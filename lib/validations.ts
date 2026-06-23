// lib/validations.ts
import { z } from "zod";

// ─── Auth Schemas ─────────────────────────────────────────────────────────────
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Invalid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name is too long"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Invalid email address"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(100, "Password is too long")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number"
      ),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginInput    = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

// ─── Subject & Chapter Schemas ────────────────────────────────────────────────
export const subjectSchema = z.object({
  name: z
    .string()
    .min(1, "Subject name is required")
    .max(100, "Subject name is too long"),
});

export const chapterSchema = z.object({
  subjectId: z.string().min(1, "Subject is required"),
  unitId: z.string().optional(),
  name: z
    .string()
    .min(1, "Chapter name is required")
    .max(200, "Chapter name is too long"),
});

export const unitSchema = z.object({
  subjectId: z.string().min(1, "Subject is required"),
  name: z.string().min(1, "Unit name is required").max(200, "Unit name is too long"),
});

export type SubjectInput = z.infer<typeof subjectSchema>;
export type ChapterInput = z.infer<typeof chapterSchema>;
export type UnitInput = z.infer<typeof unitSchema>;

// ─── Question Schema ──────────────────────────────────────────────────────────
export const questionSchema = z.object({
  subjectId: z.string().min(1, "Subject is required"),
  chapterId: z.string().min(1, "Chapter is required"),
  questionText: z
    .string()
    .min(10, "Question must be at least 10 characters")
    .max(2000, "Question is too long"),
  optionA: z
    .string()
    .min(1, "Option A is required")
    .max(500, "Option A is too long"),
  optionB: z
    .string()
    .min(1, "Option B is required")
    .max(500, "Option B is too long"),
  optionC: z
    .string()
    .min(1, "Option C is required")
    .max(500, "Option C is too long"),
  optionD: z
    .string()
    .min(1, "Option D is required")
    .max(500, "Option D is too long"),
  correctOption: z.enum(["A", "B", "C", "D"], {
    required_error: "Correct answer is required",
    invalid_type_error: "Correct answer must be A, B, C, or D",
  }),
  explanation: z
    .string()
    .max(3000, "Explanation is too long")
    .optional()
    .or(z.literal("")),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"], {
    required_error: "Difficulty is required",
  }),
  marks: z
    .number()
    .int("Marks must be a whole number")
    .min(1, "Marks must be at least 1")
    .max(10, "Marks cannot exceed 10")
    .default(1),
});

export type QuestionInput = z.infer<typeof questionSchema>;

// ─── Bulk Upload Schema ───────────────────────────────────────────────────────
export const bulkQuestionRowSchema = z.object({
  subject:       z.string().min(1, "Subject is required"),
  chapter:       z.string().min(1, "Chapter is required"),
  difficulty:    z.enum(["EASY", "MEDIUM", "HARD", "Easy", "Medium", "Hard"]),
  question:      z.string().min(10, "Question too short"),
  optionA:       z.string().min(1),
  optionB:       z.string().min(1),
  optionC:       z.string().min(1),
  optionD:       z.string().min(1),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  explanation:   z.string().optional().default(""),
});

export type BulkQuestionRow = z.infer<typeof bulkQuestionRowSchema>;

// ─── Practice Set Generator Schema ───────────────────────────────────────────
export const practiceSetSchema = z.object({
  subjectIds: z
    .array(z.string())
    .min(1, "Select at least one subject"),
  chapterIds: z
    .array(z.string())
    .optional()
    .default([]),
  questionCount: z
    .number()
    .int()
    .refine((v) => [10, 20, 30, 50, 100].includes(v), {
      message: "Question count must be 10, 20, 30, 50, or 100",
    }),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD", "MIXED"]),
  durationMinutes: z
    .number()
    .int()
    .refine((v) => [15, 30, 60, 120].includes(v), {
      message: "Duration must be 15, 30, 60, or 120 minutes",
    }),
  title: z.string().max(200).optional(),
});

export type PracticeSetInput = z.infer<typeof practiceSetSchema>;

// ─── Mock Test Schema ─────────────────────────────────────────────────────────
export const mockTestSchema = z.object({
  title: z
    .string()
    .max(200)
    .optional()
    .default("IOE Full Mock Test"),
});

export type MockTestInput = z.infer<typeof mockTestSchema>;

// ─── Answer Submission Schema ─────────────────────────────────────────────────
export const answerSchema = z.object({
  testId:        z.string().min(1),
  questionId:    z.string().min(1),
  selectedAnswer: z.enum(["A", "B", "C", "D"]).nullable(),
});

export const markReviewSchema = z.object({
  testId:     z.string().min(1),
  questionId: z.string().min(1),
  marked:     z.boolean(),
});

export const submitTestSchema = z.object({
  testId: z.string().min(1),
});

export type AnswerInput      = z.infer<typeof answerSchema>;
export type MarkReviewInput  = z.infer<typeof markReviewSchema>;
export type SubmitTestInput  = z.infer<typeof submitTestSchema>;

// ─── Bookmark Schema ──────────────────────────────────────────────────────────
export const bookmarkSchema = z.object({
  questionId: z.string().min(1, "Question ID is required"),
});

export type BookmarkInput = z.infer<typeof bookmarkSchema>;

// ─── Question Filter/Search Schema ───────────────────────────────────────────
export const questionFilterSchema = z.object({
  subjectId:  z.string().optional(),
  chapterId:  z.string().optional(),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]).optional(),
  keyword:    z.string().max(200).optional(),
  page:       z.number().int().min(1).default(1),
  pageSize:   z.number().int().min(1).max(100).default(20),
});

export type QuestionFilterInput = z.infer<typeof questionFilterSchema>;

// ─── Test History Filter Schema ───────────────────────────────────────────────
export const testHistoryFilterSchema = z.object({
  dateFrom:   z.string().optional(),
  dateTo:     z.string().optional(),
  minScore:   z.number().min(0).max(100).optional(),
  maxScore:   z.number().min(0).max(100).optional(),
  page:       z.number().int().min(1).default(1),
  pageSize:   z.number().int().min(1).max(50).default(10),
});

export type TestHistoryFilterInput = z.infer<typeof testHistoryFilterSchema>;

// ─── Profile Update Schema ────────────────────────────────────────────────────
export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name is too long"),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain uppercase, lowercase, and a number"
      ),
    confirmNewPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((d) => d.newPassword === d.confirmNewPassword, {
    message: "Passwords do not match",
    path: ["confirmNewPassword"],
  });

export type UpdateProfileInput  = z.infer<typeof updateProfileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
