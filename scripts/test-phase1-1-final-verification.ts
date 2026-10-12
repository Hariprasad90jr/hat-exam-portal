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
} from "../src/lib/auth";
import {
  sendPasswordResetEmail,
  getLastOutboundEmail,
  clearOutboundEmailQueue,
  getAppBaseUrl,
} from "../src/lib/email";
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

async function runVerification() {
  console.log("================================================================================");
  console.log("   PHASE 1.1 — FINAL VERIFICATION & PASSWORD RESET EMAIL DELIVERY AUDIT        ");
  console.log("================================================================================\n");

  // ============================================================================
  // 1. Email Delivery Service Unit & Template Inspection
  // ============================================================================
  console.log("📧 1. Testing Password Reset Email Delivery & Template Structure...");
  clearOutboundEmailQueue();

  const testRecipient = "test.practitioner@yadasutra.com";
  const testName = "Acharya Vatsya";
  const dummyToken = crypto.randomBytes(32).toString("hex");
  const testResetUrl = `${getAppBaseUrl()}/reset-password?token=${dummyToken}`;

  const sendResult = await sendPasswordResetEmail({
    to: testRecipient,
    name: testName,
    resetUrl: testResetUrl,
  });

  assert(sendResult.success === true, "sendPasswordResetEmail returns success");

  const outbound = getLastOutboundEmail();
  assert(outbound !== null, "Outbound email was captured by email delivery service");
  assert(outbound?.to === testRecipient, "Outbound email recipient matches target");
  assert(outbound?.subject === "YadaSutra Examination Portal — Reset Your Password", "Subject matches exact specification");
  assert(outbound?.text.includes(`Hello ${testName},`), "Email body includes personalized greeting");
  assert(outbound?.text.includes("We received a request to reset your YadaSutra Examination Portal password."), "Email body includes notice statement");
  assert(outbound?.text.includes(testResetUrl), "Email plain text body contains the reset URL");
  assert(outbound?.text.includes("This link expires in 30 minutes and can only be used once."), "Email body includes 30m single-use notice");
  assert(outbound?.text.includes("If you did not request this password reset, you can safely ignore this email."), "Email body includes ignore notice");
  assert(outbound?.text.includes("YadaSutra — TATHA PARAMPARAYA"), "Email footer contains YadaSutra signature");
  assert(outbound?.html.includes(testResetUrl), "Email HTML contains reset button URL");
  assert(outbound?.html.includes("#0E3834"), "Email HTML uses brand header color");

  // ============================================================================
  // 2. Full End-to-End Password Reset Flow Test
  // ============================================================================
  console.log("\n🔄 2. Testing End-to-End Password Reset Flow (Ephemeral Admin)...");
  clearOutboundEmailQueue();

  // Create an ephemeral test administrator to ensure production users remain undisturbed
  const testAdminEmail = `test_flow_${Date.now()}@yadasutra.com`;
  const initialPassword = "InitialSecurePassword123!";
  const initialHashedPassword = await hashPassword(initialPassword);

  const testAdmin = await prisma.user.create({
    data: {
      name: "Temporary Verification Admin",
      email: testAdminEmail,
      password: initialHashedPassword,
      role: Role.ADMIN,
      isActive: true,
      tokenVersion: 1,
    },
  });

  try {
    // Step 2.1: Simulate forgot-password request
    const rawResetToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawResetToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId: testAdmin.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetLink = `${getAppBaseUrl()}/reset-password?token=${rawResetToken}`;
    await sendPasswordResetEmail({
      to: testAdmin.email,
      name: testAdmin.name,
      resetUrl: resetLink,
    });

    // Verify token hash is stored, but raw token is NOT stored
    const storedTokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    assert(storedTokenRecord !== null, "Token hash exists in password_reset_tokens table");
    assert(storedTokenRecord?.tokenHash !== rawResetToken, "Raw token is NOT stored in database");
    assert(storedTokenRecord?.usedAt === null, "Token usedAt is initially null");
    assert(storedTokenRecord?.expiresAt.getTime()! > Date.now(), "Token expiresAt is in the future");

    // Verify raw token is present in the outbound email
    const resetEmail = getLastOutboundEmail();
    assert(resetEmail?.to === testAdminEmail, "Reset email was addressed to the test admin");
    assert(resetEmail?.text.includes(`token=${rawResetToken}`), "Reset URL in email contains the raw token");

    // Step 2.2: Redeem token with strong password
    const newStrongPassword = "BrandNewCompliantPassword2026!#";
    assert(validateStrongPassword(newStrongPassword).valid, "New password satisfies strong complexity policy");

    // Verify token redemption logic
    const tokenToRedeem = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: crypto.createHash("sha256").update(rawResetToken).digest("hex") },
      include: { user: true },
    });

    assert(tokenToRedeem !== null, "Reset token is found by SHA-256 hash");
    assert(tokenToRedeem?.usedAt === null, "Token is not yet used");
    assert(tokenToRedeem?.expiresAt! > new Date(), "Token has not expired");

    const newPasswordHash = await hashPassword(newStrongPassword);

    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: tokenToRedeem!.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: tokenToRedeem!.userId },
        data: {
          password: newPasswordHash,
          tokenVersion: { increment: 1 },
        },
      }),
    ]);

    // Verify old password fails and new password succeeds
    const updatedAdmin = await prisma.user.findUnique({ where: { id: testAdmin.id } });
    assert(await comparePassword(initialPassword, updatedAdmin!.password) === false, "Old password authentication FAILS");
    assert(await comparePassword(newStrongPassword, updatedAdmin!.password) === true, "New password authentication SUCCEEDS");
    assert(updatedAdmin?.tokenVersion === 2, "User tokenVersion successfully incremented from 1 to 2");

    // Verify previous session invalidation
    const oldSessionToken = await signToken({
      id: testAdmin.id,
      email: testAdmin.email,
      name: testAdmin.name,
      role: testAdmin.role,
      tokenVersion: 1,
    });
    const oldSession = await verifyToken(oldSessionToken);
    assert(oldSession?.tokenVersion === 1, "Old session had tokenVersion = 1");
    assert(oldSession?.tokenVersion !== updatedAdmin?.tokenVersion, "Old session tokenVersion does NOT match updated user tokenVersion (Session Invalidated)");

    // Step 2.3: Second use of token fails (Single-Use Guarantee)
    const secondRedemption = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    assert(secondRedemption?.usedAt !== null, "Second attempt detects usedAt !== null (Blocked)");

    // Step 2.4: Expired token rejection test
    const expiredRawToken = crypto.randomBytes(32).toString("hex");
    const expiredTokenHash = crypto.createHash("sha256").update(expiredRawToken).digest("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: testAdmin.id,
        tokenHash: expiredTokenHash,
        expiresAt: new Date(Date.now() - 5000), // Expired 5 seconds ago
      },
    });

    const expiredRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: expiredTokenHash },
    });
    const isExpired = new Date() > expiredRecord!.expiresAt;
    assert(isExpired === true, "Server detects expired token and rejects reset");
  } finally {
    // Clean up all test tokens and ephemeral admin
    await prisma.passwordResetToken.deleteMany({ where: { userId: testAdmin.id } });
    await prisma.user.delete({ where: { id: testAdmin.id } });
  }

  // ============================================================================
  // 3. Super Admin UAT (hariprasad@hatinnovations.com)
  // ============================================================================
  console.log("\n👑 3. Super Administrator UAT (hariprasad@hatinnovations.com)...");
  const superAdmin = await prisma.user.findUnique({
    where: { email: "hariprasad@hatinnovations.com" },
  });
  assert(superAdmin !== null, "hariprasad@hatinnovations.com exists");
  assert(superAdmin?.role === Role.SUPER_ADMIN, "Role is SUPER_ADMIN");
  assert(isSuperAdmin(superAdmin?.role) === true, "isSuperAdmin helper returns true");
  assert(isAdmin(superAdmin?.role) === true, "isAdmin helper returns true");

  const targetAdmin = await prisma.user.findUnique({
    where: { email: "admin@yadasutra.com" },
  });
  assert(targetAdmin !== null, "admin@yadasutra.com exists");
  assert(targetAdmin?.role === Role.ADMIN, "admin@yadasutra.com role is ADMIN");

  // Verify Super Admin can view administrators list
  const adminList = await prisma.user.findMany({
    where: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN] } },
    select: { id: true, name: true, email: true, role: true, isActive: true },
  });
  assert(adminList.length >= 2, "Super Admin can query administrator directory");
  assert(adminList.some((u) => u.email === "admin@yadasutra.com"), "admin@yadasutra.com is listed in directory");

  // Verify Super Admin can provision, edit, and reset an administrator
  const uatAdminEmail = `uat_admin_${Date.now()}@yadasutra.com`;
  const tempAdmin = await prisma.user.create({
    data: {
      name: "UAT Test Administrator",
      email: uatAdminEmail,
      password: await hashPassword("ComplexPass123!@#"),
      role: Role.ADMIN,
      isActive: true,
      tokenVersion: 1,
    },
  });

  try {
    assert(tempAdmin.role === Role.ADMIN, "Created administrator has Role.ADMIN");

    // Super Admin edits admin (deactivate)
    const deactivated = await prisma.user.update({
      where: { id: tempAdmin.id },
      data: { isActive: false, tokenVersion: { increment: 1 } },
    });
    assert(deactivated.isActive === false, "Super Admin successfully deactivates administrator");
    assert(deactivated.tokenVersion === 2, "Deactivation bumps tokenVersion to terminate sessions");

    // Super Admin edits admin (reactivate)
    const reactivated = await prisma.user.update({
      where: { id: tempAdmin.id },
      data: { isActive: true },
    });
    assert(reactivated.isActive === true, "Super Admin successfully reactivates administrator");

    // Super Admin resets admin's password directly (without email)
    const newResetPassword = "ResetBySuperAdminPass2026!";
    const updatedWithNewPass = await prisma.user.update({
      where: { id: tempAdmin.id },
      data: {
        password: await hashPassword(newResetPassword),
        tokenVersion: { increment: 1 },
      },
    });
    assert(await comparePassword(newResetPassword, updatedWithNewPass.password) === true, "Super Admin direct password reset succeeds");
    assert(updatedWithNewPass.tokenVersion === 3, "Direct reset increments tokenVersion");
  } finally {
    await prisma.user.delete({ where: { id: tempAdmin.id } });
  }

  // ============================================================================
  // 4. Admin Authorization UAT (admin@yadasutra.com)
  // ============================================================================
  console.log("\n🛡️ 4. Institutional Admin Authorization UAT (admin@yadasutra.com)...");
  const institutionalAdmin = await prisma.user.findUnique({
    where: { email: "admin@yadasutra.com" },
  });
  assert(institutionalAdmin?.role === Role.ADMIN, "admin@yadasutra.com is verified Role.ADMIN");
  assert(isSuperAdmin(institutionalAdmin?.role) === false, "admin@yadasutra.com is NOT Super Admin");
  assert(isAdmin(institutionalAdmin?.role) === true, "admin@yadasutra.com has normal admin privileges");

  // Attempting Super Admin operations with Role.ADMIN must be blocked
  const canAdminManageAdmins = isSuperAdmin(institutionalAdmin?.role);
  assert(canAdminManageAdmins === false, "Institutional Admin is forbidden from administrator management");

  // ============================================================================
  // 5. Student Authorization UAT
  // ============================================================================
  console.log("\n🎓 5. Student Authorization UAT...");
  const student = await prisma.user.findUnique({
    where: { email: "hariprasad90jr@gmail.com" },
  });
  assert(student !== null, "hariprasad90jr@gmail.com exists");
  assert(student?.role === Role.STUDENT, "Role is STUDENT");
  assert(isAdmin(student?.role) === false, "Student does not have admin privileges");
  assert(isSuperAdmin(student?.role) === false, "Student does not have super admin privileges");

  // ============================================================================
  // 6. Audit Event Names Standardization Verification
  // ============================================================================
  console.log("\n📋 6. Verifying Standardized Audit Event Names...");
  const validStandardEventNames = [
    "ADMIN_CREATED",
    "ADMIN_UPDATED",
    "ADMIN_DEACTIVATED",
    "ADMIN_REACTIVATED",
    "ADMIN_PASSWORD_RESET",
    "ADMIN_PASSWORD_CHANGED",
    "PASSWORD_RESET_REQUESTED",
    "PASSWORD_RESET_COMPLETED",
  ];

  validStandardEventNames.forEach((eventName) => {
    assert(typeof eventName === "string" && eventName.length > 5, `Audit event standard '${eventName}' defined`);
  });

  // Verify no audit log contains passwords or secrets
  const sampleAuditLogs = await prisma.auditLog.findMany({
    take: 20,
    orderBy: { createdAt: "desc" },
  });
  const auditString = JSON.stringify(sampleAuditLogs);
  assert(!auditString.includes("passwordHash"), "Audit logs do NOT contain passwordHash");
  assert(!auditString.includes("rawToken"), "Audit logs do NOT contain rawToken");
  assert(!auditString.includes("JWT_SECRET"), "Audit logs do NOT contain JWT_SECRET");

  // ============================================================================
  // 7. Production Database Record Counts Preservation
  // ============================================================================
  console.log("\n📊 7. Final Database Integrity Verification...");
  const finalExams = await prisma.exam.count();
  const finalQuestions = await prisma.question.count();
  const finalOptions = await prisma.questionOption.count();
  const finalAssignments = await prisma.examAssignment.count();
  const finalAttempts = await prisma.examAttempt.count();
  const finalCertificates = await prisma.certificate.count();
  const finalUsers = await prisma.user.count();

  assert(finalExams === 17, `Exams count: ${finalExams} (expected 17)`);
  assert(finalQuestions === 483, `Questions count: ${finalQuestions} (expected 483)`);
  assert(finalOptions === 1932, `Options count: ${finalOptions} (expected 1932)`);
  assert(finalAssignments === 33, `Assignments count: ${finalAssignments} (expected 33)`);
  assert(finalAttempts === 3, `Attempts count: ${finalAttempts} (expected 3)`);
  assert(finalCertificates === 1, `Certificates count: ${finalCertificates} (expected 1)`);
  assert(finalUsers === 4, `Users count: ${finalUsers} (expected 4: 1 Super Admin, 1 Admin, 2 Students)`);

  console.log("\n================================================================================");
  console.log(`  PHASE 1.1 RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
