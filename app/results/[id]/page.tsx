// app/results/[id]/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Trophy, CheckCircle2, XCircle, MinusCircle,
  Clock, Target, ArrowLeft, BookOpen, Eye,
  AlertTriangle, TrendingUp, TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell,
  TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDuration, formatDateTime, getScoreColor, roundTo } from "@/lib/utils";

interface ReviewData {
  test: {
    id:              string;
    title:           string;
    score:           number | null;
    totalMarks:      number;
    percentage:      number | null;
    totalQuestions:  number;
    durationMinutes: number;
    startedAt:       string;
    submittedAt:     string | null;
    timeTakenSeconds: number;
  };
  questions: {
    id:             string;
    orderIndex:     number;
    selectedAnswer: string | null;
    isCorrect:      boolean | null;
    question: { difficulty: string; marks: number };
  }[];
  subjectPerformance: {
    subjectId:   string;
    subjectName: string;
    total:       number;
    correct:     number;
    wrong:       number;
    accuracy:    number;
    marks:       number;
    earnedMarks: number;
  }[];
  chapterPerformance: {
    chapterId:   string;
    chapterName: string;
    subjectName: string;
    total:       number;
    correct:     number;
    wrong:       number;
    accuracy:    number;
  }[];
  difficultyPerformance: {
    difficulty: string;
    total:      number;
    correct:    number;
    wrong:      number;
    accuracy:   number;
  }[];
}

