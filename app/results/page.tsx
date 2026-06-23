// app/results/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Trophy, Clock, ChevronRight, AlertTriangle,
  Search, Filter, BookOpen, Target,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { formatDate, formatDuration, getScoreColor, roundTo } from "@/lib/utils";
import { useState } from "react";

interface TestResult {
  id:              string;
  title:           string;
  score:           number;
  totalMarks:      number;
  percentage:      number;
  totalQuestions:  number;
  durationMinutes: number;
  submittedAt:     string;
  startedAt:       string;
}

function ScoreBadge({ pct }: { pct: number }) {
  const color =
    pct >= 80 ? "bg-green-100 text-green-700 border-green-200" :
    pct >= 60 ? "bg-blue-100  text-blue-700  border-blue-200"  :
    pct >= 40 ? "bg-amber-100 text-amber-700 border-amber-200" :
                "bg-red-100   text-red-700   border-red-200";
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${color}`}>
      {roundTo(pct)}%
    </span>
  );
}

export default function ResultsPage() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery<{ success: boolean; data: TestResult[] }>({
    queryKey: ["test-history"],
    queryFn: async () => {
      const res = await fetch("/api/tests/history");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const tests = (data?.data ?? []).filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase())
  );

  const avgScore = tests.length
    ? roundTo(tests.reduce((s, t) => s + (t.percentage ?? 0), 0) / tests.length)
    : 0;
  const bestScore = tests.length
    ? roundTo(Math.max(...tests.map((t) => t.percentage ?? 0)))
    : 0;

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Trophy className="h-6 w-6 text-blue-600" />
          My Tests
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Review all your completed practice sessions and mock tests.
        </p>
      </div>

      {/* Summary stats */}
      {!isLoading && tests.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Tests Taken",   value: tests.length, color: "text-blue-600"  },
            { label: "Average Score", value: `${avgScore}%`,  color: "text-purple-600" },
            { label: "Best Score",    value: `${bestScore}%`, color: "text-green-600"  },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search tests by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Test list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : tests.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Trophy className="h-12 w-12 mx-auto text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">
              {search ? "No tests match your search." : "No tests completed yet."}
            </p>
            {!search && (
              <div className="flex gap-3 justify-center mt-4">
                <Button asChild variant="outline" size="sm">
                  <Link href="/practice">Practice Set</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/mock-test">Mock Test</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tests.map((test) => {
            const timeTaken = test.submittedAt && test.startedAt
              ? Math.floor(
                  (new Date(test.submittedAt).getTime() - new Date(test.startedAt).getTime()) / 1000
                )
              : 0;

            return (
              <Link key={test.id} href={`/results/${test.id}`}>
                <Card className="hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer group">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      {/* Score circle */}
                      <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center shrink-0 font-bold text-sm
                        ${(test.percentage ?? 0) >= 80 ? "bg-green-100 text-green-700"
                        : (test.percentage ?? 0) >= 60 ? "bg-blue-100  text-blue-700"
                        : (test.percentage ?? 0) >= 40 ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"}`}>
                        <span className="text-lg font-bold leading-none">
                          {Math.round(test.percentage ?? 0)}
                        </span>
                        <span className="text-xs opacity-70">%</span>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                          {test.title}
                        </p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(test.submittedAt)}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {test.score}/{test.totalMarks} marks
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <BookOpen className="h-3 w-3" />
                            {test.totalQuestions} questions
                          </span>
                          {timeTaken > 0 && (
                            <span className="text-xs text-gray-400">
                              ⏱ {formatDuration(timeTaken)}
                            </span>
                          )}
                        </div>
                        <Progress
                          value={test.percentage ?? 0}
                          className="h-1.5 mt-2"
                        />
                      </div>

                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
