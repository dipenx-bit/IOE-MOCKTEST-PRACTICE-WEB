// app/admin/subjects/page.tsx
"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen, Plus, ChevronDown, ChevronRight,
  Loader2, AlertTriangle, Hash, Layers, Trash2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface Chapter {
  id:    string;
  name:  string;
  _count?: { questions: number };
}
interface Subject {
  id:       string;
  name:     string;
  chapters?: Chapter[];
  _count?:   { questions: number };
}

function SubjectCard({ subject }: { subject: Subject }) {
  const [expanded, setExpanded] = useState(false);
  const qClient = useQueryClient();
  const [newChapter, setNewChapter] = useState("");
  const [adding,     setAdding]     = useState(false);

  const addChapter = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/chapters", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ subjectId: subject.id, name: newChapter.trim() }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to add chapter");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Chapter added", variant: "success" });
      qClient.invalidateQueries({ queryKey: ["subjects"] });
      setNewChapter("");
      setAdding(false);
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteSubject = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/subjects?id=${subject.id}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to delete subject");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Subject deleted", variant: "success" });
      qClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  const deleteChapter = useMutation({
    mutationFn: async (chapterId: string) => {
      const res = await fetch(`/api/chapters?id=${chapterId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed to delete chapter");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Chapter deleted", variant: "success" });
      qClient.invalidateQueries({ queryKey: ["subjects"] });
    },
    onError: (err: Error) => toast({ title: err.message, variant: "destructive" }),
  });

  return (
    <Card className="overflow-hidden">
      {/* Subject header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
            <BookOpen className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{subject.name}</p>
            <p className="text-xs text-gray-400">
              {subject.chapters?.length ?? 0} chapter{(subject.chapters?.length ?? 0) !== 1 ? "s" : ""} ·{" "}
              {subject._count?.questions ?? 0} question{(subject._count?.questions ?? 0) !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="secondary" className="text-xs">
            {subject._count?.questions ?? 0} Qs
          </Badge>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              if (!confirm(`Delete subject "${subject.name}"? This cannot be undone.`)) return;
              deleteSubject.mutate();
            }}
            className="h-8 w-8 p-0"
            aria-label={`Delete subject ${subject.name}`}
          >
            {deleteSubject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
          </Button>
          {expanded
            ? <ChevronDown className="h-4 w-4 text-gray-400" />
            : <ChevronRight className="h-4 w-4 text-gray-400" />}
        </div>
      </div>

      {/* Chapters */}
      {expanded && (
        <div className="border-t bg-gray-50/50">
          <div className="p-4 space-y-2">
            {subject.chapters.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-3">No chapters yet.</p>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {(subject.chapters ?? []).map((chapter) => (
                  <div
                    key={chapter.id}
                    className="flex items-center justify-between px-3 py-2 bg-white rounded-lg border border-gray-200 text-sm"
                  >
                    <span className="text-gray-700 font-medium truncate">{chapter.name}</span>
                    <Badge variant="outline" className="text-xs ml-2 shrink-0">
                      {chapter._count?.questions ?? 0} Qs
                    </Badge>
                    <div className="ml-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          if (!confirm(`Delete chapter "${chapter.name}"? Questions (if any) will be moved to 'Uncategorized'. Proceed?`)) return;
                          deleteChapter.mutate(chapter.id);
                        }}
                        aria-label={`Delete chapter ${chapter.name}`}
                      >
                        {deleteChapter.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Chapter inline */}
            {adding ? (
              <div className="flex items-center gap-2 pt-2">
                <Input
                  placeholder="Chapter name…"
                  value={newChapter}
                  onChange={(e) => setNewChapter(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newChapter.trim()) addChapter.mutate();
                    if (e.key === "Escape") { setAdding(false); setNewChapter(""); }
                  }}
                  autoFocus
                  className="flex-1 h-8 text-sm"
                />
                <Button
                  size="sm"
                  className="h-8"
                  disabled={!newChapter.trim() || addChapter.isPending}
                  onClick={() => addChapter.mutate()}
                >
                  {addChapter.isPending
                    ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    : "Add"}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8"
                  onClick={() => { setAdding(false); setNewChapter(""); }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="mt-1 gap-1.5 text-xs h-8"
                onClick={() => setAdding(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Chapter
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function AdminSubjectsPage() {
  const qClient = useQueryClient();
  const [showAdd,   setShowAdd]   = useState(false);
  const [newName,   setNewName]   = useState("");
  const [nameError, setNameError] = useState("");

  const { data, isLoading } = useQuery<{ success: boolean; data: Subject[] }>({
    queryKey: ["subjects"],
    queryFn:  async () => {
      const res = await fetch("/api/subjects");
      return res.json();
    },
  });

  const subjects = data?.data ?? [];

  const addSubject = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/subjects", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ name: newName.trim() }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Failed");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Subject added successfully", variant: "success" });
      qClient.invalidateQueries({ queryKey: ["subjects"] });
      setShowAdd(false);
      setNewName("");
      setNameError("");
    },
    onError: (err: Error) => setNameError(err.message),
  });

  function handleAdd() {
    if (!newName.trim()) { setNameError("Subject name is required"); return; }
    setNameError("");
    addSubject.mutate();
  }

  const totalQuestions = subjects.reduce((s, sub) => s + (sub._count?.questions ?? 0), 0);
  const totalChapters  = subjects.reduce((s, sub) => s + (sub.chapters?.length ?? 0), 0);

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-blue-600" />
            Subjects & Chapters
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage the subject and chapter structure for the question bank.
          </p>
        </div>
        <Button onClick={() => setShowAdd(true)} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          Add Subject
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Subjects",  value: subjects.length, icon: BookOpen, color: "bg-blue-100   text-blue-600"   },
          { label: "Chapters",  value: totalChapters,   icon: Layers,   color: "bg-purple-100 text-purple-600" },
          { label: "Questions", value: totalQuestions,  icon: Hash,     color: "bg-green-100  text-green-600"  },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subject list */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : subjects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <BookOpen className="h-12 w-12 mx-auto text-gray-200" />
            <p className="text-gray-500 font-medium">No subjects yet.</p>
            <Button onClick={() => setShowAdd(true)} size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Add First Subject
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {subjects.map((subject) => (
            <SubjectCard key={subject.id} subject={subject} />
          ))}
        </div>
      )}

      {/* Add Subject Dialog */}
      <Dialog open={showAdd} onOpenChange={(o) => { if (!o) { setShowAdd(false); setNewName(""); setNameError(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Subject</DialogTitle>
            <DialogDescription>
              Add a new subject to the question bank. You can add chapters after.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="subjectName">Subject Name</Label>
              <Input
                id="subjectName"
                placeholder="e.g. Mathematics"
                value={newName}
                onChange={(e) => { setNewName(e.target.value); setNameError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                autoFocus
                className={nameError ? "border-red-400" : ""}
              />
              {nameError && <p className="text-xs text-red-600">{nameError}</p>}
            </div>
            <p className="text-xs text-gray-400">
              Standard IOE subjects: Mathematics, Physics, Chemistry, English
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={addSubject.isPending}>
              {addSubject.isPending
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Adding…</>
                : "Add Subject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
