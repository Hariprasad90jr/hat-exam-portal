import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { hashPassword } from "@/lib/auth";
import { validateStrongPassword } from "@/lib/validation";
import { logAuditEvent } from "@/lib/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`reset-pw:${ip}`, 5, 60_000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { token, newPassword } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "A valid reset token is required" },
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

    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

    const resetTokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            tokenVersion: true,
          },
        },
      },
    });

    if (!resetTokenRecord) {
      return NextResponse.json(
        { error: "Invalid or expired password reset link." },
        { status: 400 }
      );
    }

    if (resetTokenRecord.usedAt !== null) {
      return NextResponse.json(
        { error: "This password reset link has already been used. Please request a new one." },
        { status: 400 }
      );
    }

    if (new Date() > resetTokenRecord.expiresAt) {
      return NextResponse.json(
        { error: "This password reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    if (!resetTokenRecord.user || !resetTokenRecord.user.isActive) {
      return NextResponse.json(
        { error: "This account has been deactivated or cannot be found." },
        { status: 403 }
      );
    }

    const hashedPassword = await hashPassword(newPassword);

    // Atomically mark token as used, update password, and bump tokenVersion
    await prisma.$transaction([
      prisma.passwordResetToken.update({
        where: { id: resetTokenRecord.id },
        data: { usedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: resetTokenRecord.userId },
        data: {
          password: hashedPassword,
          tokenVersion: { increment: 1 },
        },
      }),
      // Invalidate any other tokens
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: resetTokenRecord.userId,
          id: { not: resetTokenRecord.id },
        },
      }),
    ]);

    await logAuditEvent({
      userId: resetTokenRecord.userId,
      action: "PASSWORD_RESET_COMPLETED",
      targetType: "User",
      targetId: resetTokenRecord.userId,
      details: {
        email: resetTokenRecord.user.email,
        timestamp: new Date().toISOString(),
      },
      req,
    });

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset. Please log in with your new credentials.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while resetting your password." },
      { status: 500 }
    );
  }
}
