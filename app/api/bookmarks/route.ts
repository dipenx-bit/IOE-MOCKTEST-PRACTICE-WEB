// app/api/bookmarks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { bookmarkSchema } from "@/lib/validations";

// GET /api/bookmarks — list student's bookmarks
export async function GET(_req: NextRequest) {
  try {
    const session = await requireAuth();

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId: session.user.id },
      include: {
        question: {
          include: {
            subject: { select: { id: true, name: true } },
            chapter: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: bookmarks });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[BOOKMARKS GET]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/bookmarks — toggle bookmark
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();

    const body   = await req.json();
    const parsed = bookmarkSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }

    const { questionId } = parsed.data;
    const userId = session.user.id;

    // Check if already bookmarked
    const existing = await prisma.bookmark.findUnique({
      where: { userId_questionId: { userId, questionId } },
    });

    if (existing) {
      await prisma.bookmark.delete({
        where: { userId_questionId: { userId, questionId } },
      });
      return NextResponse.json({ success: true, data: { bookmarked: false }, message: "Bookmark removed" });
    } else {
      await prisma.bookmark.create({ data: { userId, questionId } });
      return NextResponse.json({ success: true, data: { bookmarked: true }, message: "Bookmark added" }, { status: 201 });
    }
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[BOOKMARK TOGGLE]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
