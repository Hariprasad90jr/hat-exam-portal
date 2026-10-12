import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, hashPassword, isAdmin } from "@/lib/auth";
import { Role } from "@prisma/client";
import { logAuditEvent } from "@/lib/audit";

interface BulkStudentRow {
  name: string;
  email: string;
  password?: string;
  studentId?: string;
  department?: string;
}

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { students }: { students: BulkStudentRow[] } = await req.json();

    if (!Array.isArray(students) || students.length === 0) {
      return NextResponse.json(
        { error: "Provide an array of students to import" },
        { status: 400 }
      );
    }

    const defaultPasswordHash = await hashPassword("student123");
    let insertedCount = 0;
    const skippedEmails: string[] = [];

    for (const s of students) {
      if (!s.email || !s.name) continue;
      const cleanEmail = s.email.toLowerCase().trim();

      const exists = await prisma.user.findUnique({
        where: { email: cleanEmail },
      });

      if (exists) {
        skippedEmails.push(cleanEmail);
        continue;
      }

      const pass = s.password ? await hashPassword(s.password) : defaultPasswordHash;

      await prisma.user.create({
        data: {
          name: s.name.trim(),
          email: cleanEmail,
          password: pass,
          role: Role.STUDENT,
          studentId: s.studentId ? s.studentId.trim() : null,
          department: s.department ? s.department.trim() : null,
        },
      });

      insertedCount++;
    }

    await logAuditEvent({
      userId: session.id,
      action: "STUDENT_BULK_IMPORTED",
      targetType: "User",
      details: {
        insertedCount,
        skippedCount: skippedEmails.length,
        skippedEmails,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Imported ${insertedCount} students successfully.`,
      insertedCount,
      skippedCount: skippedEmails.length,
      skippedEmails,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    return NextResponse.json({ error: "Bulk import failed" }, { status: 500 });
  }
}
