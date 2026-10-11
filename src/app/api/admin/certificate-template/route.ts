import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth";
import { sanitizeText } from "@/lib/validation";
import { logAuditEvent } from "@/lib/audit";

export async function GET() {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let template = await prisma.certificateTemplate.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    if (!template) {
      template = await prisma.certificateTemplate.create({
        data: {
          organizationName: "National Examination Board",
          title: "Certificate of Achievement",
          passStatement: "has successfully fulfilled the prescribed evaluation criteria and demonstrated academic proficiency in the examination:",
          signatoryName: "Dr. Eleanor Vance",
          signatoryTitle: "Director of Examinations",
          primaryColor: "#d97706",
          isActive: true,
        },
      });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Fetch certificate template error:", error);
    return NextResponse.json({ error: "Failed to load template" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getSessionUser();
  if (!session || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      organizationName,
      title,
      passStatement,
      signatoryName,
      signatoryTitle,
      primaryColor,
      logoUrl,
    } = body;

    const sanitizedOrg = sanitizeText(organizationName || "National Examination Board");
    const sanitizedTitle = sanitizeText(title || "Certificate of Achievement");
    const sanitizedPassStatement = sanitizeText(passStatement || "has successfully fulfilled the prescribed evaluation criteria and demonstrated academic proficiency in the examination:");
    const sanitizedSigName = sanitizeText(signatoryName || "Director of Examinations");
    const sanitizedSigTitle = sanitizeText(signatoryTitle || "Board of Certification");
    const safeColor = typeof primaryColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(primaryColor)
      ? primaryColor
      : "#d97706";

    // Find existing template or create new
    const existing = await prisma.certificateTemplate.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    });

    let updatedTemplate;
    if (existing) {
      updatedTemplate = await prisma.certificateTemplate.update({
        where: { id: existing.id },
        data: {
          organizationName: sanitizedOrg,
          title: sanitizedTitle,
          passStatement: sanitizedPassStatement,
          signatoryName: sanitizedSigName,
          signatoryTitle: sanitizedSigTitle,
          primaryColor: safeColor,
          logoUrl: typeof logoUrl === "string" ? sanitizeText(logoUrl) : null,
        },
      });
    } else {
      updatedTemplate = await prisma.certificateTemplate.create({
        data: {
          organizationName: sanitizedOrg,
          title: sanitizedTitle,
          passStatement: sanitizedPassStatement,
          signatoryName: sanitizedSigName,
          signatoryTitle: sanitizedSigTitle,
          primaryColor: safeColor,
          logoUrl: typeof logoUrl === "string" ? sanitizeText(logoUrl) : null,
          isActive: true,
        },
      });
    }

    await logAuditEvent({
      userId: session.id,
      action: "CERTIFICATE_TEMPLATE_UPDATED",
      targetType: "CERTIFICATE_TEMPLATE",
      targetId: updatedTemplate.id,
      details: `Admin ${session.name} updated certificate template configuration`,
      req,
    });

    return NextResponse.json({
      message: "Certificate template updated successfully",
      template: updatedTemplate,
    });
  } catch (error) {
    console.error("Update certificate template error:", error);
    return NextResponse.json({ error: "Failed to update template" }, { status: 500 });
  }
}
