// app/api/tests/history/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await requireAuth();

    const tests = await prisma.test.findMany({
      where:   { userId: session.user.id, completed: true },
      orderBy: { submittedAt: "desc" },
      select: {
        id:              true,
        title:           true,
        score:           true,
        totalMarks:      true,
        percentage:      true,
        totalQuestions:  true,
        durationMinutes: true,
        submittedAt:     true,
        startedAt:       true,
      },
    });

    return NextResponse.json({ success: true, data: tests });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED")
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[TEST HISTORY]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
