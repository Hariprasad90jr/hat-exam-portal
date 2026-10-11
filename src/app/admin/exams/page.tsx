"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  BookOpen, 
  PlusCircle, 
  Clock, 
  Search, 
  Trash2, 
  Edit3, 
  UserPlus, 
  Loader2, 
  FileCheck2,
} from "lucide-react";

interface Exam {
  id: string;
  title: string;
  code: string;
  durationMinutes: number;
  passingScore: number;
  totalMarks: number;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  negativeMarking: boolean;
  proctoringStrict: boolean;
  createdAt: string;
  _count?: {
    questions: number;
    assignments: number;
    attempts: number;
  };
}

export default function AdminExamsPage() {
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/exams");
      const data = await res.json();
      if (res.ok) {
        setExams(data.exams || []);
      }
    } catch (err) {
      console.error("Failed to load exams:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete exam "${title}"? This will delete all questions, assignments, and attempts.`)) return;

    try {
      const res = await fetch(`/api/admin/exams/${id}`, { method: "DELETE" });
      if (res.ok) {
        setExams((prev) => prev.filter((e) => e.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete exam:", err);
    }
  };

  const handleTogglePublish = async (exam: Exam) => {
    const nextStatus = exam.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const res = await fetch(`/api/admin/exams/${exam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setExams((prev) =>
          prev.map((e) => (e.id === exam.id ? { ...e, status: nextStatus } : e))
        );
      }
    } catch (err) {
      console.error("Failed to toggle status:", err);
    }
  };

  const filteredExams = exams.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || e.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E0D6] pb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#24332F]">Curriculum Examinations</h1>
          <p className="text-xs text-[#66736E] mt-1 font-sans">Design, configure, and administer academic assessments</p>
        </div>
        <Link
          href="/admin/exams/create"
          className="px-4 py-2 rounded-xl bg-[#176B63] hover:bg-[#12554E] text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-sm w-fit"
        >
          <PlusCircle className="w-4 h-4 text-[#B59A68]" />
          <span>Author New Examination</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E4E0D6] rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or syllabus code..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63] transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                statusFilter === status
                  ? "bg-[#176B63] text-white shadow-sm font-semibold"
                  : "bg-white text-[#66736E] border border-[#E4E0D6] hover:bg-[#FAF7F0]"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Exam Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-[#66736E]">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#176B63]" />
          Loading examinations...
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-white border border-[#E4E0D6] rounded-2xl p-12 text-center shadow-sm">
          <BookOpen className="w-10 h-10 mx-auto text-[#8A9690] mb-3" />
          <h2 className="font-serif text-lg font-bold text-[#24332F]">No Examinations Found</h2>
          <p className="text-xs text-[#66736E] mt-1 max-w-sm mx-auto">
            {search ? "No exams matched your search query." : "Begin by authoring your first Ayurvedic curriculum examination."}
          </p>
          {!search && (
            <Link
              href="/admin/exams/create"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#176B63] hover:bg-[#12554E] text-white rounded-xl text-xs font-semibold transition shadow-sm"
            >
              <PlusCircle className="w-4 h-4 text-[#B59A68]" />
              <span>Author First Exam</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="bg-white border border-[#E4E0D6] hover:border-[#B59A68]/60 rounded-2xl p-5 shadow-sm transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-[#FAF7F0] text-[#8C7448] border border-[#B59A68]/30 font-semibold">
                      {exam.code}
                    </span>
                    <h2 className="font-serif text-base font-bold text-[#24332F] mt-1.5 leading-snug">{exam.title}</h2>
                  </div>

                  <button
                    onClick={() => handleTogglePublish(exam)}
                    className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition cursor-pointer ${
                      exam.status === "PUBLISHED"
                        ? "bg-[#E8F3F1] text-[#176B63] border-[#2E857A]/20 hover:bg-[#D5EAE6]"
                        : "bg-[#FAF7F0] text-[#8C7448] border-[#B59A68]/30 hover:bg-[#F6F1E5]"
                    }`}
                  >
                    {exam.status}
                  </button>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-3 gap-2 my-4 p-3 rounded-xl bg-[#FAF7F0]/50 border border-[#E4E0D6] text-center">
                  <div>
                    <span className="text-[10px] text-[#66736E] block uppercase font-medium">Duration</span>
                    <span className="text-xs font-bold text-[#24332F]">{exam.durationMinutes} mins</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#66736E] block uppercase font-medium">Questions</span>
                    <span className="text-xs font-bold text-[#176B63]">{exam._count?.questions || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#66736E] block uppercase font-medium">Passing</span>
                    <span className="text-xs font-bold text-[#8C7448]">{exam.passingScore}%</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#66736E] mb-4">
                  <span className="flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5 text-[#8A9690]" />
                    {exam._count?.attempts || 0} attempts
                  </span>
                  <span>•</span>
                  <span>{exam._count?.assignments || 0} assigned</span>
                  {exam.negativeMarking && (
                    <>
                      <span>•</span>
                      <span className="text-rose-700 font-medium">Negative marking</span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions footer */}
              <div className="pt-3 border-t border-[#E4E0D6] flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/exams/${exam.id}/assign`}
                    className="px-3 py-1.5 bg-white hover:bg-[#FAF7F0] text-[#24332F] text-xs rounded-lg border border-[#E4E0D6] transition font-medium flex items-center gap-1 shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-[#176B63]" />
                    <span>Assign</span>
                  </Link>
                  <Link
                    href={`/admin/exams/${exam.id}/edit`}
                    className="px-3 py-1.5 bg-[#E8F3F1] hover:bg-[#D5EAE6] text-[#176B63] text-xs rounded-lg border border-[#2E857A]/20 transition font-semibold flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Questions</span>
                  </Link>
                </div>

                <button
                  onClick={() => handleDelete(exam.id, exam.title)}
                  className="p-1.5 text-[#8A9690] hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                  title="Delete Exam"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
