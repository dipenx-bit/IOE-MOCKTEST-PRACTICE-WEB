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

const SAMPLE_QUESTIONS: Record<string, Record<string, SampleQuestion[]>> = {
  Mathematics: {
    Trigonometry: [
      {
        questionText: "The value of sin²θ + cos²θ is:",
        optionA: "0",
        optionB: "1",
        optionC: "2",
        optionD: "-1",
        correctOption: "B",
        explanation:
          "This is the fundamental Pythagorean identity. For any angle θ, sin²θ + cos²θ = 1. This can be derived from the unit circle definition where a point on the circle satisfies x² + y² = 1, with x = cosθ and y = sinθ.",
        difficulty: "EASY",
        marks: 1,
      },
      {
        questionText: "The value of tan 45° is:",
        optionA: "0",
        optionB: "√3",
        optionC: "1",
        optionD: "1/√2",
        correctOption: "C",
        explanation:
          "tan 45° = sin 45° / cos 45° = (1/√2) / (1/√2) = 1. Alternatively, at 45°, the opposite and adjacent sides of a right triangle are equal, so their ratio is 1.",
        difficulty: "EASY",
        marks: 1,
      },
      {
        questionText:
          "If sin A = 3/5, then the value of cos A (where A is acute) is:",
        optionA: "4/5",
        optionB: "3/4",
        optionC: "5/4",
        optionD: "5/3",
        correctOption: "A",
        explanation:
          "Using sin²A + cos²A = 1: cos²A = 1 - (3/5)² = 1 - 9/25 = 16/25. Since A is acute, cos A > 0, so cos A = 4/5.",
        difficulty: "MEDIUM",
        marks: 1,
      },
      {
        questionText: "The general solution of sin θ = 0 is:",
        optionA: "θ = nπ, n ∈ Z",
        optionB: "θ = (2n+1)π/2, n ∈ Z",
        optionC: "θ = 2nπ, n ∈ Z",
        optionD: "θ = nπ/2, n ∈ Z",
        correctOption: "A",
        explanation:
          "sin θ = 0 when θ is a multiple of π. The general solution is θ = nπ where n is any integer (0, ±1, ±2, ...), giving θ = ..., -2π, -π, 0, π, 2π, ...",
        difficulty: "MEDIUM",
        marks: 1,
      },
    ],
    Calculus: [
      {
        questionText: "The derivative of x³ with respect to x is:",
        optionA: "x²",
        optionB: "3x²",
        optionC: "3x",
        optionD: "x³",
        correctOption: "B",
        explanation:
          "Using the power rule: d/dx(xⁿ) = nxⁿ⁻¹. For x³, n = 3, so d/dx(x³) = 3x².",
        difficulty: "EASY",
        marks: 1,
      },
      {
        questionText: "∫x dx equals:",
        optionA: "x + C",
        optionB: "x²/2 + C",
        optionC: "2x + C",
        optionD: "x²+ C",
        correctOption: "B",
        explanation:
          "Using the power rule for integration: ∫xⁿ dx = xⁿ⁺¹/(n+1) + C. For ∫x dx = ∫x¹ dx = x²/2 + C.",
        difficulty: "EASY",
        marks: 1,
      },
      {
        questionText:
          "The value of lim(x→0) (sin x)/x is:",
        optionA: "0",
        optionB: "∞",
        optionC: "1",
        optionD: "undefined",
        correctOption: "C",
        explanation:
          "This is a fundamental limit in calculus. As x approaches 0, (sin x)/x approaches 1. This can be proved using the squeeze theorem or L'Hôpital's rule.",
        difficulty: "MEDIUM",
        marks: 1,
      },
    ],
    Algebra: [
      {
        questionText:
          "The roots of the quadratic equation x² - 5x + 6 = 0 are:",
        optionA: "2 and 3",
        optionB: "1 and 6",
        optionC: "-2 and -3",
        optionD: "2 and -3",
        correctOption: "A",
        explanation:
          "Factoring: x² - 5x + 6 = (x - 2)(x - 3) = 0. So x = 2 or x = 3. Verification: 2+3=5 (sum) and 2×3=6 (product). ✓",
        difficulty: "EASY",
        marks: 1,
      },
      {
        questionText:
          "If A = {1,2,3} and B = {3,4,5}, then A ∩ B is:",
        optionA: "{1,2,3,4,5}",
        optionB: "{3}",
        optionC: "{1,2}",
        optionD: "{}",
        correctOption: "B",
        explanation:
          "A ∩ B is the intersection — elements common to both sets. The only element in both A = {1,2,3} and B = {3,4,5} is 3. So A ∩ B = {3}.",
        difficulty: "EASY",
        marks: 1,
      },
    ],
  },
  Physics: {
    Mechanics: [
      {
        questionText:
          "A body is thrown vertically upward with velocity u. The time to reach maximum height is:",
        optionA: "u/g",
        optionB: "2u/g",
        optionC: "u²/2g",
        optionD: "u/2g",
        correctOption: "A",
        explanation:
          "At maximum height, velocity becomes zero. Using v = u - gt: 0 = u - gt, so t = u/g. Here g is acceleration due to gravity (9.8 m/s²).",
        difficulty: "MEDIUM",
        marks: 1,
      },
      {
        questionText: "Newton's second law of motion states that force equals:",
        optionA: "mass × velocity",
        optionB: "mass × acceleration",
        optionC: "mass × displacement",
        optionD: "mass × speed",
        correctOption: "B",
        explanation:
          "Newton's second law: F = ma, where F is the net force, m is mass, and a is acceleration. The SI unit of force is Newton (N) = kg·m/s².",
        difficulty: "EASY",
        marks: 1,
      },
      {
        questionText:
          "A car accelerates from rest to 20 m/s in 5 seconds. Its acceleration is:",
        optionA: "2 m/s²",
        optionB: "4 m/s²",
        optionC: "100 m/s²",
        optionD: "0.25 m/s²",
        correctOption: "B",
        explanation:
          "Acceleration a = (v - u)/t = (20 - 0)/5 = 4 m/s². Using the formula a = Δv/Δt where initial velocity u = 0 (starts from rest).",
        difficulty: "EASY",
        marks: 1,
      },
    ],
    "Heat and Thermodynamics": [
      {
        questionText:
          "The first law of thermodynamics is a statement of conservation of:",
        optionA: "Momentum",
        optionB: "Mass",
        optionC: "Energy",
        optionD: "Charge",
        correctOption: "C",
        explanation:
          "The first law of thermodynamics states ΔU = Q - W, which is the conservation of energy applied to thermodynamic systems. Heat added to a system equals the increase in internal energy plus work done by the system.",
        difficulty: "EASY",
        marks: 1,
      },
      {
        questionText:
          "An ideal gas undergoes isothermal expansion. Which quantity remains constant?",
        optionA: "Pressure",
        optionB: "Volume",
        optionC: "Temperature",
        optionD: "Entropy",
        correctOption: "C",
        explanation:
          "Isothermal means constant temperature (iso = same, thermal = temperature). During isothermal expansion, temperature stays constant. By the ideal gas law PV = nRT, if T is constant, P and V vary inversely.",
        difficulty: "MEDIUM",
        marks: 1,
      },
    ],
    Optics: [
      {
        questionText: "The speed of light in vacuum is approximately:",
        optionA: "3 × 10⁶ m/s",
        optionB: "3 × 10⁸ m/s",
        optionC: "3 × 10¹⁰ m/s",
        optionD: "3 × 10⁴ m/s",
        correctOption: "B",
        explanation:
          "The speed of light in vacuum c ≈ 3 × 10⁸ m/s (more precisely, 299,792,458 m/s). This is a universal physical constant and the maximum speed at which information can travel.",
        difficulty: "EASY",
        marks: 1,
      },
    ],
  },
  Chemistry: {
    "Atomic Structure": [
      {
        questionText: "The number of protons in an atom is called its:",
        optionA: "Mass number",
        optionB: "Atomic number",
        optionC: "Neutron number",
        optionD: "Valence number",
        correctOption: "B",
        explanation:
          "The atomic number (Z) is defined as the number of protons in the nucleus of an atom. It uniquely identifies a chemical element. The mass number (A) = protons + neutrons.",
        difficulty: "EASY",
        marks: 1,
      },
      {
        questionText:
          "The maximum number of electrons in the third shell (n=3) is:",
        optionA: "8",
        optionB: "18",
        optionC: "32",
        optionD: "2",
        correctOption: "B",
        explanation:
          "The maximum number of electrons in shell n is given by 2n². For n=3: 2(3)² = 2×9 = 18 electrons. The third shell has subshells 3s (2e), 3p (6e), and 3d (10e).",
        difficulty: "MEDIUM",
        marks: 1,
      },
    ],
    "Chemical Bonding": [
      {
        questionText:
          "Which type of bond is formed by the transfer of electrons?",
        optionA: "Covalent bond",
        optionB: "Metallic bond",
        optionC: "Ionic bond",
        optionD: "Hydrogen bond",
        correctOption: "C",
        explanation:
          "An ionic bond is formed by the complete transfer of electrons from one atom to another, creating oppositely charged ions (cations and anions) that attract each other. Example: NaCl (Na⁺ and Cl⁻).",
        difficulty: "EASY",
        marks: 1,
      },
    ],
  },
  English: {
    "Grammar and Usage": [
      {
        questionText:
          "Choose the correct form: 'She _____ to school every day.'",
        optionA: "go",
        optionB: "goes",
        optionC: "going",
        optionD: "gone",
        correctOption: "B",
        explanation:
          "With third-person singular subjects (he, she, it), simple present tense verbs take an -s/-es ending. 'She goes' is correct. 'Go' is used with I/you/we/they.",
        difficulty: "EASY",
        marks: 1,
      },
      {
        questionText:
          "Which sentence uses the correct form of the verb?\n'The team _____ practicing since morning.'",
        optionA: "has been",
        optionB: "have been",
        optionC: "was",
        optionD: "is",
        correctOption: "A",
        explanation:
          "'Team' is a collective noun treated as singular in British/Indian English context. The present perfect continuous 'has been practicing' correctly shows an action that started in the past and continues to the present.",
        difficulty: "MEDIUM",
        marks: 1,
      },
    ],
    Vocabulary: [
      {
        questionText: "The antonym of 'benevolent' is:",
        optionA: "Kind",
        optionB: "Generous",
        optionC: "Malevolent",
        optionD: "Charitable",
        correctOption: "C",
        explanation:
          "'Benevolent' means well-meaning and kindly. Its antonym is 'malevolent', meaning having or showing a wish to do evil to others. The prefix 'bene-' means good, while 'male-' means bad/evil.",
        difficulty: "MEDIUM",
        marks: 1,
      },
    ],
  },
};

