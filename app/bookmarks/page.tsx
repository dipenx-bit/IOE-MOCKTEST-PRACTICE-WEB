// app/bookmarks/page.tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import {
  Bookmark, BookmarkX, BookOpen, Search,
  Loader2, AlertTriangle, ChevronDown, ChevronUp,
  FlaskConical, Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface BookmarkedQuestion {
  id:         string;
  createdAt:  string;
  question: {
    id:           string;
    questionText: string;
    optionA:      string;
    optionB:      string;
    optionC:      string;
    optionD:      string;
    correctOption: string;
    explanation:  string | null;
    difficulty:   string;
    marks:        number;
    subject:      { id: string; name: string };
    chapter:      { id: string; name: string };
  };
}

const OPTIONS = ["A", "B", "C", "D"] as const;
const OPTION_KEYS = { A: "optionA", B: "optionB", C: "optionC", D: "optionD" } as const;

function BookmarkCard({
  bm,
  onRemove,
  isRemoving,
}: {
  bm:         BookmarkedQuestion;
  onRemove:   () => void;
  isRemoving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const q = bm.question;

  return (
    <Card className="hover:border-blue-200 transition-colors">
      <CardContent className="p-4 space-y-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">{q.subject.name}</Badge>
            <Badge variant="outline" className="text-xs">{q.chapter.name}</Badge>
            <span className={cn(
              "text-xs px-2 py-0.5 rounded-full font-medium",
              q.difficulty === "EASY"   ? "badge-easy"   :
              q.difficulty === "MEDIUM" ? "badge-medium" : "badge-hard"
            )}>
              {q.difficulty}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={isRemoving}
            className="shrink-0 text-gray-400 hover:text-red-500 hover:bg-red-50 h-8 w-8 p-0"
          >
            {isRemoving
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <BookmarkX className="h-4 w-4" />}
          </Button>
        </div>

        {/* Question text */}
        <p className="text-sm text-gray-900 leading-relaxed font-medium">
          {q.questionText}
        </p>

        {/* Toggle options */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          {expanded ? (
            <><ChevronUp className="h-3.5 w-3.5" /> Hide options</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" /> Show options & answer</>
          )}
        </button>

        {expanded && (
          <div className="space-y-2 pt-1">
            {OPTIONS.map((opt) => {
              const text      = q[OPTION_KEYS[opt]];
              const isCorrect = opt === q.correctOption;
              return (
                <div
                  key={opt}
                  className={cn(
                    "flex items-start gap-2.5 p-2.5 rounded-lg border text-xs",
                    isCorrect
                      ? "border-green-400 bg-green-50 text-green-800"
                      : "border-gray-100 bg-gray-50 text-gray-700"
                  )}
                >
                  <span className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center font-bold shrink-0 text-[10px]",
                    isCorrect
                      ? "bg-green-500 text-white"
                      : "bg-gray-200 text-gray-600"
                  )}>
                    {opt}
                  </span>
                  <span className="leading-snug">{text}</span>
                </div>
              );
            })}

            {q.explanation && (
              <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs font-semibold text-blue-700 mb-1">Explanation</p>
                <p className="text-xs text-blue-800 leading-relaxed">{q.explanation}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function BookmarksPage() {
  const router      = useRouter();
  const qClient     = useQueryClient();
  const [search,    setSearch]    = useState("");
  const [subject,   setSubject]   = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [generating, setGenerating] = useState(false);

  const { data, isLoading } = useQuery<{ success: boolean; data: BookmarkedQuestion[] }>({
    queryKey: ["bookmarks"],
    queryFn:  async () => {
      const res = await fetch("/api/bookmarks");
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const removeBookmark = useMutation({
    mutationFn: async (questionId: string) => {
      const res = await fetch("/api/bookmarks", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ questionId }),
      });
      if (!res.ok) throw new Error("Failed to remove bookmark");
      return res.json();
    },
    onSuccess: () => {
      qClient.invalidateQueries({ queryKey: ["bookmarks"] });
      toast({ title: "Bookmark removed", variant: "default" });
    },
    onError: () => toast({ title: "Failed to remove bookmark", variant: "destructive" }),
  });

  const bookmarks = data?.data ?? [];

  // Derive unique subjects for filter
  const subjectOptions = Array.from(
    new Set(bookmarks.map((b) => b.question.subject.name))
  );

  // Apply filters
  const filtered = bookmarks.filter((b) => {
    const q          = b.question;
    const matchSearch  = q.questionText.toLowerCase().includes(search.toLowerCase());
    const matchSubject = subject === "all" || q.subject.name === subject;
    const matchDiff    = difficulty === "all" || q.difficulty === difficulty;
    return matchSearch && matchSubject && matchDiff;
  });

  // Generate practice test from bookmarks
  async function handleGenerateFromBookmarks() {
    if (bookmarks.length === 0) return;
    setGenerating(true);
    try {
      // Get unique subject IDs from bookmarks
      const subjectIds = [...new Set(bookmarks.map((b) => b.question.subject.id))];
      const questionIds = bookmarks.map((b) => b.question.id);

      const res  = await fetch("/api/tests/generate-bookmarks", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ questionIds, subjectIds }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast({ title: "Failed", description: json.error, variant: "destructive" });
        return;
      }

      toast({ title: "Test generated from bookmarks!", variant: "success" });
      router.push(`/exam/${json.data.testId}`);
    } catch {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bookmark className="h-6 w-6 text-blue-600" />
            Bookmarks
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {bookmarks.length} saved question{bookmarks.length !== 1 ? "s" : ""}
          </p>
        </div>
        {bookmarks.length > 0 && (
          <Button
            onClick={handleGenerateFromBookmarks}
            disabled={generating}
            className="gap-2 shrink-0"
          >
            {generating
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <FlaskConical className="h-4 w-4" />}
            Practice from Bookmarks
          </Button>
        )}
      </div>

      {/* Filters */}
      {bookmarks.length > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search bookmarks…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjectOptions.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Levels</SelectItem>
              <SelectItem value="EASY">Easy</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HARD">Hard</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full" /></CardContent></Card>
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <Card>
          <CardContent className="py-20 text-center space-y-3">
            <Bookmark className="h-12 w-12 mx-auto text-gray-200" />
            <p className="text-gray-500 font-medium">No bookmarks yet.</p>
            <p className="text-gray-400 text-sm">
              While reviewing solutions, click the bookmark icon to save questions for later.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Filter className="h-8 w-8 mx-auto text-gray-200 mb-2" />
            <p className="text-gray-500 text-sm">No bookmarks match your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((bm) => (
            <BookmarkCard
              key={bm.id}
              bm={bm}
              onRemove={() => removeBookmark.mutate(bm.question.id)}
              isRemoving={removeBookmark.isPending && removeBookmark.variables === bm.question.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
