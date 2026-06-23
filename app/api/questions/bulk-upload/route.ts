// app/api/questions/bulk-upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { bulkQuestionRowSchema } from "@/lib/validations";

interface UploadResult {
  total:    number;
  success:  number;
  failed:   number;
  errors:   { row: number; message: string }[];
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { rows } = body as { rows: Record<string, string>[] };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "No data provided" },
        { status: 400 }
      );
    }

    if (rows.length > 500) {
      return NextResponse.json(
        { success: false, error: "Maximum 500 questions per upload" },
        { status: 400 }
      );
    }

    // ── Cache subjects & chapters ─────────────────────────────────────────────
    const subjects = await prisma.subject.findMany({
      include: { chapters: true },
    });

    const subjectMap = new Map(subjects.map((s) => [s.name.toLowerCase(), s]));

    const result: UploadResult = {
      total:   rows.length,
      success: 0,
      failed:  0,
      errors:  [],
    };

    // ── Process each row ──────────────────────────────────────────────────────
    const toCreate: {
      subjectId:     string;
      chapterId:     string;
      questionText:  string;
      optionA:       string;
      optionB:       string;
      optionC:       string;
      optionD:       string;
      correctOption: string;
      explanation:   string;
      difficulty:    "EASY" | "MEDIUM" | "HARD";
      marks:         number;
    }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2; // +2 because row 1 is headers
      const row    = rows[i];

      // Normalise CSV header keys (case-insensitive)
      const normalised = Object.fromEntries(
        Object.entries(row).map(([k, v]) => [k.toLowerCase().trim(), v?.trim() ?? ""])
      );

      const rowData = {
        subject:       normalised["subject"]       ?? "",
        chapter:       normalised["chapter"]       ?? "",
        difficulty:    (normalised["difficulty"]?.toUpperCase() ?? "MEDIUM") as any,
        question:      normalised["question"]      ?? "",
        optionA:       normalised["optiona"]       ?? normalised["option_a"] ?? normalised["option a"] ?? "",
        optionB:       normalised["optionb"]       ?? normalised["option_b"] ?? normalised["option b"] ?? "",
        optionC:       normalised["optionc"]       ?? normalised["option_c"] ?? normalised["option c"] ?? "",
        optionD:       normalised["optiond"]       ?? normalised["option_d"] ?? normalised["option d"] ?? "",
        correctAnswer: (normalised["correctanswer"] ?? normalised["correct_answer"] ?? normalised["correct answer"] ?? "").toUpperCase() as any,
        explanation:   normalised["explanation"]   ?? "",
      };

      // Validate row
      const parsed = bulkQuestionRowSchema.safeParse(rowData);
      if (!parsed.success) {
        result.failed++;
        result.errors.push({
          row:     rowNum,
          message: parsed.error.errors.map((e) => e.message).join("; "),
        });
        continue;
      }

      // Look up subject
      const subject = subjectMap.get(parsed.data.subject.toLowerCase());
      if (!subject) {
        result.failed++;
        result.errors.push({
          row:     rowNum,
          message: `Subject "${parsed.data.subject}" not found. Create it first.`,
        });
        continue;
      }

      // Look up chapter
      const chapter = subject.chapters.find(
        (c) => c.name.toLowerCase() === parsed.data.chapter.toLowerCase()
      );
      if (!chapter) {
        result.failed++;
        result.errors.push({
          row:     rowNum,
          message: `Chapter "${parsed.data.chapter}" not found in subject "${subject.name}". Create it first.`,
        });
        continue;
      }

      toCreate.push({
        subjectId:     subject.id,
        chapterId:     chapter.id,
        questionText:  parsed.data.question,
        optionA:       parsed.data.optionA,
        optionB:       parsed.data.optionB,
        optionC:       parsed.data.optionC,
        optionD:       parsed.data.optionD,
        correctOption: parsed.data.correctAnswer,
        explanation:   parsed.data.explanation ?? "",
        difficulty:    parsed.data.difficulty.toUpperCase() as "EASY" | "MEDIUM" | "HARD",
        marks:         1,
      });
    }

    // ── Bulk insert valid questions ────────────────────────────────────────────
    if (toCreate.length > 0) {
      await prisma.question.createMany({ data: toCreate });
      result.success = toCreate.length;
    }

    return NextResponse.json({
      success: true,
      data:    result,
      message: `Uploaded ${result.success} of ${result.total} questions successfully.`,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[BULK UPLOAD]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
