"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  FileCheck2, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  Award, 
  Loader2, 
  ExternalLink,
  ChevronRight,
  Filter
} from "lucide-react";
import { formatDate, formatSecondsToTime } from "@/lib/utils";

interface Attempt {
  id: string;
  student: {
    id: string;
    name: string;
    email: string;
    studentId: string | null;
    department: string | null;
  };
  exam: {
    id: string;
    title: string;
    code: string;
    passingScore: number;
    totalMarks: number;
  };
  score: number;
  totalMarks: number;
  percentage: number;
  passed: boolean;
  status: string;
  timeSpentSeconds: number;
  tabSwitchCount: number;
  submittedAt: string | null;
  createdAt: string;
  requiresReview?: boolean;
  reviewStatus?: string;
  certificate: {
    id: string;
    certificateNumber: string;
  } | null;
}

export default function AdminAttemptsPage() {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [examFilter, setExamFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [reviewFilter, setReviewFilter] = useState("ALL");

  // Review Modal State
  const [reviewAttempt, setReviewAttempt] = useState<any | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [grades, setGrades] = useState<Record<string, { marks: number; feedback: string }>>({});

  const openReviewModal = async (attemptId: string) => {
    try {
      setReviewLoading(true);
      const res = await fetch(`/api/admin/attempts/${attemptId}/review`);
      const data = await res.json();
      if (res.ok && data.attempt) {
        setReviewAttempt(data.attempt);
        const initialGrades: Record<string, { marks: number; feedback: string }> = {};
        for (const a of data.attempt.answers || []) {
          initialGrades[a.questionId] = {
            marks: a.marksAwarded || 0,
            feedback: a.feedback || "",
          };
        }
        setGrades(initialGrades);
      }
    } catch (err) {
      console.error("Failed to load attempt for review:", err);
    } finally {
      setReviewLoading(false);
    }
  };

  const submitReview = async () => {
    if (!reviewAttempt) return;
    try {
      setReviewSubmitting(true);
      const gradesPayload = Object.entries(grades).map(([qId, g]) => ({
        questionId: qId,
        marksAwarded: Number(g.marks),
        feedback: g.feedback,
      }));

      const res = await fetch(`/api/admin/attempts/${reviewAttempt.id}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grades: gradesPayload }),
      });

      if (res.ok) {
        setReviewAttempt(null);
        fetchAttempts();
      }
    } catch (err) {
      console.error("Failed to submit review:", err);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams();
      if (search) queryParams.set("q", search);
      if (examFilter !== "ALL") queryParams.set("examId", examFilter);
      if (statusFilter !== "ALL") queryParams.set("status", statusFilter);
      if (reviewFilter !== "ALL") queryParams.set("reviewStatus", reviewFilter);

      const res = await fetch(`/api/admin/attempts?${queryParams.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setAttempts(data.attempts || []);
        setExams(data.exams || []);
      }
    } catch (err) {
      console.error("Failed to load attempts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAttempts();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, examFilter, statusFilter, reviewFilter]);

  const totalAttempts = attempts.length;
  const passedAttempts = attempts.filter((a) => a.passed).length;
  const passPercentage = totalAttempts > 0 ? Math.round((passedAttempts / totalAttempts) * 100) : 0;
  const totalViolations = attempts.reduce((acc, a) => acc + (a.tabSwitchCount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Attempts & Results Analytics</h1>
        <p className="text-xs text-slate-400 mt-1">Review candidate examination submissions, grading records, and proctoring logs</p>
      </div>

      {/* Metric Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Submissions</span>
          <span className="text-2xl font-extrabold text-white font-mono mt-1 block">{totalAttempts}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Pass Rate</span>
          <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-1 block">
            {passPercentage}% <span className="text-xs text-slate-400 font-normal">({passedAttempts} passed)</span>
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Failed / Below Cutoff</span>
          <span className="text-2xl font-extrabold text-rose-400 font-mono mt-1 block">
            {totalAttempts - passedAttempts}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">Tab Switch Incidents</span>
          <span className="text-2xl font-extrabold text-amber-400 font-mono mt-1 block">
            {totalViolations}
          </span>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate or exam..."
            className="w-full pl-10 pr-4 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">All Examinations</option>
            {exams.map((ex) => (
              <option key={ex.id} value={ex.id}>
                {ex.code} - {ex.title}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="TIMED_OUT">Timed Out</option>
          </select>

          <select
            value={reviewFilter}
            onChange={(e) => setReviewFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-xl px-3 py-2 focus:outline-none"
          >
            <option value="ALL">All Grading Stages</option>
            <option value="PENDING_REVIEW">Pending Manual Review</option>
            <option value="COMPLETED">Grading Completed</option>
          </select>
        </div>
      </div>

      {/* Attempts Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Candidate</th>
                <th className="px-5 py-3.5 font-semibold">Exam Title</th>
                <th className="px-5 py-3.5 font-semibold text-center">Score</th>
                <th className="px-5 py-3.5 font-semibold text-center">Percentage</th>
                <th className="px-5 py-3.5 font-semibold text-center">Result</th>
                <th className="px-5 py-3.5 font-semibold text-center">Duration</th>
                <th className="px-5 py-3.5 font-semibold text-center">Proctor Incidents</th>
                <th className="px-5 py-3.5 font-semibold">Submitted</th>
                <th className="px-5 py-3.5 font-semibold text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                    Loading attempt records...
                  </td>
                </tr>
              ) : attempts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-slate-500">
                    No matching exam attempts found.
                  </td>
                </tr>
              ) : (
                attempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-white">{attempt.student?.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {attempt.student?.studentId || attempt.student?.email}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-medium text-slate-200">{attempt.exam?.title}</div>
                      <span className="font-mono text-[10px] text-indigo-400">{attempt.exam?.code}</span>
                    </td>

                    <td className="px-5 py-3.5 text-center font-bold text-white font-mono">
                      {attempt.score} / {attempt.totalMarks}
                    </td>

                    <td className="px-5 py-3.5 text-center font-bold font-mono">
                      {Math.round(attempt.percentage)}%
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {attempt.reviewStatus === "PENDING_REVIEW" || attempt.requiresReview ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-semibold">
                          <Clock className="w-3 h-3" /> Pending Review
                        </span>
                      ) : attempt.passed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-center font-mono text-slate-300">
                      {formatSecondsToTime(attempt.timeSpentSeconds)}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {attempt.tabSwitchCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono text-[11px] font-bold">
                          <ShieldAlert className="w-3 h-3" />
                          {attempt.tabSwitchCount}
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                      {formatDate(attempt.submittedAt || attempt.createdAt)}
                    </td>

                    <td className="px-5 py-3.5 text-right flex items-center justify-end gap-2">
                      {(attempt.reviewStatus === "PENDING_REVIEW" || attempt.requiresReview) && (
                        <button
                          onClick={() => openReviewModal(attempt.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-semibold text-[11px] border border-amber-500/30 transition"
                        >
                          <span>Grade</span>
                        </button>
                      )}
                      <Link
                        href={`/student/results/${attempt.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-medium text-[11px] border border-indigo-500/30 transition"
                      >
                        <span>View</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {reviewAttempt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Manual Subjective Review</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Candidate: <strong className="text-white">{reviewAttempt.student?.name}</strong> • Exam: {reviewAttempt.exam?.title}
                </p>
              </div>
              <button
                onClick={() => setReviewAttempt(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {reviewAttempt.answers?.filter((a: any) => a.question?.type === "SHORT_ANSWER").length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No subjective short-answer questions found on this attempt.</p>
              ) : (
                reviewAttempt.answers
                  ?.filter((a: any) => a.question?.type === "SHORT_ANSWER")
                  .map((ans: any, idx: number) => {
                    const q = ans.question;
                    const grade = grades[ans.questionId] || { marks: 0, feedback: "" };

                    return (
                      <div key={ans.id} className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs font-bold text-white leading-relaxed">
                            {idx + 1}. {q.prompt}
                          </p>
                          <span className="text-[10px] font-mono text-slate-400 shrink-0">
                            Max: {q.points} pts
                          </span>
                        </div>

                        <div className="p-3 bg-slate-900/80 border border-slate-800/80 rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Candidate Answer:</span>
                          <p className="text-xs text-white italic whitespace-pre-wrap">
                            {ans.textAnswer || "(No answer submitted)"}
                          </p>
                        </div>

                        {q.explanation && (
                          <div className="p-2.5 bg-indigo-950/20 border border-indigo-900/30 rounded-xl text-[11px] text-indigo-300">
                            <strong className="text-indigo-400">Sample/Expected Solution:</strong> {q.explanation}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                              Awarded Points (0 - {q.points})
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0"
                              max={q.points}
                              value={grade.marks}
                              onChange={(e) =>
                                setGrades((prev) => ({
                                  ...prev,
                                  [ans.questionId]: {
                                    ...prev[ans.questionId],
                                    marks: Math.max(0, Math.min(q.points, Number(e.target.value))),
                                  },
                                }))
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                              Feedback Note (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Well articulated concept"
                              value={grade.feedback}
                              onChange={(e) =>
                                setGrades((prev) => ({
                                  ...prev,
                                  [ans.questionId]: {
                                    ...prev[ans.questionId],
                                    feedback: e.target.value,
                                  },
                                }))
                              }
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-800 bg-slate-950/40 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReviewAttempt(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={reviewSubmitting}
                onClick={submitReview}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50"
              >
                {reviewSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Finalizing Score...</span>
                  </>
                ) : (
                  <span>Submit Grades & Finalize</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
