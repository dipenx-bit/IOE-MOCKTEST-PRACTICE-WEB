// app/exam/[id]/layout.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function ExamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "STUDENT") redirect("/admin/dashboard");

  // Full-screen layout — no sidebar
  return (
    <div className="min-h-screen bg-gray-100">
      {children}
    </div>
  );
}
