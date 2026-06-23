// app/dashboard/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  Trophy, BookOpen, Target, Zap, TrendingUp,
  AlertTriangle, ArrowRight, FlaskConical, Clock,
  Flame, CheckCircle2, XCircle, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatMinutes, getScoreColor, roundTo } from "@/lib/utils";

interface DashboardData {
  stats: {
    testsAttempted:  number;
    questionsSolved: number;
    averageScore:    number;
    bestScore:       number;
    currentStreak:   number;
  };
  recentTests: {
    id:              string;
    title:           string;
    score:           number;
    totalMarks:      number;
    percentage:      number;
    totalQuestions:  number;
    submittedAt:     string;
    durationMinutes: number;
  }[];
  weakChapters: {
    chapterName: string;
    subjectName: string;
    correct:     number;
    total:       number;
    accuracy:    number;
  }[];
}

function StatCard({
  label, value, icon: Icon, color, sub,
}: {
  label: string;
  value: string | number;
  icon:  React.ElementType;
  color: string;
  sub?:  string;
}) {
  return (
    <Card className="stats-card">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">{label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}><CardContent className="p-6"><Skeleton className="h-20 w-full" /></CardContent></Card>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
        <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = useSession();

  const { data, isLoading, error } = useQuery<{ success: boolean; data: DashboardData }>({
    queryKey: ["student-stats"],
    queryFn:  async () => {
      const res = await fetch("/api/student/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
  });

  const stats       = data?.data?.stats;
  const recentTests = data?.data?.recentTests ?? [];
  const weakChapters = data?.data?.weakChapters ?? [];

  // Smart recommendations based on weak chapters
  const recommendations = weakChapters.slice(0, 3).map((c) => ({
    chapter:  c.chapterName,
    subject:  c.subjectName,
    accuracy: c.accuracy,
    suggested: Math.max(10, Math.min(20, Math.ceil((100 - c.accuracy) / 5) * 5)),
  }));

  if (isLoading) return <DashboardSkeleton />;
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        <AlertTriangle className="h-5 w-5 mr-2" /> Failed to load dashboard.
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session?.user?.fullName?.split(" ")[0]} 👋
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Ready to practice? Keep up the momentum!
          </p>
        </div>
        <div className="flex gap-3">
          <Button asChild variant="outline">
            <Link href="/practice">
              <BookOpen className="h-4 w-4" />
              Practice Set
            </Link>
          </Button>
          <Button asChild>
            <Link href="/mock-test">
              <FlaskConical className="h-4 w-4" />
              Mock Test
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Tests Attempted"
          value={stats?.testsAttempted ?? 0}
          icon={Trophy}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          label="Average Score"
          value={`${roundTo(stats?.averageScore ?? 0)}%`}
          icon={Target}
          color="bg-purple-100 text-purple-600"
          sub="across all tests"
        />
        <StatCard
          label="Best Score"
          value={`${roundTo(stats?.bestScore ?? 0)}%`}
          icon={TrendingUp}
          color="bg-green-100 text-green-600"
          sub="personal best"
        />
        <StatCard
          label="Study Streak"
          value={`${stats?.currentStreak ?? 0} days`}
          icon={Flame}
          color="bg-orange-100 text-orange-600"
          sub={stats?.currentStreak ? "Keep it up!" : "Start today!"}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Tests */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base font-semibold">Recent Tests</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/results">
                  View all <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentTests.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Trophy className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No tests taken yet.</p>
                  <Button asChild className="mt-4" size="sm">
                    <Link href="/practice">Take your first test</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTests.map((test) => (
                    <Link
                      key={test.id}
                      href={`/results/${test.id}`}
                      className="flex items-center gap-4 p-3 rounded-lg border border-gray-100 hover:border-blue-200 hover:bg-blue-50/50 transition-colors group"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${
                        (test.percentage ?? 0) >= 80 ? "bg-green-100 text-green-700"
                        : (test.percentage ?? 0) >= 60 ? "bg-blue-100 text-blue-700"
                        : (test.percentage ?? 0) >= 40 ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                      }`}>
                        {Math.round(test.percentage ?? 0)}%
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{test.title}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(test.submittedAt)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {test.score}/{test.totalMarks} marks
                          </span>
                        </div>
                        <Progress
                          value={test.percentage ?? 0}
                          className="h-1.5 mt-2"
                        />
                      </div>
                      <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Weak Chapters & Recommendations */}
        <div className="space-y-4">
          {/* Weak Chapters */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Weak Areas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weakChapters.length === 0 ? (
                <div className="text-center py-4 text-gray-400">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-400" />
                  <p className="text-xs">No weak areas detected yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {weakChapters.slice(0, 4).map((chapter, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-gray-700 truncate">{chapter.chapterName}</p>
                          <p className="text-xs text-gray-400">{chapter.subjectName}</p>
                        </div>
                        <span className={`text-xs font-bold ml-2 ${getScoreColor(chapter.accuracy)}`}>
                          {chapter.accuracy}%
                        </span>
                      </div>
                      <Progress
                        value={chapter.accuracy}
                        className="h-1.5"
                      />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Smart Recommendations */}
          {recommendations.length > 0 && (
            <Card className="border-blue-100 bg-blue-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-500" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {recommendations.map((rec, i) => (
                    <div key={i} className="text-xs text-gray-700 bg-white rounded-lg p-3 border border-blue-100">
                      <p>
                        Your weakest chapter is{" "}
                        <span className="font-semibold text-blue-700">{rec.chapter}</span>{" "}
                        with <span className="font-semibold text-red-600">{rec.accuracy}%</span> accuracy.
                      </p>
                      <p className="text-gray-500 mt-1">
                        Recommended: {rec.suggested} {rec.subject} questions
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
