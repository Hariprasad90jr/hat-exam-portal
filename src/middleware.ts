import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { getJwtSecret } from "./lib/config";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth_token")?.value;

  let session: { id: string; email: string; role: string; name: string } | null = null;

  if (token) {
    try {
      const secret = getJwtSecret();
      const encodedKey = new TextEncoder().encode(secret);
      const { payload } = await jwtVerify(token, encodedKey, {
        algorithms: ["HS256"],
      });
      session = payload as unknown as { id: string; email: string; role: string; name: string };
    } catch {
      session = null;
    }
  }

  // 1. Auth routes (/login, /register)
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    if (session) {
      if (session.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 2. Admin routes (/admin/*)
  if (pathname.startsWith("/admin")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/student/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 3. Student routes (/student/*)
  if (pathname.startsWith("/student")) {
    if (!session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/student/:path*",
    "/login",
    "/register",
  ],
};
