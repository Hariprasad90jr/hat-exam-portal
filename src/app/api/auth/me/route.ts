import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      studentId: true,
      department: true,
      isActive: true,
      tokenVersion: true,
      createdAt: true,
    },
  });

  if (!user || !user.isActive) {
    return NextResponse.json({ user: null, error: "Account deactivated" }, { status: 403 });
  }

  if (session.tokenVersion !== undefined && user.tokenVersion !== session.tokenVersion) {
    return NextResponse.json({ user: null, error: "Session expired" }, { status: 401 });
  }

  return NextResponse.json({ user });
}