// ─── Main Seed Function ───────────────────────────────────────────────────────
async function main() {
  console.log("🌱 Starting database seed...");

  // ── 1. Create Admin User ────────────────────────────────────────────────────
  console.log("👤 Creating admin user...");
  const adminHash = await bcrypt.hash("Admin@1234", 12);
  await prisma.user.upsert({
    where: { email: "admin@ioe.edu.np" },
    update: {},
    create: {
      fullName:     "IOE Admin",
      email:        "admin@ioe.edu.np",
      passwordHash: adminHash,
      role:         "ADMIN",
      dateOfBirth:  new Date('1980-01-01'),
      sex:          'MALE',
      collegeName:  'IOE',
    },
  });

  // ── 2. Create Demo Student ──────────────────────────────────────────────────
  console.log("👤 Creating demo student...");
  const studentHash = await bcrypt.hash("Student@1234", 12);
  const demoStudent = await prisma.user.upsert({
    where: { email: "student@ioe.edu.np" },
    update: {},
    create: {
      fullName:     "Demo Student",
      email:        "student@ioe.edu.np",
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
  console.log("   Email   : admin@ioe.edu.np");
  console.log("   Password: Admin@1234");
  console.log("\n🔑 Student credentials:");
  console.log("   Email   : student@ioe.edu.np");
  console.log("   Password: Student@1234");
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
