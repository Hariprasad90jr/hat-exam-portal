import { PrismaClient, Role, ExamStatus, QuestionType, AssignmentStatus, AttemptStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting Exam Portal database seeding...");

  // Clear existing data in reverse order of foreign key dependencies
  await prisma.auditLog.deleteMany();
  await prisma.certificate.deleteMany();
  await prisma.studentAnswer.deleteMany();
  await prisma.examAttempt.deleteMany();
  await prisma.examAssignment.deleteMany();
  await prisma.questionOption.deleteMany();
  await prisma.question.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleaned existing database records.");

  // Password hash
  const adminPassword = await bcrypt.hash("admin123", 10);
  const studentPassword = await bcrypt.hash("student123", 10);

  // 1. Create Admin
  const admin = await prisma.user.create({
    data: {
      name: "Dr. Eleanor Vance",
      email: "admin@examportal.com",
      password: adminPassword,
      role: Role.ADMIN,
      department: "Computer Science & Engineering",
    },
  });
  console.log(`👤 Created Admin: ${admin.email}`);

  // 2. Create Students
  const student1 = await prisma.user.create({
    data: {
      name: "John Doe",
      email: "john.doe@student.com",
      password: studentPassword,
      role: Role.STUDENT,
      studentId: "STU-2026-001",
      department: "Computer Science",
    },
  });

  const student2 = await prisma.user.create({
    data: {
      name: "Jane Smith",
      email: "jane.smith@student.com",
      password: studentPassword,
      role: Role.STUDENT,
      studentId: "STU-2026-002",
      department: "Information Technology",
    },
  });

  const student3 = await prisma.user.create({
    data: {
      name: "Alex Jones",
      email: "alex.jones@student.com",
      password: studentPassword,
      role: Role.STUDENT,
      studentId: "STU-2026-003",
      department: "Data Science",
    },
  });
  console.log("👥 Created Students: John Doe, Jane Smith, Alex Jones");

  // 3. Create Exam 1: Full-Stack Web Development & System Design
  const exam1 = await prisma.exam.create({
    data: {
      title: "Full-Stack Web Development & System Design",
      code: "CS-401-WEB",
      description: "Comprehensive assessment covering modern React 19, Next.js App Router, relational databases, and distributed architecture fundamentals.",
      instructions: "1. Total duration is 45 minutes.\n2. Ensure a stable internet connection.\n3. Switching tabs or exiting fullscreen will be recorded.\n4. Passing score is 50%.",
      durationMinutes: 45,
      passingScore: 50.0,
      totalMarks: 20.0,
      shuffleQuestions: false,
      shuffleOptions: true,
      showResultsImmediately: true,
      allowReview: true,
      negativeMarking: true,
      negativeMarkPerQuestion: 0.5,
      proctoringStrict: true,
      status: ExamStatus.PUBLISHED,
      authorId: admin.id,
      questions: {
        create: [
          {
            order: 1,
            type: QuestionType.MCQ_SINGLE,
            prompt: "In Next.js App Router, what is the default rendering paradigm for components in the `app` directory?",
            points: 4.0,
            negativePoints: 1.0,
            explanation: "All components inside the App Router are React Server Components (RSC) by default unless marked with the 'use client' directive.",
            options: {
              create: [
                { text: "Client-Side Rendered (CSR)", isCorrect: false, order: 1 },
                { text: "Server Components (RSC)", isCorrect: true, order: 2 },
                { text: "Static Site Generation (SSG) with getStaticProps", isCorrect: false, order: 3 },
                { text: "Server-Side Rendered with getServerSideProps", isCorrect: false, order: 4 },
              ],
            },
          },
          {
            order: 2,
            type: QuestionType.MCQ_MULTIPLE,
            prompt: "Which of the following HTTP status codes represent Client Errors (4xx)? (Select all that apply)",
            points: 4.0,
            negativePoints: 1.0,
            explanation: "401 (Unauthorized), 403 (Forbidden), and 429 (Too Many Requests) are 4xx client errors. 502 (Bad Gateway) is a 5xx server error.",
            options: {
              create: [
                { text: "401 Unauthorized", isCorrect: true, order: 1 },
                { text: "403 Forbidden", isCorrect: true, order: 2 },
                { text: "429 Too Many Requests", isCorrect: true, order: 3 },
                { text: "502 Bad Gateway", isCorrect: false, order: 4 },
              ],
            },
          },
          {
            order: 3,
            type: QuestionType.TRUE_FALSE,
            prompt: "In PostgreSQL, a TRANSACTION provides ACID guarantees, ensuring changes are fully committed or completely rolled back.",
            points: 3.0,
            negativePoints: 0.5,
            explanation: "True. PostgreSQL transactions strictly adhere to Atomicity, Consistency, Isolation, and Durability.",
            options: {
              create: [
                { text: "True", isCorrect: true, order: 1 },
                { text: "False", isCorrect: false, order: 2 },
              ],
            },
          },
          {
            order: 4,
            type: QuestionType.MCQ_SINGLE,
            prompt: "Which database index structure is commonly used as the default for PostgreSQL B-Tree indexes?",
            points: 4.0,
            negativePoints: 1.0,
            explanation: "PostgreSQL uses balanced B-Tree indexes by default for equality and range queries.",
            options: {
              create: [
                { text: "B-Tree", isCorrect: true, order: 1 },
                { text: "Hash Index", isCorrect: false, order: 2 },
                { text: "GIN (Generalized Inverted Index)", isCorrect: false, order: 3 },
                { text: "BRIN (Block Range Index)", isCorrect: false, order: 4 },
              ],
            },
          },
          {
            order: 5,
            type: QuestionType.SHORT_ANSWER,
            prompt: "What is the primary role of a reverse proxy like Nginx or Caddy in modern web deployments?",
            points: 5.0,
            negativePoints: 0.0,
            explanation: "A reverse proxy sits in front of web servers, routing client requests, handling SSL termination, load balancing, caching, and rate limiting.",
            options: {
              create: [],
            },
          },
        ],
      },
    },
    include: {
      questions: {
        include: {
          options: true,
        },
      },
    },
  });
  console.log(`📝 Created Exam 1: ${exam1.title} with 5 questions`);

  // 4. Create Exam 2: Data Structures & Algorithms
  const exam2 = await prisma.exam.create({
    data: {
      title: "Data Structures & Algorithms Core Concepts",
      code: "CS-201-DSA",
      description: "Foundational evaluation on time complexity, recursion, search trees, and dynamic programming.",
      instructions: "Time limit: 30 minutes. Answer all questions.",
      durationMinutes: 30,
      passingScore: 60.0,
      totalMarks: 15.0,
      shuffleQuestions: true,
      shuffleOptions: true,
      showResultsImmediately: true,
      allowReview: true,
      negativeMarking: false,
      proctoringStrict: false,
      status: ExamStatus.PUBLISHED,
      authorId: admin.id,
      questions: {
        create: [
          {
            order: 1,
            type: QuestionType.MCQ_SINGLE,
            prompt: "What is the worst-case time complexity of QuickSort?",
            points: 5.0,
            negativePoints: 0.0,
            explanation: "When the pivot chosen is consistently the smallest or largest element, QuickSort degrades to O(n^2).",
            options: {
              create: [
                { text: "O(n log n)", isCorrect: false, order: 1 },
                { text: "O(n^2)", isCorrect: true, order: 2 },
                { text: "O(log n)", isCorrect: false, order: 3 },
                { text: "O(n)", isCorrect: false, order: 4 },
              ],
            },
          },
          {
            order: 2,
            type: QuestionType.TRUE_FALSE,
            prompt: "A Hash Map provides O(1) average time complexity for key lookups and insertions.",
            points: 5.0,
            negativePoints: 0.0,
            explanation: "True. Assuming a uniform hash distribution, lookup and insert are expected O(1).",
            options: {
              create: [
                { text: "True", isCorrect: true, order: 1 },
                { text: "False", isCorrect: false, order: 2 },
              ],
            },
          },
          {
            order: 3,
            type: QuestionType.MCQ_SINGLE,
            prompt: "Which data structure follows the First-In, First-Out (FIFO) principle?",
            points: 5.0,
            negativePoints: 0.0,
            explanation: "Queue is a FIFO data structure.",
            options: {
              create: [
                { text: "Stack", isCorrect: false, order: 1 },
                { text: "Queue", isCorrect: true, order: 2 },
                { text: "Heap", isCorrect: false, order: 3 },
                { text: "Binary Search Tree", isCorrect: false, order: 4 },
              ],
            },
          },
        ],
      },
    },
  });
  console.log(`📝 Created Exam 2: ${exam2.title}`);

  // 5. Assign Exam 1 to John Doe & Jane Smith
  const assignment1 = await prisma.examAssignment.create({
    data: {
      examId: exam1.id,
      studentId: student1.id,
      status: AssignmentStatus.COMPLETED,
      maxAttempts: 2,
    },
  });

  await prisma.examAssignment.create({
    data: {
      examId: exam1.id,
      studentId: student2.id,
      status: AssignmentStatus.ASSIGNED,
      maxAttempts: 1,
    },
  });

  await prisma.examAssignment.create({
    data: {
      examId: exam2.id,
      studentId: student1.id,
      status: AssignmentStatus.ASSIGNED,
      maxAttempts: 1,
    },
  });
  console.log("📌 Assigned exams to students");

  // 6. Create Completed Attempt for John Doe on Exam 1
  const q1 = exam1.questions[0];
  const q1Correct = q1.options.find((o) => o.isCorrect);
  const q2 = exam1.questions[1];
  const q2CorrectIds = q2.options.filter((o) => o.isCorrect).map((o) => o.id);
  const q3 = exam1.questions[2];
  const q3Correct = q3.options.find((o) => o.isCorrect);
  const q4 = exam1.questions[3];
  const q4Correct = q4.options.find((o) => o.isCorrect);
  const q5 = exam1.questions[4];

  const attempt1 = await prisma.examAttempt.create({
    data: {
      examId: exam1.id,
      studentId: student1.id,
      assignmentId: assignment1.id,
      startedAt: new Date(Date.now() - 35 * 60 * 1000),
      submittedAt: new Date(Date.now() - 5 * 60 * 1000),
      status: AttemptStatus.SUBMITTED,
      score: 19.0,
      totalMarks: 20.0,
      percentage: 95.0,
      passed: true,
      timeSpentSeconds: 1800,
      tabSwitchCount: 0,
      fullscreenExitCount: 0,
      answers: {
        create: [
          {
            questionId: q1.id,
            selectedOptionIds: q1Correct ? [q1Correct.id] : [],
            isCorrect: true,
            marksAwarded: 4.0,
            feedback: "Correct! Next.js App Router defaults to RSC.",
          },
          {
            questionId: q2.id,
            selectedOptionIds: q2CorrectIds,
            isCorrect: true,
            marksAwarded: 4.0,
            feedback: "All correct client error codes identified.",
          },
          {
            questionId: q3.id,
            selectedOptionIds: q3Correct ? [q3Correct.id] : [],
            isCorrect: true,
            marksAwarded: 3.0,
            feedback: "Correct! PostgreSQL transactions are fully ACID.",
          },
          {
            questionId: q4.id,
            selectedOptionIds: q4Correct ? [q4Correct.id] : [],
            isCorrect: true,
            marksAwarded: 4.0,
            feedback: "Correct! B-Tree is the default indexing method.",
          },
          {
            questionId: q5.id,
            textAnswer: "A reverse proxy acts as an intermediary for clients, handling SSL offloading, caching, security filtering, and load balancing across web workers.",
            isCorrect: true,
            marksAwarded: 4.0,
            feedback: "Excellent concise definition of reverse proxy responsibilities.",
          },
        ],
      },
    },
  });

  // 7. Issue Certificate for John Doe
  const certNumber = "CERT-2026-94812";
  const verificationCode = "VERIF-CS401-JOHN-DOE-2026";

  await prisma.certificate.create({
    data: {
      certificateNumber: certNumber,
      attemptId: attempt1.id,
      examId: exam1.id,
      studentId: student1.id,
      score: 19.0,
      percentage: 95.0,
      verificationCode: verificationCode,
      issueDate: new Date(),
    },
  });
  console.log(`🏆 Generated Certificate for John Doe: ${certNumber}`);

  console.log("✅ Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
