// app/api/units/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

// GET /api/units?subjectId=xxx — list units (with chapters) optionally for a subject
export async function GET(req: NextRequest) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const subjectId = searchParams.get("subjectId");

    const units = await prisma.unit.findMany({
      where: subjectId ? { subjectId } : undefined,
      include: {
        chapters: { orderBy: { name: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: units });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[UNITS GET]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/units — create unit (admin only)
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { subjectId, name } = body;
    if (!subjectId || !name) return NextResponse.json({ success: false, error: "subjectId and name required" }, { status: 400 });

    const existing = await prisma.unit.findUnique({ where: { subjectId_name: { subjectId, name } } });
    if (existing) return NextResponse.json({ success: false, error: "Unit already exists" }, { status: 409 });

    const unit = await prisma.unit.create({ data: { subjectId, name } });
    return NextResponse.json({ success: true, data: unit }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[UNITS POST]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/units?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ success: false, error: "Missing unit id" }, { status: 400 });

    // Before deleting, reassign chapters to a default unit for that subject
    const unit = await prisma.unit.findUnique({ where: { id } });
    if (!unit) return NextResponse.json({ success: false, error: "Unit not found" }, { status: 404 });

    const defaultName = "Uncategorized";
    let defaultUnit = await prisma.unit.findUnique({ where: { subjectId_name: { subjectId: unit.subjectId, name: defaultName } } });
    if (!defaultUnit) {
      defaultUnit = await prisma.unit.create({ data: { subjectId: unit.subjectId, name: defaultName } });
    }

    await prisma.chapter.updateMany({ where: { unitId: id }, data: { unitId: defaultUnit.id } });
    await prisma.unit.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[UNITS DELETE]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/units — rename unit (admin only)
export async function PATCH(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });

    const body = await req.json();
    const { id, name } = body;
    if (!id || !name || typeof name !== 'string' || !name.trim()) return NextResponse.json({ success: false, error: 'Missing id or name' }, { status: 400 });

    // fetch unit to know subjectId
    const unit = await prisma.unit.findUnique({ where: { id } });
    if (!unit) return NextResponse.json({ success: false, error: 'Unit not found' }, { status: 404 });

    // validate name
    const { unitSchema } = await import('@/lib/validations');
    const parsed = unitSchema.pick({ name: true }).safeParse({ name: name.trim() });
    if (!parsed.success) return NextResponse.json({ success: false, error: 'Validation failed', fields: parsed.error.flatten().fieldErrors }, { status: 400 });

    // check duplicate within subject
    const existing = await prisma.unit.findUnique({ where: { subjectId_name: { subjectId: unit.subjectId, name: parsed.data.name } } });
    if (existing && existing.id !== id) return NextResponse.json({ success: false, error: 'Unit name already exists for this subject' }, { status: 409 });

    const updated = await prisma.unit.update({ where: { id }, data: { name: parsed.data.name } });
    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[UNITS PATCH]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
