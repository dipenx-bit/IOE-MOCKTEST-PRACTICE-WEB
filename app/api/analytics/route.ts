// app/api/analytics/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();
    const userId  = session.user.id;

    // ── Score trend (last 10 completed tests) ─────────────────────────────────
    const scoreTrend = await prisma.test.findMany({
      where:   { userId, completed: true },
      orderBy: { submittedAt: "asc" },
      take:    10,
      select: {
        id:          true,
        title:       true,
        percentage:  true,
        score:       true,
        totalMarks:  true,
        submittedAt: true,
      },
    });

    // ── Subject-wise performance ──────────────────────────────────────────────
    const subjectPerf = await prisma.$queryRaw<
      { subjectName: string; correct: number; total: number; accuracy: number }[]
    >`
      SELECT
        s.name AS "subjectName",
        COUNT(CASE WHEN tq."isCorrect" = true THEN 1 END)::int AS correct,
        COUNT(tq.id)::int                                       AS total,
        ROUND(
          COUNT(CASE WHEN tq."isCorrect" = true THEN 1 END)::numeric
          / NULLIF(COUNT(tq.id), 0) * 100
        )::int AS accuracy
      FROM test_questions tq
      JOIN tests     t ON t.id  = tq."testId"
      JOIN questions q ON q.id  = tq."questionId"
      JOIN subjects  s ON s.id  = q."subjectId"
      WHERE t."userId"   = ${userId}
        AND t.completed  = true
        AND tq."isCorrect" IS NOT NULL
      GROUP BY s.id, s.name
      ORDER BY accuracy DESC
    `;

    // ── Chapter-wise performance ──────────────────────────────────────────────
    const chapterPerf = await prisma.$queryRaw<
      { chapterName: string; subjectName: string; correct: number; total: number; accuracy: number }[]
    >`
      SELECT
        c.name AS "chapterName",
        s.name AS "subjectName",
        COUNT(CASE WHEN tq."isCorrect" = true THEN 1 END)::int AS correct,
        COUNT(tq.id)::int                                       AS total,
        ROUND(
          COUNT(CASE WHEN tq."isCorrect" = true THEN 1 END)::numeric
          / NULLIF(COUNT(tq.id), 0) * 100
        )::int AS accuracy
      FROM test_questions tq
      JOIN tests     t ON t.id = tq."testId"
      JOIN questions q ON q.id = tq."questionId"
      JOIN chapters  c ON c.id = q."chapterId"
      JOIN subjects  s ON s.id = q."subjectId"
      WHERE t."userId"   = ${userId}
        AND t.completed  = true
        AND tq."isCorrect" IS NOT NULL
      GROUP BY c.id, c.name, s.name
      HAVING COUNT(tq.id) >= 2
      ORDER BY accuracy ASC
    `;

    // ── Test history (all completed) ──────────────────────────────────────────
    const testHistory = await prisma.test.findMany({
      where:   { userId, completed: true },
      orderBy: { submittedAt: "desc" },
      take:    20,
      select: {
        id:             true,
        title:          true,
        score:          true,
        totalMarks:     true,
        percentage:     true,
        totalQuestions: true,
        durationMinutes: true,
        submittedAt:    true,
        startedAt:      true,
      },
    });

    // ── Weak topics (accuracy < 60%) ──────────────────────────────────────────
    const weakTopics = chapterPerf.filter((c) => c.accuracy < 60);

    // ── Strong topics (accuracy >= 80%) ──────────────────────────────────────
    const strongTopics = chapterPerf
      .filter((c) => c.accuracy >= 80)
      .sort((a, b) => b.accuracy - a.accuracy)
      .slice(0, 5);

    return NextResponse.json({
      success: true,
      data: {
        scoreTrend: scoreTrend.map((t, i) => ({
          test:       `Test ${i + 1}`,
          title:      t.title,
          percentage: t.percentage ?? 0,
          date:       t.submittedAt,
        })),
        subjectPerformance: subjectPerf,
        chapterPerformance: chapterPerf,
        testHistory,
        weakTopics,
        strongTopics,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[ANALYTICS]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
