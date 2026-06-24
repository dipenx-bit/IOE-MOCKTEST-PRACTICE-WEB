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
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface Subject {
  id: string;
  name: string;
  chapters: { id: string; name: string }[];
  units?: { id: string; name: string; chapters: { id: string; name: string }[] }[];
  _count: { questions: number };
}

const QUESTION_COUNTS = [10, 20, 30, 50, 100] as const;
const DIFFICULTIES = ["EASY", "MEDIUM", "HARD", "MIXED"] as const;
const DURATIONS = [15, 30, 60, 120] as const;

type Difficulty = typeof DIFFICULTIES[number];
type Duration = typeof DURATIONS[number];

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
  MIXED: "Mixed",
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  EASY: "border-green-400 bg-green-50 text-green-700",
  MEDIUM: "border-amber-400 bg-amber-50 text-amber-700",
  HARD: "border-red-400 bg-red-50 text-red-700",
  MIXED: "border-blue-400 bg-blue-50 text-blue-700",
};

function OptionButton({
  selected, onClick, children, className = "",
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      data-selected={selected}
      className={cn(
        "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
        selected
          ? "border-blue-500 bg-blue-500 text-white"
          : "border-gray-200 bg-white text-gray-700 hover:bg-blue-50",
        className
      )}
    >
      {children}
    </button>
  );
}

export default function PracticePage() {
  const router = useRouter();

  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [difficulty, setDifficulty] = useState<Difficulty>("MIXED");

  // ✅ FIXED: no strict union state issues anymore
  const [duration, setDuration] = useState<number>(30);

  const [negativeMarking, setNegativeMarking] = useState<number>(0);
  const [allowNegative, setAllowNegative] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);

  const { data: subjectsData, isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const res = await fetch("/api/subjects");
      if (!res.ok) throw new Error("Failed to load subjects");
      return res.json();
    },
  });

  const subjects = subjectsData?.data ?? [];

  const availableUnits = subjects
    .filter((s) => selectedSubjects.includes(s.id))
    .flatMap((s) => (s.units ?? []).map((u) => ({ ...u, subjectName: s.name })));

  const unitlessChapters = subjects
    .filter((s) => selectedSubjects.includes(s.id))
    .flatMap((s) => s.chapters.map((c) => ({ ...c, subjectName: s.name })));

  const availableChapters =
    selectedUnits.length > 0
      ? subjects
          .flatMap((s) => (s.units ?? []).map((u) => ({ ...u, subjectName: s.name })))
          .filter((u) => selectedUnits.includes(u.id))
          .flatMap((u) =>
            u.chapters.map((c) => ({
              ...c,
              subjectName: u.subjectName,
              unitName: u.name,
              unitId: u.id,
            }))
          )
      : unitlessChapters;

  useEffect(() => {
    const validUnitIds = availableUnits.map((u) => u.id);
    setSelectedUnits((prev) => prev.filter((id) => validUnitIds.includes(id)));
  }, [selectedSubjects]);

  // ✅ FIXED duration handler
  const handleDurationChange = (value: number) => {
    if (!isNaN(value)) {
      setDuration(value);
    }
  };

  async function handleGenerate() {
    if (selectedSubjects.length === 0) {
      toast({
        title: "Select a subject",
        description: "Please select at least one subject.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/tests/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectIds: selectedSubjects,
          chapterIds: selectedChapters,
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

      router.push(`/exam/${json.data.testId}`);
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">

      {/* Duration */}
      <Card>
        <CardHeader>
          <CardTitle>Time Limit</CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex gap-3 flex-wrap">

            {DURATIONS.map((d) => (
              <OptionButton
                key={d}
                selected={duration === d}
                onClick={() => setDuration(d)}
              >
                {d} min
              </OptionButton>
            ))}

            {/* ✅ FIXED INPUT */}
            <input
              type="number"
              value={duration}
              onChange={(e) => handleDurationChange(Number(e.target.value))}
              className="w-24 px-3 py-2 border rounded-lg"
            />
          </div>
        </CardContent>
      </Card>

      {/* Generate */}
      <Button onClick={handleGenerate} disabled={isGenerating}>
        {isGenerating ? "Generating..." : "Start Practice"}
      </Button>

    </div>
  );
}