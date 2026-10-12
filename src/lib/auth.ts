import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";
import { getJwtSecret } from "./config";

function getEncodedKey(): Uint8Array {
  return new TextEncoder().encode(getJwtSecret());
}

export interface TokenPayload {
  id: string;
  email: string;
  name: string;
  role: Role;
  studentId?: string | null;
  tokenVersion?: number;
}

export function isSuperAdmin(role: string | Role | undefined | null): boolean {
  return role === Role.SUPER_ADMIN;
}

export function isAdmin(role: string | Role | undefined | null): boolean {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN;
}

export function requireAdmin(session: TokenPayload | null | undefined): boolean {
  return !!session && isAdmin(session.role);
}

export function requireSuperAdmin(session: TokenPayload | null | undefined): boolean {
  return !!session && isSuperAdmin(session.role);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getEncodedKey());
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getEncodedKey(), {
      algorithms: ["HS256"],
    });
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<TokenPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;
    if (!token) return null;
    return await verifyToken(token);
  } catch {
    return null;
  }
}

/**
 * Authoritatively retrieves user profile directly from the database
 * to enforce immediate lockout if an administrator deactivates the account
 * or if tokenVersion has changed (e.g. password changed or reset).
 */
export async function getActiveUserFromSession() {
  const session = await getSessionUser();
  if (!session) return null;

  const { prisma } = await import("@/lib/prisma");
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      studentId: true,
      department: true,
      isActive: true,
      tokenVersion: true,
    },
  });

  if (!user || !user.isActive) return null;

  // Immediate session invalidation if tokenVersion is present and doesn't match
  if (session.tokenVersion !== undefined && user.tokenVersion !== session.tokenVersion) {
    return null;
  }

  return user;
}

export const AUTH_COOKIE_NAME = "auth_token";

