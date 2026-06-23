// app/api/questions/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { questionSchema, questionFilterSchema } from "@/lib/validations";

// GET /api/questions — paginated, filtered question list
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();

    const { searchParams } = new URL(req.url);
    const raw = {
      subjectId:  searchParams.get("subjectId")  ?? undefined,
      chapterId:  searchParams.get("chapterId")  ?? undefined,
      difficulty: searchParams.get("difficulty") ?? undefined,
      keyword:    searchParams.get("keyword")    ?? undefined,
      page:       Number(searchParams.get("page")     ?? 1),
      pageSize:   Number(searchParams.get("pageSize") ?? 20),
    };

    const parsed = questionFilterSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid filter parameters" },
        { status: 400 }
      );
    }

    const { subjectId, chapterId, difficulty, keyword, page, pageSize } = parsed.data;

    const where: any = {};
    if (subjectId)  where.subjectId  = subjectId;
    if (chapterId)  where.chapterId  = chapterId;
    if (difficulty) where.difficulty = difficulty;
    if (keyword) {
      where.OR = [
        { questionText: { contains: keyword, mode: "insensitive" } },
        { optionA:      { contains: keyword, mode: "insensitive" } },
        { optionB:      { contains: keyword, mode: "insensitive" } },
        { optionC:      { contains: keyword, mode: "insensitive" } },
        { optionD:      { contains: keyword, mode: "insensitive" } },
      ];
    }

    const [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        include: {
          subject: { select: { id: true, name: true } },
          chapter: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip:  (page - 1) * pageSize,
        take:  pageSize,
      }),
      prisma.question.count({ where }),
    ]);

    // For students, hide correct answer unless admin
    const sanitized = session.user.role === "ADMIN"
      ? questions
      : questions.map(({ correctOption, explanation, ...q }) => q);

    return NextResponse.json({
      success: true,
      data: sanitized,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    console.error("[QUESTIONS GET]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/questions — create question (admin only)
export async function POST(req: NextRequest) {
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

    const { subjectId, chapterId, ...rest } = parsed.data;

    // Verify subject & chapter exist and chapter belongs to subject
    const chapter = await prisma.chapter.findFirst({
      where: { id: chapterId, subjectId },
    });
    if (!chapter) {
      return NextResponse.json(
        { success: false, error: "Chapter not found in the specified subject" },
        { status: 404 }
      );
    }

    const question = await prisma.question.create({
      data: { subjectId, chapterId, ...rest },
      include: {
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: question }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[QUESTIONS POST]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
