import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { isValidEmail } from "@/lib/validation";
import { logAuditEvent } from "@/lib/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { sendPasswordResetEmail, getAppBaseUrl } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`forgot-pw:${ip}`, 5, 60_000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many password reset requests. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email } = body;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, name: true, email: true, isActive: true },
    });

    if (user && user.isActive) {
      // Invalidate existing open reset tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      });

      // Generate cryptographically secure random token (64 hex characters)
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // Standardized audit event
      await logAuditEvent({
        userId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        targetType: "User",
        targetId: user.id,
        details: {
          email: user.email,
          expiresAt: expiresAt.toISOString(),
        },
        req,
      });

      // Construct reset URL in memory only (never written to database or logs)
      const baseUrl = getAppBaseUrl();
      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;

      try {
        await sendPasswordResetEmail({
          to: user.email,
          name: user.name,
          resetUrl,
        });
      } catch (emailError: unknown) {
        // Safe operational error logging without exposing token, credentials, or complete reset URL
        console.error(
          `[Email Delivery Error] Failed to dispatch password reset email to mail provider for user: ${user.id}`
        );

        // Delete the un-delivered token so no stranded token exists
        await prisma.passwordResetToken.delete({
          where: { tokenHash },
        }).catch(() => {});

        return NextResponse.json(
          { error: "The notification service is temporarily unavailable. Please try again later or contact your institutional administrator." },
          { status: 503 }
        );
      }
    }

    // Always return generic response to prevent account enumeration
    return NextResponse.json({
      success: true,
      message: "If an account exists with this email address, password reset instructions have been generated.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
