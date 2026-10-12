"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  UserPlus,
  Search,
  CheckCircle2,
  XCircle,
  KeyRound,
  Edit2,
  AlertCircle,
  Loader2,
  Lock,
  Mail,
  User,
  RefreshCw,
  Check,
  X,
  Eye,
  EyeOff,
} from "lucide-react";

interface Administrator {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN";
  isActive: boolean;
  tokenVersion: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    createdExams: number;
  };
}

export default function AdministratorsPage() {
  const [administrators, setAdministrators] = useState<Administrator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");

  // Notifications
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Administrator | null>(null);

  // Add form state
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [showAddPassword, setShowAddPassword] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editLoading, setEditLoading] = useState(false);

  // Reset form state
  const [resetPassword, setResetPassword] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const fetchAdministrators = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/administrators");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load administrators");
      setAdministrators(data.administrators || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load administrators";
      setFeedback({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdministrators();
  }, []);

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*";
    let pass = "";
    // Ensure all criteria are met
    pass += "A"; // Uppercase
    pass += "a"; // Lowercase
    pass += "7"; // Digit
    pass += "@"; // Special
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Shuffle
    return pass.split("").sort(() => 0.5 - Math.random()).join("");
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/admin/administrators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName,
          email: addEmail,
          password: addPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create administrator");

      setFeedback({ type: "success", message: `Administrator ${data.administrator.name} created successfully.` });
      setIsAddModalOpen(false);
      setAddName("");
      setAddEmail("");
      setAddPassword("");
      fetchAdministrators();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create administrator";
      setFeedback({ type: "error", message: msg });
    } finally {
      setAddLoading(false);
    }
  };

  const handleEditAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    setEditLoading(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/administrators/${selectedAdmin.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          isActive: editIsActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update administrator");

      setFeedback({ type: "success", message: data.message || "Administrator updated successfully." });
      setIsEditModalOpen(false);
      setSelectedAdmin(null);
      fetchAdministrators();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update administrator";
      setFeedback({ type: "error", message: msg });
    } finally {
      setEditLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;
    setResetLoading(true);
    setFeedback(null);

    try {
      const res = await fetch(`/api/admin/administrators/${selectedAdmin.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          newPassword: resetPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset password");

      setFeedback({ type: "success", message: data.message || "Password reset successfully." });
      setIsResetModalOpen(false);
      setSelectedAdmin(null);
      setResetPassword("");
      fetchAdministrators();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset password";
      setFeedback({ type: "error", message: msg });
    } finally {
      setResetLoading(false);
    }
  };

  const getPasswordCriteria = (pass: string) => [
    { label: "12+ characters", met: pass.length >= 12 },
    { label: "Uppercase letter (A-Z)", met: /[A-Z]/.test(pass) },
    { label: "Lowercase letter (a-z)", met: /[a-z]/.test(pass) },
    { label: "Number (0-9)", met: /[0-9]/.test(pass) },
    { label: "Special character (!@#$%^&*)", met: /[^A-Za-z0-9]/.test(pass) },
  ];

  const filteredAdmins = administrators.filter((admin) => {
    const matchesSearch =
      admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" && admin.isActive) ||
      (statusFilter === "INACTIVE" && !admin.isActive);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-[#E4E0D6]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-serif text-2xl font-bold text-[#24332F]">Institutional Administrators</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#176B63]/10 text-[#176B63]">
              {administrators.length} Accounts
            </span>
          </div>
          <p className="text-xs text-[#66736E] mt-1">
            Super Administrator console for delegating access, provisioning staff, and managing credentials.
          </p>
        </div>

        <button
          onClick={() => {
            setAddName("");
            setAddEmail("");
            setAddPassword("");
            setIsAddModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#176B63] hover:bg-[#12554E] text-white text-xs font-semibold rounded-xl transition shadow-sm cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision Administrator</span>
        </button>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start justify-between gap-3 text-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-rose-50 border border-rose-200 text-rose-900"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs hover:underline cursor-pointer opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search administrators by name or email..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63]"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Deactivated Only</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-[#E4E0D6] rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-12 text-center text-[#66736E]">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#176B63]" />
            <p className="text-xs mt-2">Loading administrators...</p>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div className="p-12 text-center text-[#66736E]">
            <ShieldCheck className="w-10 h-10 mx-auto text-[#B59A68] opacity-50 mb-2" />
            <p className="text-sm font-semibold text-[#24332F]">No administrators found</p>
            <p className="text-xs text-[#8A9690] mt-1">Try adjusting your search criteria or add a new administrator.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F0] border-b border-[#E4E0D6] text-[#24332F] uppercase tracking-wider text-[10px] font-semibold">
                <tr>
                  <th className="px-5 py-3.5">Administrator</th>
                  <th className="px-5 py-3.5">Role</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-center">Exams Authored</th>
                  <th className="px-5 py-3.5">Created Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E4E0D6]">
                {filteredAdmins.map((admin) => {
                  const isSuper = admin.role === "SUPER_ADMIN";
                  return (
                    <tr key={admin.id} className="hover:bg-[#FAF7F0]/60 transition">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#176B63]/10 text-[#176B63] font-bold text-xs flex items-center justify-center border border-[#176B63]/20">
                            {admin.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-[#24332F]">{admin.name}</p>
                            <p className="text-[11px] text-[#66736E] font-mono">{admin.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#B59A68]/15 text-[#8C7343] border border-[#B59A68]/30">
                            <ShieldCheck className="w-3 h-3" />
                            <span>SUPER ADMIN</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#176B63]/10 text-[#176B63] border border-[#176B63]/20">
                            <span>ADMINISTRATOR</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {admin.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            <span>Deactivated</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-center font-medium text-[#24332F]">
                        {admin._count?.createdExams ?? 0}
                      </td>
                      <td className="px-5 py-3.5 text-[#66736E]">
                        {new Date(admin.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {isSuper ? (
                          <span className="text-[11px] text-[#8A9690] italic">Primary Root</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setEditName(admin.name);
                                setEditIsActive(admin.isActive);
                                setIsEditModalOpen(true);
                              }}
                              title="Edit profile & status"
                              className="p-1.5 hover:bg-[#FAF7F0] text-[#24332F] rounded-lg transition border border-[#E4E0D6] cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedAdmin(admin);
                                setResetPassword("");
                                setIsResetModalOpen(true);
                              }}
                              title="Reset administrator password"
                              className="p-1.5 hover:bg-[#FAF7F0] text-[#176B63] rounded-lg transition border border-[#E4E0D6] cursor-pointer"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Add Administrator */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E0D6] rounded-2xl w-full max-w-lg p-6 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E0D6] mb-5">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#24332F]">Provision Administrator</h3>
                <p className="text-xs text-[#66736E] mt-0.5">Creates a institutional ADMIN account with full operational access.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-[#8A9690] hover:text-[#24332F] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#24332F] mb-1 uppercase tracking-wider">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
                  <input
                    type="text"
                    required
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="Dr. Rajesh Sharma"
                    className="w-full pl-10 pr-4 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#24332F] mb-1 uppercase tracking-wider">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
                  <input
                    type="email"
                    required
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="admin2@yadasutra.com"
                    className="w-full pl-10 pr-4 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63]"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#24332F] uppercase tracking-wider">
                    Initial Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setAddPassword(generateRandomPassword())}
                    className="text-[11px] text-[#176B63] hover:text-[#12554E] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate Strong Password</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
                  <input
                    type={showAddPassword ? "text" : "password"}
                    required
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="Enter or generate strong password"
                    className="w-full pl-10 pr-10 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAddPassword(!showAddPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A9690] hover:text-[#24332F]"
                  >
                    {showAddPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password criteria checklist */}
              <div className="p-3 bg-[#FAF7F0] border border-[#E4E0D6] rounded-xl space-y-1 text-[11px]">
                <p className="font-semibold text-[#24332F] mb-1.5 uppercase tracking-wider text-[10px]">
                  Password Policy Requirements:
                </p>
                {getPasswordCriteria(addPassword).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    {item.met ? (
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    ) : (
                      <X className="w-3 h-3 text-[#8A9690] shrink-0" />
                    )}
                    <span className={item.met ? "text-emerald-800 font-medium" : "text-[#66736E]"}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#E4E0D6] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-[#E4E0D6] rounded-xl text-xs font-semibold text-[#24332F] hover:bg-[#FAF7F0] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading || !getPasswordCriteria(addPassword).every((c) => c.met)}
                  className="px-4 py-2 bg-[#176B63] hover:bg-[#12554E] disabled:bg-[#176B63]/40 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 cursor-pointer"
                >
                  {addLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Administrator</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Administrator */}
      {isEditModalOpen && selectedAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E0D6] rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E0D6] mb-5">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#24332F]">Modify Administrator</h3>
                <p className="text-xs text-[#66736E] mt-0.5">{selectedAdmin.email}</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 text-[#8A9690] hover:text-[#24332F] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#24332F] mb-1 uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#24332F] mb-1.5 uppercase tracking-wider">
                  Account Status
                </label>
                <div className="flex items-center gap-3 p-3 bg-[#FAF7F0] border border-[#E4E0D6] rounded-xl">
                  <input
                    type="checkbox"
                    id="isActiveToggle"
                    checked={editIsActive}
                    onChange={(e) => setEditIsActive(e.target.checked)}
                    className="w-4 h-4 text-[#176B63] rounded border-[#E4E0D6] focus:ring-[#176B63]"
                  />
                  <label htmlFor="isActiveToggle" className="text-xs text-[#24332F] cursor-pointer">
                    <span className="font-semibold">{editIsActive ? "Active" : "Deactivated"}</span>
                    <p className="text-[11px] text-[#66736E] mt-0.5">
                      {editIsActive
                        ? "Administrator can sign in and perform examinations operations."
                        : "Administrator is locked out. Active sessions are terminated immediately."}
                    </p>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E4E0D6] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-[#E4E0D6] rounded-xl text-xs font-semibold text-[#24332F] hover:bg-[#FAF7F0] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-4 py-2 bg-[#176B63] hover:bg-[#12554E] disabled:bg-[#176B63]/40 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 cursor-pointer"
                >
                  {editLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Reset Administrator Password */}
      {isResetModalOpen && selectedAdmin && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E0D6] rounded-2xl w-full max-w-md p-6 sm:p-7 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[#E4E0D6] mb-5">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#24332F]">Reset Password</h3>
                <p className="text-xs text-[#66736E] mt-0.5">For {selectedAdmin.name} ({selectedAdmin.email})</p>
              </div>
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="p-1 text-[#8A9690] hover:text-[#24332F] rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                <p className="font-semibold">Session Revocation Notice:</p>
                <p className="mt-0.5">
                  Resetting this administrator’s password will immediately invalidate all their existing browser sessions.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-[#24332F] uppercase tracking-wider">
                    New Strong Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setResetPassword(generateRandomPassword())}
                    className="text-[11px] text-[#176B63] hover:text-[#12554E] font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
                  <input
                    type={showResetPassword ? "text" : "password"}
                    required
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Enter or generate new password"
                    className="w-full pl-10 pr-10 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A9690] hover:text-[#24332F]"
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password criteria checklist */}
              <div className="p-3 bg-[#FAF7F0] border border-[#E4E0D6] rounded-xl space-y-1 text-[11px]">
                <p className="font-semibold text-[#24332F] mb-1.5 uppercase tracking-wider text-[10px]">
                  Password Policy Requirements:
                </p>
                {getPasswordCriteria(resetPassword).map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    {item.met ? (
                      <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                    ) : (
                      <X className="w-3 h-3 text-[#8A9690] shrink-0" />
                    )}
                    <span className={item.met ? "text-emerald-800 font-medium" : "text-[#66736E]"}>
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-[#E4E0D6] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(false)}
                  className="px-4 py-2 border border-[#E4E0D6] rounded-xl text-xs font-semibold text-[#24332F] hover:bg-[#FAF7F0] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading || !getPasswordCriteria(resetPassword).every((c) => c.met)}
                  className="px-4 py-2 bg-[#176B63] hover:bg-[#12554E] disabled:bg-[#176B63]/40 text-white text-xs font-semibold rounded-xl transition flex items-center gap-2 cursor-pointer"
                >
                  {resetLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Reset Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
