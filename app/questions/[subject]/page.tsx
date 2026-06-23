import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    include: {
      units: {
        orderBy: {
          name: "asc",
        },
        include: {
          chapters: {
            orderBy: {
              name: "asc",
            },
          },
        },
      },
      _count: {
        select: {
          questions: true,
        },
      },
    },
  });
}

type SubjectType = Awaited<ReturnType<typeof getSubject>>;

export default async function SubjectPage({
  params,
}: {
  params: { subject: string };
}) {
  const subjectName = unslug(params.subject);

  let subjectData: SubjectType = null;

  try {
    subjectData = await getSubject(subjectName);
  } catch (error) {
    console.error("[SUBJECT PAGE ERROR]", error);
  }

  if (!subjectData) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Subject Not Found
        </h1>

        <p className="text-gray-600">
          The subject you're looking for doesn't exist.
        </p>

        <Link
          href="/questions"
          className="text-blue-600 hover:underline"
        >
          ← Back to Questions
        </Link>
      </div>
    );
  }

  const units = subjectData.units ?? [];

  return (
    <div className="space-y-6">
      <BreadcrumbNav
        items={[
          { label: "Questions", href: "/questions" },
          { label: subjectData.name },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {subjectData.name}
          </h1>

          <p className="text-sm text-gray-600 mt-1">
            {subjectData._count?.questions ?? 0} questions across{" "}
            {units.length} unit{units.length !== 1 ? "s" : ""}
          </p>
        </div>

        <Link
          href="/questions"
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          ← Back to Subjects
        </Link>
      </div>

      {units.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500">
            No units found for this subject.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {units.map((unit) => (
            <Card key={unit.id}>
              <CardHeader>
                <div className="flex justify-between gap-4">
                  <div>
                    <Link
                      href={`/questions/${params.subject}/${slugify(
                        unit.name
                      )}`}
                    >
                      <CardTitle className="hover:text-blue-600">
                        {unit.name}
                      </CardTitle>
                    </Link>

                    <p className="text-sm text-gray-600 mt-1">
                      {unit.chapters?.length ?? 0} chapters
                    </p>
                  </div>

                  <Link
                    href={`/questions/${params.subject}/${slugify(
                      unit.name
                    )}`}
                    className="text-sm px-3 py-1 bg-blue-50 text-blue-600 rounded"
                  >
                    View Chapters
                  </Link>
                </div>
              </CardHeader>

              {(unit.chapters?.length ?? 0) > 0 && (
                <CardContent>
                  <div className="grid gap-2">
                    {unit.chapters.map((chapter) => (
                      <Link
                        key={chapter.id}
                        href={`/questions/${params.subject}/${slugify(
                          unit.name
                        )}/${slugify(chapter.name)}`}
                        className="p-2 bg-gray-50 rounded hover:bg-gray-100"
                      >
                        {chapter.name}
                      </Link>
                    ))}
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