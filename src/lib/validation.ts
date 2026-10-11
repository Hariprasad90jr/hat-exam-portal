/**
 * Validation and Sanitization utilities for Exam Portal
 */

export function sanitizeText(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/<[^>]+>/g, "") // Strip all HTML tags
    .replace(/javascript:/gi, "")
    .replace(/on\w+\s*=/gi, "")
    .trim();
}

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim().toLowerCase());
}

export function isValidPassword(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== "string") {
    return { valid: false, error: "Password is required" };
  }
  if (password.length < 6) {
    return { valid: false, error: "Password must be at least 6 characters" };
  }
  return { valid: true };
}

export function parsePaginationParams(urlSearchParams: URLSearchParams): {
  page: number;
  limit: number;
  skip: number;
} {
  const pageParam = urlSearchParams.get("page");
  const limitParam = urlSearchParams.get("limit");

  let page = parseInt(pageParam || "1", 10);
  let limit = parseInt(limitParam || "20", 10);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(limit) || limit < 1) limit = 20;
  if (limit > 100) limit = 100; // Cap at 100 to prevent DoS

  const skip = (page - 1) * limit;
  return { page, limit, skip };
}
