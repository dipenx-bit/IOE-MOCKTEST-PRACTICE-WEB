// app/api/subjects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { subjectSchema } from "@/lib/validations";

// GET /api/subjects — list all subjects (with chapters)
export async function GET() {
  try {
    await requireAuth();

    const subjects = await prisma.subject.findMany({
      include: {
        units: {
          include: {
            chapters: { orderBy: { createdAt: "asc" } },
          },
          orderBy: { createdAt: "asc" },
        },
        chapters: {
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { questions: true } },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, data: subjects });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("[SUBJECTS GET]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/subjects — create subject (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const parsed = subjectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Validation failed", fields: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const existing = await prisma.subject.findUnique({ where: { name: parsed.data.name } });
    if (existing) {
      return NextResponse.json({ success: false, error: "Subject already exists" }, { status: 409 });
    }

    const subject = await prisma.subject.create({ data: { name: parsed.data.name } });
    return NextResponse.json({ success: true, data: subject }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[SUBJECTS POST]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/subjects?id=xxx or body { id }
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

    if (!id) return NextResponse.json({ success: false, error: "Missing subject id" }, { status: 400 });

    // Prevent deleting a subject that still has questions
    const qCount = await prisma.question.count({ where: { subjectId: id } });
    if (qCount > 0) {
      return NextResponse.json({ success: false, error: "Subject has questions; remove them first" }, { status: 409 });
    }

    // Delete chapters first to avoid FK issues
    await prisma.chapter.deleteMany({ where: { subjectId: id } });
    await prisma.subject.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[SUBJECTS DELETE]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/subjects — rename subject (admin only)
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id, name } = body;
    if (!id || !name || typeof name !== 'string' || !name.trim()) return NextResponse.json({ success: false, error: 'Missing id or name' }, { status: 400 });

    const parsed = subjectSchema.safeParse({ name: name.trim() });
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });

    const existing = await prisma.subject.findUnique({ where: { name: parsed.data.name } });
    if (existing && existing.id !== id) return NextResponse.json({ success: false, error: 'Subject name already in use' }, { status: 409 });

    const subject = await prisma.subject.update({ where: { id }, data: { name: parsed.data.name } });
    return NextResponse.json({ success: true, data: subject });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[SUBJECTS PATCH]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
