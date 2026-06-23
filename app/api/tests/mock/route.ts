// app/api/tests/mock/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { shuffle } from "@/lib/utils";

// IOE standard distribution
const IOE_DISTRIBUTION: Record<string, number> = {
  Mathematics: 40,
  Physics:     30,
  Chemistry:   20,
  English:     10,
};

const TOTAL_QUESTIONS   = 100;
const TOTAL_DURATION    = 120; // minutes

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    if (session.user.role !== "STUDENT") {
      return NextResponse.json({ success: false, error: "Only students can take mock tests" }, { status: 403 });
    }

    // Fetch active mock format (admin-configured)
    const activeFormat = await prisma.mockFormat.findFirst({ where: { active: true }, orderBy: { createdAt: 'desc' } });
    const marksPerSubjectInput: Record<string, number> = activeFormat?.marksPerSubject as any ?? {};
    const negativeMarking: number = typeof activeFormat?.negativeMark === "number" ? activeFormat!.negativeMark : 0;
    const requestedDuration: number = typeof activeFormat?.durationMinutes === "number" ? activeFormat!.durationMinutes : TOTAL_DURATION;

    // ── Fetch subjects ────────────────────────────────────────────────────────
    const subjects = await prisma.subject.findMany({
      where: { name: { in: Object.keys(IOE_DISTRIBUTION) } },
      select: { id: true, name: true },
    });

    if (subjects.length !== 4) {
      const found = subjects.map((s) => s.name).join(", ");
      return NextResponse.json(
        {
          success: false,
          error: `Mock test requires all 4 subjects (Mathematics, Physics, Chemistry, English). Found: ${found || "none"}. Please seed the database first.`,
        },
        { status: 422 }
      );
    }

    // ── For each subject, fetch & randomly pick required questions ────────────
    const allSelected: { id: string; marks: number }[] = [];
    const shortfall: string[] = [];

    for (const subject of subjects) {
      const required = IOE_DISTRIBUTION[subject.name];

      const candidates = await prisma.question.findMany({
        where:  { subjectId: subject.id },
        select: { id: true, marks: true },
      });

      if (candidates.length < required) {
        shortfall.push(
          `${subject.name}: need ${required}, have ${candidates.length}`
        );
        continue;
      }

      const picked = shuffle(candidates).slice(0, required);
      allSelected.push(...picked);
    }

    if (shortfall.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: `Not enough questions for mock test. ${shortfall.join("; ")}. Please add more questions via bulk upload.`,
        },
        { status: 422 }
      );
    }

    // Compute total marks using either question.marks OR provided marksPerSubject override
    let totalMarks = 0;
    for (const subject of subjects) {
      const required = IOE_DISTRIBUTION[subject.name];
      const perMark = typeof marksPerSubjectInput[subject.name] === 'number' ? Math.max(0, Math.floor(marksPerSubjectInput[subject.name])) : 1;
      totalMarks += perMark * required;
    }

    // ── Shuffle final order ───────────────────────────────────────────────────
    const shuffledAll = shuffle(allSelected);

    // ── Create test + questions ───────────────────────────────────────────────
    const now  = new Date();
    const year = now.getFullYear();
    const month = now.toLocaleString("default", { month: "long" });

    const test = await prisma.$transaction(async (tx) => {
      const newTest = await tx.test.create({
        data: {
          userId:          session.user.id,
          title:           `IOE Full Mock Test — ${month} ${year}`,
          totalQuestions:  TOTAL_QUESTIONS,
          totalMarks,
          durationMinutes: requestedDuration,
          marksPerSubject: marksPerSubjectInput,
          negativeMarking: negativeMarking,
          completed:       false,
        },
      });

      await tx.testQuestion.createMany({
        data: shuffledAll.map((q, idx) => ({
          testId:     newTest.id,
          questionId: q.id,
          orderIndex: idx,
        })),
      });

      return newTest;
    });

    return NextResponse.json({
      success: true,
      data: {
        testId:      test.id,
        title:       test.title,
        distribution: IOE_DISTRIBUTION,
        totalQuestions: TOTAL_QUESTIONS,
        durationMinutes: requestedDuration,
        marksPerSubject: marksPerSubjectInput,
        negativeMarking,
      },
      message: "IOE Mock Test generated successfully",
    }, { status: 201 });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    console.error("[MOCK TEST]", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
