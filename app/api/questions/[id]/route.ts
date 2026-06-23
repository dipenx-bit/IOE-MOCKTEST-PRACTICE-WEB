// app/api/questions/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { questionSchema } from "@/lib/validations";

// GET /api/questions/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
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
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const existing = await prisma.question.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: "Question not found" }, { status: 404 });
    }

    await prisma.question.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true, message: "Question deleted successfully" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[QUESTION DELETE]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
