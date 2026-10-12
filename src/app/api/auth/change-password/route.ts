import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getSessionUser,
  comparePassword,
  hashPassword,
  signToken,
  AUTH_COOKIE_NAME,
} from "@/lib/auth";
import { validateStrongPassword } from "@/lib/validation";
import { logAuditEvent } from "@/lib/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`change-pw:${session.id}:${ip}`, 5, 60_000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many password change attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "User account not found or deactivated" }, { status: 403 });
    }

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      await logAuditEvent({
        userId: user.id,
        action: "AUTH_PASSWORD_CHANGE_FAILURE",
        targetType: "User",
        targetId: user.id,
        details: { reason: "Incorrect current password" },
        req,
      });
      return NextResponse.json(
        { error: "Incorrect current password" },
        { status: 400 }
      );
    }

    if (currentPassword === newPassword) {
      return NextResponse.json(
        { error: "New password cannot be identical to the current password" },
        { status: 400 }
      );
    }

    const validation = validateStrongPassword(newPassword);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const newHashedPassword = await hashPassword(newPassword);
    const nextTokenVersion = user.tokenVersion + 1;

    // Update password and bump tokenVersion
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: newHashedPassword,
        tokenVersion: nextTokenVersion,
      },
    });

    // Invalidate any open password reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id },
    });

    await logAuditEvent({
      userId: user.id,
      action: "ADMIN_PASSWORD_CHANGED",
      targetType: "User",
      targetId: user.id,
      details: {
        email: user.email,
        tokenVersion: nextTokenVersion,
      },
      req,
    });

    // Re-issue cookie with the updated tokenVersion so the current session remains active
    const newToken = await signToken({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      studentId: updatedUser.studentId,
      tokenVersion: nextTokenVersion,
    });

    const response = NextResponse.json({
      success: true,
      message: "Your password has been changed successfully.",
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: newToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "Failed to update password. Please try again." },
      { status: 500 }
    );
  }
}
