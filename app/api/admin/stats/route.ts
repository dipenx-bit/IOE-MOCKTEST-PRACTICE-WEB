// app/api/admin/stats/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const [
      totalStudents,
      totalQuestions,
      totalTests,
      subjectDist,
      difficultyDist,
      recentStudents,
    ] = await Promise.all([
      prisma.user.count({ where: { role: "STUDENT" } }),
      prisma.question.count(),
      prisma.test.count({ where: { completed: true } }),

      // Questions per subject
      prisma.question.groupBy({
        by:       ["subjectId"],
        _count:   { id: true },
        orderBy:  { _count: { id: "desc" } },
      }),

      // Questions per difficulty
      prisma.question.groupBy({
        by:     ["difficulty"],
        _count: { id: true },
      }),

      // Recently joined students
      prisma.user.findMany({
        where:   { role: "STUDENT" },
        orderBy: { createdAt: "desc" },
        take:    5,
        select: {
          id:        true,
          fullName:  true,
          email:     true,
          createdAt: true,
          studyStats: {
            select: { testsAttempted: true, averageScore: true },
          },
        },
      }),
    ]);

    // Enrich subject distribution with names
    const subjects = await prisma.subject.findMany({
      select: { id: true, name: true },
    });
    const subjectNameMap = new Map(subjects.map((s) => [s.id, s.name]));

    const subjectDistribution = subjectDist.map((s) => ({
      subjectId:   s.subjectId,
      subjectName: subjectNameMap.get(s.subjectId) ?? "Unknown",
      count:       s._count.id,
    }));

    const difficultyDistribution = difficultyDist.map((d) => ({
      difficulty: d.difficulty,
      count:      d._count.id,
    }));

    return NextResponse.json({
      success: true,
      data: {
        totalStudents,
        totalQuestions,
        totalTests,
        subjectDistribution,
        difficultyDistribution,
        recentStudents,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (error.message === "FORBIDDEN")    return NextResponse.json({ success: false, error: "Forbidden"    }, { status: 403 });
    console.error("[ADMIN STATS]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
