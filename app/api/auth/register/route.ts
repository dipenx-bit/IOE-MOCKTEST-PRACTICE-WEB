// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validations";

export async function POST(req: NextRequest) {
  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error('[REGISTER] Invalid JSON payload', e);
      return NextResponse.json({ success: false, error: 'Invalid JSON payload' }, { status: 400 });
    }

    // ── Validate input ────────────────────────────────────────────────────────
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { fullName, email, password, dateOfBirth, sex, collegeName } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // ── Check if email already exists ─────────────────────────────────────────
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // ── Hash password ─────────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, 12);

    // ── Create user + study stats in a transaction ────────────────────────────
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          fullName:     fullName.trim(),
          email:        normalizedEmail,
          passwordHash,
          role:         "STUDENT",
          verified:     false,
          dateOfBirth:  new Date(dateOfBirth),
          sex:          sex as any,
          collegeName:  collegeName.trim(),
        },
        select: {
          id:        true,
          fullName:  true,
          email:     true,
          role:      true,
          createdAt: true,
        },
      });

      // Initialize study stats for the new student
      await tx.studyStats.create({
        data: { userId: newUser.id },
      });

      return newUser;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully. Your account will be activated after admin verification.",
        user,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("[REGISTER] Unexpected error", error && (error.stack || error));
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
