import { prisma } from "@/lib/prisma";

export interface AuditLogParams {
  userId?: string | null;
  action: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, any> | string;
  req?: Request;
}

/**
 * Centrally records security, administrative, and academic audit events.
 * Safely extracts client metadata (IP, user-agent) without breaking user workflows.
 */
export async function logAuditEvent({
  userId,
  action,
  targetType,
  targetId,
  details,
  req,
}: AuditLogParams): Promise<void> {
  try {
    let ipAddress: string | null = null;
    let userAgent: string | null = null;

    if (req) {
      ipAddress =
        req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        req.headers.get("x-real-ip") ||
        null;
      userAgent = req.headers.get("user-agent") || null;
    }

    const detailsStr =
      typeof details === "object" ? JSON.stringify(details) : details || null;

    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        action,
        targetType: targetType || null,
        targetId: targetId || null,
        details: detailsStr,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.error(`Audit log failed for action [${action}]:`, err);
  }
}
