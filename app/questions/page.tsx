import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";

function slugify(name: string) {
  return encodeURIComponent(name.toLowerCase().replace(/\s+/g, "-"));
}

export default async function QuestionsIndexPage() {
  const subjects = await prisma.subject.findMany({
    include: {
      units: {
        include: {
          chapters: { orderBy: { name: "asc" } },
        },
        orderBy: { name: "asc" },
      },
      _count: { select: { questions: true } },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <BreadcrumbNav items={[{ label: "Questions" }]} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Question Bank</h1>
          <p className="text-sm text-gray-600 mt-1">
            {subjects.length} subjects • {subjects.reduce((sum, s) => sum + (s._count?.questions ?? 0), 0)} total questions
          </p>
          <p className="text-xs text-gray-500 mt-2">Browse and study questions organized by subject and topic</p>
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((s) => (
          <Link key={s.id} href={`/questions/${slugify(s.name)}`}>
            <Card className="h-full hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer">
              <CardHeader>
                <CardTitle className="text-xl text-gray-900">{s.name}</CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  {s._count?.questions ?? 0} questions
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Units</p>
                  <div className="flex flex-col gap-2">
                    {(s.units ?? []).slice(0, 4).map((u) => (
                      <div key={u.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm hover:bg-gray-100 transition-colors">
                        <span className="text-gray-800 font-medium truncate">{u.name}</span>
                        <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                          {(u.chapters ?? []).length} c
                        </span>
                      </div>
                    ))}
                    {(s.units ?? []).length > 4 && (
                      <p className="text-xs text-gray-500 p-2">
                        +{(s.units ?? []).length - 4} more unit{(s.units ?? []).length - 4 !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {subjects.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-gray-500 text-base">No subjects found yet.</p>
        </div>
      )}
    </div>
  );
}
