import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { AdminSidebar } from "@/components/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionUser();

  if (!session || (session.role !== "ADMIN" && session.role !== "SUPER_ADMIN")) {
    redirect("/login?redirect=/admin");
  }

  return (
    <div className="min-h-screen bg-[#F7F5EF] text-[#24332F] flex selection:bg-[#E8F3F1] selection:text-[#176B63]">
      <AdminSidebar adminName={session.name} adminRole={session.role} />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 p-6 sm:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
