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
  const status = searchParams.get("status");
  const query = searchParams.get("q")?.toLowerCase();
  const { page, limit, skip } = parsePaginationParams(searchParams);

  try {
    const whereClause: any = {
      ...(status && status !== "ALL" ? { status: status as any } : {}),
      ...(query
        ? {
            OR: [
              { student: { name: { contains: query, mode: "insensitive" } } },
              { student: { email: { contains: query, mode: "insensitive" } } },
              { exam: { title: { contains: query, mode: "insensitive" } } },
              { exam: { code: { contains: query, mode: "insensitive" } } },
              { reason: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [requests, totalCount] = await Promise.all([
      prisma.attemptRequest.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              studentId: true,
              department: true,
            },
          },
          exam: {
            select: {
              id: true,
              title: true,
              code: true,
              durationMinutes: true,
              passingScore: true,
            },
          },
          assignment: {
            select: {
              id: true,
              maxAttempts: true,
              validFrom: true,
              validTo: true,
              status: true,
            },
          },
        },
        orderBy: { requestedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.attemptRequest.count({ where: whereClause }),
    ]);

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Fetch attempt requests error:", error);
    return NextResponse.json({ error: "Failed to fetch attempt requests" }, { status: 500 });
  }
}
