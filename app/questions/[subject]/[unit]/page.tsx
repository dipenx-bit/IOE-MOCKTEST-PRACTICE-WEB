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

interface UnitPageParams {
  params: {
    subject: string;
    unit: string;
  };
}

export default async function UnitPage({ params }: UnitPageParams) {
  const subjectName = unslug(params.subject);
  const unitName = unslug(params.unit);

  // Fetch subject and unit together
  const subject = await prisma.subject.findFirst({
    where: { name: { equals: subjectName, mode: "insensitive" } },
    include: {
      units: {
        where: { name: { equals: unitName, mode: "insensitive" } },
        include: {
          chapters: { orderBy: { name: "asc" } },
        },
      },
      _count: { select: { questions: true } },
    },
  });

  if (!subject) {
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

  const unit = subject.units?.[0];

  if (!unit) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Unit Not Found</h1>
        <p className="text-gray-600">The unit you're looking for doesn't exist.</p>
        <Link href={`/questions/${params.subject}`} className="text-blue-600 hover:underline">
          ← Back to {subject.name}
        </Link>
      </div>
    );
  }

  const chapters = unit.chapters ?? [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <BreadcrumbNav
        items={[
          { label: "Questions", href: "/questions" },
          { label: subject.name, href: `/questions/${params.subject}` },
          { label: unit.name },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{unit.name}</h1>
          <p className="text-sm text-gray-600 mt-1">
            {chapters.length} chapter{chapters.length !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Part of <span className="font-medium text-gray-700">{subject.name}</span>
          </p>
        </div>
        <Link href={`/questions/${params.subject}`} className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
          ← Back to Units
        </Link>
      </div>

      {/* Chapters Grid */}
      {chapters.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500 text-base">No chapters found in this unit.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {chapters.map((chapter) => (
            <Link key={chapter.id} href={`/questions/${params.subject}/${params.unit}/${slugify(chapter.name)}`}>
              <Card className="h-full hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900">{chapter.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">
                    Questions in this chapter
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
