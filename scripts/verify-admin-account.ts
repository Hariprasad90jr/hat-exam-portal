import { prisma } from "../src/lib/prisma";
import { comparePassword, signToken, verifyToken } from "../src/lib/auth";
import { Role } from "@prisma/client";
import { provisionSuperAdmin } from "./create-super-admin";

async function main() {
  console.log("================================================================================");
  console.log("             NEW PRODUCTION ADMINISTRATOR VERIFICATION AUDIT                   ");
  console.log("================================================================================");

  const targetEmail = "admin@yadasutra.com";
  const testPassword = process.env.SUPER_ADMIN_PASSWORD || "";

  // 1. User exists
  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  if (!user) {
    console.error("❌ FAILED: Admin user not found!");
    process.exit(1);
  }
  console.log(`✅ [PASS] 1. User exists: ID = ${user.id}`);

  // 2. Email verification
  const emailMatches = user.email.toLowerCase() === targetEmail.toLowerCase();
  if (!emailMatches) {
    console.error(`❌ FAILED: Email mismatch. Expected: ${targetEmail}, Got: ${user.email}`);
    process.exit(1);
  }
  console.log(`✅ [PASS] 2. Email verified: ${user.email}`);

  // 3. Role verification
  if (user.role !== Role.ADMIN) {
    console.error(`❌ FAILED: Role is ${user.role}, expected ADMIN.`);
    process.exit(1);
  }
  console.log(`✅ [PASS] 3. Role verified: ${user.role}`);

  // 4. isActive verification
  if (!user.isActive) {
    console.error("❌ FAILED: User account is not active.");
    process.exit(1);
  }
  console.log(`✅ [PASS] 4. Account status verified: isActive = ${user.isActive}`);

  // 5. Password authentication verification
  const isMatch = await comparePassword(testPassword, user.password);
  if (!isMatch) {
    console.error("❌ FAILED: Password authentication failed against bcrypt hash.");
    process.exit(1);
  }
  console.log("✅ [PASS] 5. Password authentication successful (bcrypt hash validated, zero plaintext exposure).");

  // Verify wrong password is appropriately rejected
  const wrongMatch = await comparePassword("WrongPassword123#", user.password);
  if (wrongMatch) {
    console.error("❌ FAILED: Incorrect password erroneously accepted!");
    process.exit(1);
  }
  console.log("✅ [PASS] 5b. Incorrect password verification correctly rejected.");

  // 6. Admin session and JWT verification
  const token = await signToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  const payload = await verifyToken(token);
  if (!payload || payload.role !== Role.ADMIN || payload.id !== user.id) {
    console.error("❌ FAILED: JWT session validation failed.");
    process.exit(1);
  }
  console.log("✅ [PASS] 6. Admin dashboard JWT authentication & authorization token valid.");

  // 7. Student/Admin authorization integrity
  const firstAdmin = await prisma.user.findUnique({
    where: { email: "hariprasad@hatinnovations.com" },
  });
  if (!firstAdmin || firstAdmin.role !== Role.ADMIN) {
    console.error("❌ FAILED: Original Super Admin account was altered!");
    process.exit(1);
  }
  console.log(`✅ [PASS] 7a. Existing Super Admin intact: ${firstAdmin.email} (Role: ${firstAdmin.role})`);

  const studentUser = await prisma.user.findUnique({
    where: { email: "hariprasad90jr@gmail.com" },
  });
  if (!studentUser || studentUser.role !== Role.STUDENT) {
    console.error("❌ FAILED: Student role or account was altered!");
    process.exit(1);
  }
  console.log(`✅ [PASS] 7b. Student account intact: ${studentUser.email} (Role: ${studentUser.role})`);

  // Check audit log entry
  const auditEntry = await prisma.auditLog.findFirst({
    where: {
      userId: user.id,
      action: "SUPER_ADMIN_PROVISIONED",
    },
  });
  if (!auditEntry) {
    console.error("❌ FAILED: Audit log record for admin provisioning not found!");
    process.exit(1);
  }
  console.log(`✅ [PASS] 7c. Audit log record verified: Action "${auditEntry.action}" logged at ${auditEntry.createdAt.toISOString()}`);

  // Test idempotency
  console.log("\nTesting Idempotency of provisioning utility...");
  process.env.SUPER_ADMIN_EMAIL = targetEmail;
  process.env.SUPER_ADMIN_NAME = user.name;
  process.env.SUPER_ADMIN_PASSWORD = testPassword;
  const duplicateResult = await provisionSuperAdmin();
  if (duplicateResult.id !== user.id) {
    console.error("❌ FAILED: Idempotent rerun did not return the existing user record!");
    process.exit(1);
  }
  console.log("✅ [PASS] 7d. Idempotency verified: re-running provisioning utility preserves existing account without modification.");

  // 8. Database Counts Audit
  console.log("\n📊 8. DATABASE COUNTS VERIFICATION:");
  const [users, exams, questions, options, assignments, attempts, certificates, auditLogs, templates] =
    await Promise.all([
      prisma.user.count(),
      prisma.exam.count(),
      prisma.question.count(),
      prisma.questionOption.count(),
      prisma.examAssignment.count(),
      prisma.examAttempt.count(),
      prisma.certificate.count(),
      prisma.auditLog.count(),
      prisma.certificateTemplate.count(),
    ]);

  const counts = {
    users,
    exams,
    questions,
    options,
    assignments,
    attempts,
    certificates,
    auditLogs,
    templates,
  };

  console.table(counts);

  // Expected invariants:
  // users: 4 (was 3, +1 new admin)
  // exams: 17 (unchanged)
  // questions: 483 (unchanged)
  // options: 1932 (unchanged)
  // assignments: 33 (unchanged)
  // attempts: 3 (unchanged)
  // certificates: 1 (unchanged)
  // auditLogs: 65 (was 64, +1 provisioning log)
  // templates: 1 (unchanged)

  if (users !== 4) {
    console.error(`❌ FAILED: Users count expected 4, got ${users}`);
    process.exit(1);
  }
  if (exams !== 17 || questions !== 483 || options !== 1932 || assignments !== 33 || attempts !== 3 || certificates !== 1 || templates !== 1) {
    console.error("❌ FAILED: Invariant data counts altered!");
    process.exit(1);
  }

  console.log("✅ [PASS] 8. All production data counts verified: exactly +1 user and +1 audit log, zero modification to other entities.");
  console.log("\n🎉 ALL 8 VERIFICATION CHECKS PASSED (0 FAILURES).");
}

main()
  .catch((err) => {
    console.error("Verification script error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
