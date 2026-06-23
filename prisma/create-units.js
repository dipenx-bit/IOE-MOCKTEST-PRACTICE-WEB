const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Creating default unit for each subject and assigning chapters...');
  const subjects = await prisma.subject.findMany({ select: { id: true, name: true } });
  let totalAssigned = 0;

  for (const s of subjects) {
    const defaultUnitName = 'Unit 1';
    let unit = await prisma.unit.findUnique({ where: { subjectId_name: { subjectId: s.id, name: defaultUnitName } } });
    if (!unit) {
      unit = await prisma.unit.create({ data: { subjectId: s.id, name: defaultUnitName } });
      console.log(`Created unit for subject ${s.name}: ${unit.id}`);
    }

    // Assign chapters that don't have a unit yet
    const res = await prisma.chapter.updateMany({ where: { subjectId: s.id, unitId: null }, data: { unitId: unit.id } });
    if (res.count > 0) {
      console.log(`Assigned ${res.count} chapters to ${s.name} -> ${defaultUnitName}`);
      totalAssigned += res.count;
    }
  }

  console.log(`Total chapters assigned: ${totalAssigned}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
