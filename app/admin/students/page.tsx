// app/admin/students/page.tsx
"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users, Search, ChevronLeft, ChevronRight,
  Trophy, Target, Flame, BookOpen,
  AlertTriangle, GraduationCap, Clock,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { formatDate, timeAgo, roundTo } from "@/lib/utils";

interface StudyStats {
  testsAttempted:  number;
  questionsSolved: number;
  averageScore:    number;
  bestScore:       number;
  currentStreak:   number;
  lastStudiedAt:   string | null;
}

interface Student {
  id:         string;
  fullName:   string;
  email:      string;
  createdAt:  string;
  studyStats: StudyStats | null;
}

interface Pagination {
  page: number; pageSize: number; total: number; totalPages: number;
}

function StudentDetailDialog({
  student,
  open,
  onClose,
}: {
  student: Student | null;
  open:    boolean;
  onClose: () => void;
}) {
  if (!student) return null;
  const s = student.studyStats;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
              <span className="text-blue-700 font-bold text-sm">
                {student.fullName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-base font-semibold">{student.fullName}</p>
              <p className="text-xs text-gray-400 font-normal">{student.email}</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Joined */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Joined</span>
            <span className="font-medium">{formatDate(student.createdAt)}</span>
          </div>

          {s ? (
            <>
              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Tests Attempted",  value: s.testsAttempted,              icon: Trophy,   color: "text-blue-600   bg-blue-50"   },
                  { label: "Questions Solved",  value: s.questionsSolved,             icon: BookOpen, color: "text-purple-600 bg-purple-50" },
                  { label: "Average Score",     value: `${roundTo(s.averageScore)}%`, icon: Target,   color: "text-green-600  bg-green-50"  },
                  { label: "Best Score",        value: `${roundTo(s.bestScore)}%`,    icon: Trophy,   color: "text-amber-600  bg-amber-50"  },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className={`p-3 rounded-lg flex items-center gap-3 ${color.split(" ")[1]}`}>
                    <Icon className={`h-5 w-5 ${color.split(" ")[0]}`} />
                    <div>
                      <p className={`text-lg font-bold ${color.split(" ")[0]}`}>{value}</p>
                      <p className="text-xs text-gray-500">{label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Streak & last active */}
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <span className="text-sm font-medium text-gray-700">Study Streak</span>
                </div>
                <span className="text-lg font-bold text-orange-600">
                  {s.currentStreak} day{s.currentStreak !== 1 ? "s" : ""}
                </span>
              </div>

              {s.lastStudiedAt && (
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Last active</span>
                  <span>{timeAgo(s.lastStudiedAt)}</span>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-6 text-gray-400">
              <GraduationCap className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No activity yet.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminStudentsPage() {
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(1);
  const [selected, setSelected] = useState<Student | null>(null);
  const PAGE_SIZE = 20;

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  params.set("page",     String(page));
  params.set("pageSize", String(PAGE_SIZE));

  const { data, isLoading } = useQuery<{
    success:    boolean;
    data:       Student[];
    pagination: Pagination;
  }>({
    queryKey: ["admin-students", search, page],
    queryFn:  async () => {
      const res = await fetch(`/api/admin/students?${params}`);
      return res.json();
    },
  });

  const students   = data?.data ?? [];
  const pagination = data?.pagination;

  function getActivityBadge(s: StudyStats | null) {
    if (!s || s.testsAttempted === 0)  return { label: "Inactive",  color: "bg-gray-100  text-gray-500"  };
    if (s.testsAttempted >= 10)        return { label: "Active",    color: "bg-green-100 text-green-700" };
    if (s.testsAttempted >= 3)         return { label: "Started",   color: "bg-blue-100  text-blue-700"  };
    return                                    { label: "New",       color: "bg-amber-100 text-amber-700" };
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="h-6 w-6 text-blue-600" />
          Students
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {pagination ? `${pagination.total} registered student${pagination.total !== 1 ? "s" : ""}` : "All registered students"}
        </p>
      </div>

      {/* Summary cards */}
      {!isLoading && students.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            {
              label: "Total Students",
              value:  pagination?.total ?? 0,
              color: "bg-blue-50 text-blue-600",
            },
            {
              label: "Active Students",
              value:  students.filter((s) => (s.studyStats?.testsAttempted ?? 0) >= 1).length,
              color: "bg-green-50 text-green-600",
            },
            {
              label: "Avg Tests / Student",
              value: students.length > 0
                ? roundTo(
                    students.reduce((sum, s) => sum + (s.studyStats?.testsAttempted ?? 0), 0) /
                    students.length
                  )
                : 0,
              color: "bg-purple-50 text-purple-600",
            },
            {
              label: "Avg Score",
              value: students.filter((s) => s.studyStats?.averageScore).length > 0
                ? `${roundTo(
                    students
                      .filter((s) => s.studyStats?.averageScore)
                      .reduce((sum, s) => sum + (s.studyStats?.averageScore ?? 0), 0) /
                    students.filter((s) => s.studyStats?.averageScore).length
                  )}%`
                : "—",
              color: "bg-amber-50 text-amber-600",
            },
          ].map(({ label, value, color }) => (
            <Card key={label}>
              <CardContent className={`p-4 rounded-xl ${color.split(" ")[0]}`}>
                <p className={`text-2xl font-bold ${color.split(" ")[1]}`}>{value}</p>
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
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : students.length === 0 ? (
            <div className="py-16 text-center">
              <Users className="h-10 w-10 mx-auto text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">
                {search ? "No students match your search." : "No students registered yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-center">Tests</TableHead>
                    <TableHead className="text-center">Avg Score</TableHead>
                    <TableHead className="text-center">Streak</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const activity = getActivityBadge(student.studyStats);
                    const s        = student.studyStats;
                    return (
                      <TableRow
                        key={student.id}
                        className="cursor-pointer hover:bg-blue-50/40"
                        onClick={() => setSelected(student)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0">
                              <span className="text-white text-xs font-bold">
                                {student.fullName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{student.fullName}</p>
                              <p className="text-xs text-gray-400">{student.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">
                          {formatDate(student.createdAt)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-sm font-semibold text-gray-700">
                            {s?.testsAttempted ?? 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-sm font-bold ${
                            (s?.averageScore ?? 0) >= 80 ? "text-green-600" :
                            (s?.averageScore ?? 0) >= 60 ? "text-blue-600"  :
                            (s?.averageScore ?? 0) >= 40 ? "text-amber-600" :
                            s?.averageScore            ? "text-red-500"   : "text-gray-400"
                          }`}>
                            {s?.averageScore ? `${roundTo(s.averageScore)}%` : "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          {(s?.currentStreak ?? 0) > 0 ? (
                            <span className="flex items-center justify-center gap-1 text-orange-500 text-xs font-semibold">
                              <Flame className="h-3.5 w-3.5" />
                              {s!.currentStreak}d
                            </span>
                          ) : (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${activity.color}`}>
                            {activity.label}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-xs text-gray-400">
                          {s?.lastStudiedAt ? timeAgo(s.lastStudiedAt) : "Never"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <p>
            Showing {(pagination.page - 1) * PAGE_SIZE + 1}–
            {Math.min(pagination.page * PAGE_SIZE, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium text-gray-700">
              {page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Student detail dialog */}
      <StudentDetailDialog
        student={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}
