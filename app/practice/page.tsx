// app/practice/page.tsx
"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Layers,
  FileText,
  BarChart2,
  Clock,
  MinusCircle,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckSquare,
  Square,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Chapter {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  name: string;
  chapters: Chapter[];
}

interface Subject {
  id: string;
  name: string;
  chapters: Chapter[];
  units?: Unit[];
  _count: { questions: number };
}

type Difficulty = "EASY" | "MEDIUM" | "HARD" | "MIXED";

interface PracticeConfig {
  subjectIds: string[];
  unitIds: string[];
  chapterIds: string[];
  questionCount: number;
  difficulty: Difficulty;
  duration: number;
  negativeMarking: boolean;
  negativeMarkValue: number;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ToggleChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  count?: number;
}

function ToggleChip({ label, selected, onClick, count }: ToggleChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
        selected
          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
          : "bg-white text-gray-700 border-gray-200 hover:border-blue-400 hover:text-blue-600"
      )}
    >
      {selected ? (
        <CheckSquare className="w-3.5 h-3.5 flex-shrink-0" />
      ) : (
        <Square className="w-3.5 h-3.5 flex-shrink-0" />
      )}
      {label}
      {count !== undefined && (
        <span
          className={cn(
            "text-xs px-1.5 py-0.5 rounded-full",
            selected ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-500"
          )}
        >
          {count}
        </span>
      )}
    </button>
  );
}

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function SectionCard({ icon, title, children }: SectionCardProps) {
  return (
    <Card className="border border-gray-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-800">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

interface SummaryItemProps {
  label: string;
  value: string;
  warn?: boolean;
}

function SummaryItem({ label, value, warn = false }: SummaryItemProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-blue-600 font-medium uppercase tracking-wide">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-semibold truncate",
          warn ? "text-amber-600" : "text-gray-800"
        )}
        title={value}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTY_OPTIONS: {
  value: Difficulty;
  label: string;
  activeClass: string;
}[] = [
  {
    value: "EASY",
    label: "Easy",
    activeClass: "bg-green-100 text-green-700 border-green-300",
  },
  {
    value: "MEDIUM",
    label: "Medium",
    activeClass: "bg-yellow-100 text-yellow-700 border-yellow-300",
  },
  {
    value: "HARD",
    label: "Hard",
    activeClass: "bg-red-100 text-red-700 border-red-300",
  },
  {
    value: "MIXED",
    label: "Mixed",
    activeClass: "bg-purple-100 text-purple-700 border-purple-300",
  },
];

const DURATION_PRESETS: { label: string; value: number }[] = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "45 min", value: 45 },
  { label: "60 min", value: 60 },
  { label: "90 min", value: 90 },
  { label: "120 min", value: 120 },
];

const NEGATIVE_OPTIONS: { label: string; value: number }[] = [
  { label: "−0.25", value: 0.25 },
  { label: "−0.5", value: 0.5 },
  { label: "−1", value: 1 },
];

