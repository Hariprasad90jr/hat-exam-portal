import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isSuperAdmin, hashPassword } from "@/lib/auth";
import { isValidEmail, validateStrongPassword, sanitizeText } from "@/lib/validation";
import { logAuditEvent } from "@/lib/audit";
import { Role } from "@prisma/client";

export async function GET() {
  const session = await getSessionUser();
  if (!session || !isSuperAdmin(session.role)) {
    return NextResponse.json(
      { error: "Access denied. Super Administrator privilege required." },
      { status: 403 }
    );
  }

  try {
    const administrators = await prisma.user.findMany({
      where: {
        role: {
          in: [Role.SUPER_ADMIN, Role.ADMIN],
        },
      },
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
      orderBy: [
        { role: "asc" }, // SUPER_ADMIN first
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json({ administrators });
  } catch (error) {
    console.error("Fetch administrators error:", error);
    return NextResponse.json(
      { error: "Failed to fetch administrator directory" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (!session || !isSuperAdmin(session.role)) {
    return NextResponse.json(
      { error: "Access denied. Super Administrator privilege required." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { name, email, password } = body;

    const sanitizedName = sanitizeText(name);
    if (!sanitizedName || sanitizedName.length < 2) {
      return NextResponse.json(
        { error: "Administrator name is required (minimum 2 characters)" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid institutional email address" },
        { status: 400 }
      );
    }

    const passwordValidation = validateStrongPassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.error },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check existing email
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, email: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    // Enforce Role.ADMIN strictly — SUPER_ADMIN cannot be provisioned via API
    const newAdmin = await prisma.user.create({
      data: {
        name: sanitizedName,
        email: cleanEmail,
        password: hashedPassword,
        role: Role.ADMIN,
        isActive: true,
        tokenVersion: 1,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    await logAuditEvent({
      userId: session.id,
      action: "ADMIN_CREATED",
      targetType: "User",
      targetId: newAdmin.id,
      details: {
        adminId: newAdmin.id,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
        createdBy: session.email,
      },
      req,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Administrator account created successfully.",
        administrator: newAdmin,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create administrator error:", error);
    return NextResponse.json(
      { error: "Failed to create administrator account" },
      { status: 500 }
    );
  }
}
