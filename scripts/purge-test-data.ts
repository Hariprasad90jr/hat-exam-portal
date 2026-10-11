import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const isConfirmed = process.argv.includes("--confirm");

  console.log("=========================================");
  console.log("   PHASE 6 TEST DATA REMOVAL UTILITY     ");
  console.log("=========================================\n");

  // 1. Identify test users
  const testUsers = await prisma.user.findMany({
    where: {
      OR: [
        { email: { endsWith: "@examportal.edu" } },
        { email: { endsWith: "@student.com" } },
        { email: { endsWith: "@examportal.com" } },
      ],
    },
    select: { id: true, email: true, name: true, role: true },
  });

  const testUserIds = testUsers.map((u) => u.id);

  // 2. Identify legitimate users (to confirm preservation)
  const legitimateUsers = await prisma.user.findMany({
    where: {
      id: { notIn: testUserIds },
    },
    select: { id: true, email: true, name: true, role: true },
  });

  // 3. Identify test exams (authored by test admin or created during Phase 6 testing)
  const testExams = await prisma.exam.findMany({
    where: {
      OR: [
        { authorId: { in: testUserIds } },
        { code: { in: ["CS-101-HH", "PH6-E2E-2026", "CS-401-WEB", "CS-201-DSA"] } },
      ],
    },
    select: { id: true, title: true, code: true, authorId: true },
  });

  const testExamIds = testExams.map((e) => e.id);

  // 4. Identify questions and options belonging to test exams
  const testQuestions = await prisma.question.findMany({
    where: { examId: { in: testExamIds } },
    select: { id: true },
  });
  const testQuestionIds = testQuestions.map((q) => q.id);

  const testOptionsCount = await prisma.questionOption.count({
    where: { questionId: { in: testQuestionIds } },
  });

  // 5. Identify test assignments (linked to test users OR test exams)
  const testAssignments = await prisma.examAssignment.findMany({
    where: {
      OR: [
        { studentId: { in: testUserIds } },
        { examId: { in: testExamIds } },
      ],
    },
    select: { id: true },
  });
  const testAssignmentIds = testAssignments.map((a) => a.id);

  // 6. Identify test attempts (linked to test users OR test exams)
  const testAttempts = await prisma.examAttempt.findMany({
    where: {
      OR: [
        { studentId: { in: testUserIds } },
        { examId: { in: testExamIds } },
        { assignmentId: { in: testAssignmentIds } },
      ],
    },
    select: { id: true },
  });
  const testAttemptIds = testAttempts.map((a) => a.id);

  // 7. Count student answers linked to test attempts
  const testAnswersCount = await prisma.studentAnswer.count({
    where: {
      OR: [
        { attemptId: { in: testAttemptIds } },
        { questionId: { in: testQuestionIds } },
      ],
    },
  });

  // 8. Count certificates linked to test users OR test exams OR test attempts
  const testCertificatesCount = await prisma.certificate.count({
    where: {
      OR: [
        { studentId: { in: testUserIds } },
        { examId: { in: testExamIds } },
        { attemptId: { in: testAttemptIds } },
      ],
    },
  });

  // 9. Count attempt requests linked to test users OR test exams
  const testRequestsCount = await prisma.attemptRequest.count({
    where: {
      OR: [
        { studentId: { in: testUserIds } },
        { examId: { in: testExamIds } },
      ],
    },
  });

  // 10. Count audit logs linked to test users, exams, attempts
  const testAuditLogsCount = await prisma.auditLog.count({
    where: {
      OR: [
        { userId: { in: testUserIds } },
        { targetId: { in: [...testUserIds, ...testExamIds, ...testAttemptIds] } },
      ],
    },
  });

  console.log("📋 Identified Staging & Test Records for Removal:");
  console.log(`- Test Users (${testUsers.length}):`);
  for (const u of testUsers) {
    console.log(`    • ${u.email} (${u.role}) - ${u.name}`);
  }
  console.log(`- Test Exams (${testExams.length}):`);
  for (const e of testExams) {
    console.log(`    • "${e.title}" (Code: ${e.code})`);
  }
  console.log(`- Questions & Options: ${testQuestions.length} questions, ${testOptionsCount} options`);
  console.log(`- Exam Assignments: ${testAssignments.length}`);
  console.log(`- Exam Attempts: ${testAttempts.length}`);
  console.log(`- Student Answers: ${testAnswersCount}`);
  console.log(`- Certificates: ${testCertificatesCount}`);
  console.log(`- Additional Attempt Requests: ${testRequestsCount}`);
  console.log(`- Associated Audit Logs: ${testAuditLogsCount}`);

  console.log("\n🛡️  Legitimate Production Data Preserved:");
  if (legitimateUsers.length === 0) {
    console.log("  (No non-test users registered)");
  } else {
    for (const lu of legitimateUsers) {
      console.log(`  ✓ User preserved: ${lu.email} (${lu.role}) - ${lu.name}`);
    }
  }

  if (!isConfirmed) {
    console.log("\n=========================================");
    console.log("⚠️  DRY RUN ONLY — NO DATA WAS DELETED.");
    console.log("=========================================");
    console.log("To permanently remove only the test records above, run:");
    console.log("  npx tsx --env-file=.env.local scripts/purge-test-data.ts --confirm\n");
    return;
  }

  console.log("\n🧹 Purging test records in strict foreign key order...\n");

  // 1. Delete student answers
  const delAnswers = await prisma.studentAnswer.deleteMany({
    where: {
      OR: [
        { attemptId: { in: testAttemptIds } },
        { questionId: { in: testQuestionIds } },
      ],
    },
  });
  console.log(`  ✓ Deleted ${delAnswers.count} student answers`);

  // 2. Delete certificates
  const delCerts = await prisma.certificate.deleteMany({
    where: {
      OR: [
        { studentId: { in: testUserIds } },
        { examId: { in: testExamIds } },
        { attemptId: { in: testAttemptIds } },
      ],
    },
  });
  console.log(`  ✓ Deleted ${delCerts.count} certificates`);

  // 3. Delete exam attempts
  const delAttempts = await prisma.examAttempt.deleteMany({
    where: {
      OR: [
        { studentId: { in: testUserIds } },
        { examId: { in: testExamIds } },
        { assignmentId: { in: testAssignmentIds } },
      ],
    },
  });
  console.log(`  ✓ Deleted ${delAttempts.count} exam attempts`);

  // 4. Delete attempt requests
  const delRequests = await prisma.attemptRequest.deleteMany({
    where: {
      OR: [
        { studentId: { in: testUserIds } },
        { examId: { in: testExamIds } },
      ],
    },
  });
  console.log(`  ✓ Deleted ${delRequests.count} attempt requests`);

  // 5. Delete assignments
  const delAssignments = await prisma.examAssignment.deleteMany({
    where: {
      OR: [
        { studentId: { in: testUserIds } },
        { examId: { in: testExamIds } },
      ],
    },
  });
  console.log(`  ✓ Deleted ${delAssignments.count} exam assignments`);

  // 6. Delete question options
  const delOptions = await prisma.questionOption.deleteMany({
    where: { questionId: { in: testQuestionIds } },
  });
  console.log(`  ✓ Deleted ${delOptions.count} question options`);

  // 7. Delete questions
  const delQuestions = await prisma.question.deleteMany({
    where: { examId: { in: testExamIds } },
  });
  console.log(`  ✓ Deleted ${delQuestions.count} questions`);

  // 8. Delete test exams
  const delExams = await prisma.exam.deleteMany({
    where: { id: { in: testExamIds } },
  });
  console.log(`  ✓ Deleted ${delExams.count} test exams`);

  // 9. Delete audit logs associated with test users or test entities
  const delLogs = await prisma.auditLog.deleteMany({
    where: {
      OR: [
        { userId: { in: testUserIds } },
        { targetId: { in: [...testUserIds, ...testExamIds, ...testAttemptIds] } },
      ],
    },
  });
  console.log(`  ✓ Deleted ${delLogs.count} test audit logs`);

  // 10. Delete test users
  const delUsers = await prisma.user.deleteMany({
    where: { id: { in: testUserIds } },
  });
  console.log(`  ✓ Deleted ${delUsers.count} test users`);

  console.log("\n=========================================");
  console.log("✅ TEST DATA PURGE COMPLETED SUCCESSFULLY");
  console.log("=========================================\n");
}

main()
  .catch((e) => {
    console.error("Purge error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
