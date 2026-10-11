import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { comparePassword, signToken, AUTH_COOKIE_NAME } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(`login:${ip}`, 5, 60_000);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: `Too many login attempts. Please try again in ${rateLimit.retryAfterSeconds} seconds.` },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimit.retryAfterSeconds.toString(),
            "X-RateLimit-Limit": rateLimit.limit.toString(),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
    }

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      await logAuditEvent({
        action: "AUTH_LOGIN_FAILURE",
        targetType: "USER",
        details: { email: cleanEmail, reason: "User not found" },
        req,
      });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      await logAuditEvent({
        userId: user.id,
        action: "AUTH_LOGIN_BLOCKED_DEACTIVATED",
        targetType: "USER",
        targetId: user.id,
        details: { email: cleanEmail, reason: "Account inactive" },
        req,
      });
      return NextResponse.json(
        { error: "This account has been deactivated. Please contact administrator." },
        { status: 403 }
      );
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      await logAuditEvent({
        userId: user.id,
        action: "AUTH_LOGIN_FAILURE",
        targetType: "USER",
        targetId: user.id,
        details: { email: cleanEmail, reason: "Incorrect password" },
        req,
      });
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Login successful
    await logAuditEvent({
      userId: user.id,
      action: "AUTH_LOGIN_SUCCESS",
      targetType: "USER",
      targetId: user.id,
      details: { role: user.role, email: user.email },
      req,
    });

    const token = await signToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      studentId: user.studentId,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        studentId: user.studentId,
      },
      redirectTo: user.role === "ADMIN" ? "/admin" : "/student/dashboard",
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: unknown) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during login" },
      { status: 500 }
    );
  }
}
