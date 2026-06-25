// app/api/questions/[id]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { questionSchema } from "@/lib/validations";

// GET /api/questions/[id]
export async function GET(
  _req: Request,
  ctx: any
) {
  const { params } = ctx as any;
  try {
    const session = await requireAuth();

    const question = await prisma.question.findUnique({
      where: { id: params.id },
      include: {
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, name: true } },
      },
    });

    if (!question) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }

    // Hide answer from students
    if (session.user.role !== "ADMIN") {
      const { correctOption, explanation, ...safe } = question;
      return NextResponse.json({ success: true, data: safe });
    }

    return NextResponse.json({ success: true, data: question });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[QUESTION GET]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/questions/[id] — update question (admin only)
export async function PUT(
  req: Request,
  ctx: any
) {
  const { params } = ctx as any;
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body   = await req.json();
    const parsed = questionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Verify question exists
    const existing = await prisma.question.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }

    // Verify chapter belongs to subject
    const chapter = await prisma.chapter.findFirst({
      where: { id: parsed.data.chapterId, subjectId: parsed.data.subjectId },
    });
    if (!chapter) {
      return NextResponse.json(
        { success: false, error: "Chapter not found in the specified subject" },
        { status: 404 }
      );
    }

    const updated = await prisma.question.update({
      where: { id: params.id },
      data:  parsed.data,
      include: {
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[QUESTION PUT]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/questions/[id] — delete question (admin only)
export async function DELETE(
  _req: Request,
  ctx: any
) {
  const { params } = ctx as any;
  const id = params?.id;

  console.info(`[QUESTION DELETE] incoming id=${id}`);

  if (!id) {
    console.error("[QUESTION DELETE] Missing id param");
    return NextResponse.json({ success: false, error: "Missing question id" }, { status: 400 });
  }

  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.question.findUnique({ where: { id } });
    console.info(`[QUESTION DELETE] existing question lookup for id=${id}`, { exists: Boolean(existing) });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }

    const [testQuestionCount, bookmarkCount] = await Promise.all([
      prisma.testQuestion.count({ where: { questionId: id } }),
      prisma.bookmark.count({ where: { questionId: id } }),
    ]);
    console.info(`[QUESTION DELETE] related counts for id=${id}`, { testQuestionCount, bookmarkCount });

    try {
      await prisma.$transaction([
        prisma.testQuestion.deleteMany({ where: { questionId: id } }),
        prisma.bookmark.deleteMany({ where: { questionId: id } }),
        prisma.question.delete({ where: { id } }),
      ]);
    } catch (dbErr: any) {
      console.error("[QUESTION DELETE - DB ERROR]", {
        questionId: id,
        message: dbErr?.message,
        stack: dbErr?.stack,
      });
      return NextResponse.json(
        { success: false, error: dbErr?.message ?? "DB error" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: "Question deleted successfully" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    if (error.message === "FORBIDDEN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }
    console.error("[QUESTION DELETE]", { message: error?.message, stack: error?.stack });
    return NextResponse.json(
      { success: false, error: error?.message ?? "Internal server error" },
      { status: 500 }
    );
  }
}
