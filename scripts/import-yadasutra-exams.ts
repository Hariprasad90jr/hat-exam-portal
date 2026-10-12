import fs from "fs";
import path from "path";
import { prisma } from "../src/lib/prisma";
import { Role, QuestionType, ExamStatus, AssignmentStatus } from "@prisma/client";

interface ImportOption {
  key: string;
  text: string;
}

interface ImportQuestion {
  number: number;
  question: string;
  options: ImportOption[];
  correctOption: string;
  points: number;
  negativePoints: number;
}

interface ImportExam {
  examCode: string;
  title: string;
  sourceTitle: string;
  status: string;
  questionType: string;
  questionCount: number;
  pointsPerQuestion: number;
  negativeMarking: number;
  passPercentage: number;
  maxAttempts: number;
  timePerQuestionSeconds: number;
  durationSeconds: number;
  questions: ImportQuestion[];
}

interface ImportDataset {
  schemaVersion: string;
  brand: string;
  summary: {
    examCount: number;
    questionsPerExam: number;
    totalQuestions: number;
    maxAttempts: number;
    durationPerExamSeconds: number;
    recommendedPassPercentage: number;
  };
  exams: ImportExam[];
}

async function main() {
  console.log("==================================================");
  console.log("  YADASUTRA AYURVEDA EXAMINATIONS IMPORT PIPELINE ");
  console.log("==================================================");

  // 1. Read and validate import files
  const importFilePath = path.join(process.cwd(), "yadasutra_exam_import.json");
  const certPlanPath = path.join(process.cwd(), "yadasutra_certificate_plan.json");

  if (!fs.existsSync(importFilePath)) {
    throw new Error(`Import file not found at: ${importFilePath}`);
  }
  if (!fs.existsSync(certPlanPath)) {
    throw new Error(`Certificate plan file not found at: ${certPlanPath}`);
  }

  const rawImport = fs.readFileSync(importFilePath, "utf-8");
  const dataset: ImportDataset = JSON.parse(rawImport);
  const certPlan = JSON.parse(fs.readFileSync(certPlanPath, "utf-8"));

  console.log(`\n📋 Loaded dataset: "${dataset.brand}"`);
  console.log(`   Source files verified: yadasutra_exam_import.json (${dataset.exams.length} exams)`);
  console.log(`   Certificate Plan version: ${certPlan.certificatePlanVersion}`);

  // 2. Pre-flight Validation
  if (dataset.exams.length !== 16) {
    throw new Error(`Expected exactly 16 exams, found: ${dataset.exams.length}`);
  }

  let totalQuestionsCount = 0;
  let totalOptionsCount = 0;

  for (const exam of dataset.exams) {
    if (exam.questions.length !== 30) {
      throw new Error(`Exam ${exam.examCode} has ${exam.questions.length} questions (expected 30)`);
    }
    totalQuestionsCount += exam.questions.length;

    for (const q of exam.questions) {
      if (q.options.length !== 4) {
        throw new Error(`Exam ${exam.examCode} Q#${q.number} has ${q.options.length} options (expected 4)`);
      }
      totalOptionsCount += q.options.length;

      const keys = q.options.map((o) => o.key);
      if (!["A", "B", "C", "D"].every((k) => keys.includes(k))) {
        throw new Error(`Exam ${exam.examCode} Q#${q.number} options missing A/B/C/D keys: ${keys.join(", ")}`);
      }

      if (!["A", "B", "C", "D"].includes(q.correctOption)) {
        throw new Error(`Exam ${exam.examCode} Q#${q.number} invalid correctOption: ${q.correctOption}`);
      }

      const matchingCorrect = q.options.filter((o) => o.key === q.correctOption);
      if (matchingCorrect.length !== 1) {
        throw new Error(`Exam ${exam.examCode} Q#${q.number} has ${matchingCorrect.length} matching correct options`);
      }
    }
  }

  console.log(`✅ Pre-flight Dataset Validation PASS:`);
  console.log(`   Exams: ${dataset.exams.length} | Questions: ${totalQuestionsCount} | Options: ${totalOptionsCount}`);

  // 3. Find Administrator Author
  const adminUser = await prisma.user.findFirst({
    where: { role: Role.ADMIN, isActive: true },
    select: { id: true, name: true, email: true },
  });

  if (!adminUser) {
    throw new Error("No active ADMIN user found in database to author exams.");
  }
  console.log(`\n👤 Using Admin Author: ${adminUser.name} (${adminUser.email}) [${adminUser.id}]`);

  // 4. Retrieve Active Students for Enrollment
  const activeStudents = await prisma.user.findMany({
    where: { role: Role.STUDENT, isActive: true },
    select: { id: true, name: true, email: true },
  });
  console.log(`👥 Found ${activeStudents.length} active students for examination enrollment:`);
  activeStudents.forEach((s) => console.log(`   - ${s.name} (${s.email})`));

  // 5. Update / Ensure Active Certificate Template matches YadaSutra Plan
  console.log(`\n📜 Configuring YadaSutra Certificate Template...`);
  const existingTemplate = await prisma.certificateTemplate.findFirst({
    where: { isActive: true },
  });

  if (existingTemplate) {
    await prisma.certificateTemplate.update({
      where: { id: existingTemplate.id },
      data: {
        organizationName: "YadaSutra — TATHA PARAMPARAYA",
        title: "Certificate of Achievement",
        passStatement: "has successfully fulfilled the prescribed evaluation criteria and demonstrated academic proficiency in the examination:",
        signatoryName: "Director of Academic Council",
        signatoryTitle: "Board of Certification · YadaSutra",
        primaryColor: "#B59A68",
        isActive: true,
      },
    });
    console.log(`   ✅ Updated existing Certificate Template [${existingTemplate.id}] with YadaSutra specification.`);
  } else {
    const newTemplate = await prisma.certificateTemplate.create({
      data: {
        organizationName: "YadaSutra — TATHA PARAMPARAYA",
        title: "Certificate of Achievement",
        passStatement: "has successfully fulfilled the prescribed evaluation criteria and demonstrated academic proficiency in the examination:",
        signatoryName: "Director of Academic Council",
        signatoryTitle: "Board of Certification · YadaSutra",
        primaryColor: "#B59A68",
        isActive: true,
      },
    });
    console.log(`   ✅ Created new Certificate Template [${newTemplate.id}] with YadaSutra specification.`);
  }

  // 6. Transactional & Idempotent Import of All 16 Exams
  console.log(`\n🚀 Beginning Transactional Import of 16 YadaSutra Examinations...`);

  const results: Array<{
    code: string;
    title: string;
    questionsCount: number;
    durationMinutes: number;
    maxAttempts: number;
    passingScore: number;
    status: string;
    assignedCount: number;
  }> = [];

  for (let i = 0; i < dataset.exams.length; i++) {
    const importExam = dataset.exams[i];
    const examNumber = i + 1;

    console.log(`\n--------------------------------------------------`);
    console.log(`[${examNumber}/16] Importing: ${importExam.examCode} — ${importExam.title}`);

    // Execute each exam import inside a single database transaction with extended timeout for remote DB
    const examResult = await prisma.$transaction(
      async (tx) => {
      // Check if exam already exists
      const existingExam = await tx.exam.findUnique({
        where: { code: importExam.examCode },
        include: {
          _count: { select: { attempts: true } },
        },
      });

      if (existingExam && existingExam._count.attempts > 0) {
        console.log(`   ⚠️ Exam ${importExam.examCode} has existing attempts (${existingExam._count.attempts}). Preserving attempt integrity.`);
      }

      // Upsert the Exam record
      const examRecord = await tx.exam.upsert({
        where: { code: importExam.examCode },
        create: {
          code: importExam.examCode,
          title: importExam.title,
          description: importExam.sourceTitle || importExam.title,
          instructions: "All 30 questions are single-choice. Total duration is 30 minutes (1 minute per question). Pass percentage is 70%. Maximum 3 attempts permitted.",
          durationMinutes: 30, // 30 questions * 1 min = 30 minutes (1800s)
          passingScore: 70.0,  // Pass percentage: 70%
          totalMarks: 30.0,    // 30 questions * 1 point = 30 points
          shuffleQuestions: false,
          shuffleOptions: false,
          showResultsImmediately: true,
          allowReview: true,
          negativeMarking: false,
          negativeMarkPerQuestion: 0.0,
          proctoringStrict: true,
          status: ExamStatus.DRAFT, // Will be set to PUBLISHED after question verification!
          authorId: adminUser.id,
        },
        update: {
          title: importExam.title,
          description: importExam.sourceTitle || importExam.title,
          instructions: "All 30 questions are single-choice. Total duration is 30 minutes (1 minute per question). Pass percentage is 70%. Maximum 3 attempts permitted.",
          durationMinutes: 30,
          passingScore: 70.0,
          totalMarks: 30.0,
          negativeMarking: false,
          negativeMarkPerQuestion: 0.0,
        },
      });

      // If no attempts exist, replace/create questions cleanly
      if (!existingExam || existingExam._count.attempts === 0) {
        // Remove prior questions if any
        await tx.question.deleteMany({
          where: { examId: examRecord.id },
        });

        // Insert all 30 questions and their 4 options
        for (const q of importExam.questions) {
          await tx.question.create({
            data: {
              examId: examRecord.id,
              order: q.number,
              type: QuestionType.MCQ_SINGLE,
              prompt: q.question,
              points: q.points || 1.0,
              negativePoints: q.negativePoints || 0.0,
              explanation: null,
              options: {
                create: q.options.map((opt, optIdx) => ({
                  text: opt.text,
                  isCorrect: opt.key === q.correctOption,
                  order: optIdx + 1,
                })),
              },
            },
          });
        }
      }

      // Verification before Publishing:
      const qCount = await tx.question.count({
        where: { examId: examRecord.id, isActive: true },
      });
      const optCount = await tx.questionOption.count({
        where: { question: { examId: examRecord.id } },
      });
      const correctOptCount = await tx.questionOption.count({
        where: { question: { examId: examRecord.id }, isCorrect: true },
      });

      if (qCount !== 30) {
        throw new Error(`Integrity check failed: ${importExam.examCode} has ${qCount} questions (expected 30)`);
      }
      if (optCount !== 120) {
        throw new Error(`Integrity check failed: ${importExam.examCode} has ${optCount} options (expected 120)`);
      }
      if (correctOptCount !== 30) {
        throw new Error(`Integrity check failed: ${importExam.examCode} has ${correctOptCount} correct options (expected 30)`);
      }

      // NOW PUBLISH THE EXAM
      const publishedExam = await tx.exam.update({
        where: { id: examRecord.id },
        data: { status: ExamStatus.PUBLISHED },
      });

      // Enroll/Assign all active students with maxAttempts: 3
      let studentAssignedCount = 0;
      for (const student of activeStudents) {
        await tx.examAssignment.upsert({
          where: {
            examId_studentId: {
              examId: publishedExam.id,
              studentId: student.id,
            },
          },
          create: {
            examId: publishedExam.id,
            studentId: student.id,
            maxAttempts: 3,
            status: AssignmentStatus.ASSIGNED,
          },
          update: {
            maxAttempts: 3,
            status: AssignmentStatus.ASSIGNED,
          },
        });
        studentAssignedCount++;
      }

      // Record Audit Event
      await tx.auditLog.create({
        data: {
          userId: adminUser.id,
          action: "EXAM_IMPORT_PUBLISHED",
          targetType: "Exam",
          targetId: publishedExam.id,
          details: JSON.stringify({
            examCode: publishedExam.code,
            title: publishedExam.title,
            questions: qCount,
            options: optCount,
            durationMinutes: publishedExam.durationMinutes,
            passingScore: publishedExam.passingScore,
            status: publishedExam.status,
            assignedStudents: studentAssignedCount,
          }),
        },
      });

      return {
        code: publishedExam.code,
        title: publishedExam.title,
        questionsCount: qCount,
        durationMinutes: publishedExam.durationMinutes,
        maxAttempts: 3,
        passingScore: publishedExam.passingScore,
        status: publishedExam.status,
        assignedCount: studentAssignedCount,
      };
    }, { maxWait: 20000, timeout: 60000 });

    results.push(examResult);
    console.log(`   ✅ Exam ${examResult.code} PUBLISHED: ${examResult.questionsCount} questions, 120 options, ${examResult.durationMinutes}m duration, ${examResult.passingScore}% pass mark, ${examResult.assignedCount} students assigned.`);
  }

  console.log(`\n==================================================`);
  console.log(`  IMPORT COMPLETE: ALL 16 EXAMS PUBLISHED LIVE   `);
  console.log(`==================================================`);
  console.table(results);
}

main()
  .catch((err) => {
    console.error("❌ IMPORT PIPELINE FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
