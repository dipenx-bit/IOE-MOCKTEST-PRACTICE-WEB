// app/api/tests/[id]/review/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/tests/[id]/review — full solution review with correct answers
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    const test = await prisma.test.findUnique({
      where: { id: params.id },
      include: {
        testQuestions: {
          orderBy: { orderIndex: "asc" },
          include: {
            question: {
              include: {
                subject: { select: { id: true, name: true } },
                chapter: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!test) {
      return NextResponse.json({ success: false, error: "Test not found" }, { status: 404 });
    }

    // Access control
    if (session.user.role === "STUDENT" && test.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    if (!test.completed) {
      return NextResponse.json(
        { success: false, error: "Test has not been submitted yet" },
        { status: 400 }
      );
    }

    // ── Build subject-wise & chapter-wise performance ─────────────────────────
    const subjectStats: Record<string, { name: string; correct: number; total: number; marks: number; earnedMarks: number }> = {};
    const chapterStats: Record<string, { name: string; subjectName: string; correct: number; total: number }> = {};
    const difficultyStats: Record<string, { correct: number; total: number }> = {
      EASY:   { correct: 0, total: 0 },
      MEDIUM: { correct: 0, total: 0 },
      HARD:   { correct: 0, total: 0 },
    };

    for (const tq of test.testQuestions) {
      const q           = tq.question;
      const subjectId   = q.subject.id;
      const chapterId   = q.chapter.id;
      const difficulty  = q.difficulty;
      const isCorrect   = tq.isCorrect ?? false;

      // Subject stats
      if (!subjectStats[subjectId]) {
        subjectStats[subjectId] = { name: q.subject.name, correct: 0, total: 0, marks: 0, earnedMarks: 0 };
      }
      subjectStats[subjectId].total++;
      subjectStats[subjectId].marks += q.marks;
      if (isCorrect) {
        subjectStats[subjectId].correct++;
        subjectStats[subjectId].earnedMarks += q.marks;
      }

      // Chapter stats
      if (!chapterStats[chapterId]) {
        chapterStats[chapterId] = { name: q.chapter.name, subjectName: q.subject.name, correct: 0, total: 0 };
      }
      chapterStats[chapterId].total++;
      if (isCorrect) chapterStats[chapterId].correct++;

      // Difficulty stats
      if (difficultyStats[difficulty]) {
        difficultyStats[difficulty].total++;
        if (isCorrect) difficultyStats[difficulty].correct++;
      }
    }

    const subjectPerformance = Object.entries(subjectStats).map(([id, s]) => ({
      subjectId:   id,
      subjectName: s.name,
      total:       s.total,
      correct:     s.correct,
      wrong:       s.total - s.correct,
      accuracy:    s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
      marks:       s.marks,
      earnedMarks: s.earnedMarks,
    }));

    const chapterPerformance = Object.entries(chapterStats).map(([id, c]) => ({
      chapterId:   id,
      chapterName: c.name,
      subjectName: c.subjectName,
      total:       c.total,
      correct:     c.correct,
      wrong:       c.total - c.correct,
      accuracy:    c.total > 0 ? Math.round((c.correct / c.total) * 100) : 0,
    }));

    const difficultyPerformance = Object.entries(difficultyStats).map(([level, d]) => ({
      difficulty: level,
      total:      d.total,
      correct:    d.correct,
      wrong:      d.total - d.correct,
      accuracy:   d.total > 0 ? Math.round((d.correct / d.total) * 100) : 0,
    }));

    // ── Time taken ────────────────────────────────────────────────────────────
    const timeTakenSeconds = test.submittedAt && test.startedAt
      ? Math.floor((test.submittedAt.getTime() - test.startedAt.getTime()) / 1000)
      : 0;

    return NextResponse.json({
      success: true,
      data: {
        test: {
          id:             test.id,
          title:          test.title,
          score:          test.score,
          totalMarks:     test.totalMarks,
          percentage:     test.percentage,
          totalQuestions: test.totalQuestions,
          durationMinutes: test.durationMinutes,
          startedAt:      test.startedAt,
          submittedAt:    test.submittedAt,
          timeTakenSeconds,
        },
        questions: test.testQuestions.map((tq) => ({
          id:             tq.id,
          orderIndex:     tq.orderIndex,
          selectedAnswer: tq.selectedAnswer,
          isCorrect:      tq.isCorrect,
          question: {
            id:            tq.question.id,
            questionText:  tq.question.questionText,
            optionA:       tq.question.optionA,
            optionB:       tq.question.optionB,
            optionC:       tq.question.optionC,
            optionD:       tq.question.optionD,
            correctOption: tq.question.correctOption,
            explanation:   tq.question.explanation,
            difficulty:    tq.question.difficulty,
            marks:         tq.question.marks,
            subject:       tq.question.subject,
            chapter:       tq.question.chapter,
          },
        })),
        subjectPerformance,
        chapterPerformance,
        difficultyPerformance,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[REVIEW GET]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
