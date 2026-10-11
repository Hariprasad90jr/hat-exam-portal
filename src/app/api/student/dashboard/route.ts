import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveUserFromSession } from "@/lib/auth";

export async function GET() {
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

  try {
    const studentId = user.id;

    const [studentProfile, assignments, pastAttempts, certificates, attemptRequests] = await Promise.all([
      prisma.user.findUnique({
        where: { id: studentId },
        select: {
          id: true,
          name: true,
          email: true,
          studentId: true,
          department: true,
          createdAt: true,
        },
      }),
      prisma.examAssignment.findMany({
        where: {
          studentId,
          exam: { status: "PUBLISHED" },
        },
        include: {
          exam: {
            include: {
              _count: { select: { questions: true } },
            },
          },
          attempts: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              status: true,
              score: true,
              totalMarks: true,
              percentage: true,
              passed: true,
              submittedAt: true,
            },
          },
        },
        orderBy: { assignedAt: "desc" },
      }),
      prisma.examAttempt.findMany({
        where: {
          studentId,
          status: { in: ["SUBMITTED", "TIMED_OUT"] },
        },
        include: {
          exam: {
            select: {
              id: true,
              title: true,
              code: true,
              durationMinutes: true,
              passingScore: true,
            },
          },
          certificate: {
            select: {
              id: true,
              certificateNumber: true,
            },
          },
        },
        orderBy: { submittedAt: "desc" },
      }),
      prisma.certificate.findMany({
        where: { studentId },
        include: {
          exam: { select: { title: true, code: true } },
        },
        orderBy: { issueDate: "desc" },
      }),
      prisma.attemptRequest.findMany({
        where: { studentId },
        orderBy: { requestedAt: "desc" },
      }),
    ]);

    return NextResponse.json({
      student: studentProfile,
      assignments,
      pastAttempts,
      certificates,
      attemptRequests,
    });
  } catch (error) {
    console.error("Student dashboard error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
