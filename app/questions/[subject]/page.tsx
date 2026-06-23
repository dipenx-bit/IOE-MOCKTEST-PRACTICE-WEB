import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";

function slugify(name: string) {
  return encodeURIComponent(name.toLowerCase().replace(/\s+/g, "-"));
}

function unslug(slug: string) {
  return decodeURIComponent(slug).replace(/-/g, " ");
}

export default async function SubjectPage(props: any) {
  const { params } = props as any;
  const { subject } = params;
  const subjectName = unslug(subject);
  const subjectData = await prisma.subject.findFirst({
    where: { name: { equals: subjectName, mode: "insensitive" } },
    include: {
      units: {
        orderBy: { name: "asc" },
        include: {
          chapters: { orderBy: { name: "asc" } },
        },
      },
      _count: { select: { questions: true } },
    },
  });

  if (!subjectData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Subject Not Found</h1>
        <p className="text-gray-600">The subject you're looking for doesn't exist.</p>
        <Link href="/questions" className="text-blue-600 hover:underline">
          ← Back to Questions
        </Link>
      </div>
    );
  }

  const units = subjectData.units ?? [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <BreadcrumbNav
        items={[
          { label: "Questions", href: "/questions" },
          { label: subjectData.name },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{subjectData.name}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {subjectData._count?.questions ?? 0} questions across {units.length} unit{units.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/questions" className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
          ← Back to Subjects
        </Link>
      </div>

      {/* Units Grid */}
      {units.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500 text-base">No units found for this subject.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {units.map((unit) => (
            <Card key={unit.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <Link href={`/questions/${subject}/${slugify(unit.name)}`}>
                      <CardTitle className="text-xl text-gray-900 hover:text-blue-600 transition-colors">
                        {unit.name}
                      </CardTitle>
                    </Link>
                    <p className="text-sm text-gray-600 mt-1">
                      {unit.chapters?.length ?? 0} chapter{(unit.chapters?.length ?? 0) !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <Link
                    href={`/questions/${subject}/${slugify(unit.name)}`}
                    className="text-sm px-3 py-1 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors whitespace-nowrap"
                  >
                    View Chapters
                  </Link>
                </div>
              </CardHeader>

              {/* Chapters preview */}
              {(unit.chapters?.length ?? 0) > 0 && (
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Chapters</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {(unit.chapters ?? []).map((chapter) => (
                        <div key={chapter.id} className="p-2 bg-gray-50 rounded text-sm text-gray-700 hover:bg-gray-100 transition-colors">
                          <Link href={`/questions/${params.subject}/${slugify(unit.name)}/${slugify(chapter.name)}`} className="hover:text-blue-600">
                            {chapter.name}
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
