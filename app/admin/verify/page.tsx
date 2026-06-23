"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Student = { id: string; fullName: string; email: string; createdAt: string };

export default function AdminVerifyPage() {
  const [users, setUsers] = useState<Student[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch('/api/admin/verify');
    const json = await res.json();
    if (json.success) setUsers(json.users);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function takeAction(userId: string, action: 'approve' | 'reject') {
    await fetch('/api/admin/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, action }) });
    setUsers((prev) => prev ? prev.filter(u => u.id !== userId) : prev);
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Student Verifications</h2>
      {loading && <p>Loading…</p>}
      {!loading && users && users.length === 0 && <p>No students awaiting verification.</p>}
      <div className="space-y-3">
        {users?.map(u => (
          <div key={u.id} className="p-3 border rounded flex items-center justify-between">
            <div>
              <div className="font-medium">{u.fullName}</div>
              <div className="text-sm text-muted-foreground">{u.email}</div>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => takeAction(u.id, 'reject')}>Reject</Button>
              <Button onClick={() => takeAction(u.id, 'approve')}>Approve</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
