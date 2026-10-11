import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: attemptId } = await params;

  try {
    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            studentId: true,
            department: true,
          },
        },
        exam: {
          select: {
            id: true,
            title: true,
            code: true,
            passingScore: true,
            totalMarks: true,
          },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                order: true,
                type: true,
                prompt: true,
                points: true,
                explanation: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        certificate: true,
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    return NextResponse.json({ attempt });
  } catch (error) {
    console.error("Fetch attempt for review error:", error);
    return NextResponse.json({ error: "Failed to load attempt details" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: attemptId } = await params;

  try {
    const body = await req.json();
    const { grades } = body; // Array of { questionId: string, marksAwarded: number, feedback?: string }

    if (!Array.isArray(grades) || grades.length === 0) {
      return NextResponse.json(
        { error: "Provide an array of grades to submit review" },
        { status: 400 }
      );
    }

    const attempt = await prisma.examAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: true,
        answers: true,
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Process each graded answer
    for (const g of grades) {
      if (!g.questionId || typeof g.marksAwarded !== "number") continue;

      const marks = Math.max(0, Number(g.marksAwarded));

      await prisma.studentAnswer.updateMany({
        where: {
          attemptId,
          questionId: g.questionId,
        },
        data: {
          marksAwarded: marks,
          isCorrect: marks > 0,
          requiresReview: false,
          reviewedBy: session.id,
          reviewedAt: new Date(),
          ...(g.feedback !== undefined ? { feedback: g.feedback } : {}),
        },
      });
    }

    // Check if any answers still require review
    const remainingPendingAnswers = await prisma.studentAnswer.count({
      where: {
        attemptId,
        requiresReview: true,
      },
    });

    const isFullyReviewed = remainingPendingAnswers === 0;

    // Recalculate authoritative total score from all answers
    const allAnswers = await prisma.studentAnswer.findMany({
      where: { attemptId },
    });

    const rawTotalScore = allAnswers.reduce((sum, a) => sum + (a.marksAwarded || 0), 0);
    const finalScore = Math.max(0, Math.round(rawTotalScore * 100) / 100);
    const totalMaxMarks = attempt.totalMarks > 0 ? attempt.totalMarks : attempt.exam.totalMarks;
    const percentage = totalMaxMarks > 0 ? Math.round((finalScore / totalMaxMarks) * 1000) / 10 : 0;
    const passed = isFullyReviewed && percentage >= attempt.exam.passingScore;

    const now = new Date();

    // Update Exam Attempt
    const updatedAttempt = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        score: finalScore,
        percentage,
        passed,
        requiresReview: !isFullyReviewed,
        reviewStatus: isFullyReviewed ? "COMPLETED" : "PENDING_REVIEW",
        reviewedBy: session.id,
        reviewedAt: now,
      },
    });

    // Handle Certificate issuance upon successful review qualification
    let certificate = null;
    if (passed) {
      const existingCert = await prisma.certificate.findUnique({
        where: { attemptId },
      });

      if (!existingCert) {
        const certNumber = `CERT-${new Date().getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const verificationCode = `VERIF-${Math.random().toString(36).substring(2, 9).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

        certificate = await prisma.certificate.create({
          data: {
            certificateNumber: certNumber,
            verificationCode,
            attemptId,
            examId: attempt.examId,
            studentId: attempt.studentId,
            score: finalScore,
            percentage,
            issueDate: now,
          },
        });

        await logAuditEvent({
          userId: attempt.studentId,
          action: "CERTIFICATE_GENERATED",
          targetType: "Certificate",
          targetId: certificate.id,
          details: {
            certificateNumber: certNumber,
            percentage,
            examId: attempt.examId,
            issuedViaInstructorReview: true,
          },
          req,
        });
      } else {
        certificate = await prisma.certificate.update({
          where: { id: existingCert.id },
          data: {
            score: finalScore,
            percentage,
          },
        });
      }
    }

    // Log the review action in audit log
    await logAuditEvent({
      userId: session.id,
      action: "ATTEMPT_REVIEWED",
      targetType: "ExamAttempt",
      targetId: attemptId,
      details: {
        candidateId: attempt.studentId,
        score: finalScore,
        totalMarks: totalMaxMarks,
        percentage,
        passed,
        isFullyReviewed,
        gradedQuestionsCount: grades.length,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      attempt: updatedAttempt,
      certificate,
    });
  } catch (error) {
    console.error("Submit review error:", error);
    return NextResponse.json({ error: "Failed to submit review" }, { status: 500 });
  }
}
