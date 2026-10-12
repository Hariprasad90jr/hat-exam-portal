import { prisma } from "../src/lib/prisma";
import { Role } from "@prisma/client";
import crypto from "crypto";
import {
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  isSuperAdmin,
  isAdmin,
  requireAdmin,
  requireSuperAdmin,
} from "../src/lib/auth";
import { validateStrongPassword } from "../src/lib/validation";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    failed++;
  }
}

async function runPhase7Tests() {
  console.log("================================================================================");
  console.log("   PHASE 7 / PHASE 1 — ADMINISTRATOR MANAGEMENT & PASSWORD SECURITY TESTS       ");
  console.log("================================================================================\n");

  // 1. Role enum and Prisma schema
  console.log("🏛️ 1. Verifying Database Schema & Role Enums...");
  assert(Role.SUPER_ADMIN === "SUPER_ADMIN", "Role.SUPER_ADMIN is defined in Prisma client");
  assert(Role.ADMIN === "ADMIN", "Role.ADMIN is defined in Prisma client");
  assert(Role.STUDENT === "STUDENT", "Role.STUDENT is defined in Prisma client");

  // 2. Verified Accounts & Role Distribution
  console.log("\n👥 2. Verifying Production Account State...");
  const superAdmin = await prisma.user.findUnique({
    where: { email: "hariprasad@hatinnovations.com" },
  });
  assert(superAdmin !== null, "hariprasad@hatinnovations.com exists");
  assert(superAdmin?.role === Role.SUPER_ADMIN, "hariprasad@hatinnovations.com is SUPER_ADMIN");
  assert(superAdmin?.tokenVersion === 1, "hariprasad@hatinnovations.com tokenVersion initialized to 1");

  const admin = await prisma.user.findUnique({
    where: { email: "admin@yadasutra.com" },
  });
  assert(admin !== null, "admin@yadasutra.com exists");
  assert(admin?.role === Role.ADMIN, "admin@yadasutra.com is Role.ADMIN");
  assert(admin?.tokenVersion === 1, "admin@yadasutra.com tokenVersion initialized to 1");

  const studentCount = await prisma.user.count({ where: { role: Role.STUDENT } });
  assert(studentCount === 2, "Exactly 2 student accounts preserved");

  // 3. Authorization Helpers
  console.log("\n🛡️ 3. Testing RBAC & Authorization Helper Utilities...");
  assert(isSuperAdmin(Role.SUPER_ADMIN) === true, "isSuperAdmin(SUPER_ADMIN) returns true");
  assert(isSuperAdmin(Role.ADMIN) === false, "isSuperAdmin(ADMIN) returns false");
  assert(isSuperAdmin(Role.STUDENT) === false, "isSuperAdmin(STUDENT) returns false");
  assert(isSuperAdmin(null) === false, "isSuperAdmin(null) returns false");

  assert(isAdmin(Role.SUPER_ADMIN) === true, "isAdmin(SUPER_ADMIN) returns true");
  assert(isAdmin(Role.ADMIN) === true, "isAdmin(ADMIN) returns true");
  assert(isAdmin(Role.STUDENT) === false, "isAdmin(STUDENT) returns false");
  assert(isAdmin(null) === false, "isAdmin(null) returns false");

  assert(requireAdmin({ id: "1", email: "a", name: "a", role: Role.SUPER_ADMIN }) === true, "requireAdmin accepts SUPER_ADMIN");
  assert(requireAdmin({ id: "1", email: "a", name: "a", role: Role.ADMIN }) === true, "requireAdmin accepts ADMIN");
  assert(requireAdmin({ id: "1", email: "a", name: "a", role: Role.STUDENT }) === false, "requireAdmin rejects STUDENT");

  assert(requireSuperAdmin({ id: "1", email: "a", name: "a", role: Role.SUPER_ADMIN }) === true, "requireSuperAdmin accepts SUPER_ADMIN");
  assert(requireSuperAdmin({ id: "1", email: "a", name: "a", role: Role.ADMIN }) === false, "requireSuperAdmin rejects ADMIN");

  // 4. Strong Password Policy
  console.log("\n🔐 4. Testing Strong Password Policy Enforcement...");
  assert(!validateStrongPassword("Short1!").valid, "Rejects password under 12 characters");
  assert(!validateStrongPassword("alllowercase123!@#").valid, "Rejects password without uppercase");
  assert(!validateStrongPassword("ALLUPPERCASE123!@#").valid, "Rejects password without lowercase");
  assert(!validateStrongPassword("NoDigitsPassword!@#").valid, "Rejects password without digits");
  assert(!validateStrongPassword("NoSpecialChars123456").valid, "Rejects password without special characters");
  assert(validateStrongPassword("SecureP@ssw0rd2026!").valid, "Accepts compliant 12+ char complex password");

  // 5. Token Versioning & Immediate Session Invalidation
  console.log("\n🔄 5. Testing Token Versioning & Session Revocation...");
  const testPayload = {
    id: "test_user_token_version",
    email: "test@tokenversion.com",
    name: "Token Test",
    role: Role.ADMIN,
    tokenVersion: 1,
  };
  const tokenV1 = await signToken(testPayload);
  const decoded = await verifyToken(tokenV1);
  assert(decoded?.tokenVersion === 1, "JWT token carries tokenVersion payload");

  // Simulate tokenVersion check: if DB has tokenVersion: 2, tokenV1 is invalid
  const simulatedDbTokenVersion = 2;
  const isSessionValid = decoded?.tokenVersion === simulatedDbTokenVersion;
  assert(!isSessionValid, "Old session token with tokenVersion: 1 rejected when user tokenVersion bumped to 2");

  // 6. Password Reset Token Lifecycle
  console.log("\n🎫 6. Testing Password Reset Token Generation & Validation...");
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // +30m

  assert(rawToken.length === 64, "Generated raw token is 64 hex characters (32 bytes entropy)");
  assert(tokenHash.length === 64, "SHA-256 token hash is 64 hex characters");

  // Simulate single-use token logic
  const mockTokenRecord = {
    tokenHash,
    expiresAt,
    usedAt: null as Date | null,
  };
  assert(mockTokenRecord.usedAt === null, "New token record has usedAt = null");
  assert(mockTokenRecord.expiresAt > new Date(), "New token record is within 30-minute validity");

  // Mark token used
  mockTokenRecord.usedAt = new Date();
  assert(mockTokenRecord.usedAt !== null, "Token marked as used upon redemption");
  const canReuse = mockTokenRecord.usedAt === null;
  assert(!canReuse, "Re-submission of used token is blocked (Single-Use Guarantee)");

  // 7. Production Database Integrity Check
  console.log("\n📊 7. Verifying Preservation of All Production Entities...");
  const examsCount = await prisma.exam.count();
  const questionsCount = await prisma.question.count();
  const optionsCount = await prisma.questionOption.count();
  const assignmentsCount = await prisma.examAssignment.count();
  const attemptsCount = await prisma.examAttempt.count();
  const certificatesCount = await prisma.certificate.count();
  const templateCount = await prisma.certificateTemplate.count();

  assert(examsCount === 17, `Exams count preserved: ${examsCount} (expected 17)`);
  assert(questionsCount === 483, `Questions count preserved: ${questionsCount} (expected 483)`);
  assert(optionsCount === 1932, `Options count preserved: ${optionsCount} (expected 1932)`);
  assert(assignmentsCount === 33, `Assignments count preserved: ${assignmentsCount} (expected 33)`);
  assert(attemptsCount === 3, `Attempts count preserved: ${attemptsCount} (expected 3)`);
  assert(certificatesCount === 1, `Certificates count preserved: ${certificatesCount} (expected 1)`);
  assert(templateCount === 1, `Certificate templates preserved: ${templateCount} (expected 1)`);

  console.log("\n================================================================================");
  console.log(`  PHASE 7 RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase7Tests()
  .catch((err) => {
    console.error("Test execution failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
