"use client";

import { useState, useEffect } from "react";
import { 
  UserPlus, 
  Upload, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Award, 
  Loader2, 
  X,
} from "lucide-react";

interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  department: string | null;
  isActive: boolean;
  createdAt: string;
  _count?: {
    assignments: number;
    attempts: number;
    certificates: number;
  };
}

export default function StudentsManagementPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Add modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    studentId: "",
    department: "",
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Bulk import modal state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/students?q=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (res.ok) {
        setStudents(data.students || []);
      }
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setAddLoading(true);

    try {
      const res = await fetch("/api/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add student");
      }
      setShowAddModal(false);
      setAddForm({ name: "", email: "", password: "", studentId: "", department: "" });
      fetchStudents();
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : "Error adding student");
    } finally {
      setAddLoading(false);
    }
  };

  const handleToggleStatus = async (student: Student) => {
    try {
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !student.isActive }),
      });
      if (res.ok) {
        setStudents((prev) =>
          prev.map((s) => (s.id === student.id ? { ...s, isActive: !s.isActive } : s))
        );
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  const handleDelete = async (studentId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete student "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/students/${studentId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setStudents((prev) => prev.filter((s) => s.id !== studentId));
      }
    } catch (err) {
      console.error("Failed to delete student:", err);
    }
  };

  const handleBulkSubmit = async () => {
    setBulkLoading(true);
    setBulkResult(null);

    try {
      // Parse CSV: name,email,studentId,department,password
      const lines = csvContent.trim().split("\n");
      const rows = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        return {
          name: parts[0] || "",
          email: parts[1] || "",
          studentId: parts[2] || undefined,
          department: parts[3] || undefined,
          password: parts[4] || "student123",
        };
      }).filter((r) => r.email && r.name);

      if (rows.length === 0) {
        setBulkResult("No valid rows detected. Please check CSV formatting.");
        setBulkLoading(false);
        return;
      }

      const res = await fetch("/api/admin/students/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: rows }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk import failed");

      setBulkResult(`Success: ${data.message} (Skipped: ${data.skippedCount})`);
      fetchStudents();
    } catch (err: unknown) {
      setBulkResult(err instanceof Error ? err.message : "Bulk import failed");
    } finally {
      setBulkLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E0D6] pb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#24332F]">Scholar Enrollment & Roster</h1>
          <p className="text-xs text-[#66736E] mt-1 font-sans">
            Enroll candidates, manage credentials, and track Ayurvedic examination eligibility
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setBulkResult(null);
              setShowBulkModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#FAF7F0] border border-[#E4E0D6] text-xs font-semibold text-[#24332F] transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Upload className="w-4 h-4 text-[#8C7448]" />
            <span>Bulk CSV Import</span>
          </button>
          <button
            onClick={() => {
              setAddError(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-[#176B63] hover:bg-[#12554E] text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#B59A68]" />
            <span>Enroll Scholar</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E4E0D6] rounded-2xl p-4 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scholars by name, email, roll ID, or Ayurvedic discipline..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63] transition"
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white border border-[#E4E0D6] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F0] text-[#66736E] border-b border-[#E4E0D6]">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Scholar Name & Email</th>
                <th className="px-5 py-3.5 font-semibold">Roll ID</th>
                <th className="px-5 py-3.5 font-semibold">Discipline / Dept</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-center">Assigned / Done</th>
                <th className="px-5 py-3.5 font-semibold text-center">Certificates</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E0D6]/60 text-[#24332F]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[#66736E]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#176B63]" />
                    Loading enrolled scholars...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[#66736E]">
                    No scholars found. Use "Enroll Scholar" or "Bulk CSV Import" to register candidates.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-[#FAF7F0]/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#E8F3F1] text-[#176B63] border border-[#2E857A]/20 flex items-center justify-center font-bold text-xs shrink-0">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-[#24332F]">{student.name}</div>
                          <div className="text-[11px] text-[#66736E]">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[#8C7448]">
                      {student.studentId || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-[#24332F] font-medium">
                      {student.department || "General"}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleToggleStatus(student)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition cursor-pointer ${
                          student.isActive
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        }`}
                      >
                        {student.isActive ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono">
                      <span className="text-[#24332F]">{student._count?.assignments || 0}</span>
                      <span className="text-[#8A9690] mx-1">/</span>
                      <span className="text-[#176B63] font-bold">{student._count?.attempts || 0}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {(student._count?.certificates || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[#8C7448] font-bold">
                          <Award className="w-3.5 h-3.5" />
                          {student._count?.certificates}
                        </span>
                      ) : (
                        <span className="text-[#8A9690]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(student.id, student.name)}
                        className="p-1.5 text-[#8A9690] hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Delete Scholar"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E0D6] rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-[#8A9690] hover:text-[#24332F] p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-serif text-xl font-bold text-[#24332F] mb-1">Enroll New Scholar</h2>
            <p className="text-xs text-[#66736E] mb-5 font-sans">Create an account for examination eligibility</p>

            {addError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddStudent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#24332F] mb-1 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Acharya Devdas"
                  className="w-full px-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-1 focus:ring-[#176B63] focus:border-[#176B63]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#24332F] mb-1 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="devdas@yadasutra.com"
                  className="w-full px-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-1 focus:ring-[#176B63] focus:border-[#176B63]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#24332F] mb-1 uppercase tracking-wider">Roll ID</label>
                  <input
                    type="text"
                    value={addForm.studentId}
                    onChange={(e) => setAddForm({ ...addForm, studentId: e.target.value })}
                    placeholder="YS-2026-100"
                    className="w-full px-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-1 focus:ring-[#176B63] focus:border-[#176B63]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#24332F] mb-1 uppercase tracking-wider">Discipline</label>
                  <input
                    type="text"
                    value={addForm.department}
                    onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                    placeholder="Kayachikitsa"
                    className="w-full px-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-1 focus:ring-[#176B63] focus:border-[#176B63]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#24332F] mb-1 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  required
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-1 focus:ring-[#176B63] focus:border-[#176B63]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-white hover:bg-[#FAF7F0] border border-[#E4E0D6] text-xs font-semibold text-[#24332F] rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 bg-[#176B63] hover:bg-[#12554E] disabled:opacity-50 text-xs font-semibold text-white rounded-xl transition flex items-center gap-1.5 shadow-sm"
                >
                  {addLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Scholar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E0D6] rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setShowBulkModal(false)}
              className="absolute right-4 top-4 text-[#8A9690] hover:text-[#24332F] p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="font-serif text-xl font-bold text-[#24332F] mb-1">Bulk CSV Scholar Import</h2>
            <p className="text-xs text-[#66736E] mb-4 font-sans">
              Paste comma-separated rows in format: <code className="text-[#176B63] font-semibold">Name, Email, StudentID, Department, Password</code>
            </p>

            <div className="mb-3">
              <button
                type="button"
                onClick={() =>
                  setCsvContent(
                    `Acharya Devdas, devdas@yadasutra.com, YS-2026-050, Kayachikitsa, scholar123\nDr. Meera Nambiar, meera@yadasutra.com, YS-2026-051, Dravyaguna Vijnana, scholar123\nVaidya Arjun Sharma, arjun@yadasutra.com, YS-2026-052, Shalya Tantra, scholar123`
                  )
                }
                className="text-[11px] text-[#176B63] hover:text-[#12554E] underline font-medium cursor-pointer"
              >
                + Insert Sample Batch Data
              </button>
            </div>

            <textarea
              rows={6}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="Name, Email, StudentID, Department, Password"
              className="w-full p-3 font-mono text-xs bg-white border border-[#E4E0D6] rounded-xl text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-1 focus:ring-[#176B63] focus:border-[#176B63]"
            />

            {bulkResult && (
              <div className="mt-3 p-3 bg-[#E8F3F1] border border-[#2E857A]/30 rounded-xl text-[#176B63] text-xs font-mono">
                {bulkResult}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 bg-white hover:bg-[#FAF7F0] border border-[#E4E0D6] text-xs font-semibold text-[#24332F] rounded-xl transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleBulkSubmit}
                disabled={bulkLoading || !csvContent.trim()}
                className="px-4 py-2 bg-[#176B63] hover:bg-[#12554E] disabled:opacity-50 text-xs font-semibold text-white rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5 text-[#B59A68]" />}
                <span>Import Candidates</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
