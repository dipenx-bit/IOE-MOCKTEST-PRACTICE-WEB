// app/api/tests/generate-bookmarks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { shuffle } from "@/lib/utils";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { questionIds } = await req.json() as { questionIds: string[] };

    if (!Array.isArray(questionIds) || questionIds.length === 0) {
      return NextResponse.json({ success: false, error: "No questions provided" }, { status: 400 });
    }

    // Verify all questions exist and belong to user's bookmarks
    const bookmarks = await prisma.bookmark.findMany({
      where:  { userId: session.user.id, questionId: { in: questionIds } },
      include: { question: { select: { id: true, marks: true } } },
    });

    if (bookmarks.length === 0) {
      return NextResponse.json({ success: false, error: "No valid bookmarked questions found" }, { status: 404 });
    }

    const selected   = shuffle(bookmarks.map((b) => b.question));
    const totalMarks = selected.reduce((sum, q) => sum + q.marks, 0);

    const test = await prisma.$transaction(async (tx) => {
      const newTest = await tx.test.create({
        data: {
          userId:         session.user.id,
          title:          `Bookmark Practice — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
          totalQuestions: selected.length,
          totalMarks,
          durationMinutes: Math.max(15, Math.ceil(selected.length * 1.5)),
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
    }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[GENERATE BOOKMARKS]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