const QUESTION_PRESETS = [10, 20, 30, 40, 50] as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PracticePage() {
  const router = useRouter();

  const [config, setConfig] = useState<PracticeConfig>({
    subjectIds: [],
    unitIds: [],
    chapterIds: [],
    questionCount: 20,
    difficulty: "MIXED",
    duration: 30,
    negativeMarking: false,
    negativeMarkValue: 0.25,
  });

  const [isStarting, setIsStarting] = useState<boolean>(false);
  const [startError, setStartError] = useState<string>("");

  // ── Data loading ───────────────────────────────────────────────────────────

  const {
    data: subjectsData,
    isLoading,
    isError,
  } = useQuery<{ success: boolean; data: Subject[] }>({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await fetch("/api/subjects");
      return res.json() as Promise<{ success: boolean; data: Subject[] }>;
    },
  });

  const subjects: Subject[] = subjectsData?.data ?? [];

  // ── Derived data ───────────────────────────────────────────────────────────

  const selectedSubjects = useMemo(
    () => subjects.filter((s: Subject) => config.subjectIds.includes(s.id)),
    [subjects, config.subjectIds]
  );

  const availableUnits = useMemo<Unit[]>(
    () => selectedSubjects.flatMap((s: Subject) => s.units ?? []),
    [selectedSubjects]
  );

  const availableChapters = useMemo<Chapter[]>(() => {
    if (selectedSubjects.length === 0) return [];

    const fromUnits: Chapter[] =
      config.unitIds.length > 0
        ? availableUnits
            .filter((u: Unit) => config.unitIds.includes(u.id))
            .flatMap((u: Unit) => u.chapters)
        : availableUnits.flatMap((u: Unit) => u.chapters);

    const topLevel: Chapter[] = selectedSubjects.flatMap(
      (s: Subject) => s.chapters
    );

    const seen = new Set<string>();
    return [...fromUnits, ...topLevel].filter((c: Chapter) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    });
  }, [selectedSubjects, availableUnits, config.unitIds]);

  // ── Toggle helpers ─────────────────────────────────────────────────────────

  function toggleId(
    key: "subjectIds" | "unitIds" | "chapterIds",
    id: string
  ): void {
    setConfig((prev: PracticeConfig) => {
      const current = prev[key];
      const next = current.includes(id)
        ? current.filter((x: string) => x !== id)
        : [...current, id];

      if (key === "subjectIds") {
        return { ...prev, subjectIds: next, unitIds: [], chapterIds: [] };
      }
      if (key === "unitIds") {
        return { ...prev, unitIds: next, chapterIds: [] };
      }
      return { ...prev, chapterIds: next };
    });
  }

  function selectAllSubjects(): void {
    setConfig((prev: PracticeConfig) => ({
      ...prev,
      subjectIds: subjects.map((s: Subject) => s.id),
      unitIds: [],
      chapterIds: [],
    }));
  }

  function clearSubjects(): void {
    setConfig((prev: PracticeConfig) => ({
      ...prev,
      subjectIds: [],
      unitIds: [],
      chapterIds: [],
    }));
  }

  function selectAllChapters(): void {
    setConfig((prev: PracticeConfig) => ({
      ...prev,
      chapterIds: availableChapters.map((c: Chapter) => c.id),
    }));
  }

  function clearChapters(): void {
    setConfig((prev: PracticeConfig) => ({ ...prev, chapterIds: [] }));
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  const isValid =
    config.subjectIds.length > 0 &&
    config.questionCount > 0 &&
    config.duration > 0;

  // ── Start practice ─────────────────────────────────────────────────────────

  async function handleStart(): Promise<void> {
    if (!isValid) return;
    setIsStarting(true);
    setStartError("");
    try {
      const res = await fetch("/api/practice/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) throw new Error("Failed to generate practice set");
      const json = (await res.json()) as { testId: string };
      router.push(`/practice/${json.testId}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong";
      setStartError(message);
      setIsStarting(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                Practice Set Generator
              </h1>
              <p className="text-sm text-gray-500">
                Customise your session — subjects, difficulty, and duration
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Loading skeletons */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border border-gray-200">
                <CardHeader className="pb-3">
                  <Skeleton className="h-5 w-40" />
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4].map((j) => (
                      <Skeleton key={j} className="h-8 w-24 rounded-lg" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p>Could not load subjects. Please refresh the page.</p>
          </div>
        )}

        {!isLoading && !isError && (
          <>
            {/* ── 1. Select Subjects ──────────────────────────────────────── */}
            <SectionCard
              icon={<BookOpen className="w-4 h-4 text-blue-600" />}
              title="Select Subjects"
            >
              {subjects.length === 0 ? (
                <p className="text-sm text-gray-400">No subjects found.</p>
              ) : (
                <>
                  <div className="flex gap-2 mb-3">
                    <button
                      type="button"
                      onClick={selectAllSubjects}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={clearSubjects}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((subject: Subject) => (
                      <ToggleChip
                        key={subject.id}
                        label={subject.name}
                        selected={config.subjectIds.includes(subject.id)}
                        onClick={() => toggleId("subjectIds", subject.id)}
                        count={subject._count.questions}
                      />
                    ))}
                  </div>
                </>
              )}
            </SectionCard>

            {/* ── 2. Select Units (conditional) ───────────────────────────── */}
            {availableUnits.length > 0 && (
              <SectionCard
                icon={<Layers className="w-4 h-4 text-indigo-600" />}
                title="Select Units"
              >
                <p className="text-xs text-gray-500 mb-3">
                  Leave all unselected to include every unit.
                </p>
                <div className="flex flex-wrap gap-2">
                  {availableUnits.map((unit: Unit) => (
                    <ToggleChip
                      key={unit.id}
                      label={unit.name}
                      selected={config.unitIds.includes(unit.id)}
                      onClick={() => toggleId("unitIds", unit.id)}
                      count={unit.chapters.length}
                    />
                  ))}
                </div>
              </SectionCard>
            )}

            {/* ── 3. Select Chapters ──────────────────────────────────────── */}
            <SectionCard
              icon={<FileText className="w-4 h-4 text-teal-600" />}
              title="Select Chapters"
            >
              {config.subjectIds.length === 0 ? (
                <p className="text-sm text-gray-400">
                  Select at least one subject first.
                </p>
              ) : availableChapters.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No chapters found for the selected subjects.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      type="button"
                      onClick={selectAllChapters}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Select all
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      onClick={clearChapters}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Clear
                    </button>
                    <span className="ml-auto text-xs text-gray-400">
                      {config.chapterIds.length > 0
                        ? `${config.chapterIds.length} of ${availableChapters.length} selected`
                        : "All chapters included"}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableChapters.map((chapter: Chapter) => (
                      <ToggleChip
                        key={chapter.id}
                        label={chapter.name}
                        selected={config.chapterIds.includes(chapter.id)}
                        onClick={() => toggleId("chapterIds", chapter.id)}
                      />
                    ))}
                  </div>
                </>
              )}
            </SectionCard>

            {/* ── 4. Number of Questions ──────────────────────────────────── */}
            <SectionCard
              icon={<FileText className="w-4 h-4 text-orange-500" />}
              title="Number of Questions"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Questions</span>
                  <span className="text-2xl font-bold text-blue-600">
                    {config.questionCount}
                  </span>
                </div>

                <input
                  type="range"
                  min={5}
                  max={100}
                  step={5}
                  value={config.questionCount}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setConfig((prev: PracticeConfig) => ({
                      ...prev,
                      questionCount: Number(e.target.value),
                    }))
                  }
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between text-xs text-gray-400">
                  <span>5</span>
                  <span>50</span>
                  <span>100</span>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {QUESTION_PRESETS.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() =>
                        setConfig((prev: PracticeConfig) => ({
                          ...prev,
                          questionCount: n,
                        }))
                      }
                      className={cn(
                        "px-3 py-1 rounded-md text-sm border transition-colors",
                        config.questionCount === n
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-blue-400"
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <span className="text-sm text-gray-500">Custom:</span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={config.questionCount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const val = Math.max(
                        1,
                        Math.min(200, Number(e.target.value))
                      );
                      setConfig((prev: PracticeConfig) => ({
                        ...prev,
                        questionCount: val,
                      }));
                    }}
                    className="w-20 px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </SectionCard>

            {/* ── 5. Difficulty ───────────────────────────────────────────── */}
            <SectionCard
              icon={<BarChart2 className="w-4 h-4 text-rose-500" />}
              title="Difficulty Level"
            >
              <div className="flex flex-wrap gap-2">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() =>
                      setConfig((prev: PracticeConfig) => ({
                        ...prev,
                        difficulty: opt.value,
                      }))
                    }
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                      config.difficulty === opt.value
                        ? opt.activeClass + " shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-400">
                {config.difficulty === "MIXED"
                  ? "Questions from all difficulty levels"
                  : `Only ${config.difficulty.toLowerCase()} questions will be included`}
              </p>
            </SectionCard>

            {/* ── 6. Time Limit ───────────────────────────────────────────── */}
            <SectionCard
              icon={<Clock className="w-4 h-4 text-sky-600" />}
              title="Time Limit"
            >
              <div className="flex flex-wrap gap-2">
                {DURATION_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() =>
                      setConfig((prev: PracticeConfig) => ({
                        ...prev,
                        duration: preset.value,
                      }))
                    }
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                      config.duration === preset.value
                        ? "bg-sky-600 text-white border-sky-600 shadow-sm"
                        : "bg-white text-gray-600 border-gray-200 hover:border-sky-400"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Estimated pace:{" "}
                <span className="font-medium text-gray-600">
                  {(config.duration / config.questionCount).toFixed(1)}{" "}
                  min/question
                </span>
              </p>
            </SectionCard>

            {/* ── 7. Negative Marking ─────────────────────────────────────── */}
            <SectionCard
              icon={<MinusCircle className="w-4 h-4 text-red-500" />}
              title="Negative Marking"
            >
              <label className="flex items-center gap-3 cursor-pointer select-none mb-4">
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    id="negative-marking"
                    checked={config.negativeMarking}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setConfig((prev: PracticeConfig) => ({
                        ...prev,
                        negativeMarking: e.target.checked,
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Enable negative marking
                  </p>
                  <p className="text-xs text-gray-400">
                    Marks deducted for wrong answers
                  </p>
                </div>
              </label>

              {config.negativeMarking && (
                <div>
                  <p className="text-sm text-gray-600 mb-2 font-medium">
                    Deduction per wrong answer
                  </p>
                  <div className="flex gap-2">
                    {NEGATIVE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setConfig((prev: PracticeConfig) => ({
                            ...prev,
                            negativeMarkValue: opt.value,
                          }))
                        }
                        className={cn(
                          "px-4 py-2 rounded-lg text-sm font-medium border transition-colors",
                          config.negativeMarkValue === opt.value
                            ? "bg-red-500 text-white border-red-500 shadow-sm"
                            : "bg-white text-gray-600 border-gray-200 hover:border-red-400"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </SectionCard>

            {/* ── 8. Summary ──────────────────────────────────────────────── */}
            <Card className="border-2 border-blue-100 bg-blue-50 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-blue-800">
                  Practice Set Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <SummaryItem
                    label="Subjects"
                    value={
                      config.subjectIds.length > 0
                        ? selectedSubjects
                            .map((s: Subject) => s.name)
                            .join(", ")
                        : "None selected"
                    }
                    warn={config.subjectIds.length === 0}
                  />
                  {availableUnits.length > 0 && (
                    <SummaryItem
                      label="Units"
                      value={
                        config.unitIds.length === 0
                          ? "All units"
                          : `${config.unitIds.length} selected`
                      }
                    />
                  )}
                  <SummaryItem
                    label="Chapters"
                    value={
                      config.chapterIds.length === 0
                        ? "All chapters"
                        : `${config.chapterIds.length} selected`
                    }
                  />
                  <SummaryItem
                    label="Questions"
                    value={String(config.questionCount)}
                  />
                  <SummaryItem
                    label="Difficulty"
                    value={
                      DIFFICULTY_OPTIONS.find(
                        (d) => d.value === config.difficulty
                      )?.label ?? config.difficulty
                    }
                  />
                  <SummaryItem
                    label="Duration"
                    value={`${config.duration} minutes`}
                  />
                  <SummaryItem
                    label="Negative Marking"
                    value={
                      config.negativeMarking
                        ? `−${config.negativeMarkValue} per wrong`
                        : "Disabled"
                    }
                  />
                </div>

                {config.subjectIds.length === 0 && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p>Select at least one subject to start.</p>
                  </div>
                )}

                {startError && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p>{startError}</p>
                  </div>
                )}

                {config.subjectIds.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {selectedSubjects.map((s: Subject) => (
                      <Badge
                        key={s.id}
                        variant="secondary"
                        className="bg-blue-100 text-blue-700 text-xs"
                      >
                        {s.name}
                      </Badge>
                    ))}
                    <Badge variant="outline" className="text-xs">
                      {config.questionCount} Qs
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {config.duration} min
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {config.difficulty}
                    </Badge>
                    {config.negativeMarking && (
                      <Badge
                        variant="outline"
                        className="text-xs text-red-600 border-red-200"
                      >
                        −{config.negativeMarkValue} neg
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Start Button ─────────────────────────────────────────────── */}
            <Button
              size="lg"
              disabled={!isValid || isStarting}
              onClick={handleStart}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold py-6 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isStarting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Generating practice set…
                </>
              ) : (
                <>
                  Start Practice
                  <ChevronRight className="w-5 h-5 ml-1" />
                </>
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
