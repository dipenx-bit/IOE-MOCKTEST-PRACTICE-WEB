// app/api/tests/generate/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { practiceSetSchema } from "@/lib/validations";
import { shuffle } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ success: false, error: "Only students can generate tests" }, { status: 403 });
    }

    const body   = await req.json();
    const parsed = practiceSetSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { subjectIds, chapterIds, questionCount, difficulty, durationMinutes, negativeMarking, title } = parsed.data;

    // ── Build question filter ─────────────────────────────────────────────────
    const where: any = { subjectId: { in: subjectIds } };

    if (chapterIds && chapterIds.length > 0) {
      where.chapterId = { in: chapterIds };
    }
    if (difficulty !== "MIXED") {
      where.difficulty = difficulty;
    }

    // ── Fetch candidate questions ─────────────────────────────────────────────
    const candidates = await prisma.question.findMany({
      where,
      select: { id: true, marks: true, subjectId: true },
    });

    if (candidates.length < questionCount) {
      return NextResponse.json(
        {
          success: false,
          error: `Not enough questions available. Found ${candidates.length}, need ${questionCount}. Try adjusting your filters or selecting Mixed difficulty.`,
        },
        { status: 422 }
      );
    }

    // ── Randomly select required count ────────────────────────────────────────
    const selected  = shuffle(candidates).slice(0, questionCount);
    const totalMarks = selected.reduce((sum, q) => sum + q.marks, 0);

    // ── Get subject names for title ───────────────────────────────────────────
    const subjects = await prisma.subject.findMany({
      where: { id: { in: subjectIds } },
      select: { name: true },
    });
    const subjectNames = subjects.map((s) => s.name).join(", ");

    const testTitle = title?.trim() ||
      `Practice Set — ${subjectNames} (${difficulty === "MIXED" ? "Mixed" : difficulty})`;

    // ── Create test + test questions in transaction ───────────────────────────
    const test = await prisma.$transaction(async (tx) => {
      const newTest = await tx.test.create({
        data: {
          userId:         session.user.id,
          title:          testTitle,
          totalQuestions: questionCount,
          totalMarks,
          durationMinutes,
          negativeMarking: negativeMarking ?? 0,
          completed:      false,
        },
      });

      await tx.testQuestion.createMany({
        data: selected.map((q, idx) => ({
          testId:     newTest.id,
          questionId: q.id,
          orderIndex: idx,
        })),
      });

      return newTest;
    });

    return NextResponse.json({
      success: true,
      data: { testId: test.id, title: test.title },
      message: "Practice set generated successfully",
    }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[GENERATE TEST]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
