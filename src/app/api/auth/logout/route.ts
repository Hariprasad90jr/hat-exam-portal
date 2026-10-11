import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getSessionUser } from "@/lib/auth";
import { logAuditEvent } from "@/lib/audit";

export async function POST(req: Request) {
  const session = await getSessionUser();
  if (session) {
    await logAuditEvent({
      userId: session.id,
      action: "AUTH_LOGOUT",
      targetType: "USER",
      targetId: session.id,
      details: { email: session.email },
      req,
    });
  }

  const response = NextResponse.json({ success: true, message: "Logged out successfully" });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    expires: new Date(0),
    path: "/",
  });
  return response;
}
