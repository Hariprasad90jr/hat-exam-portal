"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  BookOpen, 
  PlusCircle, 
  Users, 
  FileCheck2, 
  LogOut, 
  Award,
  Clock,
  Activity
} from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "All Exams", href: "/admin/exams", icon: BookOpen },
  { label: "Create Exam", href: "/admin/exams/create", icon: PlusCircle },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "Attempts & Results", href: "/admin/attempts", icon: FileCheck2 },
  { label: "Attempt Requests", href: "/admin/attempt-requests", icon: Clock },
  { label: "Certificate Design", href: "/admin/certificate-templates", icon: Award },
  { label: "Audit Activity Log", href: "/admin/audit-logs", icon: Activity },
];

export function AdminSidebar({ adminName }: { adminName?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <aside className="w-64 bg-[#0E3834] border-r border-[#176B63]/40 flex flex-col shrink-0 min-h-screen text-white select-none">
      {/* Brand Header */}
      <div className="h-20 px-5 flex items-center border-b border-[#176B63]/40 bg-[#092825]">
        <Link href="/admin" className="hover:opacity-90 transition">
          <BrandLogo
            variant="horizontal"
            theme="dark"
            size="sm"
            portalSubtitle="Admin Console"
          />
        </Link>
      </div>

      {/* Nav list */}
      <nav className="flex-1 p-3.5 space-y-1">
        <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-[#B59A68]">
          Curriculum & Operations
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition relative ${
                isActive
                  ? "bg-[#176B63] text-white shadow-sm font-semibold before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-1 before:bg-[#B59A68] before:rounded-r"
                  : "text-[#A3B8B2] hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#B59A68]" : "text-[#7A938C]"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User profile & logout */}
      <div className="p-4 border-t border-[#176B63]/40 bg-[#092825]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#176B63] border border-[#B59A68]/60 flex items-center justify-center text-[#B59A68] font-bold text-xs shrink-0">
              {adminName ? adminName.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{adminName || "Administrator"}</p>
              <p className="text-[10px] text-[#B59A68] tracking-wider uppercase font-medium">Super Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 text-[#A3B8B2] hover:text-rose-300 hover:bg-rose-900/30 rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
