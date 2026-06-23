import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { BreadcrumbNav } from "@/components/breadcrumb-nav";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function slugify(name: string) {
  return encodeURIComponent(name.toLowerCase().replace(/\s+/g, "-"));
}

function unslug(slug: string) {
  return decodeURIComponent(slug).replace(/-/g, " ");
}

async function getSubject(subjectName: string) {
  return prisma.subject.findFirst({
    where: {
      name: {
        equals: subjectName,
        mode: "insensitive",
      },
    },
  });
}

async function getUnit(unitName: string, subjectId: string) {
  return prisma.unit.findFirst({
    where: {
      name: {
        equals: unitName,
        mode: "insensitive",
      },
      subjectId,
    },
  });
}

async function getChapter(
  chapterName: string,
  subjectId: string,
  unitId: string
) {
  return prisma.chapter.findFirst({
    where: {
      name: {
        equals: chapterName,
        mode: "insensitive",
      },
      subjectId,
      unitId,
    },
  });
}

type SubjectType = Awaited<ReturnType<typeof getSubject>>;
type UnitType = Awaited<ReturnType<typeof getUnit>>;
type ChapterType = Awaited<ReturnType<typeof getChapter>>;

export default async function ChapterPage({
  params,
  searchParams,
}: {
  params: { subject: string; unit: string; chapter: string };
  searchParams: { page?: string; q?: string };
}) {
  const subjectName = unslug(params.subject);
  const unitName = unslug(params.unit);
  const chapterName = unslug(params.chapter);

  const page = Number(searchParams.page ?? 1);
  const pageSize = 20;
  const keyword = searchParams.q ?? undefined;

  let subject: SubjectType = null;

  try {
    subject = await getSubject(subjectName);
  } catch (e) {
    console.error("[CHAPTER PAGE - SUBJECT]", e);
  }

  if (!subject) {
    return (
      <div>
        <h1>Subject Not Found</h1>
        <Link href="/questions">Back</Link>
      </div>
    );
  }

  let unit: UnitType = null;

  try {
    unit = await getUnit(unitName, subject.id);
  } catch (e) {
    console.error("[CHAPTER PAGE - UNIT]", e);
  }

  if (!unit) {
    return (
      <div>
        <h1>Unit Not Found</h1>
        <Link href={`/questions/${params.subject}`}>Back</Link>
      </div>
    );
  }

  let chapter: ChapterType = null;

  try {
    chapter = await getChapter(
      chapterName,
      subject.id,
      unit.id
    );
  } catch (e) {
    console.error("[CHAPTER PAGE - CHAPTER]", e);
  }

  if (!chapter) {
    return (
      <div>
        <h1>Chapter Not Found</h1>
        <Link href={`/questions/${params.subject}/${params.unit}`}>
          Back
        </Link>
      </div>
    );
  }

  const where: Record<string, any> = {
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

  let questions: Awaited<
    ReturnType<typeof prisma.question.findMany>
  > = [];

  let total = 0;

  try {
    [questions, total] = await Promise.all([
      prisma.question.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.question.count({ where }),
    ]);
  } catch (e) {
    console.error("[CHAPTER PAGE - QUESTIONS]", e);
  }

  const totalPages = Math.ceil(total / pageSize) || 1;

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Questions", href: "/questions" },
          { label: subject.name },
          { label: unit.name },
          { label: chapter.name },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold">{chapter.name}</h1>
        <p className="text-sm text-gray-600">
          {total} questions
        </p>
      </div>

      <Card>
        <CardContent className="p-4">
          <form className="flex gap-2" method="GET">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
              <Input
                name="q"
                defaultValue={keyword ?? ""}
              />
            </div>

            <Button type="submit">
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {questions.map((q) => (
          <Card key={q.id}>
            <CardHeader>
              <p>{q.questionText}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex gap-4">
          {page > 1 && (
            <Link
              href={`?page=${page - 1}${
                keyword ? `&q=${keyword}` : ""
              }`}
            >
              <ChevronLeft /> Prev
            </Link>
          )}

          <span>
            Page {page} of {totalPages}
          </span>

          {page < totalPages && (
            <Link
              href={`?page=${page + 1}${
                keyword ? `&q=${keyword}` : ""
              }`}
            >
              Next <ChevronRight />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}