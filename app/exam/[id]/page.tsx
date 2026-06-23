// app/exam/[id]/page.tsx
"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, Flag, Trash2,
  Send, Clock, AlertTriangle, CheckCircle2,
  Loader2, BookmarkIcon, Menu, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { cn, formatDuration } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface TestQuestion {
  id:             string;
  questionId:     string;
  selectedAnswer: string | null;
  markedReview:   boolean;
  orderIndex:     number;
  question: {
    id:           string;
    questionText: string;
    optionA:      string;
    optionB:      string;
    optionC:      string;
    optionD:      string;
    difficulty:   string;
    marks:        number;
    subject:      { id: string; name: string };
    chapter:      { id: string; name: string };
  };
}

interface Test {
  id:              string;
  title:           string;
  totalQuestions:  number;
  totalMarks:      number;
  durationMinutes: number;
  completed:       boolean;
  startedAt:       string;
  testQuestions:   TestQuestion[];
}

const OPTIONS = ["A", "B", "C", "D"] as const;
const OPTION_KEYS = {
  A: "optionA", B: "optionB", C: "optionC", D: "optionD",
} as const;

// ─── Timer hook ───────────────────────────────────────────────────────────────
function useExamTimer(testId: string, durationMinutes: number, startedAt: string, onExpire: () => void) {
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const storageKey = `exam_timer_${testId}`;
    const stored     = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    if (stored) {
      const { endTime } = JSON.parse(stored);
      const remaining   = Math.floor((endTime - Date.now()) / 1000);
      return Math.max(0, remaining);
    }
    // Calculate from server startedAt
    const endTime = new Date(startedAt).getTime() + durationMinutes * 60 * 1000;
    const remaining = Math.floor((endTime - Date.now()) / 1000);
    // Persist endTime
    if (typeof window !== "undefined") {
      localStorage.setItem(storageKey, JSON.stringify({ endTime }));
    }
    return Math.max(0, remaining);
  });

  const expiredRef  = useRef(false);
  const storageKey  = `exam_timer_${testId}`;
  useEffect(() => {
    // If no duration or no valid startedAt, don't start timer or trigger expire.
    if (!startedAt || durationMinutes <= 0) return;

    if (secondsLeft <= 0 && !expiredRef.current) {
      expiredRef.current = true;
      if (typeof window !== "undefined") localStorage.removeItem(storageKey);
      onExpire();
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        const next = prev - 1;
        if (next <= 0 && !expiredRef.current) {
          expiredRef.current = true;
          clearInterval(interval);
          if (typeof window !== "undefined") localStorage.removeItem(storageKey);
          onExpire();
        }
        return Math.max(0, next);
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, durationMinutes, secondsLeft, storageKey, onExpire]);

  return secondsLeft;
}

// ─── Question Palette Button ──────────────────────────────────────────────────
function PaletteButton({
  number, state, isCurrent, onClick,
}: {
  number:    number;
  state:     "answered" | "unanswered" | "review" | "not-visited";
  isCurrent: boolean;
  onClick:   () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-9 h-9 rounded-lg text-xs font-bold transition-all duration-150",
        state === "answered"    && "bg-green-500  text-white",
        state === "unanswered"  && "bg-red-500    text-white",
        state === "review"      && "bg-amber-500  text-white",
        state === "not-visited" && "bg-gray-200   text-gray-600",
        isCurrent && "ring-2 ring-offset-1 ring-blue-600 scale-110"
      )}
    >
      {number}
    </button>
  );
}

