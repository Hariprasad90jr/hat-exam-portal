import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserFromSession } from "@/lib/auth";
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

  try {
    const body = await req.json();
    const { attemptId, eventType } = body; // 'TAB_SWITCH' | 'FULLSCREEN_EXIT'

    if (!attemptId) {
      return NextResponse.json({ error: "attemptId required" }, { status: 400 });
    }

    const attempt = await prisma.examAttempt.findFirst({
      where: {
        id: attemptId,
        studentId: user.id,
        examId,
        status: "IN_PROGRESS",
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    const updated = await prisma.examAttempt.update({
      where: { id: attemptId },
      data: {
        tabSwitchCount: eventType === "TAB_SWITCH" ? { increment: 1 } : undefined,
        fullscreenExitCount: eventType === "FULLSCREEN_EXIT" ? { increment: 1 } : undefined,
      },
      select: {
        tabSwitchCount: true,
        fullscreenExitCount: true,
      },
    });

    // Record audit log
    await logAuditEvent({
      userId: user.id,
      action: `PROCTOR_VIOLATION_${eventType}`,
      targetType: "ExamAttempt",
      targetId: attemptId,
      details: {
        examId,
        attemptId,
        tabSwitchCount: updated.tabSwitchCount,
        fullscreenExitCount: updated.fullscreenExitCount,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      tabSwitchCount: updated.tabSwitchCount,
      fullscreenExitCount: updated.fullscreenExitCount,
    });
  } catch (error) {
    console.error("Proctor event error:", error);
    return NextResponse.json({ error: "Failed to record proctor event" }, { status: 500 });
  }
}
