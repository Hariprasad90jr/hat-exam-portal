import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { ExamStatus } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const exams = await prisma.exam.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            questions: true,
            assignments: true,
            attempts: true,
          },
        },
      },
    });

    return NextResponse.json({ exams });
  } catch (error) {
    console.error("Fetch exams error:", error);
    return NextResponse.json({ error: "Failed to fetch exams" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

    if (!title || !code) {
      return NextResponse.json({ error: "Title and Code are required" }, { status: 400 });
    }

    // Verify code uniqueness
    const existing = await prisma.exam.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An exam with this Code already exists" },
        { status: 409 }
      );
    }

    // Calculate total marks from questions if provided
    let totalMarks = 0;
    if (Array.isArray(questions)) {
      totalMarks = questions.reduce((acc, q) => acc + (Number(q.points) || 1), 0);
    }

    const exam = await prisma.exam.create({
      data: {
        title: title.trim(),
        code: code.trim().toUpperCase(),
        description: description?.trim() || null,
        instructions: instructions?.trim() || null,
        durationMinutes: Number(durationMinutes) || 60,
        passingScore: Number(passingScore) || 50,
        totalMarks: totalMarks > 0 ? totalMarks : 100,
        shuffleQuestions: Boolean(shuffleQuestions),
        shuffleOptions: Boolean(shuffleOptions),
        negativeMarking: Boolean(negativeMarking),
        negativeMarkPerQuestion: Number(negativeMarkPerQuestion) || 0,
        proctoringStrict: Boolean(proctoringStrict ?? true),
        status: status || ExamStatus.DRAFT,
        authorId: session.id,
        questions: questions && Array.isArray(questions)
          ? {
              create: questions.map((q: any, idx: number) => ({
                order: idx + 1,
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
              })),
            }
          : undefined,
      },
      include: {
        questions: {
          include: {
            options: true,
          },
        },
      },
    });

    await logAuditEvent({
      userId: session.id,
      action: "EXAM_CREATED",
      targetType: "Exam",
      targetId: exam.id,
      details: {
        title: exam.title,
        code: exam.code,
        status: exam.status,
        totalMarks: exam.totalMarks,
        durationMinutes: exam.durationMinutes,
      },
      req,
    });

    return NextResponse.json({ success: true, exam }, { status: 201 });
  } catch (error) {
    console.error("Create exam error:", error);
    return NextResponse.json({ error: "Failed to create exam" }, { status: 500 });
  }
}
