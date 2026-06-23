"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

const SUBJECTS = ["Mathematics", "Physics", "Chemistry", "English"];

export default function AdminMockFormatPage() {
  const qClient = useQueryClient();
  const { data } = useQuery({ queryKey: ["mockFormat"], queryFn: async () => { const res = await fetch('/api/admin/mock-format'); return res.json(); } });
  const format = data?.data?.format ?? null;

  const [name, setName] = useState(format?.name ?? "IOE Full Mock");
  const [negative, setNegative] = useState(format?.negativeMark ?? 0);
  const [duration, setDuration] = useState(format?.durationMinutes ?? 120);

  const [marksEnabled, setMarksEnabled] = useState<Record<string, boolean>>(() => {
    const base: Record<string, boolean> = {};
    SUBJECTS.forEach((s) => { base[s] = true; });
    return base;
  });
  const [marksValues, setMarksValues] = useState<Record<string, number>>(() => {
    const base: Record<string, number> = {};
    SUBJECTS.forEach((s) => { base[s] = 1; });
    return base;
  });

  useEffect(() => {
    if (format) {
      setName(format.name);
      const mp: Record<string, number> = format.marksPerSubject ?? {};
      const enabled: Record<string, boolean> = {};
      const vals: Record<string, number> = {};
      SUBJECTS.forEach((s) => {
        if (typeof mp[s] === 'number') { enabled[s] = true; vals[s] = mp[s]; }
        else { enabled[s] = false; vals[s] = 1; }
      });
      setMarksEnabled(enabled);
      setMarksValues(vals);
      setNegative(format.negativeMark ?? 0);
      setDuration(format.durationMinutes ?? 120);
    }
  }, [format]);

  const save = useMutation({
    mutationFn: async () => {
      const marks: Record<string, number> = {};
      SUBJECTS.forEach((s) => {
        if (marksEnabled[s]) marks[s] = Number(marksValues[s] ?? 1);
      });
      const res = await fetch('/api/admin/mock-format', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, marksPerSubject: marks, negativeMark: Number(negative), durationMinutes: Number(duration) }) });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error || 'Failed'); }
      return res.json();
    },
    onSuccess: () => { toast({ title: 'Saved' }); qClient.invalidateQueries({ queryKey: ['mockFormat'] }); },
    onError: (e: any) => toast({ title: e.message || 'Error', variant: 'destructive' }),
  });

  return (
    <div className="space-y-4 page-enter max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Mock Test Format</h1>
        <p className="text-sm text-gray-500">Configure mock test defaults (admin only).</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Format</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div>
              <label className="text-sm">Name</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div>
              <label className="text-sm">Marks per subject</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {SUBJECTS.map((s) => (
                  <div key={s} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!marksEnabled[s]}
                      onChange={(e) => setMarksEnabled((m) => ({ ...m, [s]: e.target.checked }))}
                      className="h-4 w-4"
                    />
                    <span className="w-28 text-sm">{s}</span>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={marksValues[s]}
                      onChange={(e) => setMarksValues((m) => ({ ...m, [s]: Number(e.target.value || 0) }))}
                      disabled={!marksEnabled[s]}
                      className="w-20 p-1 border rounded"
                    />
                    <span className="text-xs text-gray-500">marks/q</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div>
                <label className="text-sm">Negative mark</label>
                <Input type="number" value={String(negative)} onChange={(e) => setNegative(Number(e.target.value))} />
              </div>
              <div>
                <label className="text-sm">Duration (minutes)</label>
                <Input type="number" value={String(duration)} onChange={(e) => setDuration(Number(e.target.value))} />
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={() => save.mutate()} disabled={save.isPending}>{save.isPending ? 'Saving...' : 'Save Format'}</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
