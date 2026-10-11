"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  UserPlus, 
  Upload, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  ShieldAlert, 
  Award, 
  FileText, 
  Loader2, 
  X,
  FileCheck2
} from "lucide-react";
import { formatDate } from "@/lib/utils";

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
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Student Management</h1>
          <p className="text-xs text-slate-400 mt-1">Enroll candidates, manage credentials, and track participation</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setBulkResult(null);
              setShowBulkModal(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-medium text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-400" />
            <span>Bulk CSV Import</span>
          </button>
          <button
            onClick={() => {
              setAddError(null);
              setShowAddModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/25 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, roll number, or department..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Student Name & Email</th>
                <th className="px-5 py-3.5 font-semibold">Roll / Student ID</th>
                <th className="px-5 py-3.5 font-semibold">Department</th>
                <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                <th className="px-5 py-3.5 font-semibold text-center">Assigned / Done</th>
                <th className="px-5 py-3.5 font-semibold text-center">Certificates</th>
                <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading students...
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                    No students found. Use "Add Student" or "Bulk CSV Import" to enroll candidates.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs shrink-0">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-white">{student.name}</div>
                          <div className="text-[11px] text-slate-400">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-300">
                      {student.studentId || "—"}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">
                      {student.department || "General"}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <button
                        onClick={() => handleToggleStatus(student)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition cursor-pointer ${
                          student.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
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
                      <span className="text-slate-200">{student._count?.assignments || 0}</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-indigo-400 font-semibold">{student._count?.attempts || 0}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {(student._count?.certificates || 0) > 0 ? (
                        <span className="inline-flex items-center gap-1 text-amber-400 font-semibold">
                          <Award className="w-3.5 h-3.5" />
                          {student._count?.certificates}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(student.id, student.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
                        title="Delete Student"
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white mb-1">Add New Student</h2>
            <p className="text-xs text-slate-400 mb-5">Create an account for examination eligibility</p>

            {addError && (
              <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                {addError}
              </div>
            )}

            <form onSubmit={handleAddStudent} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Alex Morgan"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="alex.morgan@univ.edu"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Roll / Student ID</label>
                  <input
                    type="text"
                    value={addForm.studentId}
                    onChange={(e) => setAddForm({ ...addForm, studentId: e.target.value })}
                    placeholder="STU-2026-100"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Department</label>
                  <input
                    type="text"
                    value={addForm.department}
                    onChange={(e) => setAddForm({ ...addForm, department: e.target.value })}
                    placeholder="Computer Sci"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-medium text-white rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
                >
                  {addLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Save Student</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <button
              onClick={() => setShowBulkModal(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white mb-1">Bulk CSV Student Import</h2>
            <p className="text-xs text-slate-400 mb-4">
              Paste comma-separated rows in format: <code className="text-indigo-400">Name, Email, StudentID, Department, Password</code>
            </p>

            <div className="mb-3">
              <button
                type="button"
                onClick={() =>
                  setCsvContent(
                    `Alice Walker, alice@example.com, STU-2026-050, Software Engineering, student123\nBob Marley, bob@marley.com, STU-2026-051, Cybersecurity, student123\nCharlie Brown, charlie@brown.com, STU-2026-052, Artificial Intelligence, student123`
                  )
                }
                className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-medium cursor-pointer"
              >
                + Insert Sample Batch Data
              </button>
            </div>

            <textarea
              rows={6}
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="Name, Email, StudentID, Department, Password"
              className="w-full p-3 font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            {bulkResult && (
              <div className="mt-3 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-300 text-xs font-mono">
                {bulkResult}
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded-xl transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleBulkSubmit}
                disabled={bulkLoading || !csvContent.trim()}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-medium text-white rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                {bulkLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>Import Candidates</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
