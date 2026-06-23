// app/api/admin/mock-format/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

// GET – return active format
export async function GET() {
  try {
    const format = await prisma.mockFormat.findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ success: true, data: { format } });
  } catch (error) {
    console.error('[ADMIN MOCK GET]', error);
    return NextResponse.json({ success: false, error: 'Internal' }, { status: 500 });
  }
}

// POST – create or update format (admin only)
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { name, marksPerSubject, negativeMark, durationMinutes } = body;
    if (!name || !marksPerSubject) return NextResponse.json({ success: false, error: 'Invalid' }, { status: 400 });

    // Deactivate others and create new active format
    await prisma.mockFormat.updateMany({ where: {}, data: { active: false } });
    const created = await prisma.mockFormat.create({ data: { name, marksPerSubject: marksPerSubject as any, negativeMark: Number(negativeMark ?? 0), durationMinutes: Number(durationMinutes ?? 120), active: true } });
    return NextResponse.json({ success: true, data: { format: created } });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    console.error('[ADMIN MOCK POST]', err);
    return NextResponse.json({ success: false, error: 'Internal' }, { status: 500 });
  }
}
