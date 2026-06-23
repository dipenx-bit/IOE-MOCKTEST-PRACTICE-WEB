// app/api/tests/[id]/answer/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { answerSchema, markReviewSchema } from "@/lib/validations";

// POST /api/tests/[id]/answer — save a student's answer
export async function POST(
  req: Request,
  ctx: any
) {
  const { params } = ctx as any;
  try {
    const session = await requireAuth();
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body   = await req.json();
    const parsed = answerSchema.safeParse({ ...body, testId: params.id });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { testId, questionId, selectedAnswer } = parsed.data;

    // Verify test belongs to student and is not completed
    const test = await prisma.test.findUnique({
      where: { id: testId },
      select: { userId: true, completed: true },
    });

    if (!test) return NextResponse.json({ success: false, error: "Test not found" }, { status: 404 });
    if (test.userId !== session.user.id) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    if (test.completed) return NextResponse.json({ success: false, error: "Test already submitted" }, { status: 409 });

    // Verify question is part of this test
    const testQuestion = await prisma.testQuestion.findUnique({
      where: { testId_questionId: { testId, questionId } },
    });
    if (!testQuestion) {
      return NextResponse.json({ success: false, error: "Question not found in this test" }, { status: 404 });
    }

    // Update answer (null = clear response)
    const updated = await prisma.testQuestion.update({
      where: { testId_questionId: { testId, questionId } },
      data:  { selectedAnswer },
    });

    return NextResponse.json({
      success: true,
      data: { questionId, selectedAnswer: updated.selectedAnswer },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[SAVE ANSWER]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/tests/[id]/answer — toggle mark for review
export async function PATCH(
  req: Request,
  ctx: any
) {
  const { params } = ctx as any;
  try {
    const session = await requireAuth();
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body   = await req.json();
    const parsed = markReviewSchema.safeParse({ ...body, testId: params.id });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed" },
        { status: 400 }
      );
    }

    const { testId, questionId, marked } = parsed.data;

    // Verify ownership
    const test = await prisma.test.findUnique({
      where:  { id: testId },
      select: { userId: true, completed: true },
    });
    if (!test) return NextResponse.json({ success: false, error: "Test not found" }, { status: 404 });
    if (test.userId !== session.user.id) return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    if (test.completed) return NextResponse.json({ success: false, error: "Test already submitted" }, { status: 409 });

    const updated = await prisma.testQuestion.update({
      where: { testId_questionId: { testId, questionId } },
      data:  { markedReview: marked },
    });

    return NextResponse.json({
      success: true,
      data: { questionId, markedReview: updated.markedReview },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[MARK REVIEW]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
