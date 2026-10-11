import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const certificate = await prisma.certificate.findFirst({
      where: {
        OR: [{ id }, { verificationCode: id }, { certificateNumber: id }],
      },
      include: {
        student: {
          select: {
            name: true,
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
        attempt: {
          select: {
            id: true,
            score: true,
            percentage: true,
            submittedAt: true,
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    const template = await prisma.certificateTemplate.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      certificate: {
        ...certificate,
        template: template || null,
      },
    });
  } catch (error) {
    console.error("Fetch certificate error:", error);
    return NextResponse.json({ error: "Failed to load certificate" }, { status: 500 });
  }
}