function StatBox({ label, value, icon: Icon, colorClass }: {
  label:      string;
  value:      string | number;
  icon:       React.ElementType;
  colorClass: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-gray-100 shadow-sm text-center">
      <Icon className={`h-6 w-6 mb-2 ${colorClass}`} />
      <p className={`text-2xl font-bold ${colorClass}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

export default function ResultPage() {
  const params = useParams();
  const testId = params.id as string;

  const { data, isLoading, error } = useQuery<{ success: boolean; data: ReviewData }>({
    queryKey: ["review", testId],
    queryFn:  async () => {
      const res = await fetch(`/api/tests/${testId}/review`);
      if (!res.ok) throw new Error("Failed to load results");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !data?.data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <AlertTriangle className="h-12 w-12 text-red-400" />
        <p className="text-gray-600">Failed to load results.</p>
        <Button asChild variant="outline"><Link href="/results">Back to Tests</Link></Button>
      </div>
    );
  }

  const { test, questions, subjectPerformance, chapterPerformance, difficultyPerformance } = data.data;

  const correct  = questions.filter((q) => q.isCorrect === true).length;
  const wrong    = questions.filter((q) => q.isCorrect === false).length;
  const skipped  = questions.filter((q) => q.isCorrect === null).length;
  const accuracy = questions.filter((q) => q.isCorrect !== null).length > 0
    ? Math.round((correct / questions.filter((q) => q.isCorrect !== null).length) * 100)
    : 0;

  const pct        = roundTo(test.percentage ?? 0);
  const scoreColor = getScoreColor(pct);

  const scoreLabel =
    pct >= 80 ? "Excellent! 🎉" :
    pct >= 60 ? "Good Job! 👍"  :
    pct >= 40 ? "Keep Practising 💪" :
    "Needs Improvement 📚";

  return (
    <div className="space-y-6 page-enter">
      {/* Back */}
      <Button asChild variant="ghost" size="sm" className="gap-1.5 -ml-2">
        <Link href="/results">
          <ArrowLeft className="h-4 w-4" />
          All Tests
        </Link>
      </Button>

      {/* Score hero */}
      <Card className="overflow-hidden border-0 shadow-md">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white text-center">
          <p className="text-blue-200 text-sm mb-1">{test.title}</p>
          <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-white/10 border-4 border-white/30 mb-3">
            <div>
              <p className={`text-4xl font-black ${pct >= 60 ? "text-white" : "text-red-300"}`}>
                {pct}%
              </p>
            </div>
          </div>
          <p className="text-xl font-bold text-white">{scoreLabel}</p>
          <p className="text-blue-200 text-sm mt-1">
            {test.score}/{test.totalMarks} marks · {formatDateTime(test.submittedAt ?? "")}
          </p>
        </div>

        {/* Quick stats */}
        <CardContent className="p-4 bg-gray-50">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Correct"   value={correct}  icon={CheckCircle2} colorClass="text-green-600" />
            <StatBox label="Wrong"     value={wrong}    icon={XCircle}      colorClass="text-red-600"   />
            <StatBox label="Skipped"   value={skipped}  icon={MinusCircle}  colorClass="text-gray-400"  />
            <StatBox label="Accuracy"  value={`${accuracy}%`} icon={Target} colorClass="text-blue-600"  />
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="p-3 bg-white rounded-lg border text-center">
              <Clock className="h-4 w-4 text-gray-400 mx-auto mb-1" />
              <p className="text-sm font-semibold text-gray-900">
                {test.timeTakenSeconds > 0 ? formatDuration(test.timeTakenSeconds) : "—"}
              </p>
              <p className="text-xs text-gray-500">Time Taken</p>
            </div>
            <div className="p-3 bg-white rounded-lg border text-center">
              <BookOpen className="h-4 w-4 text-gray-400 mx-auto mb-1" />
              <p className="text-sm font-semibold text-gray-900">{test.totalQuestions}</p>
              <p className="text-xs text-gray-500">Total Questions</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action buttons */}
      <div className="flex gap-3 flex-wrap">
        <Button asChild className="gap-2">
          <Link href={`/results/${testId}/review`}>
            <Eye className="h-4 w-4" />
            View Solutions
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/practice">
            <BookOpen className="h-4 w-4" />
            New Practice Set
          </Link>
        </Button>
        <Button asChild variant="outline" className="gap-2">
          <Link href="/mock-test">
            <Trophy className="h-4 w-4" />
            New Mock Test
          </Link>
        </Button>
      </div>

      {/* Performance breakdown tabs */}
      <Tabs defaultValue="subject">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="subject">By Subject</TabsTrigger>
          <TabsTrigger value="chapter">By Chapter</TabsTrigger>
          <TabsTrigger value="difficulty">By Difficulty</TabsTrigger>
        </TabsList>

        {/* Subject performance */}
        <TabsContent value="subject" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Subject-wise Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subjectPerformance.map((s) => (
                  <div key={s.subjectId}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{s.subjectName}</p>
                        <p className="text-xs text-gray-400">
                          {s.correct}/{s.total} correct · {s.earnedMarks}/{s.marks} marks
                        </p>
                      </div>
                      <span className={`text-sm font-bold ${getScoreColor(s.accuracy)}`}>
                        {s.accuracy}%
                      </span>
                    </div>
                    <Progress value={s.accuracy} className="h-2" />
                  </div>
                ))}
                {subjectPerformance.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No data available.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chapter performance */}
        <TabsContent value="chapter" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Chapter-wise Performance</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Chapter</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-center">Qs</TableHead>
                    <TableHead className="text-center">✓</TableHead>
                    <TableHead className="text-center">✗</TableHead>
                    <TableHead className="text-right">Accuracy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {chapterPerformance.map((c) => (
                    <TableRow key={c.chapterId}>
                      <TableCell className="font-medium text-sm">{c.chapterName}</TableCell>
                      <TableCell className="text-xs text-gray-500">{c.subjectName}</TableCell>
                      <TableCell className="text-center text-sm">{c.total}</TableCell>
                      <TableCell className="text-center text-sm text-green-600 font-medium">{c.correct}</TableCell>
                      <TableCell className="text-center text-sm text-red-500 font-medium">{c.wrong}</TableCell>
                      <TableCell className="text-right">
                        <span className={`text-sm font-bold ${getScoreColor(c.accuracy)}`}>
                          {c.accuracy}%
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                  {chapterPerformance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-gray-400 py-6">No data.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Difficulty performance */}
        <TabsContent value="difficulty" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Difficulty-wise Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {difficultyPerformance.filter((d) => d.total > 0).map((d) => (
                  <div key={d.difficulty}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <Badge className={
                          d.difficulty === "EASY"   ? "badge-easy"   :
                          d.difficulty === "MEDIUM" ? "badge-medium" : "badge-hard"
                        }>
                          {d.difficulty}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {d.correct}/{d.total} correct
                        </span>
                      </div>
                      <span className={`text-sm font-bold ${getScoreColor(d.accuracy)}`}>
                        {d.accuracy}%
                      </span>
                    </div>
                    <Progress value={d.accuracy} className="h-2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
