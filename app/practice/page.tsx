// app/practice/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen, FlaskConical, CheckSquare, Clock,
  Loader2, AlertCircle, ChevronRight, Shuffle,
  BarChart2, Hash,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface Subject {
  id:       string;
  name:     string;
  chapters: { id: string; name: string }[];
  units?: { id: string; name: string; chapters: { id: string; name: string }[] }[];
  _count:   { questions: number };
}

const QUESTION_COUNTS  = [10, 20, 30, 50, 100] as const;
const DIFFICULTIES     = ["EASY", "MEDIUM", "HARD", "MIXED"] as const;
const DURATIONS        = [15, 30, 60, 120] as const;

type Difficulty = typeof DIFFICULTIES[number];
type Duration   = typeof DURATIONS[number];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY:   "Easy",
  MEDIUM: "Medium",
  HARD:   "Hard",
  MIXED:  "Mixed",
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  EASY:   "border-green-400 bg-green-50  text-green-700  data-[selected=true]:bg-green-500  data-[selected=true]:text-white",
  MEDIUM: "border-amber-400 bg-amber-50  text-amber-700  data-[selected=true]:bg-amber-500  data-[selected=true]:text-white",
  HARD:   "border-red-400   bg-red-50    text-red-700    data-[selected=true]:bg-red-500    data-[selected=true]:text-white",
  MIXED:  "border-blue-400  bg-blue-50   text-blue-700   data-[selected=true]:bg-blue-500   data-[selected=true]:text-white",
};

function OptionButton({
  selected, onClick, children, className = "",
}: {
  selected:  boolean;
  onClick:   () => void;
  children:  React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      data-selected={selected}
      className={cn(
        "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-150 cursor-pointer select-none",
        selected
          ? "border-blue-500 bg-blue-500 text-white shadow-sm"
          : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50",
        className
      )}
    >
      {children}
    </button>
  );
}