// ─── Main Exam Page ───────────────────────────────────────────────────────────
export default function ExamPage() {
  const params    = useParams();
  const router    = useRouter();
  const testId    = params.id as string;
  const qClient   = useQueryClient();

  const [currentIdx,    setCurrentIdx]    = useState(0);
  const [visitedSet,    setVisitedSet]    = useState<Set<string>>(new Set());
  const [showSubmit,    setShowSubmit]    = useState(false);
  const [showPalette,   setShowPalette]   = useState(false);
  const [isSubmitting,  setIsSubmitting]  = useState(false);

  // ── Fetch test data ─────────────────────────────────────────────────────────
  const { data, isLoading, error } = useQuery<{ success: boolean; data: Test }>({
    queryKey:            ["exam", testId],
    queryFn:             async () => {
      const res = await fetch(`/api/tests/${testId}`);
      if (!res.ok) throw new Error("Failed to load test");
      return res.json();
    },
    refetchOnWindowFocus: false,
    staleTime:            Infinity,
  });

  const test      = data?.data;
  const questions = test?.testQuestions ?? [];
  const current   = questions[currentIdx];

  // Mark as visited
  useEffect(() => {
    if (current?.questionId) {
      setVisitedSet((prev) => new Set([...prev, current.questionId]));
    }
  }, [currentIdx, current?.questionId]);

  // Redirect if already completed
  useEffect(() => {
    if (test?.completed) {
      router.replace(`/results/${testId}`);
    }
  }, [test?.completed, testId, router]);

  // ── Auto-submit on timer expire ─────────────────────────────────────────────
  const handleAutoSubmit = useCallback(async () => {
    toast({ title: "⏰ Time's up!", description: "Your test is being submitted automatically.", variant: "destructive" });
    await submitTest();
  }, []);

  // Always call the hook to preserve hooks ordering. The hook itself will no-op
  // when `durationMinutes` is 0 or `startedAt` is missing.
  const secondsLeft = useExamTimer(
    testId,
    test?.durationMinutes ?? 0,
    test?.startedAt ?? "",
    handleAutoSubmit
  );

  // ── Save answer mutation ────────────────────────────────────────────────────
  const saveAnswer = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: string | null }) => {
      const res = await fetch(`/api/tests/${testId}/answer`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ questionId, selectedAnswer: answer }),
      });
      if (!res.ok) throw new Error("Failed to save answer");
      return res.json();
    },
    onSuccess: (_, { questionId, answer }) => {
      qClient.setQueryData<{ success: boolean; data: Test }>(["exam", testId], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: {
            ...old.data,
            testQuestions: old.data.testQuestions.map((tq) =>
              tq.questionId === questionId ? { ...tq, selectedAnswer: answer } : tq
            ),
          },
        };
      });
    },
    onError: () => toast({ title: "Failed to save answer", variant: "destructive" }),
  });

  // ── Toggle mark for review ──────────────────────────────────────────────────
  const toggleReview = useMutation({
    mutationFn: async ({ questionId, marked }: { questionId: string; marked: boolean }) => {
      const res = await fetch(`/api/tests/${testId}/answer`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ questionId, marked }),
      });
      if (!res.ok) throw new Error("Failed to mark question");
      return res.json();
    },
    onSuccess: (_, { questionId, marked }) => {
      qClient.setQueryData<{ success: boolean; data: Test }>(["exam", testId], (old) => {
        if (!old) return old;
        return {
          ...old,
          data: {
            ...old.data,
            testQuestions: old.data.testQuestions.map((tq) =>
              tq.questionId === questionId ? { ...tq, markedReview: marked } : tq
            ),
          },
        };
      });
    },
  });

  // ── Submit test ─────────────────────────────────────────────────────────────
  async function submitTest() {
    setIsSubmitting(true);
    try {
      const res  = await fetch(`/api/tests/${testId}/submit`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      // Clean up timer
      localStorage.removeItem(`exam_timer_${testId}`);
      router.push(`/results/${testId}`);
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
      setIsSubmitting(false);
    }
  }

  // ── Derived state ───────────────────────────────────────────────────────────
  function getQuestionState(tq: TestQuestion): "answered" | "unanswered" | "review" | "not-visited" {
    if (tq.markedReview)            return "review";
    if (tq.selectedAnswer)          return "answered";
    if (visitedSet.has(tq.questionId)) return "unanswered";
    return "not-visited";
  }

  const answered    = questions.filter((q) => q.selectedAnswer && !q.markedReview).length;
  const reviewCount = questions.filter((q) => q.markedReview).length;
  const notVisited  = questions.filter((q) => !visitedSet.has(q.questionId)).length;
  const isUrgent    = secondsLeft <= 300; // 5 minutes

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-gray-600 text-sm">Loading exam…</p>
        </div>
      </div>
    );
  }

  if (error || !test || !current) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
          <p className="text-gray-700 font-medium">Failed to load exam</p>
          <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
        </div>
      </div>
    );
  }

  const q = current.question;
  const marksPerSubjectPersisted: Record<string, number> = (test as any).marksPerSubject ?? {};
  const negativeMarkPersisted: number = (test as any).negativeMarking ?? 0;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-[1400px] mx-auto px-4 h-14 flex items-center justify-between gap-4">
          {/* Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="lg:hidden p-1.5 rounded-md hover:bg-gray-100"
              onClick={() => setShowPalette(true)}
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </button>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{test.title}</p>
              <p className="text-xs text-gray-400">
                Question {currentIdx + 1} of {test.totalQuestions}
              </p>
            </div>
          </div>

          {/* Timer */}
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl font-mono text-base font-bold shrink-0",
            isUrgent ? "bg-red-50 text-red-600 animate-pulse" : "bg-blue-50 text-blue-700"
          )}>
            <Clock className="h-4 w-4" />
            {formatDuration(secondsLeft)}
          </div>

          {/* Submit button */}
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setShowSubmit(true)}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Submit Test</span>
          </Button>
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 max-w-[1400px] mx-auto w-full px-4 py-4 flex gap-4">

        {/* ── Question Area (left) ───────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* Question card */}
          <Card className="flex-1">
            <CardContent className="p-6">
              {/* Meta */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Badge variant="outline" className="text-xs">Q{currentIdx + 1}</Badge>
                <Badge variant="outline" className="text-xs">{q.subject.name}</Badge>
                <Badge variant="outline" className="text-xs">{q.chapter.name}</Badge>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-xs capitalize",
                    q.difficulty === "EASY"   && "border-green-300 text-green-700",
                    q.difficulty === "MEDIUM" && "border-amber-300 text-amber-700",
                    q.difficulty === "HARD"   && "border-red-300   text-red-700",
                  )}
                >
                  {q.difficulty.toLowerCase()}
                </Badge>
                <Badge variant="secondary" className="text-xs ml-auto">
                  {(() => {
                    const per = q.subject?.name && typeof marksPerSubjectPersisted[q.subject.name] === 'number'
                      ? marksPerSubjectPersisted[q.subject.name]
                      : q.marks;
                    return `${per} mark${per > 1 ? 's' : ''}`;
                  })()}
                </Badge>
              </div>

          {/* Negative marking indicator */}
          <div className="ml-4 text-sm text-gray-500">
            {negativeMarkPersisted > 0 ? `Negative: -${negativeMarkPersisted} per wrong` : "No negative marking"}
          </div>
              {/* Question text */}
              <p className="text-gray-900 text-base leading-relaxed mb-6 whitespace-pre-wrap">
                {q.questionText}
              </p>

              {/* Options */}
              <div className="space-y-3">
                {OPTIONS.map((opt) => {
                  const isSelected = current.selectedAnswer === opt;
                  const optionText = q[OPTION_KEYS[opt]];
                  return (
                    <button
                      key={opt}
                      onClick={() => saveAnswer.mutate({ questionId: current.questionId, answer: opt })}
                      className={cn(
                        "exam-option",
                        isSelected && "selected"
                      )}
                    >
                      <span className={cn(
                        "w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0",
                        isSelected
                          ? "border-blue-500 bg-blue-500 text-white"
                          : "border-gray-300 text-gray-500"
                      )}>
                        {opt}
                      </span>
                      <span className="text-sm text-left leading-snug">{optionText}</span>
                      {isSelected && saveAnswer.isPending && (
                        <Loader2 className="h-3 w-3 animate-spin text-blue-500 ml-auto shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* ── Action buttons ──────────────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Clear response */}
            <Button
              variant="outline"
              size="sm"
              disabled={!current.selectedAnswer}
              onClick={() => saveAnswer.mutate({ questionId: current.questionId, answer: null })}
              className="gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </Button>

            {/* Mark for review */}
            <Button
              variant={current.markedReview ? "default" : "outline"}
              size="sm"
              onClick={() => toggleReview.mutate({
                questionId: current.questionId,
                marked:     !current.markedReview,
              })}
              className={cn(
                "gap-1.5",
                current.markedReview && "bg-amber-500 hover:bg-amber-600 border-amber-500"
              )}
            >
              <Flag className="h-3.5 w-3.5" />
              {current.markedReview ? "Marked" : "Mark for Review"}
            </Button>

            {/* Navigation */}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                disabled={currentIdx === 0}
                onClick={() => setCurrentIdx((i) => i - 1)}
                className="gap-1.5"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>

              {currentIdx < questions.length - 1 ? (
                <Button
                  size="sm"
                  onClick={() => setCurrentIdx((i) => i + 1)}
                  className="gap-1.5"
                >
                  Save & Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setShowSubmit(true)}
                  className="gap-1.5"
                >
                  <Send className="h-4 w-4" />
                  Submit
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* ── Question Palette (right, desktop) ─────────────────────────── */}
        <aside className="hidden lg:flex flex-col w-64 shrink-0">
          <PalettePanel
            questions={questions}
            currentIdx={currentIdx}
            visitedSet={visitedSet}
            getState={getQuestionState}
            onSelect={(idx) => setCurrentIdx(idx)}
            answered={answered}
            reviewCount={reviewCount}
            notVisited={notVisited}
            total={test.totalQuestions}
          />
        </aside>
      </div>

      {/* ── Mobile Palette Drawer ─────────────────────────────────────── */}
      {showPalette && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowPalette(false)} />
          <aside className="relative ml-auto w-72 bg-white h-full overflow-y-auto flex flex-col z-50">
            <div className="flex items-center justify-between p-4 border-b">
              <p className="font-semibold text-sm">Question Palette</p>
              <button onClick={() => setShowPalette(false)}>
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="flex-1 p-4">
              <PalettePanel
                questions={questions}
                currentIdx={currentIdx}
                visitedSet={visitedSet}
                getState={getQuestionState}
                onSelect={(idx) => { setCurrentIdx(idx); setShowPalette(false); }}
                answered={answered}
                reviewCount={reviewCount}
                notVisited={notVisited}
                total={test.totalQuestions}
              />
            </div>
          </aside>
        </div>
      )}

      {/* ── Submit Confirmation Dialog ────────────────────────────────── */}
      <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Submit Test?
            </DialogTitle>
            <DialogDescription>
              Once submitted you cannot change your answers.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-3 py-2">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{answered}</p>
              <p className="text-xs text-gray-500 mt-1">Answered</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <p className="text-2xl font-bold text-amber-600">{reviewCount}</p>
              <p className="text-xs text-gray-500 mt-1">For Review</p>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-600">{notVisited}</p>
              <p className="text-xs text-gray-500 mt-1">Not Visited</p>
            </div>
          </div>

          {notVisited > 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-amber-700 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {notVisited} question{notVisited > 1 ? "s" : ""} not yet visited.
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSubmit(false)}>
              Continue Exam
            </Button>
            <Button
              variant="destructive"
              onClick={submitTest}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</>
              ) : (
                <><Send className="h-4 w-4" /> Submit Now</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Palette Panel Component ──────────────────────────────────────────────────
function PalettePanel({
  questions, currentIdx, visitedSet, getState,
  onSelect, answered, reviewCount, notVisited, total,
}: {
  questions:   TestQuestion[];
  currentIdx:  number;
  visitedSet:  Set<string>;
  getState:    (tq: TestQuestion) => "answered" | "unanswered" | "review" | "not-visited";
  onSelect:    (idx: number) => void;
  answered:    number;
  reviewCount: number;
  notVisited:  number;
  total:       number;
}) {
  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {[
          { color: "bg-green-500",  label: "Answered",    count: answered    },
          { color: "bg-red-500",    label: "Unanswered",  count: questions.length - answered - reviewCount - notVisited },
          { color: "bg-amber-500",  label: "For Review",  count: reviewCount },
          { color: "bg-gray-300",   label: "Not Visited", count: notVisited  },
        ].map(({ color, label, count }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${color} shrink-0`} />
            <span className="text-gray-600">{label}</span>
            <span className="font-semibold ml-auto">{Math.max(0, count)}</span>
          </div>
        ))}
      </div>

      <div className="h-px bg-gray-200" />

      {/* Grid of question numbers */}
      <div className="grid grid-cols-5 gap-1.5">
        {questions.map((tq, idx) => (
          <PaletteButton
            key={tq.id}
            number={idx + 1}
            state={getState(tq)}
            isCurrent={idx === currentIdx}
            onClick={() => onSelect(idx)}
          />
        ))}
      </div>

      {/* Progress */}
      <div className="h-px bg-gray-200" />
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1.5">
          <span>Progress</span>
          <span>{answered}/{total} answered</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-green-500 h-2 rounded-full transition-all"
            style={{ width: `${total > 0 ? (answered / total) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}
