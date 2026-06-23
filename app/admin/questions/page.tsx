// app/admin/questions/page.tsx
"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Papa from "papaparse";
import {
  Plus, Search, Edit2, Trash2, Upload, Filter,
  Loader2, AlertTriangle, CheckCircle2, X,
  ChevronLeft, ChevronRight, HelpCircle, FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { questionSchema, type QuestionInput } from "@/lib/validations";
import { cn, truncate } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Subject {
  id: string; name: string;
  chapters: { id: string; name: string }[];
  units?: { id: string; name: string; chapters?: { id: string; name: string }[] }[];
}
interface Question {
  id: string; questionText: string; optionA: string; optionB: string;
  optionC: string; optionD: string; correctOption: string;
  explanation: string | null; difficulty: string; marks: number;
  createdAt: string;
  subject: { id: string; name: string };
  chapter: { id: string; name: string };
}
interface Pagination {
  page: number; pageSize: number; total: number; totalPages: number;
}

// ─── Question Form Dialog ─────────────────────────────────────────────────────
function QuestionFormDialog({
  open, onClose, editQuestion, subjects, initialSubjectId, initialChapterId,
}: {
  open:               boolean;
  onClose:            () => void;
  editQuestion?:      Question | null;
  subjects:           Subject[];
  initialSubjectId?:  string | null;
  initialChapterId?:  string | null;
}) {
  const qClient = useQueryClient();
  const isEdit  = !!editQuestion;

  const {
    register, handleSubmit, watch, setValue, reset,
    formState: { errors, isSubmitting },
  } = useForm<QuestionInput>({
    resolver:     zodResolver(questionSchema),
    defaultValues: editQuestion ? {
      subjectId:     editQuestion.subject.id,
      chapterId:     editQuestion.chapter.id,
      questionText:  editQuestion.questionText,
      optionA:       editQuestion.optionA,
      optionB:       editQuestion.optionB,
      optionC:       editQuestion.optionC,
      optionD:       editQuestion.optionD,
      correctOption: editQuestion.correctOption as any,
      explanation:   editQuestion.explanation ?? "",
      difficulty:    editQuestion.difficulty as any,
      marks:         editQuestion.marks,
    } : {
      subjectId: initialSubjectId ?? undefined,
      chapterId: initialChapterId ?? undefined,
      difficulty: "MEDIUM",
      marks:      1,
    },
  });

  const selectedSubjectId = watch("subjectId");
  const selectedSubject   = subjects.find((s) => s.id === selectedSubjectId);
  const chapters          = selectedSubject?.chapters ?? [];

  useEffect(() => {
    // When dialog opens for adding (not editing), ensure the form is reset
    if (!open) return;
    if (isEdit) return;
    reset({
      subjectId: initialSubjectId ?? undefined,
      chapterId: initialChapterId ?? undefined,
      difficulty: "MEDIUM",
      marks: 1,
    });
  }, [open, initialSubjectId, initialChapterId, isEdit, reset]);

  async function onSubmit(data: QuestionInput) {
    const url    = isEdit ? `/api/questions/${editQuestion!.id}` : "/api/questions";
    const method = isEdit ? "PUT" : "POST";

    const res  = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(data),
    });
    const json = await res.json();

    if (!res.ok) {
      toast({ title: "Failed to save question", description: json.error, variant: "destructive" });
      return;
    }

    toast({
      title:   isEdit ? "Question updated" : "Question added",
      variant: "success",
    });
    qClient.invalidateQueries({ queryKey: ["admin-questions"] });
    onClose();
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Question" : "Add Question"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update the question details below." : "Fill in all required fields to add a new question."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          {/* Subject + Chapter row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Subject <span className="text-red-500">*</span></Label>
              <Select
                value={watch("subjectId") ?? ""}
                onValueChange={(v) => { setValue("subjectId", v); setValue("chapterId", ""); }}
              >
                <SelectTrigger className={errors.subjectId ? "border-red-400" : ""}>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.subjectId && <p className="text-xs text-red-600">{errors.subjectId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Chapter <span className="text-red-500">*</span></Label>
              <Select
                value={watch("chapterId") ?? ""}
                onValueChange={(v) => setValue("chapterId", v)}
                disabled={chapters.length === 0}
              >
                <SelectTrigger className={errors.chapterId ? "border-red-400" : ""}>
                  <SelectValue placeholder={chapters.length === 0 ? "Select subject first" : "Select chapter"} />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.chapterId && <p className="text-xs text-red-600">{errors.chapterId.message}</p>}
            </div>
          </div>

          {/* Difficulty + Marks row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Difficulty <span className="text-red-500">*</span></Label>
              <Select
                value={watch("difficulty") ?? "MEDIUM"}
                onValueChange={(v) => setValue("difficulty", v as any)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EASY">Easy</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HARD">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Marks <span className="text-red-500">*</span></Label>
              <Input
                type="number"
                min={1}
                max={10}
                {...register("marks", { valueAsNumber: true })}
                className={errors.marks ? "border-red-400" : ""}
              />
              {errors.marks && <p className="text-xs text-red-600">{errors.marks.message}</p>}
            </div>
          </div>

          {/* Question text */}
          <div className="space-y-1.5">
            <Label>Question Text <span className="text-red-500">*</span></Label>
            <Textarea
              rows={3}
              placeholder="Enter the question…"
              {...register("questionText")}
              className={errors.questionText ? "border-red-400" : ""}
            />
            {errors.questionText && <p className="text-xs text-red-600">{errors.questionText.message}</p>}
          </div>

          {/* Options */}
          <div className="space-y-2">
            <Label>Options <span className="text-red-500">*</span></Label>
            {(["A", "B", "C", "D"] as const).map((opt) => {
              const field = `option${opt}` as keyof QuestionInput;
              const err   = errors[field];
              return (
                <div key={opt} className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center shrink-0">
                    {opt}
                  </span>
                  <Input
                    placeholder={`Option ${opt}`}
                    {...register(field as any)}
                    className={cn("flex-1", err ? "border-red-400" : "")}
                  />
                </div>
              );
            })}
          </div>

          {/* Correct Answer */}
          <div className="space-y-1.5">
            <Label>Correct Answer <span className="text-red-500">*</span></Label>
            <Select
              value={watch("correctOption") ?? ""}
              onValueChange={(v) => setValue("correctOption", v as any)}
            >
              <SelectTrigger className={errors.correctOption ? "border-red-400" : ""}>
                <SelectValue placeholder="Select correct option" />
              </SelectTrigger>
              <SelectContent>
                {["A", "B", "C", "D"].map((o) => (
                  <SelectItem key={o} value={o}>Option {o}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.correctOption && <p className="text-xs text-red-600">{errors.correctOption.message}</p>}
          </div>

          {/* Explanation */}
          <div className="space-y-1.5">
            <Label>Explanation <span className="text-gray-400 text-xs font-normal">(optional)</span></Label>
            <Textarea
              rows={3}
              placeholder="Explain why the correct answer is right…"
              {...register("explanation")}
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : isEdit ? "Update Question" : "Add Question"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Bulk Upload Dialog ───────────────────────────────────────────────────────
function BulkUploadDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qClient    = useQueryClient();
  const fileRef    = useRef<HTMLInputElement>(null);
  const [rows,     setRows]     = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [result,   setResult]   = useState<{ success: number; failed: number; errors: { row: number; message: string }[] } | null>(null);
  const [uploading, setUploading] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);

    Papa.parse(file, {
      header:              true,
      skipEmptyLines:      true,
      transformHeader:     (h) => h.trim(),
      complete: (results) => setRows(results.data as Record<string, string>[]),
    });
  }

  async function handleUpload() {
    if (rows.length === 0) return;
    setUploading(true);
    try {
      const res  = await fetch("/api/questions/bulk-upload", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rows }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ title: "Upload failed", description: json.error, variant: "destructive" });
        return;
      }
      setResult(json.data);
      qClient.invalidateQueries({ queryKey: ["admin-questions"] });
      if (json.data.success > 0) {
        toast({ title: `${json.data.success} questions uploaded successfully!`, variant: "success" });
      }
    } catch {
      toast({ title: "Upload error", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  function handleClose() {
    setRows([]); setFileName(""); setResult(null);
    onClose();
  }

  const CSV_TEMPLATE = "Subject,Chapter,Difficulty,Question,OptionA,OptionB,OptionC,OptionD,CorrectAnswer,Explanation\nMathematics,Trigonometry,EASY,\"What is sin(0)?\",0,1,-1,0.5,A,\"sin(0) = 0 because at 0 radians the y-coordinate on the unit circle is 0.\"";

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "ioe_questions_template.csv";
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-blue-600" />
            Bulk Upload Questions
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import multiple questions at once.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Template download */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-xs font-semibold text-blue-700 mb-2">CSV Format</p>
            <p className="text-xs text-blue-600 font-mono break-all">
              Subject, Chapter, Difficulty, Question, OptionA, OptionB, OptionC, OptionD, CorrectAnswer, Explanation
            </p>
            <Button variant="outline" size="sm" className="mt-2 text-xs h-7" onClick={downloadTemplate}>
              <FileText className="h-3 w-3 mr-1.5" />
              Download Template
            </Button>
          </div>

          {/* File input */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
          >
            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">
              {fileName ? fileName : "Click to select CSV file"}
            </p>
            {rows.length > 0 && (
              <p className="text-xs text-blue-600 mt-1 font-medium">
                {rows.length} rows detected
              </p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleFile}
              className="hidden"
            />
          </div>

          {/* Result */}
          {result && (
            <div className="space-y-2">
              <div className="flex gap-3">
                <div className="flex-1 p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                  <p className="text-lg font-bold text-green-600">{result.success}</p>
                  <p className="text-xs text-green-700">Uploaded</p>
                </div>
                <div className="flex-1 p-3 bg-red-50 rounded-lg border border-red-200 text-center">
                  <p className="text-lg font-bold text-red-600">{result.failed}</p>
                  <p className="text-xs text-red-700">Failed</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600 bg-red-50 p-2 rounded">
                      Row {e.row}: {e.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose}>Close</Button>
          <Button
            onClick={handleUpload}
            disabled={rows.length === 0 || uploading}
          >
            {uploading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
              : <><Upload className="h-4 w-4" /> Upload {rows.length > 0 ? `(${rows.length})` : ""}</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminQuestionsPage() {
  const qClient = useQueryClient();

  // Form initial values when opening Add Question scoped to a subject/chapter
  const [formInitialSubject, setFormInitialSubject] = useState<string | null>(null);
  const [formInitialChapter, setFormInitialChapter] = useState<string | null>(null);

  // Filters
  const [search,     setSearch]     = useState("");
  const [subjectId,  setSubjectId]  = useState("all");
  const [chapterId,  setChapterId]  = useState("all");
  const [difficulty, setDifficulty] = useState("all");
  const [page,       setPage]       = useState(1);
  const PAGE_SIZE = 20;

  // Dialog state
  const [showForm,      setShowForm]      = useState(false);
  const [showBulk,      setShowBulk]      = useState(false);
  const [editQuestion,  setEditQuestion]  = useState<Question | null>(null);
  const [deleteId,      setDeleteId]      = useState<string | null>(null);

  // Fetch subjects
  const { data: subjectsData } = useQuery<{ success: boolean; data: Subject[] }>({
    queryKey: ["subjects"],
    queryFn:  async () => {
      const res = await fetch("/api/subjects");
      return res.json();
    },
  });
  const subjects        = subjectsData?.data ?? [];
  const selectedSubject = subjects.find((s) => s.id === subjectId);
  const chapters        = selectedSubject?.chapters ?? [];

  // Fetch questions
  const params = new URLSearchParams();
  if (subjectId  !== "all") params.set("subjectId",  subjectId);
  if (chapterId  !== "all") params.set("chapterId",  chapterId);
  if (difficulty !== "all") params.set("difficulty", difficulty);
  if (search)               params.set("keyword",    search);
  params.set("page",     String(page));
  params.set("pageSize", String(PAGE_SIZE));

  const { data: questionsData, isLoading } = useQuery<{
    success: boolean;
    data: Question[];
    pagination: Pagination;
  }>({
    queryKey: ["admin-questions", subjectId, chapterId, difficulty, search, page],
    queryFn:  async () => {
      const res = await fetch(`/api/questions?${params}`);
      return res.json();
    },
  });

  const questions  = questionsData?.data ?? [];
  const pagination = questionsData?.pagination;

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/questions/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      toast({ title: "Question deleted", variant: "default" });
      qClient.invalidateQueries({ queryKey: ["admin-questions"] });
      setDeleteId(null);
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  function handleEdit(q: Question) {
    setEditQuestion(q);
    setShowForm(true);
  }

  function handleAdd() {
    setEditQuestion(null);
    setFormInitialSubject(null);
    setFormInitialChapter(null);
    setShowForm(true);
  }

  function handleAddForSubject(subjectId: string) {
    setEditQuestion(null);
    setFormInitialSubject(subjectId);
    setFormInitialChapter(null);
    setShowForm(true);
  }

  function handleAddForChapter(subjectId: string, chapterId: string) {
    setEditQuestion(null);
    setFormInitialSubject(subjectId);
    setFormInitialChapter(chapterId);
    setShowForm(true);
  }

  function handleSubjectChange(val: string) {
    setSubjectId(val);
    setChapterId("all");
    setPage(1);
  }

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-blue-600" />
            Question Bank
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {pagination ? `${pagination.total} questions total` : "Manage all questions"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulk(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Bulk Upload
          </Button>
          <Button onClick={handleAdd} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Subjects quick-add section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Quick Add by Subject</h2>
          <p className="text-sm text-gray-600">{subjects.length} subjects</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {subjects.map((s) => (
            <Card key={s.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{(s.units ?? []).length} units</p>
                  </div>
                  <Button size="sm" onClick={() => handleAddForSubject(s.id)} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Add Question
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(s.units ?? []).map((u) => (
                    <div key={u.id} className="border-l-2 border-blue-200 pl-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-sm text-gray-800">{u.name}</p>
                        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded">
                          {(u.chapters ?? []).length} chapters
                        </span>
                      </div>
                      <div className="space-y-1">
                        {(u.chapters ?? []).map((c) => (
                          <div key={c.id} className="flex items-center justify-between p-1.5 bg-gray-50 rounded hover:bg-gray-100 transition-colors">
                            <span className="text-xs text-gray-700">{c.name}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleAddForChapter(s.id, c.id)}
                              className="h-6 px-2 text-blue-600 hover:text-blue-800"
                            >
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search questions…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <Select value={subjectId} onValueChange={handleSubjectChange}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={chapterId}
              onValueChange={(v) => { setChapterId(v); setPage(1); }}
              disabled={subjectId === "all"}
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="All Chapters" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Chapters</SelectItem>
                {chapters.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={difficulty} onValueChange={(v) => { setDifficulty(v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="EASY">Easy</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="HARD">Hard</SelectItem>
              </SelectContent>
            </Select>
            {(subjectId !== "all" || difficulty !== "all" || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setSearch(""); setSubjectId("all"); setChapterId("all"); setDifficulty("all"); setPage(1); }}
                className="gap-1.5 text-gray-500"
              >
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : questions.length === 0 ? (
            <div className="py-16 text-center">
              <HelpCircle className="h-10 w-10 mx-auto text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">No questions found.</p>
              <p className="text-gray-400 text-sm mt-1">
                {search || subjectId !== "all" || difficulty !== "all"
                  ? "Try adjusting your filters."
                  : "Add your first question or upload a CSV."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Question</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Chapter</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead className="text-center">Correct</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {questions.map((q) => (
                    <TableRow key={q.id} className="align-top">
                      <TableCell>
                        <p className="text-sm font-medium text-gray-900 leading-snug">
                          {truncate(q.questionText, 90)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{q.subject.name}</Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-500">{q.chapter.name}</span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          q.difficulty === "EASY"   ? "badge-easy"   :
                          q.difficulty === "MEDIUM" ? "badge-medium" : "badge-hard"
                        )}>
                          {q.difficulty}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                          {q.correctOption}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(q)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteId(q.id)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <p>
            Showing {(pagination.page - 1) * PAGE_SIZE + 1}–
            {Math.min(pagination.page * PAGE_SIZE, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="font-medium text-gray-700">
              Page {page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <QuestionFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditQuestion(null); setFormInitialSubject(null); setFormInitialChapter(null); }}
        editQuestion={editQuestion}
        subjects={subjects}
        initialSubjectId={formInitialSubject}
        initialChapterId={formInitialChapter}
      />

      {/* Bulk Upload Dialog */}
      <BulkUploadDialog open={showBulk} onClose={() => setShowBulk(false)} />

      {/* Delete Confirmation */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Delete Question?
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. The question will be permanently removed from the bank.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              {deleteMutation.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Deleting…</>
                : <><Trash2 className="h-4 w-4" /> Delete</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
