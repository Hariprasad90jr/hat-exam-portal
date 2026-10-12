import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const exam = await prisma.exam.findUnique({
      where: { id },
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
        _count: {
          select: {
            assignments: true,
            attempts: true,
          },
        },
      },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    return NextResponse.json({ exam });
  } catch (error) {
    console.error("Fetch exam error:", error);
    return NextResponse.json({ error: "Failed to fetch exam" }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const {
      title,
      code,
      description,
      instructions,
      durationMinutes,
      passingScore,
      shuffleQuestions,
      shuffleOptions,
      negativeMarking,
      negativeMarkPerQuestion,
      proctoringStrict,
      status,
      questions,
    } = body;

    // Check code collision
    if (code) {
      const existing = await prisma.exam.findFirst({
        where: {
          code: code.trim().toUpperCase(),
          NOT: { id },
        },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Another exam with this code already exists" },
          { status: 409 }
        );
      }
    }

    const existingExam = await prisma.exam.findUnique({
      where: { id },
      select: { version: true },
    });

    // Check if the exam has any attempts recorded
    const attemptsCount = await prisma.examAttempt.count({
      where: { examId: id },
    });

    // Calculate total marks from active questions
    let totalMarks = 0;
    if (Array.isArray(questions)) {
      totalMarks = questions.reduce((acc, q) => acc + (Number(q.points) || 1), 0);
    }

    // Update exam metadata
    await prisma.exam.update({
      where: { id },
      data: {
        ...(title ? { title: title.trim() } : {}),
        ...(code ? { code: code.trim().toUpperCase() } : {}),
        description: description !== undefined ? description?.trim() : undefined,
        instructions: instructions !== undefined ? instructions?.trim() : undefined,
        ...(durationMinutes ? { durationMinutes: Number(durationMinutes) } : {}),
        ...(passingScore !== undefined ? { passingScore: Number(passingScore) } : {}),
        totalMarks: totalMarks > 0 ? totalMarks : undefined,
        ...(shuffleQuestions !== undefined ? { shuffleQuestions: Boolean(shuffleQuestions) } : {}),
        ...(shuffleOptions !== undefined ? { shuffleOptions: Boolean(shuffleOptions) } : {}),
        ...(negativeMarking !== undefined ? { negativeMarking: Boolean(negativeMarking) } : {}),
        ...(negativeMarkPerQuestion !== undefined ? { negativeMarkPerQuestion: Number(negativeMarkPerQuestion) } : {}),
        ...(proctoringStrict !== undefined ? { proctoringStrict: Boolean(proctoringStrict) } : {}),
        ...(status ? { status } : {}),
      },
    });

    // Synchronize questions with historical protection
    if (Array.isArray(questions)) {
      if (attemptsCount > 0) {
        // EXAM HAS ATTEMPTS: Never delete old questions!
        // 1. Mark existing questions as inactive (archived for historical attempts)
        await prisma.question.updateMany({
          where: { examId: id, isActive: true },
          data: { isActive: false },
        });

        const newVersion = (existingExam?.version || 1) + 1;

        // 2. Increment exam version
        await prisma.exam.update({
          where: { id },
          data: { version: newVersion },
        });

        // 3. Create fresh version of questions for future attempts
        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          await prisma.question.create({
            data: {
              examId: id,
              version: newVersion,
              isActive: true,
              order: i + 1,
              type: q.type,
              prompt: q.prompt,
              points: Number(q.points) || 1,
              negativePoints: Number(q.negativePoints) || 0,
              explanation: q.explanation || null,
              options: {
                create: (q.options || []).map((opt: any, optIdx: number) => ({
                  text: opt.text,
                  isCorrect: Boolean(opt.isCorrect),
                  order: optIdx + 1,
                })),
              },
            },
          });
        }
      } else {
        // EXAM HAS NO ATTEMPTS: Safe to replace questions directly
        await prisma.question.deleteMany({
          where: { examId: id },
        });

        for (let i = 0; i < questions.length; i++) {
          const q = questions[i];
          await prisma.question.create({
            data: {
              examId: id,
              version: 1,
              isActive: true,
              order: i + 1,
              type: q.type,
              prompt: q.prompt,
              points: Number(q.points) || 1,
              negativePoints: Number(q.negativePoints) || 0,
              explanation: q.explanation || null,
              options: {
                create: (q.options || []).map((opt: any, optIdx: number) => ({
                  text: opt.text,
                  isCorrect: Boolean(opt.isCorrect),
                  order: optIdx + 1,
                })),
              },
            },
          });
        }
      }
    }

    const updatedExam = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          where: { isActive: true },
          orderBy: { order: "asc" },
          include: {
            options: {
              orderBy: { order: "asc" },
            },
          },
        },
      },
    });

    const isVersionBumped = attemptsCount > 0 && Array.isArray(questions);
    await logAuditEvent({
      userId: session.id,
      action: isVersionBumped ? "EXAM_VERSIONED" : "EXAM_UPDATED",
      targetType: "Exam",
      targetId: id,
      details: {
        title: updatedExam?.title,
        status: updatedExam?.status,
        version: updatedExam?.version,
        isVersionBumped,
      },
      req,
    });

    return NextResponse.json({ success: true, exam: updatedExam });
  } catch (error) {
    console.error("Update exam error:", error);
    return NextResponse.json({ error: "Failed to update exam" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const attemptsCount = await prisma.examAttempt.count({
      where: { examId: id },
    });

    if (attemptsCount > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete an examination with recorded candidate attempts. You may archive it instead to preserve academic records.",
        },
        { status: 400 }
      );
    }

    const examToDelete = await prisma.exam.findUnique({
      where: { id },
      select: { id: true, title: true, code: true },
    });

    await prisma.exam.delete({
      where: { id },
    });

    await logAuditEvent({
      userId: session.id,
      action: "EXAM_DELETED",
      targetType: "Exam",
      targetId: id,
      details: {
        title: examToDelete?.title,
        code: examToDelete?.code,
      },
      req,
    });

    return NextResponse.json({ success: true, message: "Exam deleted successfully" });
  } catch (error) {
    console.error("Delete exam error:", error);
    return NextResponse.json({ error: "Failed to delete exam" }, { status: 500 });
  }
}
