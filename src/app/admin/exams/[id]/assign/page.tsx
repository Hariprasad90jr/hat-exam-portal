"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  UserPlus, 
  ArrowLeft, 
  CheckSquare, 
  Square, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
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

  const assignedStudentIdSet = new Set(assignments.map((a) => a.student.id));

  const handleToggleStudent = (id: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const unassignedFilteredIds = filteredStudents
      .map((s) => s.id)
      .filter((id) => !assignedStudentIdSet.has(id));

    const allCurrentlySelected = unassignedFilteredIds.every((id) =>
      selectedStudentIds.includes(id)
    );

    if (allCurrentlySelected) {
      setSelectedStudentIds((prev) =>
        prev.filter((id) => !unassignedFilteredIds.includes(id))
      );
    } else {
      setSelectedStudentIds((prev) => [
        ...new Set([...prev, ...unassignedFilteredIds]),
      ]);
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
          validFrom: validFrom ? new Date(validFrom).toISOString() : null,
          validTo: validTo ? new Date(validTo).toISOString() : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to assign students");

      setSuccessMsg(`Successfully assigned ${data.count || selectedStudentIds.length} candidate(s).`);
      setSelectedStudentIds([]);
      fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Assignment failed");
    } finally {
      setAssigning(false);
    }
  };

  const handleRevoke = async (assignmentId: string, studentName: string) => {
    if (!confirm(`Revoke assignment for ${studentName}?`)) return;

    try {
      const res = await fetch(`/api/admin/exams/${examId}/assignments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId }),
      });
      if (res.ok) {
        setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
      }
    } catch (err) {
      console.error("Failed to revoke assignment:", err);
    }
  };

  if (loading && !exam) {
    return (
      <div className="p-16 text-center text-[#66736E]">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#176B63]" />
        Loading assignment details...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E4E0D6] pb-5">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/exams"
            className="p-2 bg-white hover:bg-[#FAF7F0] border border-[#E4E0D6] rounded-xl text-[#66736E] hover:text-[#24332F] transition shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#FAF7F0] text-[#8C7448] border border-[#B59A68]/30 font-semibold">
                {exam?.code}
              </span>
              <h1 className="font-serif text-2xl font-bold text-[#24332F]">{exam?.title}</h1>
            </div>
            <p className="text-xs text-[#66736E] mt-0.5 font-sans">Assign this curriculum assessment to scholars or cohorts</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Student Selection & Filter */}
        <div className="lg:col-span-2 bg-white border border-[#E4E0D6] rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4E0D6] pb-3">
            <div>
              <h2 className="font-serif text-base font-bold text-[#24332F]">Select Eligible Scholars</h2>
              <p className="text-[11px] text-[#66736E]">Pick enrolled candidates for this examination</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="bg-white border border-[#E4E0D6] text-xs text-[#24332F] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#176B63]"
              >
                <option value="ALL">All Disciplines</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleSelectAllFiltered}
                className="px-3 py-1.5 bg-white hover:bg-[#FAF7F0] text-[#24332F] text-xs rounded-lg border border-[#E4E0D6] transition font-semibold cursor-pointer shadow-sm"
              >
                Toggle All
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-[#E4E0D6]/60 pr-1">
            {filteredStudents.length === 0 ? (
              <div className="py-8 text-center text-[#66736E] text-xs">
                No scholars enrolled in this discipline.
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
                        ? "bg-[#E8F3F1] border border-[#2E857A]/30"
                        : "hover:bg-[#FAF7F0]/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-[#176B63]">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#176B63]" />
                        ) : (
                          <Square className="w-4 h-4 text-[#8A9690]" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#24332F] flex items-center gap-2">
                          <span>{student.name}</span>
                          {isAlreadyAssigned && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#FAF7F0] text-[#8C7448] font-medium border border-[#B59A68]/30">
                              Assigned
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#66736E]">
                          {student.email} • {student.studentId || "No Roll ID"}
                        </div>
                      </div>
                    </div>

                    <span className="text-[11px] text-[#8C7448] font-medium">
                      {student.department || "General"}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Assignment Rules & Schedule */}
        <div className="bg-white border border-[#E4E0D6] rounded-2xl p-5 space-y-4 flex flex-col justify-between shadow-sm">
          <div className="space-y-4">
            <h2 className="font-serif text-base font-bold text-[#24332F] border-b border-[#E4E0D6] pb-2">
              Assignment Rules
            </h2>

            <div>
              <label className="block text-xs font-semibold text-[#24332F] mb-1 uppercase tracking-wider">
                Max Allowed Attempts
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-1 focus:ring-[#176B63] font-mono font-bold"
              />
              <span className="text-[11px] text-[#66736E] mt-1 block">
                Number of test attempts permitted per candidate
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#24332F] mb-1 uppercase tracking-wider">
                Valid From (Optional)
              </label>
              <input
                type="datetime-local"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-1 focus:ring-[#176B63]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#24332F] mb-1 uppercase tracking-wider">
                Deadline / Valid Until (Optional)
              </label>
              <input
                type="datetime-local"
                value={validTo}
                onChange={(e) => setValidTo(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-1 focus:ring-[#176B63]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#E4E0D6] space-y-2">
            <div className="text-xs text-[#66736E]">
              Selected: <strong className="text-[#176B63] font-bold">{selectedStudentIds.length}</strong> scholar(s)
            </div>

            <button
              type="button"
              onClick={handleAssign}
              disabled={assigning || selectedStudentIds.length === 0}
              className="w-full py-2.5 px-4 bg-[#176B63] hover:bg-[#12554E] disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
            >
              {assigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 text-[#B59A68]" />}
              <span>Confirm & Enroll</span>
            </button>
          </div>
        </div>
      </div>

      {/* Currently Assigned Students Table */}
      <div className="bg-white border border-[#E4E0D6] rounded-2xl p-5 space-y-3 shadow-sm">
        <h2 className="font-serif text-base font-bold text-[#24332F]">
          Enrolled Candidates ({assignments.length})
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F0] text-[#66736E] border-b border-[#E4E0D6]">
              <tr>
                <th className="px-4 py-3 font-semibold">Scholar</th>
                <th className="px-4 py-3 font-semibold">Roll ID</th>
                <th className="px-4 py-3 font-semibold text-center">Attempts Used</th>
                <th className="px-4 py-3 font-semibold text-center">Latest Result</th>
                <th className="px-4 py-3 font-semibold">Enrolled On</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E0D6]/60 text-[#24332F]">
              {assignments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[#66736E]">
                    No candidates assigned to this examination yet.
                  </td>
                </tr>
              ) : (
                assignments.map((a) => {
                  const latestAttempt = a.attempts[0];
                  return (
                    <tr key={a.id} className="hover:bg-[#FAF7F0]/40">
                      <td className="px-4 py-3 font-medium text-[#24332F]">
                        {a.student.name}
                        <span className="block text-[11px] text-[#66736E] font-normal">
                          {a.student.email}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-[#8C7448]">
                        {a.student.studentId || "—"}
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-medium">
                        {a.attempts.length} / {a.maxAttempts}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {latestAttempt ? (
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              latestAttempt.passed
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {latestAttempt.passed ? "Passed" : "Failed"} ({latestAttempt.score} pts)
                          </span>
                        ) : (
                          <span className="text-[#8A9690] text-[11px]">Not attempted</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[#66736E] text-[11px]">
                        {formatDate(a.assignedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRevoke(a.id, a.student.name)}
                          className="p-1.5 text-[#8A9690] hover:text-rose-700 rounded-lg hover:bg-rose-50 transition cursor-pointer"
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
