// app/api/admin/students/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const search   = searchParams.get("search")   ?? "";
    const page     = Number(searchParams.get("page")     ?? 1);
    const pageSize = Number(searchParams.get("pageSize") ?? 20);

    const where: any = { role: "STUDENT" };
    if (search) {
      where.OR = [
        { fullName: { contains: search, mode: "insensitive" } },
        { email:    { contains: search, mode: "insensitive" } },
      ];
    }

    const [students, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        select: {
          id:        true,
          fullName:  true,
          email:     true,
          createdAt: true,
          studyStats: {
            select: {
              testsAttempted:  true,
              questionsSolved: true,
              averageScore:    true,
              bestScore:       true,
              currentStreak:   true,
              lastStudiedAt:   true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: students,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    if (error.message === "FORBIDDEN")    return NextResponse.json({ success: false, error: "Forbidden"    }, { status: 403 });
    console.error("[ADMIN STUDENTS]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
