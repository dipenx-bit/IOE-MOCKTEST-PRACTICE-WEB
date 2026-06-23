const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Ensuring default uncategorized subject/chapter exist...');
  let defaultSubject = await prisma.subject.findUnique({ where: { name: 'Uncategorized' } });
  if (!defaultSubject) {
    defaultSubject = await prisma.subject.create({ data: { name: 'Uncategorized' } });
    console.log('Created subject:', defaultSubject.id);
  }

  let defaultChapter = await prisma.chapter.findUnique({ where: { subjectId_name: { subjectId: defaultSubject.id, name: 'Uncategorized' } } });
  if (!defaultChapter) {
    defaultChapter = await prisma.chapter.create({ data: { subjectId: defaultSubject.id, name: 'Uncategorized' } });
    console.log('Created chapter:', defaultChapter.id);
  }

  // Find questions with missing subject or chapter references
  const questions = await prisma.question.findMany({ select: { id: true, subjectId: true, chapterId: true } });
  let moved = 0;

  for (const q of questions) {
    const subj = await prisma.subject.findUnique({ where: { id: q.subjectId } });
    const chap = await prisma.chapter.findUnique({ where: { id: q.chapterId } });
    if (!subj || !chap) {
      await prisma.question.update({ where: { id: q.id }, data: { subjectId: defaultSubject.id, chapterId: defaultChapter.id } });
      moved++;
    }
  }

  console.log(`Reassigned ${moved} questions to Uncategorized.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
