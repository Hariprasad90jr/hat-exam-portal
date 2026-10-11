import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserFromSession } from "@/lib/auth";
import { EXAM_TIMER_GRACE_SECONDS } from "@/lib/config";

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
    const { attemptId, questionId, selectedOptionIds, textAnswer } = body;

    if (!attemptId || !questionId) {
      return NextResponse.json({ error: "attemptId and questionId are required" }, { status: 400 });
    }

    // Verify attempt ownership and active status
    const attempt = await prisma.examAttempt.findFirst({
      where: {
        id: attemptId,
        studentId: user.id,
        examId,
        status: "IN_PROGRESS",
      },
      include: {
        exam: {
          select: { durationMinutes: true },
        },
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Active attempt not found or already submitted" }, { status: 404 });
    }

    // Authoritative Server-Side Timer Validation
    const startedAtMs = new Date(attempt.startedAt).getTime();
    const durationSeconds = attempt.exam.durationMinutes * 60;
    const maxAllowedMs = (durationSeconds + EXAM_TIMER_GRACE_SECONDS) * 1000;
    const elapsedMs = Date.now() - startedAtMs;

    if (elapsedMs > maxAllowedMs) {
      // Mark as TIMED_OUT automatically
      await prisma.examAttempt.update({
        where: { id: attempt.id },
        data: { status: "TIMED_OUT", submittedAt: new Date() },
      });
      return NextResponse.json(
        { error: "Examination session has expired. Further answers cannot be saved." },
        { status: 403 }
      );
    }

    // Upsert student answer
    const answer = await prisma.studentAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId,
        },
      },
      create: {
        attemptId,
        questionId,
        selectedOptionIds: selectedOptionIds || [],
        textAnswer: textAnswer || null,
      },
      update: {
        selectedOptionIds: selectedOptionIds || [],
        textAnswer: textAnswer || null,
      },
    });

    return NextResponse.json({ success: true, answerId: answer.id });
  } catch (error) {
    console.error("Save answer error:", error);
    return NextResponse.json({ error: "Failed to save answer" }, { status: 500 });
  }
}
