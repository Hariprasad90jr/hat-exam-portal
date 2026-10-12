import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isSuperAdmin, hashPassword } from "@/lib/auth";
import { validateStrongPassword } from "@/lib/validation";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function POST(
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
    const { newPassword } = body;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!targetUser || (targetUser.role !== Role.ADMIN && targetUser.role !== Role.SUPER_ADMIN)) {
      return NextResponse.json({ error: "Administrator not found" }, { status: 404 });
    }

    const passwordValidation = validateStrongPassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    // Update password and bump tokenVersion to invalidate all active sessions
    await prisma.$transaction([
      prisma.user.update({
        where: { id },
        data: {
          password: hashedPassword,
          tokenVersion: { increment: 1 },
        },
      }),
      // Invalidate any open password reset tokens
      prisma.passwordResetToken.deleteMany({
        where: { userId: id },
      }),
    ]);

    await logAuditEvent({
      userId: session.id,
      action: "ADMIN_PASSWORD_RESET",
      targetType: "User",
      targetId: id,
      details: {
        targetEmail: targetUser.email,
        targetRole: targetUser.role,
        resetBy: session.email,
        timestamp: new Date().toISOString(),
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: `Password for ${targetUser.name} has been reset. All previous sessions have been invalidated.`,
    });
  } catch (error) {
    console.error("Reset administrator password error:", error);
    return NextResponse.json(
      { error: "Failed to reset administrator password" },
      { status: 500 }
    );
  }
}
