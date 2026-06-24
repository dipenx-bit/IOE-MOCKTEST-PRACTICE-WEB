// prisma/seed.ts
import { PrismaClient, Difficulty } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Subject & Chapter Data ───────────────────────────────────────────────────
const SUBJECTS = [
  {
    name: "Mathematics",
    chapters: [
      "Sets and Functions",
      "Algebra",
      "Trigonometry",
      "Coordinate Geometry",
      "Calculus",
      "Vectors",
      "Statistics and Probability",
      "Matrices and Determinants",
      "Complex Numbers",
      "Sequence and Series",
    ],
  },
  {
    name: "Physics",
    chapters: [
      "Mechanics",
      "Kinematics",
      "Laws of Motion",
      "Work, Energy and Power",
      "Rotational Motion",
      "Gravitation",
      "Heat and Thermodynamics",
      "Waves and Sound",
      "Optics",
      "Electricity and Magnetism",
      "Modern Physics",
    ],
  },
  {
    name: "Chemistry",
    chapters: [
      "Atomic Structure",
      "Periodic Table",
      "Chemical Bonding",
      "States of Matter",
      "Chemical Equilibrium",
      "Acids, Bases and Salts",
      "Electrochemistry",
      "Organic Chemistry Basics",
      "Hydrocarbons",
      "Polymers",
    ],
  },
  {
    name: "English",
    chapters: [
      "Grammar and Usage",
      "Vocabulary",
      "Reading Comprehension",
      "Sentence Completion",
      "Error Detection",
    ],
  },
];

// ─── Sample Questions ─────────────────────────────────────────────────────────
interface SampleQuestion {
  questionText: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: string;
  explanation: string;
  difficulty: Difficulty;
  marks: number;
}

// NOTE: SAMPLE_QUESTIONS was missing and would cause a runtime ReferenceError.
// Provide an empty structure by default. Populate with real questions as needed.
const SAMPLE_QUESTIONS: Record<string, Record<string, SampleQuestion[]>> = {};

// ─── Main Seed Function ───────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Starting database seed...");

  // ── 1. Create Admin User ────────────────────────────────────────────────────
  console.log("👤 Creating admin user...");

const adminEmail = "dipenbudhathoki70@gmail.com";
const adminPassword = "@lucifer_69";

const adminHash = await bcrypt.hash(adminPassword, 12);

await prisma.user.upsert({
  where: { email: adminEmail },
  update: {
    passwordHash: adminHash,
    role: "ADMIN",
    dateOfBirth: new Date("2008-09-09"),
    collegeName: "Viswa Niketan Secondary College",
  },
  create: {
    fullName: "IOE Admin",
    email: adminEmail,
    passwordHash: adminHash,
    role: "ADMIN",
    dateOfBirth: new Date("2008-09-09"),
    sex: "MALE",
    collegeName: "Viswa Niketan Secondary College",
  },
});

  // ── 2. Create Demo Student ──────────────────────────────────────────────────
  console.log("👤 Creating demo student...");
  const demoStudentEmail = "student@ioe.edu.np";
  const demoStudentPassword = "Student@1234";
  const studentHash = await bcrypt.hash(demoStudentPassword, 12);
  const demoStudent = await prisma.user.upsert({
    where: { email: demoStudentEmail },
    update: {},
    create: {
      fullName:     "Demo Student",
      email:        demoStudentEmail,
      passwordHash: studentHash,
      role:         "STUDENT",
      verified:     true,
      dateOfBirth:  new Date('2005-01-01'),
      sex:          'MALE',
      collegeName:  'Demo College',
    },
  });

  // Create study stats for demo student
  await prisma.studyStats.upsert({
    where:  { userId: demoStudent.id },
    update: {},
    create: { userId: demoStudent.id },
  });

  // ── 3. Create Subjects & Chapters ──────────────────────────────────────────
  console.log("📚 Creating subjects and chapters...");
  const subjectMap: Record<string, string>  = {};
  const chapterMap: Record<string, string>  = {};

  for (const subjectData of SUBJECTS) {
    const subject = await prisma.subject.upsert({
      where:  { name: subjectData.name },
      update: {},
      create: { name: subjectData.name },
    });
    subjectMap[subjectData.name] = subject.id;

    for (const chapterName of subjectData.chapters) {
      const chapter = await prisma.chapter.upsert({
        where: {
          subjectId_name: { subjectId: subject.id, name: chapterName },
        },
        update: {},
        create: { subjectId: subject.id, name: chapterName },
      });
      chapterMap[`${subjectData.name}::${chapterName}`] = chapter.id;
    }
  }

  // ── 4. Create Sample Questions ──────────────────────────────────────────────
  console.log("❓ Creating sample questions...");
  let questionCount = 0;

  for (const [subjectName, chapters] of Object.entries(SAMPLE_QUESTIONS)) {
    const subjectId = subjectMap[subjectName];
    if (!subjectId) continue;

    for (const [chapterName, questions] of Object.entries(chapters)) {
      const chapterId = chapterMap[`${subjectName}::${chapterName}`];
      if (!chapterId) continue;

      for (const q of questions) {
        await prisma.question.create({
          data: {
            subjectId:    subjectId,
            chapterId:    chapterId,
            questionText: q.questionText,
            optionA:      q.optionA,
            optionB:      q.optionB,
            optionC:      q.optionC,
            optionD:      q.optionD,
            correctOption: q.correctOption,
            explanation:  q.explanation,
            difficulty:   q.difficulty,
            marks:        q.marks,
          },
        });
        questionCount++;
      }
    }
  }

  // ── 5. Summary ──────────────────────────────────────────────────────────────
  console.log("\n✅ Seed completed successfully!");
  console.log("─────────────────────────────────");
  console.log(`📊 Subjects created  : ${SUBJECTS.length}`);
  console.log(
    `📖 Chapters created  : ${SUBJECTS.reduce((a, s) => a + s.chapters.length, 0)}`
  );
  console.log(`❓ Questions created : ${questionCount}`);
  console.log("─────────────────────────────────");
  console.log("🔑 Admin credentials:");
  console.log(`   Email   : ${adminEmail}`);
  console.log(`   Password: ${adminPassword}`);
  console.log("\n🔑 Student credentials:");
  console.log(`   Email   : ${demoStudentEmail}`);
  console.log(`   Password: ${demoStudentPassword}`);
  console.log("─────────────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
