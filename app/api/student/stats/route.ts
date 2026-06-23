// app/api/student/stats/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();

    const [stats, recentTests, weakChapters] = await Promise.all([
      // Study stats
      prisma.studyStats.findUnique({ where: { userId: session.user.id } }),

      // Recent 5 tests
      prisma.test.findMany({
        where:   { userId: session.user.id, completed: true },
        orderBy: { submittedAt: "desc" },
        take:    5,
        select: {
          id:             true,
          title:          true,
          score:          true,
          totalMarks:     true,
          percentage:     true,
          totalQuestions: true,
          submittedAt:    true,
          durationMinutes: true,
        },
      }),

      // Weak chapters: chapters where accuracy < 60%
      prisma.$queryRaw<{ chapterName: string; subjectName: string; correct: number; total: number; accuracy: number }[]>`
        SELECT
          c.name        AS "chapterName",
          s.name        AS "subjectName",
          COUNT(CASE WHEN tq."isCorrect" = true  THEN 1 END)::int AS correct,
          COUNT(tq.id)::int                                        AS total,
          ROUND(
            COUNT(CASE WHEN tq."isCorrect" = true THEN 1 END)::numeric
            / NULLIF(COUNT(tq.id), 0) * 100
          )::int AS accuracy
        FROM test_questions tq
        JOIN tests         t  ON t.id = tq."testId"
        JOIN questions     q  ON q.id = tq."questionId"
        JOIN chapters      c  ON c.id = q."chapterId"
        JOIN subjects      s  ON s.id = q."subjectId"
        WHERE t."userId"    = ${session.user.id}
          AND t.completed   = true
          AND tq."isCorrect" IS NOT NULL
        GROUP BY c.id, c.name, s.name
        HAVING COUNT(tq.id) >= 3
        ORDER BY accuracy ASC
        LIMIT 5
      `,
    ]);

    // Accuracy from stats
    const accuracy = stats && stats.questionsSolved > 0
      ? Math.round(
          ((stats.questionsSolved - (stats.testsAttempted > 0 ? 0 : 0)) /
            stats.questionsSolved) * 100
        )
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        stats: stats ?? {
          testsAttempted:  0,
          questionsSolved: 0,
          averageScore:    0,
          bestScore:       0,
          currentStreak:   0,
        },
        recentTests,
        weakChapters,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[STUDENT STATS]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
