import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserFromSession } from "@/lib/auth";
import { sanitizeText } from "@/lib/validation";
import { logAuditEvent } from "@/lib/audit";
import { AttemptStatus } from "@prisma/client";

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

  try {
    const body = await req.json();
    const { reason } = body;

    const cleanReason = sanitizeText(reason);
    if (!cleanReason || cleanReason.length < 5) {
      return NextResponse.json(
        { error: "Please provide a clear reason for requesting an additional attempt (at least 5 characters)." },
        { status: 400 }
      );
    }

    // Verify assignment
    const assignment = await prisma.examAssignment.findUnique({
      where: {
        examId_studentId: {
          examId,
          studentId: user.id,
        },
      },
      include: {
        exam: {
          select: { title: true, code: true },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "You are not enrolled in this examination." }, { status: 403 });
    }

    // Check completed attempts
    const completedAttemptsCount = await prisma.examAttempt.count({
      where: {
        examId,
        studentId: user.id,
        status: { in: [AttemptStatus.SUBMITTED, AttemptStatus.TIMED_OUT] },
      },
    });

    if (completedAttemptsCount < assignment.maxAttempts) {
      return NextResponse.json(
        {
          error: `You still have ${assignment.maxAttempts - completedAttemptsCount} attempt(s) remaining. You can only request an additional attempt after exhausting your quota.`,
        },
        { status: 400 }
      );
    }

    // Check for existing pending request (Rule: Prevent duplicate pending requests)
    const existingPending = await prisma.attemptRequest.findFirst({
      where: {
        studentId: user.id,
        examId,
        status: "PENDING",
      },
    });

    if (existingPending) {
      return NextResponse.json(
        { error: "You already have a pending additional attempt request under review for this examination." },
        { status: 409 }
      );
    }

    const request = await prisma.attemptRequest.create({
      data: {
        studentId: user.id,
        examId,
        assignmentId: assignment.id,
        reason: cleanReason,
        status: "PENDING",
      },
    });

    await logAuditEvent({
      userId: user.id,
      action: "ATTEMPT_REQUEST_SUBMITTED",
      targetType: "AttemptRequest",
      targetId: request.id,
      details: {
        examId,
        examTitle: assignment.exam.title,
        completedAttemptsCount,
        maxAttempts: assignment.maxAttempts,
        reason: cleanReason,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "Additional attempt request submitted successfully.",
      request,
    });
  } catch (error) {
    console.error("Submit attempt request error:", error);
    return NextResponse.json({ error: "Failed to submit attempt request" }, { status: 500 });
  }
}
