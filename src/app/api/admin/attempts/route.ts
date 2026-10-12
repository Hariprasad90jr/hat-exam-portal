import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const examId = searchParams.get("examId");
  const status = searchParams.get("status");
  const reviewStatus = searchParams.get("reviewStatus");
  const query = searchParams.get("q")?.toLowerCase();

  try {
    const attempts = await prisma.examAttempt.findMany({
      where: {
        ...(examId ? { examId } : {}),
        ...(status ? { status: status as any } : {}),
        ...(reviewStatus ? { reviewStatus } : {}),
        ...(query
          ? {
              OR: [
                { student: { name: { contains: query, mode: "insensitive" } } },
                { student: { email: { contains: query, mode: "insensitive" } } },
                { exam: { title: { contains: query, mode: "insensitive" } } },
                { exam: { code: { contains: query, mode: "insensitive" } } },
              ],
            }
          : {}),
      },
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
        certificate: {
          select: {
            id: true,
            certificateNumber: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const examsList = await prisma.exam.findMany({
      select: { id: true, title: true, code: true },
      orderBy: { title: "asc" },
    });

    return NextResponse.json({ attempts, exams: examsList });
  } catch (error) {
    console.error("Fetch attempts error:", error);
    return NextResponse.json({ error: "Failed to fetch attempts" }, { status: 500 });
  }
}
