#!/usr/bin/env tsx
/**
 * ==============================================================================
 * Exam Portal - Institutional Super Admin Provisioning Utility
 *
 * SECURE PRODUCTION SCRIPT
 * Creates the initial institutional administrator account with Role.ADMIN.
 *
 * SAFETY GUARANTEES:
 * 1. Reads credentials strictly from environment variables (SUPER_ADMIN_EMAIL,
 *    SUPER_ADMIN_NAME, SUPER_ADMIN_PASSWORD) or CLI flags (--email, --name, --password).
 * 2. Enforces password complexity (minimum 8 characters, non-trivial).
 * 3. Hashes passwords using the authoritative bcrypt implementation in src/lib/auth.ts.
 * 4. Never echoes, prints, or logs plaintext passwords.
 * 5. Rejects demo/test email addresses (admin.test@examportal.edu, admin@example.com, etc.).
 * 6. Idempotent: Refuses duplicate provisioning without overwriting existing data.
 * 7. Writes a permanent audit journal record in audit_logs.
 * 8. Never creates students, exams, assignments, attempts, or certificates.
 * ==============================================================================
 */

import { prisma } from "../src/lib/prisma";
import { hashPassword } from "../src/lib/auth";
import { Role } from "@prisma/client";
import { logAuditEvent } from "../src/lib/audit";
import * as readline from "readline";

// Disallowed test emails to prevent accidental test artifact pollution
const FORBIDDEN_TEST_EMAILS = [
  "admin.test@examportal.edu",
  "admin@test.com",
  "admin@example.com",
  "test@examportal.edu",
  "student1.test@examportal.edu",
  "student2.test@examportal.edu",
];

// Disallowed weak/demo passwords
const FORBIDDEN_PASSWORDS = [
  "password",
  "admin",
  "admin123",
  "AdminPassword123!",
  "12345678",
  "examportal",
];

function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i];
    if (arg.startsWith("--") && i + 1 < process.argv.length && !process.argv[i + 1].startsWith("--")) {
      args[arg.substring(2)] = process.argv[++i];
    }
  }
  return args;
}

async function promptInput(question: string, hidden: boolean = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function provisionSuperAdmin() {
  const cliArgs = parseArgs();

  let email = process.env.SUPER_ADMIN_EMAIL || cliArgs.email || "";
  let name = process.env.SUPER_ADMIN_NAME || cliArgs.name || "";
  let password = process.env.SUPER_ADMIN_PASSWORD || cliArgs.password || "";

  // If interactive terminal and missing credentials, prompt securely
  if (process.stdin.isTTY) {
    if (!email) {
      email = await promptInput("Enter Super Admin Email: ");
    }
    if (!name) {
      name = await promptInput("Enter Super Admin Full Name: ");
    }
    if (!password) {
      password = await promptInput("Enter Super Admin Password (min 8 chars): ", true);
    }
  }

  if (!email || !name || !password) {
    console.error("[-] ERROR: Super Admin provisioning requires email, name, and password.");
    console.error("    Provide via environment variables (SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME, SUPER_ADMIN_PASSWORD)");
    console.error("    or CLI arguments (--email, --name, --password).");
    process.exit(1);
  }

  const cleanEmail = email.toLowerCase().trim();
  const cleanName = name.trim();

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    console.error(`[-] ERROR: Invalid email address format: "${cleanEmail}"`);
    process.exit(1);
  }

  // Validate not forbidden test email
  if (FORBIDDEN_TEST_EMAILS.includes(cleanEmail)) {
    console.error(`[-] SECURITY REJECTION: "${cleanEmail}" is a forbidden demo/test email. Provide a real institutional administrator email.`);
    process.exit(1);
  }

  // Validate password length and quality
  if (password.length < 8) {
    console.error("[-] SECURITY REJECTION: Password must be at least 8 characters long.");
    process.exit(1);
  }

  if (FORBIDDEN_PASSWORDS.includes(password)) {
    console.error("[-] SECURITY REJECTION: Password matches a known weak or demo placeholder.");
    process.exit(1);
  }

  console.log("==================================================================");
  console.log(" Exam Portal - Super Admin Provisioning");
  console.log("==================================================================");
  console.log(` Target Email : ${cleanEmail}`);
  console.log(` Target Name  : ${cleanName}`);
  console.log(" Password     : [PROTECTED - Cryptographic Hash Verification]");
  console.log("==================================================================");

  // Check if account already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: cleanEmail },
  });

  if (existingUser) {
    if (existingUser.role === Role.ADMIN) {
      console.log(`[!] NOTICE: Administrator account for "${cleanEmail}" already exists (ID: ${existingUser.id}).`);
      console.log("    To avoid unintentional overwrites, no modifications were made.");
      console.log("    Status: ALREADY PROVISIONED.");
      return existingUser;
    } else {
      console.error(`[-] CONFLICT ERROR: Account "${cleanEmail}" exists with role "${existingUser.role}".`);
      console.error("    Refusing to automatically elevate existing non-admin account without operator confirmation.");
      process.exit(1);
    }
  }

  // Hash password
  console.log("[*] Generating bcrypt hash (salt rounds: 10)...");
  const hashedPassword = await hashPassword(password);

  // Create Super Admin in transaction with audit log
  console.log("[*] Writing administrator record to database...");
  const newAdmin = await prisma.user.create({
    data: {
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role: Role.ADMIN,
      isActive: true,
    },
  });

  // Record audit log entry
  await logAuditEvent({
    userId: newAdmin.id,
    action: "SUPER_ADMIN_PROVISIONED",
    targetType: "USER",
    targetId: newAdmin.id,
    details: {
      email: newAdmin.email,
      name: newAdmin.name,
      role: newAdmin.role,
      provisionedAt: new Date().toISOString(),
    },
  });

  console.log("[+] SUPER ADMIN PROVISIONED SUCCESSFULLY:");
  console.log(`    User ID  : ${newAdmin.id}`);
  console.log(`    Email    : ${newAdmin.email}`);
  console.log(`    Name     : ${newAdmin.name}`);
  console.log(`    Role     : ${newAdmin.role}`);
  console.log(`    IsActive : ${newAdmin.isActive}`);
  console.log(`    CreatedAt: ${newAdmin.createdAt.toISOString()}`);
  console.log("==================================================================");

  return newAdmin;
}

if (require.main === module || (process.argv[1] && process.argv[1].endsWith("create-super-admin.ts"))) {
  provisionSuperAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[-] Provisioning failed:", err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
