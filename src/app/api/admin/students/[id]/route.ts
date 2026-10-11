import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { isActive, name, department, studentId } = body;

    const previousUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, isActive: true, role: true },
    });

    if (!previousUser) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (previousUser.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Cannot modify administrator accounts via student endpoint" },
        { status: 403 }
      );
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(typeof isActive === "boolean" ? { isActive } : {}),
        ...(name ? { name: name.trim() } : {}),
        ...(department !== undefined ? { department: department ? department.trim() : null } : {}),
        ...(studentId !== undefined ? { studentId: studentId ? studentId.trim() : null } : {}),
      },
    });

    // Determine audit action
    let action = "STUDENT_UPDATED";
    if (typeof isActive === "boolean" && previousUser.isActive !== isActive) {
      action = isActive ? "STUDENT_ACTIVATED" : "STUDENT_DEACTIVATED";
    }

    await logAuditEvent({
      userId: session.id,
      action,
      targetType: "User",
      targetId: id,
      details: {
        email: updated.email,
        name: updated.name,
        isActive: updated.isActive,
        previousIsActive: previousUser.isActive,
      },
      req,
    });

    return NextResponse.json({ success: true, student: updated });
  } catch (error) {
    console.error("Update student error:", error);
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const student = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (student.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Cannot delete administrator accounts via student endpoint" },
        { status: 403 }
      );
    }

    if (id === session.id) {
      return NextResponse.json(
        { error: "Cannot delete your own active administrator account" },
        { status: 400 }
      );
    }

    await logAuditEvent({
      userId: session.id,
      action: "STUDENT_DELETED",
      targetType: "User",
      targetId: id,
      details: {
        name: student?.name,
        email: student?.email,
      },
      req,
    });

    return NextResponse.json({ success: true, message: "Student deleted successfully" });
  } catch (error) {
    console.error("Delete student error:", error);
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 });
  }
}
