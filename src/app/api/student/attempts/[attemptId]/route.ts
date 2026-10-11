import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserFromSession } from "@/lib/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ attemptId: string }> }
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

  const { attemptId } = await params;

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
          include: {
            questions: {
              orderBy: { order: "asc" },
              include: {
                options: {
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        },
        answers: true,
        certificate: true,
      },
    });

    if (!attempt) {
      return NextResponse.json({ error: "Attempt not found" }, { status: 404 });
    }

    // Security check: Only the candidate or an Admin can review the attempt
    if (user.role !== "ADMIN" && attempt.studentId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // If an immutable snapshot exists for this attempt, use it to ensure historical fidelity
    if (Array.isArray(attempt.questionsSnapshot) && attempt.questionsSnapshot.length > 0) {
      attempt.exam.questions = attempt.questionsSnapshot as any;
    }

    return NextResponse.json({ attempt });
  } catch (error) {
    console.error("Fetch attempt review error:", error);
    return NextResponse.json({ error: "Failed to load attempt review" }, { status: 500 });
  }
}
