import { redirect } from "next/navigation";
import { getSessionUser, isSuperAdmin } from "@/lib/auth";

export default async function AdministratorsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();

  if (!session || !isSuperAdmin(session.role)) {
    redirect("/admin");
  }

  return <>{children}</>;
}
