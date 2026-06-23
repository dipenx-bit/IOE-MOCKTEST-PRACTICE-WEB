// app/api/tests/[id]/submit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const testId = params.id;

    // ── Load test with all questions ──────────────────────────────────────────
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        testQuestions: {
          include: {
            question: {
              select: { correctOption: true, marks: true },
            },
          },
        },
      },
    });

    if (!test) return NextResponse.json({ success: false, error: "Test not found" }, { status: 404 });
    if (test.userId !== session.user.id) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    if (test.completed) return NextResponse.json({ success: false, error: "Test already submitted" }, { status: 409 });

    // ── Grade each question ───────────────────────────────────────────────────
    let score        = 0;
    let correctCount = 0;
    let wrongCount   = 0;
    let skippedCount = 0;

    const gradedQuestions = test.testQuestions.map((tq) => {
      const isAnswered = !!tq.selectedAnswer;
      const isCorrect  = isAnswered
        ? tq.selectedAnswer === tq.question.correctOption
        : null;

      if (!isAnswered)      skippedCount++;
      else if (isCorrect)  { correctCount++; score += tq.question.marks; }
      else                   wrongCount++;

      return {
        where: { id: tq.id },
        data:  { isCorrect },
      };
    });

    const percentage = test.totalMarks > 0
      ? Math.round((score / test.totalMarks) * 100 * 10) / 10
      : 0;

    const submittedAt = new Date();

    // ── Atomic update: grade questions + mark test complete + update stats ────
    await prisma.$transaction(async (tx) => {
      // 1. Update all question grades
      for (const update of gradedQuestions) {
        await tx.testQuestion.update(update);
      }

      // 2. Mark test as complete
      await tx.test.update({
        where: { id: testId },
        data: {
          score,
          percentage,
          completed:   true,
          submittedAt,
        },
      });

      // 3. Upsert study stats
      const existing = await tx.studyStats.findUnique({
        where: { userId: session.user.id },
      });

      if (existing) {
        const newTestsAttempted  = existing.testsAttempted + 1;
        const newQuestionsSolved = existing.questionsSolved + correctCount + wrongCount;
        const newAverageScore    = (
          (existing.averageScore * existing.testsAttempted + percentage) /
          newTestsAttempted
        );
        const newBestScore = Math.max(existing.bestScore, percentage);

        // Streak: check if last study was yesterday or today
        const today     = new Date();
        today.setHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        const lastStudied = existing.lastStudiedAt
          ? new Date(existing.lastStudiedAt)
          : null;
        if (lastStudied) lastStudied.setHours(0, 0, 0, 0);

        let newStreak = existing.currentStreak;
        if (!lastStudied || lastStudied < yesterday) {
          newStreak = 1; // reset streak
        } else if (lastStudied.getTime() === yesterday.getTime()) {
          newStreak = existing.currentStreak + 1; // extend streak
        }
        // If lastStudied === today, keep streak same

        await tx.studyStats.update({
          where: { userId: session.user.id },
          data: {
            testsAttempted:  newTestsAttempted,
            questionsSolved: newQuestionsSolved,
            averageScore:    Math.round(newAverageScore * 10) / 10,
            bestScore:       Math.round(newBestScore * 10) / 10,
            currentStreak:   newStreak,
            lastStudiedAt:   submittedAt,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        testId,
        score,
        totalMarks:   test.totalMarks,
        percentage,
        correct:      correctCount,
        wrong:        wrongCount,
        skipped:      skippedCount,
        totalQuestions: test.totalQuestions,
        submittedAt,
      },
      message: "Test submitted successfully",
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[SUBMIT TEST]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