export default function PracticePage() {
  const router = useRouter();

  // ── Form state ──────────────────────────────────────────────────────────────
  const [selectedSubjects,   setSelectedSubjects]   = useState<string[]>([]);
  const [selectedChapters,   setSelectedChapters]   = useState<string[]>([]);
  const [questionCount,      setQuestionCount]      = useState<number>(20);
  const [difficulty,         setDifficulty]         = useState<Difficulty>("MIXED");
  const [duration,           setDuration]           = useState<Duration>(30);
  const [negativeMarking,    setNegativeMarking]    = useState<number>(0);
  const [allowNegative,      setAllowNegative]      = useState<boolean>(false);
  const [isGenerating,       setIsGenerating]       = useState(false);
  const [selectedUnits,      setSelectedUnits]      = useState<string[]>([]);

  // ── Fetch subjects ───────────────────────────────────────────────────────────
  const { data: subjectsData, isLoading } = useQuery<{ success: boolean; data: Subject[] }>({
    queryKey: ["subjects"],
    queryFn:  async () => {
      const res = await fetch("/api/subjects");
      if (!res.ok) throw new Error("Failed to load subjects");
      return res.json();
    },
  });

  const subjects = subjectsData?.data ?? [];

  // ── Available chapters based on selected subjects ────────────────────────────
  const availableChapters = subjects
    .filter((s) => selectedSubjects.includes(s.id))
    .flatMap((s) => [
      ...s.chapters.map((c) => ({ ...c, subjectName: s.name, unitName: undefined })),
      ...(s.units ?? []).flatMap((u) => u.chapters.map((c) => ({ ...c, subjectName: s.name, unitName: u.name, unitId: u.id }))),
    ]);

  // Reset chapters when subjects change
  useEffect(() => {
    setSelectedChapters((prev) =>
      prev.filter((cid) => availableChapters.some((c) => c.id === cid))
    );
  }, [selectedSubjects]);

  // ── Toggle helpers ───────────────────────────────────────────────────────────
  function toggleSubject(id: string) {
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }

  function toggleChapter(id: string) {
    setSelectedChapters((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function toggleUnit(unitId: string, chapterIds: string[]) {
    setSelectedUnits((prev) => prev.includes(unitId) ? prev.filter(u => u !== unitId) : [...prev, unitId]);
    setSelectedChapters((prev) => {
      const hasAll = chapterIds.every(id => prev.includes(id));
      if (hasAll) return prev.filter(id => !chapterIds.includes(id));
      return Array.from(new Set([...prev, ...chapterIds]));
    });
  }

  function toggleAllChapters() {
    if (selectedChapters.length === availableChapters.length) {
      setSelectedChapters([]);
    } else {
      setSelectedChapters(availableChapters.map((c) => c.id));
    }
  }

  // ── Generate practice set ───────────────────────────────────────────────────
  async function handleGenerate() {
    if (selectedSubjects.length === 0) {
      toast({ title: "Select a subject", description: "Please select at least one subject.", variant: "destructive" });
      return;
    }

    setIsGenerating(true);
    try {
      const res  = await fetch("/api/tests/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
              subjectIds:      selectedSubjects,
              chapterIds:      selectedChapters,
              questionCount,
              difficulty,
              durationMinutes: duration,
              negativeMarking: allowNegative ? negativeMarking : 0,
            }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast({ title: "Generation failed", description: json.error, variant: "destructive" });
        return;
      }

      toast({ title: "Practice set ready!", description: json.data.title, variant: "success" });
      router.push(`/exam/${json.data.testId}`);
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }

  // ── Total available questions estimate ──────────────────────────────────────
  const totalAvailable = subjects
    .filter((s) => selectedSubjects.includes(s.id))
    .reduce((sum, s) => sum + s._count.questions, 0);

  return (
    <div className="space-y-6 page-enter max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-6 w-6 text-blue-600" />
          Practice Set Generator
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Customise your practice session by subject, chapter, difficulty and duration.
        </p>
      </div>

      {/* Step 1 — Subjects */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
            Select Subjects
          </CardTitle>
          <CardDescription>You can select multiple subjects</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex gap-3">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-32 rounded-lg" />)}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {subjects.map((subject) => (
                <button
                  key={subject.id}
                  onClick={() => toggleSubject(subject.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-medium transition-all",
                    selectedSubjects.includes(subject.id)
                      ? "border-blue-500 bg-blue-500 text-white shadow-md scale-[1.02]"
                      : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50"
                  )}
                >
                  {selectedSubjects.includes(subject.id) && (
                    <CheckSquare className="h-4 w-4" />
                  )}
                  {subject.name}
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs ml-1",
                      selectedSubjects.includes(subject.id) ? "bg-white/20 text-white" : ""
                    )}
                  >
                    {subject._count.questions}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {selectedSubjects.length > 0 && (
            <p className="text-xs text-blue-600 mt-3 font-medium">
              ✓ {totalAvailable} questions available from selected subjects
            </p>
          )}
        </CardContent>
      </Card>

      {/* Step 2 — Chapters */}
      {availableChapters.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                Select Chapters
                <span className="text-xs text-gray-400 font-normal">(optional — leave empty for all)</span>
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={toggleAllChapters} className="text-xs">
                {selectedChapters.length === availableChapters.length ? "Deselect all" : "Select all"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {availableChapters.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => toggleChapter(chapter.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                    selectedChapters.includes(chapter.id)
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  )}
                >
                  {chapter.name}
                  <span className="text-gray-400 ml-1">· {chapter.subjectName}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 — Question Count */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
              {availableChapters.length > 0 ? "3" : "2"}
            </span>
            <Hash className="h-4 w-4 text-blue-600" />
            Number of Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {QUESTION_COUNTS.map((count) => (
              <OptionButton
                key={count}
                selected={questionCount === count}
                onClick={() => setQuestionCount(count)}
              >
                {count} Questions
              </OptionButton>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 4 — Difficulty */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
              {availableChapters.length > 0 ? "4" : "3"}
            </span>
            <BarChart2 className="h-4 w-4 text-blue-600" />
            Difficulty Level
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={cn(
                  "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-150",
                  difficulty === d
                    ? d === "EASY"   ? "border-green-500 bg-green-500 text-white"
                    : d === "MEDIUM" ? "border-amber-500 bg-amber-500 text-white"
                    : d === "HARD"   ? "border-red-500   bg-red-500   text-white"
                    :                  "border-blue-500  bg-blue-500  text-white"
                    : d === "EASY"   ? "border-green-200 bg-green-50  text-green-700 hover:border-green-400"
                    : d === "MEDIUM" ? "border-amber-200 bg-amber-50  text-amber-700 hover:border-amber-400"
                    : d === "HARD"   ? "border-red-200   bg-red-50    text-red-700   hover:border-red-400"
                    :                  "border-blue-200  bg-blue-50   text-blue-700  hover:border-blue-400"
                )}
              >
                {d === "MIXED" && <Shuffle className="inline h-3.5 w-3.5 mr-1.5" />}
                {DIFFICULTY_LABELS[d]}
              </button>
            ))}
          </div>
          {difficulty === "MIXED" && (
            <p className="text-xs text-gray-500 mt-2">
              Mixed randomly selects questions across all difficulty levels.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Step 5 — Duration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
              {availableChapters.length > 0 ? "5" : "4"}
            </span>
            <Clock className="h-4 w-4 text-blue-600" />
            Time Limit
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {DURATIONS.map((d) => (
              <OptionButton
                key={d}
                selected={duration === d}
                onClick={() => setDuration(d)}
              >
                <Clock className="inline h-3.5 w-3.5 mr-1.5 opacity-70" />
                {d < 60 ? `${d} min` : `${d / 60} hr`}
              </OptionButton>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Negative marking */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">{availableChapters.length > 0 ? "6" : "5"}</span>
            <Clock className="h-4 w-4 text-blue-600" />
            Negative Marking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={allowNegative} onChange={(e) => setAllowNegative(e.target.checked)} className="h-4 w-4" />
              <span className="text-sm">Enable negative marking</span>
            </label>
            {allowNegative && (
              <input
                type="number"
                step="0.25"
                min={0}
                max={10}
                value={negativeMarking}
                onChange={(e) => setNegativeMarking(Number(e.target.value))}
                className="w-28 px-3 py-2 border rounded-lg"
              />
            )}
          </div>
          <p className="text-xs text-gray-500 mt-2">If enabled, this value will be subtracted for each incorrect answer.</p>
        </CardContent>
      </Card>

      {/* Summary + Generate */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Practice Set Summary</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {questionCount} Questions
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {DIFFICULTY_LABELS[difficulty]} Difficulty
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {duration < 60 ? `${duration} min` : `${duration / 60} hr`} duration
                </Badge>
                {selectedSubjects.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {subjects.filter((s) => selectedSubjects.includes(s.id)).map((s) => s.name).join(", ")}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              size="lg"
              onClick={handleGenerate}
              disabled={isGenerating || selectedSubjects.length === 0}
              className="shrink-0 gap-2"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  Start Practice
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
          {selectedSubjects.length === 0 && (
            <p className="text-xs text-amber-600 flex items-center gap-1 mt-3">
              <AlertCircle className="h-3.5 w-3.5" />
              Please select at least one subject to generate a practice set.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
