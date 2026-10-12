import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isSuperAdmin } from "@/lib/auth";
import { sanitizeText } from "@/lib/validation";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || !isSuperAdmin(session.role)) {
    return NextResponse.json(
      { error: "Access denied. Super Administrator privilege required." },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const admin = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        tokenVersion: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            createdExams: true,
          },
        },
      },
    });

    if (!admin || (admin.role !== Role.ADMIN && admin.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Administrator not found" }, { status: 404 });
    }

    return NextResponse.json({ administrator: admin });
  } catch (error) {
    console.error("Fetch administrator error:", error);
    return NextResponse.json(
      { error: "Failed to fetch administrator details" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionUser();
  if (!session || !isSuperAdmin(session.role)) {
    return NextResponse.json(
      { error: "Access denied. Super Administrator privilege required." },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const { name, isActive } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        tokenVersion: true,
      },
    });

    if (!targetUser || (targetUser.role !== Role.ADMIN && targetUser.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Administrator not found" }, { status: 404 });
    }

    // Safety: Prevent deactivating the Super Admin account
    if (targetUser.role === Role.SUPER_ADMIN && isActive === false) {
      return NextResponse.json(
        { error: "The primary Super Administrator account cannot be deactivated." },
        { status: 400 }
      );
    }

    // Prepare update data
    const updateData: any = {};
    if (name) {
      const sanitizedName = sanitizeText(name);
      if (sanitizedName.length >= 2) {
        updateData.name = sanitizedName;
      }
    }

    let statusChanged = false;
    if (typeof isActive === "boolean" && isActive !== targetUser.isActive) {
      updateData.isActive = isActive;
      statusChanged = true;
      // Invalidate active sessions immediately upon deactivation
      if (!isActive) {
        updateData.tokenVersion = { increment: 1 };
      }
    }

    const updatedAdmin = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        tokenVersion: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const auditAction = statusChanged
      ? isActive
        ? "ADMIN_REACTIVATED"
        : "ADMIN_DEACTIVATED"
      : "ADMIN_UPDATED";

    await logAuditEvent({
      userId: session.id,
      action: auditAction,
      targetType: "User",
      targetId: id,
      details: {
        email: updatedAdmin.email,
        name: updatedAdmin.name,
        isActive: updatedAdmin.isActive,
        previousIsActive: targetUser.isActive,
        performedBy: session.email,
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Administrator ${updatedAdmin.name} updated successfully.`,
      administrator: updatedAdmin,
    });
  } catch (error) {
    console.error("Update administrator error:", error);
    return NextResponse.json(
      { error: "Failed to update administrator" },
      { status: 500 }
    );
  }
}
