import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserFromSession } from "@/lib/auth";
import { AttemptStatus, AssignmentStatus } from "@prisma/client";
import { EXAM_TIMER_GRACE_SECONDS } from "@/lib/config";
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
    const body = await req.json();
    const { attemptId, answers } = body;

    if (!attemptId) {
      return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
    }

    const attempt = await prisma.examAttempt.findFirst({
      where: {
        id: attemptId,
        studentId,
        examId,
      },
      include: {
        exam: {
          include: {
            questions: {
              where: { isActive: true },
              include: {
                options: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Exam attempt not found" }, { status: 404 });
    }

    // IDEMPOTENT FINALIZATION:
    // If this attempt is already submitted or timed out, return the finalized result safely
    if (attempt.status === AttemptStatus.SUBMITTED || attempt.status === AttemptStatus.TIMED_OUT) {
      const existingCert = await prisma.certificate.findUnique({
        where: { attemptId: attempt.id },
      });

      return NextResponse.json({
        success: true,
        alreadyFinalized: true,
        attemptId: attempt.id,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: attempt.percentage,
        passed: attempt.passed,
        status: attempt.status,
        isOvertime: attempt.status === AttemptStatus.TIMED_OUT,
        certificateId: existingCert?.id || null,
        requiresReview: attempt.requiresReview,
        reviewStatus: attempt.reviewStatus,
        redirectTo: `/student/results/${attempt.id}`,
      });
    }

    const exam = attempt.exam;

    // Authoritative Server-Side Timer Validation
    const startedAtMs = new Date(attempt.startedAt).getTime();
    const durationSeconds = exam.durationMinutes * 60;
    const maxAllowedMs = (durationSeconds + EXAM_TIMER_GRACE_SECONDS) * 1000;
    const elapsedMs = Date.now() - startedAtMs;
    const isOvertime = elapsedMs > maxAllowedMs;

    // Use questions snapshot if available to guarantee historical integrity
    const questionsToGrade: any[] = Array.isArray(attempt.questionsSnapshot)
      ? (attempt.questionsSnapshot as any[])
      : exam.questions;

    // Map existing/submitted answers by questionId
    const answersMap = new Map<string, { selectedOptionIds: string[]; textAnswer?: string }>();

    // 1. Load answers already auto-saved in database before expiry
    const savedAnswers = await prisma.studentAnswer.findMany({
      where: { attemptId },
    });
    for (const sa of savedAnswers) {
      answersMap.set(sa.questionId, {
        selectedOptionIds: sa.selectedOptionIds,
        textAnswer: sa.textAnswer || undefined,
      });
    }

    // 2. Override with submission payload ONLY if submitted within valid time limit!
    // (If overtime, reject payload answers to prevent offline cheating)
    if (!isOvertime && Array.isArray(answers)) {
      for (const a of answers) {
        if (a.questionId) {
          answersMap.set(a.questionId, {
            selectedOptionIds: a.selectedOptionIds || [],
            textAnswer: a.textAnswer,
          });
        }
      }
    }

    let totalScore = 0;
    let totalMaxMarks = 0;
    let hasQuestionsRequiringReview = false;

    // Evaluate each question
    for (const q of questionsToGrade) {
      totalMaxMarks += q.points;
      const ans = answersMap.get(q.id);

      let isCorrect: boolean | null = null;
      let marksAwarded = 0;
      let feedback = q.explanation || "";
      let questionRequiresReview = false;

      if (!ans || (!ans.textAnswer && (!ans.selectedOptionIds || ans.selectedOptionIds.length === 0))) {
        // Unanswered
        isCorrect = null;
        marksAwarded = 0;
      } else if (q.type === "MCQ_SINGLE" || q.type === "TRUE_FALSE") {
        const correctOpt = q.options.find((o: any) => o.isCorrect);
        const selectedId = ans.selectedOptionIds[0];

        if (correctOpt && selectedId === correctOpt.id) {
          isCorrect = true;
          marksAwarded = q.points;
        } else {
          isCorrect = false;
          marksAwarded = exam.negativeMarking ? -q.negativePoints : 0;
        }
      } else if (q.type === "MCQ_MULTIPLE") {
        const correctIds = q.options.filter((o: any) => o.isCorrect).map((o: any) => o.id);
        const selectedIds = ans.selectedOptionIds || [];

        const isExactMatch =
          correctIds.length === selectedIds.length &&
          correctIds.every((id: string) => selectedIds.includes(id));

        if (isExactMatch) {
          isCorrect = true;
          marksAwarded = q.points;
        } else {
          isCorrect = false;
          marksAwarded = exam.negativeMarking ? -q.negativePoints : 0;
        }
      } else if (q.type === "SHORT_ANSWER") {
        // Short-answer questions require manual instructor review.
        // Candidate responses MUST NOT automatically receive full marks.
        isCorrect = null;
        marksAwarded = 0;
        if (ans.textAnswer && ans.textAnswer.trim().length > 0) {
          questionRequiresReview = true;
          hasQuestionsRequiringReview = true;
        }
      }

      totalScore += marksAwarded;

      // Upsert answer in database
      await prisma.studentAnswer.upsert({
        where: {
          attemptId_questionId: {
            attemptId,
            questionId: q.id,
          },
        },
        create: {
          attemptId,
          questionId: q.id,
          selectedOptionIds: ans?.selectedOptionIds || [],
          textAnswer: ans?.textAnswer || null,
          isCorrect,
          marksAwarded,
          feedback,
          requiresReview: questionRequiresReview,
        },
        update: {
          selectedOptionIds: ans?.selectedOptionIds || [],
          textAnswer: ans?.textAnswer || null,
          isCorrect,
          marksAwarded,
          feedback,
          requiresReview: questionRequiresReview,
        },
      });
    }

    // Floor score at 0 if negative marking exceeded
    const finalScore = Math.max(0, Math.round(totalScore * 100) / 100);
    const finalMaxMarks = totalMaxMarks > 0 ? totalMaxMarks : exam.totalMarks;
    const percentage = finalMaxMarks > 0 ? Math.round((finalScore / finalMaxMarks) * 1000) / 10 : 0;

    // If manual instructor review is required, attempt CANNOT be marked definitively PASSED
    const requiresReview = hasQuestionsRequiringReview;
    const reviewStatus = requiresReview ? "PENDING_REVIEW" : "COMPLETED";
    const passed = !requiresReview && percentage >= exam.passingScore;

    const now = new Date();
    const timeSpentSeconds = Math.max(
      0,
      Math.floor((now.getTime() - new Date(attempt.startedAt).getTime()) / 1000)
    );

    // Final attempt status: TIMED_OUT if overtime, otherwise SUBMITTED
    const finalStatus = isOvertime ? AttemptStatus.TIMED_OUT : AttemptStatus.SUBMITTED;

    // Update Attempt
    const updatedAttempt = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        status: finalStatus,
        score: finalScore,
        totalMarks: finalMaxMarks,
        percentage,
        passed,
        requiresReview,
        reviewStatus,
        submittedAt: now,
        timeSpentSeconds,
      },
    });

    // Update Assignment status if linked
    if (attempt.assignmentId) {
      await prisma.examAssignment.update({
        where: { id: attempt.assignmentId },
        data: { status: AssignmentStatus.COMPLETED },
      });
    }

    // Auto-generate Certificate ONLY if definitively Passed (and not awaiting review)
    let certificateId: string | null = null;
    if (passed && !requiresReview) {
      const existingCert = await prisma.certificate.findUnique({
        where: { attemptId },
      });

      if (!existingCert) {
        const certNumber = `CERT-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const verificationCode = `VERIF-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

        const cert = await prisma.certificate.create({
          data: {
            certificateNumber: certNumber,
            verificationCode,
            attemptId,
            examId,
            studentId,
            score: finalScore,
            percentage,
            issueDate: now,
          },
        });
        certificateId = cert.id;

        await logAuditEvent({
          userId: studentId,
          action: "CERTIFICATE_GENERATED",
          targetType: "Certificate",
          targetId: cert.id,
          details: {
            certificateNumber: certNumber,
            percentage,
            examId,
          },
          req,
        });
      } else {
        certificateId = existingCert.id;
      }
    }

    // Log Exam Submission / Timeout audit event
    await logAuditEvent({
      userId: studentId,
      action: finalStatus === AttemptStatus.TIMED_OUT ? "EXAM_TIMED_OUT" : "EXAM_SUBMITTED",
      targetType: "ExamAttempt",
      targetId: updatedAttempt.id,
      details: {
        examId,
        score: finalScore,
        totalMarks: finalMaxMarks,
        percentage,
        passed,
        requiresReview,
        reviewStatus,
        isOvertime,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      attemptId: updatedAttempt.id,
      score: finalScore,
      totalMarks: finalMaxMarks,
      percentage,
      passed,
      requiresReview,
      reviewStatus,
      status: finalStatus,
      isOvertime,
      certificateId,
      redirectTo: `/student/results/${updatedAttempt.id}`,
    });
  } catch (error) {
    console.error("Submission error:", error);
    return NextResponse.json({ error: "Failed to evaluate and submit exam" }, { status: 500 });
  }
}
