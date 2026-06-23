// app/analytics/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Legend,
} from "recharts";
import {
  BarChart2, TrendingUp, TrendingDown, Target,
  AlertTriangle, CheckCircle2, BookOpen, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { getScoreColor, roundTo, formatDate } from "@/lib/utils";

interface AnalyticsData {
  scoreTrend: { test: string; title: string; percentage: number; date: string }[];
  subjectPerformance: { subjectName: string; correct: number; total: number; accuracy: number }[];
  chapterPerformance: { chapterName: string; subjectName: string; correct: number; total: number; accuracy: number }[];
  testHistory: { id: string; title: string; percentage: number; submittedAt: string }[];
  weakTopics:   { chapterName: string; subjectName: string; accuracy: number; total: number }[];
  strongTopics: { chapterName: string; subjectName: string; accuracy: number; total: number }[];
}

const CHART_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444"];

function SectionSkeleton() {
  return <Skeleton className="h-48 w-full rounded-xl" />;
}

export default function AnalyticsPage() {
  const { data, isLoading, error } = useQuery<{ success: boolean; data: AnalyticsData }>({
    queryKey: ["analytics"],
    queryFn:  async () => {
      const res = await fetch("/api/analytics");
      if (!res.ok) throw new Error("Failed to load analytics");
      return res.json();
    },
  });

  const d = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(4)].map((_, i) => <SectionSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  if (error || !d) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-500">
        <AlertTriangle className="h-10 w-10 text-red-400" />
        <p>Failed to load analytics.</p>
      </div>
    );
  }

  const noData = d.scoreTrend.length === 0;

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart2 className="h-6 w-6 text-blue-600" />
          Analytics
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Track your performance trends, strong areas, and areas needing improvement.
        </p>
      </div>

      {noData ? (
        <Card>
          <CardContent className="py-20 text-center space-y-3">
            <BarChart2 className="h-12 w-12 mx-auto text-gray-200" />
            <p className="text-gray-500 font-medium">No data yet.</p>
            <p className="text-gray-400 text-sm">Complete at least one test to see your analytics.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* ── Score Trend ──────────────────────────────────────────────── */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                Score Trend
              </CardTitle>
              <CardDescription>Your percentage scores over your last {d.scoreTrend.length} tests</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={d.scoreTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="test"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    formatter={(value: number) => [`${value}%`, "Score"]}
                    labelFormatter={(label, payload) =>
                      payload?.[0]?.payload?.title ?? label
                    }
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  {/* 60% pass line */}
                  <Line
                    type="monotone"
                    dataKey={() => 60}
                    stroke="#d1d5db"
                    strokeDasharray="4 4"
                    strokeWidth={1}
                    dot={false}
                    name="Pass (60%)"
                  />
                  <Line
                    type="monotone"
                    dataKey="percentage"
                    stroke="#3b82f6"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: "#3b82f6" }}
                    activeDot={{ r: 6 }}
                    name="Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* ── Subject Performance Bar Chart ──────────────────────── */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                  Subject Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {d.subjectPerformance.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No subject data yet.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={d.subjectPerformance}
                      margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="subjectName" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: "#9ca3af" }}
                        tickFormatter={(v) => `${v}%`}
                      />
                      <Tooltip
                        formatter={(value: number) => [`${value}%`, "Accuracy"]}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                      <Bar dataKey="accuracy" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Accuracy" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* ── Radar Chart (subject accuracy) ─────────────────────── */}
            {d.subjectPerformance.length >= 3 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-600" />
                    Performance Radar
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <RadarChart data={d.subjectPerformance}>
                      <PolarGrid stroke="#e5e7eb" />
                      <PolarAngleAxis
                        dataKey="subjectName"
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                      />
                      <PolarRadiusAxis
                        angle={30}
                        domain={[0, 100]}
                        tick={{ fontSize: 9, fill: "#9ca3af" }}
                      />
                      <Radar
                        name="Accuracy"
                        dataKey="accuracy"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.25}
                      />
                      <Tooltip
                        formatter={(v: number) => [`${v}%`, "Accuracy"]}
                        contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Chapter Performance ───────────────────────────────────────── */}
          {d.chapterPerformance.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Chapter Performance</CardTitle>
                <CardDescription>
                  Accuracy across all chapters you have attempted (min 2 questions)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-72 overflow-y-auto scrollbar-thin pr-1">
                  {[...d.chapterPerformance]
                    .sort((a, b) => b.accuracy - a.accuracy)
                    .map((c) => (
                      <div key={c.chapterName + c.subjectName}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-gray-800 truncate">
                              {c.chapterName}
                            </p>
                            <p className="text-xs text-gray-400">{c.subjectName} · {c.total} questions</p>
                          </div>
                          <span className={`text-xs font-bold ml-3 shrink-0 ${getScoreColor(c.accuracy)}`}>
                            {c.accuracy}%
                          </span>
                        </div>
                        <Progress value={c.accuracy} className="h-1.5" />
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* ── Weak Topics ──────────────────────────────────────────── */}
            <Card className="border-red-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-500" />
                  Weak Topics
                  <Badge variant="destructive" className="text-xs ml-auto">
                    Accuracy &lt; 60%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {d.weakTopics.length === 0 ? (
                  <div className="text-center py-6">
                    <CheckCircle2 className="h-8 w-8 text-green-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No weak topics! Great work.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {d.weakTopics.map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-100"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{t.chapterName}</p>
                          <p className="text-xs text-gray-500">{t.subjectName} · {t.total} attempted</p>
                        </div>
                        <span className="text-sm font-bold text-red-600 shrink-0">
                          {t.accuracy}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Strong Topics ─────────────────────────────────────────── */}
            <Card className="border-green-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-500" />
                  Strong Topics
                  <Badge variant="success" className="text-xs ml-auto">
                    Accuracy ≥ 80%
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {d.strongTopics.length === 0 ? (
                  <div className="text-center py-6">
                    <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No strong topics yet. Keep practising!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {d.strongTopics.map((t, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-100"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{t.chapterName}</p>
                          <p className="text-xs text-gray-500">{t.subjectName} · {t.total} attempted</p>
                        </div>
                        <span className="text-sm font-bold text-green-600 shrink-0">
                          {t.accuracy}%
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* ── Test History Table ────────────────────────────────────────── */}
          {d.testHistory.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Test History</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">#</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Test</th>
                        <th className="text-left p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                        <th className="text-right p-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {d.testHistory.map((t, i) => (
                        <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="p-3 text-gray-400 text-xs">{i + 1}</td>
                          <td className="p-3 font-medium text-gray-800 max-w-xs truncate">{t.title}</td>
                          <td className="p-3 text-gray-400 text-xs">{formatDate(t.submittedAt)}</td>
                          <td className="p-3 text-right">
                            <span className={`font-bold text-sm ${getScoreColor(t.percentage ?? 0)}`}>
                              {roundTo(t.percentage ?? 0)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
