// app/api/tests/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/tests/[id] — load test for exam interface
export async function GET(
  _req: Request,
  ctx: any
) {
  const { params } = ctx as any;
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

    // Students can only access their own tests
    if (session.user.role === "STUDENT" && test.userId !== session.user.id) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    // If not completed, hide correct answers and explanations
    const sanitized = {
      ...test,
      testQuestions: test.testQuestions.map((tq) => ({
        id:             tq.id,
        testId:         tq.testId,
        questionId:     tq.questionId,
        selectedAnswer: tq.selectedAnswer,
        markedReview:   tq.markedReview,
        orderIndex:     tq.orderIndex,
        isCorrect:      test.completed ? tq.isCorrect : undefined,
        question: {
          id:           tq.question.id,
          questionText: tq.question.questionText,
          optionA:      tq.question.optionA,
          optionB:      tq.question.optionB,
          optionC:      tq.question.optionC,
          optionD:      tq.question.optionD,
          difficulty:   tq.question.difficulty,
          marks:        tq.question.marks,
          subject:      tq.question.subject,
          chapter:      tq.question.chapter,
          // Only reveal answers after completion
          ...(test.completed && {
            correctOption: tq.question.correctOption,
            explanation:   tq.question.explanation,
          }),
        },
      })),
    };

    return NextResponse.json({ success: true, data: sanitized });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[TEST GET]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
