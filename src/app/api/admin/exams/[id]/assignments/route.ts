import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { AssignmentStatus, Role } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: examId } = await params;

  try {
    const [assignments, allStudents] = await Promise.all([
      prisma.examAssignment.findMany({
        where: { examId },
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
          attempts: {
            select: {
              id: true,
              score: true,
              passed: true,
              status: true,
              submittedAt: true,
            },
          },
        },
        orderBy: { assignedAt: "desc" },
      }),
      prisma.user.findMany({
        where: { role: Role.STUDENT, isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          studentId: true,
          department: true,
        },
        orderBy: { name: "asc" },
      }),
    ]);

    return NextResponse.json({ assignments, allStudents });
  } catch (error) {
    console.error("Fetch assignments error:", error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: examId } = await params;

  try {
    const body = await req.json();
    const { studentIds, validFrom, validTo, maxAttempts } = body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return NextResponse.json({ error: "Please select at least one student" }, { status: 400 });
    }

    const validFromDate = validFrom ? new Date(validFrom) : null;
    const validToDate = validTo ? new Date(validTo) : null;
    const maxAtt = Number(maxAttempts) || 1;

    let assignedCount = 0;

    for (const studentId of studentIds) {
      await prisma.examAssignment.upsert({
        where: {
          examId_studentId: {
            examId,
            studentId,
          },
        },
        create: {
          examId,
          studentId,
          validFrom: validFromDate,
          validTo: validToDate,
          maxAttempts: maxAtt,
          status: AssignmentStatus.ASSIGNED,
        },
        update: {
          validFrom: validFromDate,
          validTo: validToDate,
          maxAttempts: maxAtt,
        },
      });
      assignedCount++;
    }

    await logAuditEvent({
      userId: session.id,
      action: "EXAM_ASSIGNED",
      targetType: "Exam",
      targetId: examId,
      details: {
        studentIds,
        assignedCount,
        validFrom,
        validTo,
        maxAttempts: maxAtt,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Assigned exam to ${assignedCount} students.`,
      assignedCount,
    });
  } catch (error) {
    console.error("Assign exam error:", error);
    return NextResponse.json({ error: "Failed to assign exam" }, { status: 500 });
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

  const { searchParams } = new URL(req.url);
  const assignmentId = searchParams.get("assignmentId");

  if (!assignmentId) {
    return NextResponse.json({ error: "assignmentId query param is required" }, { status: 400 });
  }

  try {
    const assignment = await prisma.examAssignment.findUnique({
      where: { id: assignmentId },
      select: { id: true, examId: true, studentId: true },
    });

    await prisma.examAssignment.delete({
      where: { id: assignmentId },
    });

    await logAuditEvent({
      userId: session.id,
      action: "ASSIGNMENT_REVOKED",
      targetType: "ExamAssignment",
      targetId: assignmentId,
      details: {
        examId: assignment?.examId,
        studentId: assignment?.studentId,
      },
      req,
    });

    return NextResponse.json({ success: true, message: "Assignment removed" });
  } catch (error) {
    console.error("Delete assignment error:", error);
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
  }
}
