// app/results/[id]/review/page.tsx
"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2, XCircle, MinusCircle, ChevronLeft,
  ChevronRight, ArrowLeft, Lightbulb, AlertTriangle,
  BookOpen, Filter, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const OPTIONS = ["A", "B", "C", "D"] as const;
const OPTION_KEYS = {
  A: "optionA", B: "optionB", C: "optionC", D: "optionD",
} as const;

type FilterMode = "all" | "correct" | "wrong" | "skipped";

interface ReviewQuestion {
  id:             string;
  orderIndex:     number;
  selectedAnswer: string | null;
  isCorrect:      boolean | null;
  question: {
    id:            string;
    questionText:  string;
    optionA:       string;
    optionB:       string;
    optionC:       string;
    optionD:       string;
    correctOption: string;
    explanation:   string | null;
    difficulty:    string;
    marks:         number;
    subject:       { id: string; name: string };
    chapter:       { id: string; name: string };
  };
}

interface ReviewData {
  test: {
    id:         string;
    title:      string;
    score:      number | null;
    totalMarks: number;
    percentage: number | null;
  };
  questions: ReviewQuestion[];
}

export default function SolutionReviewPage() {
  const params = useParams();
  const testId = params.id as string;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [filter,     setFilter]     = useState<FilterMode>("all");
  const [showAll,    setShowAll]     = useState(false);

  const { data, isLoading, error } = useQuery<{ success: boolean; data: ReviewData }>({
    queryKey: ["review", testId],
    queryFn:  async () => {
      const res = await fetch(`/api/tests/${testId}/review`);
      if (!res.ok) throw new Error("Failed to load review");
      return res.json();
    },
  });

  const allQuestions = data?.data?.questions ?? [];

  // Apply filter
  const filteredQuestions = allQuestions.filter((q) => {
    if (filter === "correct")  return q.isCorrect === true;
    if (filter === "wrong")    return q.isCorrect === false;
    if (filter === "skipped")  return q.isCorrect === null && !q.selectedAnswer;
    return true;
  });

  const current = filteredQuestions[currentIdx];
  const test    = data?.data?.test;

  const correct  = allQuestions.filter((q) => q.isCorrect === true).length;
  const wrong    = allQuestions.filter((q) => q.isCorrect === false).length;
  const skipped  = allQuestions.filter((q) => q.isCorrect === null).length;

  function changeFilter(f: FilterMode) {
    setFilter(f);
    setCurrentIdx(0);
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="h-10 w-10 text-red-400" />
        <p className="text-gray-600">Failed to load solution review.</p>
        <Button asChild variant="outline">
          <Link href={`/results/${testId}`}>Back to Results</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 page-enter max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2">
          <Link href={`/results/${testId}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to Results
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant={showAll ? "default" : "outline"}
            size="sm"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Question Mode" : "List All"}
          </Button>
        </div>
      </div>

      {/* Title & score */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Solution Review</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {test?.title} · Score: {test?.score}/{test?.totalMarks} ({test?.percentage}%)
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: "all",     label: "All",     count: allQuestions.length, color: "bg-gray-100 text-gray-700"   },
          { key: "correct", label: "Correct", count: correct,  color: "bg-green-100 text-green-700" },
          { key: "wrong",   label: "Wrong",   count: wrong,    color: "bg-red-100   text-red-700"   },
          { key: "skipped", label: "Skipped", count: skipped,  color: "bg-gray-100  text-gray-500"  },
        ] as const).map(({ key, label, count, color }) => (
          <button
            key={key}
            onClick={() => changeFilter(key)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              filter === key
                ? "border-blue-500 bg-blue-50 text-blue-700"
                : `border-gray-200 ${color} hover:border-gray-300`
            )}
          >
            {label}
            <span className={cn(
              "px-1.5 py-0.5 rounded-full text-xs font-bold",
              filter === key ? "bg-blue-500 text-white" : "bg-white/60"
            )}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {filteredQuestions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-400">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No questions in this filter.</p>
          </CardContent>
        </Card>
      ) : showAll ? (
        /* ── List All Mode ────────────────────────────────────────────── */
        <div className="space-y-4">
          {filteredQuestions.map((tq, idx) => (
            <QuestionCard key={tq.id} tq={tq} number={idx + 1} />
          ))}
        </div>
      ) : (
        /* ── Single Question Mode ─────────────────────────────────────── */
        <>
          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx((i) => i - 1)}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-gray-500 font-medium">
              {currentIdx + 1} / {filteredQuestions.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentIdx === filteredQuestions.length - 1}
              onClick={() => setCurrentIdx((i) => i + 1)}
              className="gap-1"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {current && <QuestionCard tq={current} number={currentIdx + 1} />}

          {/* Mini palette */}
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-3 font-medium">Jump to question</p>
              <div className="flex flex-wrap gap-1.5">
                {filteredQuestions.map((tq, idx) => (
                  <button
                    key={tq.id}
                    onClick={() => setCurrentIdx(idx)}
                    className={cn(
                      "w-8 h-8 rounded-md text-xs font-bold transition-all",
                      idx === currentIdx && "ring-2 ring-blue-500 ring-offset-1 scale-110",
                      tq.isCorrect === true  && "bg-green-500 text-white",
                      tq.isCorrect === false && "bg-red-500   text-white",
                      tq.isCorrect === null  && "bg-gray-200  text-gray-600",
                    )}
                  >
                    {idx + 1}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Single Question Review Card ──────────────────────────────────────────────
function QuestionCard({ tq, number }: { tq: ReviewQuestion; number: number }) {
  const q = tq.question;

  const statusIcon =
    tq.isCorrect === true  ? <CheckCircle2 className="h-5 w-5 text-green-500" /> :
    tq.isCorrect === false ? <XCircle      className="h-5 w-5 text-red-500"   /> :
                             <MinusCircle  className="h-5 w-5 text-gray-400"  />;

  const statusLabel =
    tq.isCorrect === true  ? "Correct"  :
    tq.isCorrect === false ? "Wrong"    :
                             "Skipped";

  const statusColor =
    tq.isCorrect === true  ? "bg-green-50 border-green-200" :
    tq.isCorrect === false ? "bg-red-50   border-red-200"   :
                             "bg-gray-50  border-gray-200";

  return (
    <Card className={cn("border-2 transition-colors", statusColor)}>
      <CardContent className="p-5 space-y-4">
        {/* Meta row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-gray-400">Q{number}</span>
            <Badge variant="outline" className="text-xs">{q.subject.name}</Badge>
            <Badge variant="outline" className="text-xs">{q.chapter.name}</Badge>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              q.difficulty === "EASY"   ? "badge-easy"   :
              q.difficulty === "MEDIUM" ? "badge-medium" : "badge-hard"
            )}>
              {q.difficulty}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {statusIcon}
            <span className={cn(
              "text-xs font-semibold",
              tq.isCorrect === true  ? "text-green-600" :
              tq.isCorrect === false ? "text-red-600"   : "text-gray-400"
            )}>
              {statusLabel}
            </span>
          </div>
        </div>

        {/* Question text */}
        <p className="text-sm text-gray-900 leading-relaxed whitespace-pre-wrap font-medium">
          {q.questionText}
        </p>

        {/* Options */}
        <div className="space-y-2">
          {OPTIONS.map((opt) => {
            const text        = q[OPTION_KEYS[opt]];
            const isCorrect   = opt === q.correctOption;
            const isSelected  = opt === tq.selectedAnswer;
            const isWrong     = isSelected && !isCorrect;

            return (
              <div
                key={opt}
                className={cn(
                  "flex items-start gap-3 p-3 rounded-lg border-2 text-sm transition-colors",
                  isCorrect && isSelected  && "border-green-500 bg-green-50",
                  isCorrect && !isSelected && "border-green-400 bg-green-50/60",
                  isWrong                  && "border-red-500   bg-red-50",
                  !isCorrect && !isWrong   && "border-gray-100  bg-white",
                )}
              >
                <span className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-bold shrink-0",
                  isCorrect  ? "border-green-500 bg-green-500 text-white" :
                  isWrong    ? "border-red-500   bg-red-500   text-white" :
                               "border-gray-300  text-gray-500"
                )}>
                  {opt}
                </span>
                <span className={cn(
                  "flex-1 leading-snug",
                  isCorrect ? "text-green-800 font-medium" :
                  isWrong   ? "text-red-800"               :
                              "text-gray-700"
                )}>
                  {text}
                </span>
                <span className="shrink-0">
                  {isCorrect && isSelected  && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {isWrong                  && <XCircle      className="h-4 w-4 text-red-500"   />}
                  {isCorrect && !isSelected && <CheckCircle2 className="h-4 w-4 text-green-400 opacity-70" />}
                </span>
              </div>
            );
          })}
        </div>

        {/* Your answer summary */}
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <span className="text-gray-500">
            Your answer:{" "}
            <span className={cn(
              "font-bold",
              tq.isCorrect === true  ? "text-green-600" :
              tq.isCorrect === false ? "text-red-600"   : "text-gray-400"
            )}>
              {tq.selectedAnswer ? `Option ${tq.selectedAnswer}` : "Not answered"}
            </span>
          </span>
          <span className="text-gray-300">·</span>
          <span className="text-gray-500">
            Correct answer:{" "}
            <span className="font-bold text-green-600">Option {q.correctOption}</span>
          </span>
        </div>

        {/* Explanation */}
        {q.explanation && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Lightbulb className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-blue-700 mb-1">Explanation</p>
              <p className="text-xs text-blue-800 leading-relaxed">{q.explanation}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
