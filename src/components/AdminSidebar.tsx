"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  GraduationCap, 
  LayoutDashboard, 
  BookOpen, 
  PlusCircle, 
  Users, 
  FileCheck2, 
  LogOut, 
  Award,
  Layers,
  Clock,
  Activity
} from "lucide-react";

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
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800">
        <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-white text-base leading-none block">ExamPortal</span>
          <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">Admin Console</span>
        </div>
      </div>

      {/* Nav list */}
      <nav className="flex-1 p-4 space-y-1.5">
        <div className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Management
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition ${
                isActive
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* User profile & logout */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 font-bold text-xs shrink-0">
              {adminName ? adminName.charAt(0).toUpperCase() : "A"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{adminName || "Administrator"}</p>
              <p className="text-[10px] text-slate-400">Super Admin</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
