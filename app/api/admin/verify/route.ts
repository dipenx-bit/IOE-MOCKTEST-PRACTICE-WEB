import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      where: { role: "STUDENT", verified: false },
      select: { id: true, fullName: true, email: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ success: true, users });
  } catch (err) {
    console.error('[admin/verify] GET', err);
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { userId, action } = body;

    if (!userId || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid payload' }, { status: 400 });
    }

    if (action === "approve") {
      await prisma.user.update({ where: { id: userId }, data: { verified: true } });
      return NextResponse.json({ success: true });
    } else {
      // reject -> delete user and related study stats
      await prisma.$transaction([
        prisma.studyStats.deleteMany({ where: { userId } }),
        prisma.user.delete({ where: { id: userId } }),
      ]);
      return NextResponse.json({ success: true });
    }
  } catch (err) {
    console.error('[admin/verify] POST', err);
    return NextResponse.json({ success: false, error: 'Unauthorized or server error' }, { status: 500 });
  }
}
