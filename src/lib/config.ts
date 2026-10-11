/**
 * Centralized Application Configuration & Security Validation
 */

// Grace period allowed for network transit during exam timer validation
export const EXAM_TIMER_GRACE_SECONDS = 30;

const INSECURE_DEFAULT_SECRET = "exam-portal-secret-token-key-change-in-production-2026";

/**
 * Validates and retrieves the JWT signing secret.
 * Enforces strict environment variable presence in production.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (!secret) {
    if (isProduction) {
      throw new Error(
        "FATAL SECURITY ERROR: JWT_SECRET environment variable is missing in production! System cannot start safely."
      );
    }
    // Safe development-only fallback with warning
    console.warn(
      "[DEV WARNING] JWT_SECRET is not set in environment. Using development-only fallback key. Set JWT_SECRET in .env."
    );
    return "dev-local-jwt-secret-do-not-use-in-production-key-92817264819";
  }

  if (isProduction && secret === INSECURE_DEFAULT_SECRET) {
    throw new Error(
      "FATAL SECURITY ERROR: Default placeholder JWT_SECRET is active in production! Set a cryptographically secure JWT_SECRET in environment variables."
    );
  }

  return secret;
}
