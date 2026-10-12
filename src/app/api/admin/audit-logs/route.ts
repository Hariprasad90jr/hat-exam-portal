import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { parsePaginationParams } from "@/lib/validation";

export async function GET(req: Request) {
  const session = await getSessionUser();
  if (!session || !isAdmin(session.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");
  const query = searchParams.get("q")?.toLowerCase();
  const { page, limit, skip } = parsePaginationParams(searchParams);

  try {
    const whereClause: any = {
      ...(action && action !== "ALL" ? { action } : {}),
      ...(query
        ? {
            OR: [
              { action: { contains: query, mode: "insensitive" } },
              { details: { contains: query, mode: "insensitive" } },
              { userId: { contains: query, mode: "insensitive" } },
              { targetType: { contains: query, mode: "insensitive" } },
              { targetId: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [logs, totalCount] = await Promise.all([
      prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      logs,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    });
  } catch (error) {
    console.error("Fetch audit logs error:", error);
    return NextResponse.json({ error: "Failed to load audit logs" }, { status: 500 });
  }
}
