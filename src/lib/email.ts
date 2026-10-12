/**
 * ==============================================================================
 * YadaSutra Examination Portal - Email Delivery Service
 *
 * PRODUCTION ARCHITECTURE:
 * - Direct HTTP integration with Resend API (https://api.resend.com/emails)
 * - Zero external dependencies (uses native fetch in Node.js / Vercel Serverless)
 * - Pluggable provider selection via EMAIL_PROVIDER (resend | smtp | mock)
 * - Fallback in-memory queue for deterministic testing and local development
 *
 * SECURITY GUARANTEES:
 * 1. Never logs reset URLs containing raw tokens or token credentials.
 * 2. Operates strictly in memory; raw tokens are never written to database.
 * 3. Handles provider failure gracefully without exposing account existence.
 * ==============================================================================
 */

export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface PasswordResetEmailOptions {
  to: string;
  name: string;
  resetUrl: string;
}

export interface OutboundEmailRecord {
  to: string;
  subject: string;
  text: string;
  html: string;
  timestamp: string;
}

// Global in-memory queue for testing / development verification
const globalStore = globalThis as unknown as {
  __outboundEmailQueue?: OutboundEmailRecord[];
};

if (!globalStore.__outboundEmailQueue) {
  globalStore.__outboundEmailQueue = [];
}

/**
 * Retrieves the most recent outbound email from the test/dev queue.
 * Strictly for automated testing and local verification.
 */
export function getLastOutboundEmail(): OutboundEmailRecord | null {
  const queue = globalStore.__outboundEmailQueue || [];
  return queue.length > 0 ? queue[queue.length - 1] : null;
}

/**
 * Clears the in-memory test queue.
 */
export function clearOutboundEmailQueue(): void {
  globalStore.__outboundEmailQueue = [];
}

/**
 * Returns the effective base URL for generating authoritative absolute links.
 */
export function getAppBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.trim().replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    return "https://hat-exam-portal.vercel.app";
  }
  return "http://localhost:3000";
}

/**
 * Core email dispatch utility.
 */
export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string }> {
  const provider = (process.env.EMAIL_PROVIDER || "").toLowerCase().trim();
  const apiKey = (process.env.RESEND_API_KEY || process.env.EMAIL_API_KEY || "").trim();
  const fromEmail = (process.env.EMAIL_FROM || "YadaSutra Examination Portal <no-reply@yadasutra.com>").trim();

  // Always record to in-memory queue for verification / audit in test & dev environments
  globalStore.__outboundEmailQueue!.push({
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html,
    timestamp: new Date().toISOString(),
  });

  // Limit queue length to avoid memory leaks
  if (globalStore.__outboundEmailQueue!.length > 100) {
    globalStore.__outboundEmailQueue!.shift();
  }

  // If explicitly configured for mock or if no API key is present in non-production
  if (provider === "mock" || (!apiKey && process.env.NODE_ENV !== "production")) {
    console.log(`[Email Service: Mock] Outbound message queued for recipient: ${options.to.replace(/(.{2})(.*)(@.*)/, "$1***$3")}`);
    return { success: true, messageId: `mock_${Date.now()}` };
  }

  // Production Resend HTTP delivery (native fetch, zero packages)
  if (provider === "resend" || apiKey.startsWith("re_") || apiKey.length > 0) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [options.to],
          subject: options.subject,
          text: options.text,
          html: options.html,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        // Log safe operational error without exposing token, body, or sensitive keys
        console.error(
          `[Email Delivery Error] Provider HTTP ${res.status}: ${errorData.message || "Failed to dispatch email"}`
        );
        throw new Error(`Email provider error (${res.status})`);
      }

      const resData = await res.json().catch(() => ({}));
      return { success: true, messageId: resData.id };
    } catch (err: unknown) {
      // Re-throw safe operational error
      if (err instanceof Error && err.message.startsWith("Email provider error")) {
        throw err;
      }
      console.error("[Email Delivery Error] Network connection to email provider failed.");
      throw new Error("Email service connection failure");
    }
  }

  // Fallback if no provider is configured in production
  if (process.env.NODE_ENV === "production") {
    console.error("[Email Delivery Error] No email provider configured (EMAIL_API_KEY/RESEND_API_KEY missing).");
    throw new Error("Email provider unconfigured");
  }

  return { success: true, messageId: `dev_${Date.now()}` };
}

/**
 * Constructs and dispatches the standardized YadaSutra password reset email.
 */
export async function sendPasswordResetEmail(options: PasswordResetEmailOptions): Promise<{ success: boolean; messageId?: string }> {
  const { to, name, resetUrl } = options;
  const recipientName = name ? name.trim() : "Candidate";

  const subject = "YadaSutra Examination Portal — Reset Your Password";

  const textBody = `Hello ${recipientName},

We received a request to reset your YadaSutra Examination Portal password.

Reset Password:
${resetUrl}

This link expires in 30 minutes and can only be used once.

If you did not request this password reset, you can safely ignore this email.

YadaSutra — TATHA PARAMPARAYA`;

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password - YadaSutra Examination Portal</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FBF9F4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #24332F; line-height: 1.6;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FBF9F4; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" max-width="560" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #FFFFFF; border: 1px solid #E4E0D6; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(23, 107, 99, 0.04);">
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0E3834; padding: 32px 40px; text-align: center; border-bottom: 2px solid #B59A68;">
              <h1 style="margin: 0; font-family: Georgia, serif; font-size: 22px; font-weight: bold; color: #FFFFFF; letter-spacing: 0.5px;">
                YadaSutra
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #B59A68; font-weight: 600;">
                Ayurvedic Examination &amp; Certification Portal
              </p>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding: 36px 40px 24px 40px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; color: #24332F;">
                Hello <strong>${recipientName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #4F5E59;">
                We received a request to reset your YadaSutra Examination Portal password. Click the button below to establish a new password for your account:
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center" style="border-radius: 10px; background-color: #176B63;">
                    <a href="${resetUrl}" target="_blank" style="display: inline-block; padding: 12px 28px; font-size: 13px; font-weight: 600; color: #FFFFFF; text-decoration: none; border-radius: 10px; letter-spacing: 0.3px;">
                      Reset Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry & Safety Notice -->
              <div style="background-color: #FAF7F0; border-left: 3px solid #B59A68; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 12px; color: #66736E;">
                  <strong>Note:</strong> This link expires in <strong>30 minutes</strong> and can only be used once.
                </p>
              </div>

              <p style="margin: 0 0 16px 0; font-size: 12px; color: #8A9690;">
                If you did not request this password reset, you can safely ignore this email. Your current password remains unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF7F0; padding: 20px 40px; text-align: center; border-top: 1px solid #E4E0D6;">
              <p style="margin: 0; font-size: 11px; font-weight: 600; color: #8C7343; text-transform: uppercase; letter-spacing: 1.5px;">
                YadaSutra &mdash; TATHA PARAMPARAYA
              </p>
              <p style="margin: 4px 0 0 0; font-size: 10px; color: #8A9690;">
                Institutional Examination &amp; Evaluation Authority
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return sendEmail({
    to,
    subject,
    text: textBody,
    html: htmlBody,
  });
}
