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
  CheckCircle2, 
  AlertCircle,
  FileCheck2,
  Sliders
} from "lucide-react";
import { formatDate } from "@/lib/utils";

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Examinations</h1>
          <p className="text-xs text-slate-400 mt-1">Design, configure, and monitor academic assessments</p>
        </div>
        <Link
          href="/admin/exams/create"
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-medium text-white transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/25 w-fit"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Create New Exam</span>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or code..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                statusFilter === status
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-800/60 text-slate-400 hover:text-slate-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Exam Cards Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
          Loading exams...
        </div>
      ) : filteredExams.length === 0 ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-12 text-center">
          <BookOpen className="w-10 h-10 mx-auto text-slate-600 mb-3" />
          <h2 className="text-base font-semibold text-white">No Examinations Found</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search ? "No exams matched your search query." : "Get started by authoring your first examination."}
          </p>
          {!search && (
            <Link
              href="/admin/exams/create"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create First Exam</span>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredExams.map((exam) => (
            <div
              key={exam.id}
              className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-sm transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-semibold">
                      {exam.code}
                    </span>
                    <h2 className="text-base font-bold text-white mt-1.5 leading-snug">{exam.title}</h2>
                  </div>

                  <button
                    onClick={() => handleTogglePublish(exam)}
                    className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border transition cursor-pointer ${
                      exam.status === "PUBLISHED"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                    }`}
                  >
                    {exam.status}
                  </button>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-3 gap-2 my-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Duration</span>
                    <span className="text-xs font-bold text-white">{exam.durationMinutes} mins</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Questions</span>
                    <span className="text-xs font-bold text-indigo-400">{exam._count?.questions || 0}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">Passing</span>
                    <span className="text-xs font-bold text-emerald-400">{exam.passingScore}%</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 mb-4">
                  <span className="flex items-center gap-1">
                    <FileCheck2 className="w-3.5 h-3.5 text-slate-400" />
                    {exam._count?.attempts || 0} attempts
                  </span>
                  <span>•</span>
                  <span>{exam._count?.assignments || 0} assigned</span>
                  {exam.negativeMarking && (
                    <>
                      <span>•</span>
                      <span className="text-rose-400 font-medium">Negative marking enabled</span>
                    </>
                  )}
                </div>
              </div>

              {/* Actions footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/exams/${exam.id}/assign`}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 transition font-medium flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Assign</span>
                  </Link>
                  <Link
                    href={`/admin/exams/${exam.id}/edit`}
                    className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs rounded-lg border border-indigo-500/30 transition font-medium flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Questions</span>
                  </Link>
                </div>

                <button
                  onClick={() => handleDelete(exam.id, exam.title)}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition cursor-pointer"
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
