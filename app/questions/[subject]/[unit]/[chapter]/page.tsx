import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";

function slugify(name: string) {
  return encodeURIComponent(name.toLowerCase().replace(/\s+/g, "-"));
}

function unslug(slug: string) {
  return decodeURIComponent(slug).replace(/-/g, " ");
}

export default async function ChapterPage(props: any) {
  const { params, searchParams } = props as any;
  const subjectName = unslug(params.subject);
  const unitName = unslug(params.unit);
  const chapterName = unslug(params.chapter);
  const page = Number(searchParams.page ?? 1);
  const pageSize = 20;

  // Fetch subject
  const subject = await prisma.subject.findFirst({
    where: { name: { equals: subjectName, mode: "insensitive" } },
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

  // Fetch unit
  const unit = await prisma.unit.findFirst({
    where: {
      name: { equals: unitName, mode: "insensitive" },
      subjectId: subject.id,
    },
  });

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

  // Fetch chapter
  const chapter = await prisma.chapter.findFirst({
    where: {
      name: { equals: chapterName, mode: "insensitive" },
      subjectId: subject.id,
      unitId: unit.id,
    },
  });

  if (!chapter) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Chapter Not Found</h1>
        <p className="text-gray-600">The chapter you're looking for doesn't exist.</p>
        <Link href={`/questions/${params.subject}/${params.unit}`} className="text-blue-600 hover:underline">
          ← Back to {unit.name}
        </Link>
      </div>
    );
  }

  // Build search query
  const keyword = searchParams.q ?? undefined;
  const where: any = {
    subjectId: subject.id,
    chapterId: chapter.id,
  };

  if (keyword) {
    where.OR = [
      { questionText: { contains: keyword, mode: "insensitive" } },
      { optionA: { contains: keyword, mode: "insensitive" } },
      { optionB: { contains: keyword, mode: "insensitive" } },
      { optionC: { contains: keyword, mode: "insensitive" } },
      { optionD: { contains: keyword, mode: "insensitive" } },
    ];
  }

  // Fetch questions
  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.question.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <BreadcrumbNav
        items={[
          { label: "Questions", href: "/questions" },
          { label: subject.name, href: `/questions/${params.subject}` },
          { label: unit.name, href: `/questions/${params.subject}/${params.unit}` },
          { label: chapter.name },
        ]}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{chapter.name}</h1>
          <p className="text-sm text-gray-600 mt-1">{total} questions</p>
          <p className="text-xs text-gray-500 mt-2">
            <span className="font-medium">{subject.name}</span> • <span className="font-medium">{unit.name}</span>
          </p>
        </div>
        <Link href={`/questions/${params.subject}/${params.unit}`} className="text-sm text-blue-600 hover:text-blue-800 transition-colors">
          ← Back to {unit.name}
        </Link>
      </div>

      {/* Search */}
      {total > 0 && (
        <Card>
          <CardContent className="p-4">
            <form className="flex gap-2" method="GET">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  name="q"
                  placeholder="Search questions…"
                  defaultValue={keyword ?? ""}
                  className="pl-9"
                />
              </div>
              <Button type="submit" variant="outline">
                Search
              </Button>
              {keyword && (
                <Link href={`/questions/${params.subject}/${params.unit}/${slugify(chapter.name)}`} className="text-sm text-blue-600 hover:underline">
                  Clear
                </Link>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Questions List */}
      {questions.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500 text-base">
            {keyword ? "No questions match your search." : "No questions found in this chapter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, index) => (
            <Card key={q.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex-shrink-0 mt-1">
                        {(page - 1) * pageSize + index + 1}
                      </span>
                      <p className="font-medium text-gray-900 leading-relaxed">{q.questionText}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold flex-shrink-0 ${
                      q.difficulty === "EASY"
                        ? "bg-green-100 text-green-700"
                        : q.difficulty === "MEDIUM"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {q.difficulty.charAt(0)}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Options */}
                <div className="space-y-2">
                  {[
                    { key: "A", value: q.optionA },
                    { key: "B", value: q.optionB },
                    { key: "C", value: q.optionC },
                    { key: "D", value: q.optionD },
                  ].map(({ key, value }) => (
                    <div key={key} className="flex items-start gap-3">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold flex-shrink-0 ${
                          q.correctOption === key
                            ? "bg-green-200 text-green-800 border border-green-400"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {key}
                      </span>
                      <p className={`text-sm ${q.correctOption === key ? "text-green-800 font-medium" : "text-gray-700"}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Explanation:</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{q.explanation}</p>
                  </div>
                )}

                {/* Marks */}
                <div className="flex items-center gap-2 text-xs text-gray-500 pt-2">
                  <span className="px-2 py-1 bg-gray-100 rounded">{q.marks} mark{q.marks !== 1 ? "s" : ""}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total} questions
          </p>
          <div className="flex items-center gap-2">
            {page > 1 && (
              <Link
                href={`/questions/${params.subject}/${params.unit}/${slugify(chapter.name)}?page=${page - 1}${keyword ? `&q=${encodeURIComponent(keyword)}` : ""}`}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm border rounded hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Link>
            )}
            <span className="text-sm text-gray-700 font-medium">
              Page {page} of {totalPages}
            </span>
            {page < totalPages && (
              <Link
                href={`/questions/${params.subject}/${params.unit}/${slugify(chapter.name)}?page=${page + 1}${keyword ? `&q=${encodeURIComponent(keyword)}` : ""}`}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm border rounded hover:bg-gray-50 transition-colors"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
