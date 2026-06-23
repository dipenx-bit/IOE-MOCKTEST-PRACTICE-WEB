// app/api/chapters/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { chapterSchema } from "@/lib/validations";

// GET /api/chapters?subjectId=xxx — list chapters for a subject
export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");

    const chapters = await prisma.chapter.findMany({
      where: subjectId ? { subjectId } : undefined,
      include: {
        subject: { select: { id: true, name: true } },
        _count:  { select: { questions: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: chapters });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("[CHAPTERS GET]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/chapters — create chapter (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body   = await req.json();
    const parsed = chapterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const { subjectId, unitId, name } = parsed.data;

    // Verify subject exists
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      return NextResponse.json({ success: false, error: "Subject not found" }, { status: 404 });
    }

    // If unitId provided, verify it belongs to the subject
    if (unitId) {
      const unit = await prisma.unit.findUnique({ where: { id: unitId } });
      if (!unit || unit.subjectId !== subjectId) {
        return NextResponse.json({ success: false, error: "Unit not found for the specified subject" }, { status: 404 });
      }
    }

    // Check duplicate
    const existing = await prisma.chapter.findUnique({
      where: { subjectId_name: { subjectId, name } },
    });
    if (existing) {
      return NextResponse.json({ success: false, error: "Chapter already exists in this subject" }, { status: 409 });
    }

    const chapter = await prisma.chapter.create({
      data: { subjectId, unitId: unitId ?? undefined, name },
      include: { subject: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ success: true, data: chapter }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[CHAPTERS POST]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/chapters?id=xxx or body { id }
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const idFromQuery = searchParams.get("id");
    let id: string | null = idFromQuery;
    if (!id) {
      try {
        const body = await req.json();
        id = body?.id ?? null;
      } catch (e) {
        id = null;
      }
    }

    if (!id) return NextResponse.json({ success: false, error: "Missing chapter id" }, { status: 400 });

    const qCount = await prisma.question.count({ where: { chapterId: id } });

    if (qCount > 0) {
      // Reassign questions to an 'Uncategorized' chapter for the same subject.
      const chapter = await prisma.chapter.findUnique({ where: { id } });
      if (!chapter) return NextResponse.json({ success: false, error: "Chapter not found" }, { status: 404 });

      const defaultName = "Uncategorized";

      // Try to find existing default chapter for the subject
      let defaultChapter = await prisma.chapter.findUnique({
        where: { subjectId_name: { subjectId: chapter.subjectId, name: defaultName } },
      });

      if (!defaultChapter) {
        defaultChapter = await prisma.chapter.create({ data: { subjectId: chapter.subjectId, name: defaultName } });
      }

      // Move questions to the default chapter
      await prisma.question.updateMany({ where: { chapterId: id }, data: { chapterId: defaultChapter.id } });
    }

    await prisma.chapter.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[CHAPTERS DELETE]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
