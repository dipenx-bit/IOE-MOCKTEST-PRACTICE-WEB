import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

async function main() {
  const email = process.env.ADMIN_EMAIL || "dipenbudhathoki70@gmail.com";
  const password = process.env.ADMIN_PASSWORD || "lucifer69";

  const hash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      passwordHash: hash,
      role: "ADMIN",
      fullName: "Admin",
      verified: true,
      dateOfBirth: new Date('1985-01-01'),
      sex: 'MALE',
      collegeName: 'IOE',
    },
    create: {
      email,
      passwordHash: hash,
      fullName: "Admin",
      role: "ADMIN",
      verified: true,
      dateOfBirth: new Date('1985-01-01'),
      sex: 'MALE',
      collegeName: 'IOE',
    },
  });

  console.log("Admin user ensured:", user.email, "id:", user.id);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
