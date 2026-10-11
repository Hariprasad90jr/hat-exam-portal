import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserFromSession } from "@/lib/auth";
import { AttemptStatus } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getActiveUserFromSession();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.isActive) {
    return NextResponse.json(
      { error: "Your account is deactivated. Contact an administrator." },
      { status: 403 }
    );
  }

  const { id: examId } = await params;
  const studentId = user.id;

  try {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          where: { isActive: true }, // Only retrieve current active questions
          orderBy: { order: "asc" },
          include: {
            options: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    if (exam.status === "CLOSED" || exam.status === "ARCHIVED") {
      return NextResponse.json(
        { error: "This examination has been closed by administration and no new attempts can be started." },
        { status: 403 }
      );
    }

    if (exam.status !== "PUBLISHED") {
      return NextResponse.json(
        { error: "This examination is currently in draft status and not open for candidate attempts." },
        { status: 403 }
      );
    }

    // Check assignment
    const assignment = await prisma.examAssignment.findUnique({
      where: {
        examId_studentId: {
          examId,
          studentId,
        },
      },
    });

    // If admin is previewing or student is assigned
    if (!assignment && user.role !== "ADMIN") {
      return NextResponse.json({ error: "You are not enrolled in this examination" }, { status: 403 });
    }

    const now = new Date();
    if (assignment) {
      if (assignment.status === "EXPIRED") {
        return NextResponse.json(
          { error: "Your assignment for this examination has expired." },
          { status: 403 }
        );
      }
      if (assignment.validFrom && now < assignment.validFrom) {
        return NextResponse.json({ error: "This exam has not started yet" }, { status: 403 });
      }
      if (assignment.validTo && now > assignment.validTo) {
        return NextResponse.json({ error: "The deadline for this exam has passed" }, { status: 403 });
      }

      // Check max attempts
      const completedAttemptsCount = await prisma.examAttempt.count({
        where: {
          examId,
          studentId,
          status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.TIMED_OUT] },
        },
      });

      if (completedAttemptsCount >= assignment.maxAttempts) {
        return NextResponse.json(
          { error: `You have reached the maximum allowed attempts (${assignment.maxAttempts}) for this exam` },
          { status: 403 }
        );
      }
    }

    // Check for an ongoing active attempt to resume
    let attempt = await prisma.examAttempt.findFirst({
      where: {
        examId,
        studentId,
        status: AttemptStatus.IN_PROGRESS,
      },
      include: {
        answers: true,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!attempt) {
      // Build immutable snapshot of the active questions at this point in time
      const snapshot = exam.questions.map((q) => ({
        id: q.id,
        order: q.order,
        type: q.type,
        prompt: q.prompt,
        points: q.points,
        negativePoints: q.negativePoints,
        explanation: q.explanation,
        options: q.options.map((opt) => ({
          id: opt.id,
          text: opt.text,
          order: opt.order,
          isCorrect: opt.isCorrect,
        })),
      }));

      attempt = await prisma.examAttempt.create({
        data: {
          examId,
          studentId,
          assignmentId: assignment?.id || null,
          examVersion: exam.version || 1,
          questionsSnapshot: snapshot,
          startedAt: now,
          status: AttemptStatus.IN_PROGRESS,
          totalMarks: exam.totalMarks,
        },
        include: {
          answers: true,
        },
      });
    }

    // Calculate time elapsed
    const elapsedSeconds = Math.floor((Date.now() - new Date(attempt.startedAt).getTime()) / 1000);
    const totalDurationSeconds = exam.durationMinutes * 60;
    const remainingSeconds = Math.max(0, totalDurationSeconds - elapsedSeconds);

    if (remainingSeconds <= 0) {
      // Auto close attempt if expired
      await prisma.examAttempt.update({
        where: { id: attempt.id },
        data: { status: AttemptStatus.TIMED_OUT, submittedAt: now },
      });
      return NextResponse.json(
        { error: "The time allotted for this exam session has already expired" },
        { status: 410 }
      );
    }

    // Prepare questions (shuffle if exam setting enabled)
    let processedQuestions = [...exam.questions];
    if (exam.shuffleQuestions) {
      processedQuestions = processedQuestions.sort(() => Math.random() - 0.5);
    }

    if (exam.shuffleOptions) {
      processedQuestions = processedQuestions.map((q) => ({
        ...q,
        options: [...q.options].sort(() => Math.random() - 0.5),
      }));
    }

    // CRITICAL SECURITY FIX:
    // Strip explanation and isCorrect from client payload during active exam!
    const clientSafeQuestions = processedQuestions.map((q) => ({
      id: q.id,
      order: q.order,
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      negativePoints: q.negativePoints,
      options: q.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        order: opt.order,
      })),
    }));

    await logAuditEvent({
      userId: studentId,
      action: "EXAM_STARTED",
      targetType: "ExamAttempt",
      targetId: attempt.id,
      details: {
        examId,
        examTitle: exam.title,
        remainingSeconds,
      },
      req,
    });

    return NextResponse.json({
      attemptId: attempt.id,
      startedAt: attempt.startedAt,
      remainingSeconds,
      existingAnswers: attempt.answers,
      exam: {
        id: exam.id,
        title: exam.title,
        code: exam.code,
        instructions: exam.instructions,
        durationMinutes: exam.durationMinutes,
        passingScore: exam.passingScore,
        negativeMarking: exam.negativeMarking,
        negativeMarkPerQuestion: exam.negativeMarkPerQuestion,
        proctoringStrict: exam.proctoringStrict,
        questions: clientSafeQuestions,
      },
    });
  } catch (error) {
    console.error("Start exam error:", error);
    return NextResponse.json({ error: "Failed to start examination" }, { status: 500 });
  }
}
