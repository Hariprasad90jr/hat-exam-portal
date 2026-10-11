import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Setting up Phase 6A Test Accounts...");

  const adminPassword = await bcrypt.hash("AdminPassword123!", 10);
  const studentPassword = await bcrypt.hash("StudentPassword123!", 10);

  // 1. Create or update Test Admin
  const admin = await prisma.user.upsert({
    where: { email: "admin.test@examportal.edu" },
    update: { role: Role.ADMIN, isActive: true },
    create: {
      name: "Phase 6 Test Administrator",
      email: "admin.test@examportal.edu",
      password: adminPassword,
      role: Role.ADMIN,
      department: "Quality Assurance & Testing",
      isActive: true,
    },
  });
  console.log(`✅ Admin Account: ${admin.email} (Role: ${admin.role})`);

  // 2. Create or update Test Student 1
  const student1 = await prisma.user.upsert({
    where: { email: "student1.test@examportal.edu" },
    update: { role: Role.STUDENT, isActive: true },
    create: {
      name: "Phase 6 Test Student One",
      email: "student1.test@examportal.edu",
      password: studentPassword,
      role: Role.STUDENT,
      studentId: "STU-TEST-001",
      department: "Computer Science",
      isActive: true,
    },
  });
  console.log(`✅ Student 1 Account: ${student1.email} (Student ID: ${student1.studentId})`);

  // 3. Create or update Test Student 2
  const student2 = await prisma.user.upsert({
    where: { email: "student2.test@examportal.edu" },
    update: { role: Role.STUDENT, isActive: true },
    create: {
      name: "Phase 6 Test Student Two",
      email: "student2.test@examportal.edu",
      password: studentPassword,
      role: Role.STUDENT,
      studentId: "STU-TEST-002",
      department: "Information Technology",
      isActive: true,
    },
  });
  console.log(`✅ Student 2 Account: ${student2.email} (Student ID: ${student2.studentId})`);

  console.log("\nSetup complete! You can now log into http://localhost:3000/login using these test credentials.");
}

main()
  .catch((e) => {
    console.error("Setup error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
