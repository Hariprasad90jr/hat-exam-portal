import { prisma } from "../src/lib/prisma";
import { Role } from "@prisma/client";
import { logAuditEvent } from "../src/lib/audit";

async function promoteSuperAdmin() {
  console.log("================================================================================");
  console.log("                IDEMPOTENT SUPER ADMIN PROMOTION AUDIT                         ");
  console.log("================================================================================");

  const targetEmail = "hariprasad@hatinnovations.com";
  const user = await prisma.user.findUnique({
    where: { email: targetEmail },
  });

  if (!user) {
    throw new Error(`Target user ${targetEmail} not found!`);
  }

  if (user.role === Role.SUPER_ADMIN) {
    console.log(`[INFO] ${targetEmail} is already SUPER_ADMIN. No role modification needed.`);
  } else {
    console.log(`[UPDATE] Promoting ${targetEmail} from ${user.role} to SUPER_ADMIN...`);
    await prisma.user.update({
      where: { id: user.id },
      data: { role: Role.SUPER_ADMIN },
    });

    await logAuditEvent({
      userId: user.id,
      action: "ADMIN_ROLE_PROMOTED",
      targetType: "User",
      targetId: user.id,
      details: {
        previousRole: user.role,
        newRole: Role.SUPER_ADMIN,
        email: targetEmail,
        timestamp: new Date().toISOString(),
      },
    });
    console.log(`[SUCCESS] ${targetEmail} promoted to SUPER_ADMIN and audit log recorded.`);
  }

  // Verify other users
  const adminUser = await prisma.user.findUnique({
    where: { email: "admin@yadasutra.com" },
  });
  if (!adminUser || adminUser.role !== Role.ADMIN) {
    throw new Error(`admin@yadasutra.com role check failed: ${adminUser?.role}`);
  }
  console.log(`[VERIFIED] admin@yadasutra.com remains ADMIN.`);

  const allUsers = await prisma.user.findMany({
    select: { id: true, email: true, role: true, isActive: true, tokenVersion: true },
    orderBy: { createdAt: "asc" },
  });

  console.log("\nCurrent User Directory:");
  console.table(allUsers);

  const superAdminCount = await prisma.user.count({ where: { role: Role.SUPER_ADMIN } });
  const adminCount = await prisma.user.count({ where: { role: Role.ADMIN } });
  const studentCount = await prisma.user.count({ where: { role: Role.STUDENT } });

  console.log(`\nRole Distribution:`);
  console.log(`SUPER_ADMIN : ${superAdminCount}`);
  console.log(`ADMIN       : ${adminCount}`);
  console.log(`STUDENT     : ${studentCount}`);

  if (superAdminCount !== 1) {
    throw new Error(`Expected exactly 1 SUPER_ADMIN, found ${superAdminCount}`);
  }
  if (adminCount !== 1) {
    throw new Error(`Expected exactly 1 ADMIN, found ${adminCount}`);
  }
  if (studentCount !== 2) {
    throw new Error(`Expected exactly 2 STUDENTs, found ${studentCount}`);
  }

  console.log("\nAll role verifications passed 100%!");
}

promoteSuperAdmin()
  .catch((err) => {
    console.error("Promotion failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
