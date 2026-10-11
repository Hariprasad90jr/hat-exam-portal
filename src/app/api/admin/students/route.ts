import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { Role } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.toLowerCase();

  try {
    const students = await prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: "insensitive" } },
                { email: { contains: query, mode: "insensitive" } },
                { studentId: { contains: query, mode: "insensitive" } },
                { department: { contains: query, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        department: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: {
            assignments: true,
            attempts: true,
            certificates: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ students });
  } catch (error) {
    console.error("Fetch students error:", error);
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, email, password, studentId, department } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      );
    }

    if (studentId) {
      const existingStudentId = await prisma.user.findFirst({
        where: { studentId: studentId.trim() },
      });
      if (existingStudentId) {
        return NextResponse.json(
          { error: "Student ID / Roll number already registered" },
          { status: 409 }
        );
      }
    }

    const hashedPassword = await hashPassword(password);

    const student = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        password: hashedPassword,
        role: Role.STUDENT,
        studentId: studentId ? studentId.trim() : null,
        department: department ? department.trim() : null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        studentId: true,
        department: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAuditEvent({
      userId: session.id,
      action: "STUDENT_CREATED",
      targetType: "User",
      targetId: student.id,
      details: {
        name: student.name,
        email: student.email,
        studentId: student.studentId,
        department: student.department,
      },
      req,
    });

    return NextResponse.json({ success: true, student }, { status: 201 });
  } catch (error) {
    console.error("Create student error:", error);
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }
}
