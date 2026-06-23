// app/admin/dashboard/page.tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import {
  Users, HelpCircle, Trophy, TrendingUp,
  BookOpen, AlertTriangle, GraduationCap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, roundTo } from "@/lib/utils";

interface AdminStats {
  totalStudents:  number;
  totalQuestions: number;
  totalTests:     number;
  subjectDistribution:   { subjectId: string; subjectName: string; count: number }[];
  difficultyDistribution: { difficulty: string; count: number }[];
  recentStudents: {
    id:        string;
    fullName:  string;
    email:     string;
    createdAt: string;
    studyStats: { testsAttempted: number; averageScore: number } | null;
  }[];
}

const DIFF_COLORS: Record<string, string> = {
  EASY:   "#22c55e",
  MEDIUM: "#f59e0b",
  HARD:   "#ef4444",
};

const SUBJECT_COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b"];

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: number | string;
  icon: React.ElementType; color: string; sub?: string;
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

export default function AdminDashboardPage() {
  const { data, isLoading, error } = useQuery<{ success: boolean; data: AdminStats }>({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const stats = data?.data;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-red-500">
        <AlertTriangle className="h-6 w-6" />
        <p>Failed to load dashboard stats.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-slate-700" />
          Admin Dashboard
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Platform overview and management statistics.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Total Students"
          value={stats.totalStudents}
          icon={Users}
          color="bg-blue-100 text-blue-600"
          sub="registered accounts"
        />
        <StatCard
          label="Total Questions"
          value={stats.totalQuestions}
          icon={HelpCircle}
          color="bg-purple-100 text-purple-600"
          sub="in question bank"
        />
        <StatCard
          label="Tests Completed"
          value={stats.totalTests}
          icon={Trophy}
          color="bg-green-100 text-green-600"
          sub="all time"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Subject Distribution Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-blue-600" />
              Questions by Subject
            </CardTitle>
            <CardDescription>Distribution of questions across subjects</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.subjectDistribution.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No questions yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={stats.subjectDistribution}
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="subjectName"
                    tick={{ fontSize: 11, fill: "#9ca3af" }}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="count" name="Questions" radius={[4, 4, 0, 0]}>
                    {stats.subjectDistribution.map((_, i) => (
                      <Cell key={i} fill={SUBJECT_COLORS[i % SUBJECT_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Difficulty Distribution Pie Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-600" />
              Questions by Difficulty
            </CardTitle>
            <CardDescription>Balance of Easy, Medium, and Hard questions</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.difficultyDistribution.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No questions yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={stats.difficultyDistribution}
                    dataKey="count"
                    nameKey="difficulty"
                    cx="50%"
                    cy="50%"
                    outerRadius={75}
                    label={({ difficulty, percent }) =>
                      `${difficulty} ${(percent * 100).toFixed(0)}%`
                    }
                    labelLine={false}
                  >
                    {stats.difficultyDistribution.map((entry, i) => (
                      <Cell key={i} fill={DIFF_COLORS[entry.difficulty] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, name: string) => [v, name]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ fontSize: 12, color: "#374151" }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Students */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            Recently Joined Students
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stats.recentStudents.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No students yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase">Student</th>
                    <th className="text-left p-4 text-xs font-semibold text-gray-500 uppercase">Joined</th>
                    <th className="text-center p-4 text-xs font-semibold text-gray-500 uppercase">Tests</th>
                    <th className="text-right p-4 text-xs font-semibold text-gray-500 uppercase">Avg Score</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentStudents.map((student) => (
                    <tr key={student.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="p-4">
                        <div>
                          <p className="font-medium text-gray-900">{student.fullName}</p>
                          <p className="text-xs text-gray-400">{student.email}</p>
                        </div>
                      </td>
                      <td className="p-4 text-gray-500 text-xs">{formatDate(student.createdAt)}</td>
                      <td className="p-4 text-center">
                        <Badge variant="secondary" className="text-xs">
                          {student.studyStats?.testsAttempted ?? 0}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-semibold text-gray-700">
                          {student.studyStats?.averageScore
                            ? `${roundTo(student.studyStats.averageScore)}%`
                            : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
