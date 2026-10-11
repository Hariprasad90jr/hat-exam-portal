"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  UserPlus, 
  ArrowLeft, 
  CheckSquare, 
  Square, 
  Clock, 
  Calendar, 
  Trash2, 
  CheckCircle2, 
  Users, 
  AlertCircle, 
  Loader2,
  Filter
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface Student {
  id: string;
  name: string;
  email: string;
  studentId: string | null;
  department: string | null;
}

interface Assignment {
  id: string;
  student: Student;
  status: string;
  validFrom: string | null;
  validTo: string | null;
  maxAttempts: number;
  assignedAt: string;
  attempts: {
    id: string;
    score: number;
    passed: boolean;
    status: string;
    submittedAt: string | null;
  }[];
}

export default function AssignExamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const examId = resolvedParams.id;
  const router = useRouter();

  const [exam, setExam] = useState<any>(null);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Assignment configuration form
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [validFrom, setValidFrom] = useState("");
  const [validTo, setValidTo] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [examRes, assignRes] = await Promise.all([
        fetch(`/api/admin/exams/${examId}`),
        fetch(`/api/admin/exams/${examId}/assignments`),
      ]);

      const examData = await examRes.json();
      const assignData = await assignRes.json();

      if (examRes.ok) setExam(examData.exam);
      if (assignRes.ok) {
        setAllStudents(assignData.allStudents || []);
        setAssignments(assignData.assignments || []);
      }
    } catch (err) {
      console.error("Failed to load assignment data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [examId]);

  const departments = Array.from(
    new Set(allStudents.map((s) => s.department || "General"))
  );

  const filteredStudents = allStudents.filter((s) => {
    if (departmentFilter === "ALL") return true;
    return (s.department || "General") === departmentFilter;
  });

  const handleToggleStudent = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(selectedStudentIds.filter((sid) => sid !== id));
    } else {
      setSelectedStudentIds([...selectedStudentIds, id]);
    }
  };

  const handleSelectAllFiltered = () => {
    const ids = filteredStudents.map((s) => s.id);
    const allSelected = ids.every((id) => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds(selectedStudentIds.filter((id) => !ids.includes(id)));
    } else {
      setSelectedStudentIds(Array.from(new Set([...selectedStudentIds, ...ids])));
    }
  };

  const handleAssign = async () => {
    if (selectedStudentIds.length === 0) {
      setError("Please select at least one student to assign.");
      return;
    }

    setError(null);
    setSuccessMsg(null);
    setAssigning(true);

    try {
      const res = await fetch(`/api/admin/exams/${examId}/assignments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentIds: selectedStudentIds,
          maxAttempts: Number(maxAttempts),
          validFrom: validFrom || null,
          validTo: validTo || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign exam");

      setSuccessMsg(`Successfully assigned exam to ${selectedStudentIds.length} candidate(s)!`);
      setSelectedStudentIds([]);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to assign exam");
    } finally {
      setAssigning(false);
    }
  };

  const handleRevoke = async (assignmentId: string, studentName: string) => {
    if (!confirm(`Revoke assignment for ${studentName}?`)) return;

    try {
      const res = await fetch(
        `/api/admin/exams/${examId}/assignments?assignmentId=${assignmentId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      }
    } catch (err) {
      console.error("Failed to revoke assignment:", err);
    }
  };

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
        Loading assignment controls...
      </div>
    );
  }

  const assignedStudentIdSet = new Set(assignments.map((a) => a.student.id));

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Back button & Title */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/exams"
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                {exam?.code}
              </span>
              <h1 className="text-xl font-bold text-white">{exam?.title}</h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Assign this assessment to candidates or cohorts</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Student Selection & Filter */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Select Eligible Students</h2>
              <p className="text-[11px] text-slate-400">Pick candidates to enroll for this exam</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                <option value="ALL">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 transition font-medium cursor-pointer"
              >
                Toggle All
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-slate-800/60 pr-1">
            {filteredStudents.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No students enrolled in this category.
              </div>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = selectedStudentIds.includes(student.id);
                const isAlreadyAssigned = assignedStudentIdSet.has(student.id);

                return (
                  <div
                    key={student.id}
                    onClick={() => handleToggleStudent(student.id)}
                    className={`py-2.5 px-3 rounded-xl transition flex items-center justify-between cursor-pointer ${
                      isSelected
                        ? "bg-indigo-950/40 border border-indigo-600/40"
                        : "hover:bg-slate-800/40"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-indigo-400">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-white flex items-center gap-2">
                          <span>{student.name}</span>
                          {isAlreadyAssigned && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-normal">
                              Assigned
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {student.email} • {student.studentId || "No Roll"}
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] text-slate-400 font-mono">
                      {student.department || "General"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Assignment Rules & Schedule */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-white border-b border-slate-800 pb-2">
              Assignment Rules
            </h2>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Max Allowed Attempts
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Number of test attempts permitted per student
              </span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Valid From (Optional)
              </label>
              <input
                type="datetime-local"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Deadline / Valid Until (Optional)
              </label>
              <input
                type="datetime-local"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-2">
            <div className="text-xs text-slate-400">
              Selected: <strong className="text-indigo-400 font-mono">{selectedStudentIds.length}</strong> student(s)
            </div>

            <button
              type="button"
              onClick={handleAssign}
              disabled={assigning || selectedStudentIds.length === 0}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
            >
              {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              <span>Confirm & Assign</span>
            </button>
          </div>
        </div>
      </div>

      {/* Currently Assigned Students Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-white">
          Enrolled Candidates ({assignments.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Candidate</th>
                <th className="px-4 py-3 font-semibold">Student ID</th>
                <th className="px-4 py-3 font-semibold text-center">Attempts Used</th>
                <th className="px-4 py-3 font-semibold text-center">Latest Result</th>
                <th className="px-4 py-3 font-semibold">Enrolled On</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No candidates assigned to this exam yet.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => {
                  const latestAttempt = a.attempts[0];
                  return (
                    <tr key={a.id} className="hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-medium text-white">
                        {a.student.name}
                        <span className="block text-[11px] text-slate-400 font-normal">
                          {a.student.email}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-300">
                        {a.student.studentId || "—"}
                      </td>
                      <td className="px-4 py-3 text-center font-mono">
                        {a.attempts.length} / {a.maxAttempts}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {latestAttempt ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              latestAttempt.passed
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-rose-500/10 text-rose-400"
                            }`}
                          >
                            {latestAttempt.passed ? "Passed" : "Failed"} ({latestAttempt.score} pts)
                          </span>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Not attempted</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-[11px]">
                        {formatDate(a.assignedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRevoke(a.id, a.student.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                          title="Revoke enrollment"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
