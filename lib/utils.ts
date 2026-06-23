// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";

// ─── ShadCN cn helper ─────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Score helpers ────────────────────────────────────────────────────────────
export function getScoreColor(percentage: number): string {
  if (percentage >= 80) return "text-green-600";
  if (percentage >= 60) return "text-blue-600";
  if (percentage >= 40) return "text-amber-600";
  return "text-red-600";
}

export function getScoreLabel(percentage: number): string {
  if (percentage >= 80) return "Excellent";
  if (percentage >= 60) return "Good";
  if (percentage >= 40) return "Average";
  return "Needs Improvement";
}

export function getScoreBadgeVariant(
  percentage: number
): "default" | "secondary" | "destructive" | "outline" {
  if (percentage >= 60) return "default";
  if (percentage >= 40) return "secondary";
  return "destructive";
}

// ─── Difficulty helpers ───────────────────────────────────────────────────────
export function getDifficultyColor(difficulty: string): string {
  switch (difficulty.toUpperCase()) {
    case "EASY":   return "text-green-600 bg-green-50 border-green-200";
    case "MEDIUM": return "text-amber-600 bg-amber-50 border-amber-200";
    case "HARD":   return "text-red-600   bg-red-50   border-red-200";
    default:       return "text-gray-600  bg-gray-50  border-gray-200";
  }
}

// ─── Time helpers ─────────────────────────────────────────────────────────────
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function formatMinutes(minutes: number): string {
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy");
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "MMM d, yyyy 'at' h:mm a");
}

export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function secondsToMinutes(seconds: number): number {
  return Math.floor(seconds / 60);
}

// ─── Number helpers ───────────────────────────────────────────────────────────
export function toPercent(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function roundTo(value: number, decimals: number = 1): number {
  return Math.round(value * 10 ** decimals) / 10 ** decimals;
}

// ─── Array helpers ────────────────────────────────────────────────────────────
export function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function groupBy<T>(
  array: T[],
  key: keyof T
): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = String(item[key]);
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

export function uniqueBy<T>(array: T[], key: keyof T): T[] {
  const seen = new Set<unknown>();
  return array.filter((item) => {
    const k = item[key];
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// ─── String helpers ───────────────────────────────────────────────────────────
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "…";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ─── Exam helpers ─────────────────────────────────────────────────────────────
export type QuestionState =
  | "answered"
  | "unanswered"
  | "review"
  | "not-visited";

export function getQuestionStateClass(state: QuestionState): string {
  switch (state) {
    case "answered":    return "q-answered";
    case "unanswered":  return "q-unanswered";
    case "review":      return "q-review";
    case "not-visited": return "q-not-visited";
  }
}

export function getOptionLabel(option: string): string {
  const labels: Record<string, string> = {
    A: "Option A",
    B: "Option B",
    C: "Option C",
    D: "Option D",
  };
  return labels[option.toUpperCase()] ?? option;
}

// ─── CSV helpers ──────────────────────────────────────────────────────────────
export function parseCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// ─── API response helpers ─────────────────────────────────────────────────────
export function apiSuccess<T>(data: T, message?: string) {
  return { success: true, data, message };
}

export function apiError(message: string, status: number = 400) {
  return { success: false, error: message, status };
}
