import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { sanitizeText } from "@/lib/validation";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: requestId } = await params;

  try {
    const body = await req.json();
    const { action, adminComment, additionalAttempts } = body;

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { error: "Action must be either APPROVE or REJECT" },
        { status: 400 }
      );
    }

    const attemptRequest = await prisma.attemptRequest.findUnique({
      where: { id: requestId },
      include: {
        student: true,
        exam: true,
        assignment: true,
      },
    });

    if (!attemptRequest) {
      return NextResponse.json({ error: "Attempt request not found" }, { status: 404 });
    }

    if (attemptRequest.status !== "PENDING") {
      return NextResponse.json(
        { error: `This request has already been ${attemptRequest.status.toLowerCase()}` },
        { status: 400 }
      );
    }

    const cleanComment = adminComment ? sanitizeText(adminComment) : null;
    const now = new Date();

    if (action === "APPROVE") {
      const attemptsToAdd = Math.max(1, Number(additionalAttempts) || 1);

      // Increment assignment maxAttempts
      if (attemptRequest.assignmentId) {
        await prisma.examAssignment.update({
          where: { id: attemptRequest.assignmentId },
          data: {
            maxAttempts: { increment: attemptsToAdd },
          },
        });
      } else {
        // If student had no assignment record, create or upsert one
        await prisma.examAssignment.upsert({
          where: {
            examId_studentId: {
              examId: attemptRequest.examId,
              studentId: attemptRequest.studentId,
            },
          },
          create: {
            examId: attemptRequest.examId,
            studentId: attemptRequest.studentId,
            maxAttempts: attemptsToAdd,
          },
          update: {
            maxAttempts: { increment: attemptsToAdd },
          },
        });
      }

      const updatedRequest = await prisma.attemptRequest.update({
        where: { id: requestId },
        data: {
          status: "APPROVED",
          reviewedBy: session.id,
          reviewedAt: now,
          adminComment: cleanComment,
        },
      });

      await logAuditEvent({
        userId: session.id,
        action: "ATTEMPT_REQUEST_APPROVED",
        targetType: "AttemptRequest",
        targetId: requestId,
        details: {
          studentId: attemptRequest.studentId,
          studentName: attemptRequest.student.name,
          examId: attemptRequest.examId,
          examTitle: attemptRequest.exam.title,
          additionalAttemptsGranted: attemptsToAdd,
          adminComment: cleanComment,
        },
        req,
      });

      return NextResponse.json({
        success: true,
        message: `Approved request. Candidate granted ${attemptsToAdd} additional attempt(s).`,
        request: updatedRequest,
      });
    } else {
      // REJECT: Do not grant attempt
      const updatedRequest = await prisma.attemptRequest.update({
        where: { id: requestId },
        data: {
          status: "REJECTED",
          reviewedBy: session.id,
          reviewedAt: now,
          adminComment: cleanComment,
        },
      });

      await logAuditEvent({
        userId: session.id,
        action: "ATTEMPT_REQUEST_REJECTED",
        targetType: "AttemptRequest",
        targetId: requestId,
        details: {
          studentId: attemptRequest.studentId,
          studentName: attemptRequest.student.name,
          examId: attemptRequest.examId,
          examTitle: attemptRequest.exam.title,
          adminComment: cleanComment,
        },
        req,
      });

      return NextResponse.json({
        success: true,
        message: "Attempt request was rejected.",
        request: updatedRequest,
      });
    }
  } catch (error) {
    console.error("Review attempt request error:", error);
    return NextResponse.json({ error: "Failed to review attempt request" }, { status: 500 });
  }
}
