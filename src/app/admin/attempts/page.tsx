"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldAlert, 
  Loader2, 
  ExternalLink,
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

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Review submission failed");

      setReviewAttempt(null);
      fetchAttempts();
    } catch (err) {
      console.error("Failed to submit review:", err);
      alert(err instanceof Error ? err.message : "Review submission failed");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const fetchAttempts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/attempts");
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
    fetchAttempts();
  }, []);

  const filteredAttempts = attempts.filter((att) => {
    const matchesSearch =
      att.student?.name.toLowerCase().includes(search.toLowerCase()) ||
      att.student?.email.toLowerCase().includes(search.toLowerCase()) ||
      att.exam?.title.toLowerCase().includes(search.toLowerCase()) ||
      att.exam?.code.toLowerCase().includes(search.toLowerCase());

    const matchesExam = examFilter === "ALL" || att.exam?.id === examFilter;
    const matchesStatus = statusFilter === "ALL" || att.status === statusFilter;
    const matchesReview =
      reviewFilter === "ALL" ||
      (reviewFilter === "PENDING_REVIEW" &&
        (att.reviewStatus === "PENDING_REVIEW" || att.requiresReview)) ||
      (reviewFilter === "COMPLETED" &&
        att.reviewStatus !== "PENDING_REVIEW" &&
        !att.requiresReview);

    return matchesSearch && matchesExam && matchesStatus && matchesReview;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E0D6] pb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#24332F]">Examination Submissions & Results</h1>
          <p className="text-xs text-[#66736E] mt-1 font-sans">
            Audit candidate evaluations, verify classical reasoning, and inspect score breakdowns
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E4E0D6] rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by scholar or exam title..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63] transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={examFilter}
            onChange={(e) => setExamFilter(e.target.value)}
            className="bg-white border border-[#E4E0D6] text-xs text-[#24332F] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#176B63]"
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
            className="bg-white border border-[#E4E0D6] text-xs text-[#24332F] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#176B63]"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="TIMED_OUT">Timed Out</option>
          </select>

          <select
            value={reviewFilter}
            onChange={(e) => setReviewFilter(e.target.value)}
            className="bg-white border border-[#E4E0D6] text-xs text-[#24332F] rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-[#176B63]"
          >
            <option value="ALL">All Grading Stages</option>
            <option value="PENDING_REVIEW">Pending Manual Review</option>
            <option value="COMPLETED">Grading Completed</option>
          </select>
        </div>
      </div>

      {/* Attempts Table */}
      <div className="bg-white border border-[#E4E0D6] rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF7F0] text-[#66736E] border-b border-[#E4E0D6]">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Scholar</th>
                <th className="px-5 py-3.5 font-semibold">Curriculum Exam</th>
                <th className="px-5 py-3.5 font-semibold text-center">Score</th>
                <th className="px-5 py-3.5 font-semibold text-center">Percentage</th>
                <th className="px-5 py-3.5 font-semibold text-center">Result</th>
                <th className="px-5 py-3.5 font-semibold text-center">Duration</th>
                <th className="px-5 py-3.5 font-semibold text-center">Integrity Incidents</th>
                <th className="px-5 py-3.5 font-semibold">Submitted</th>
                <th className="px-5 py-3.5 font-semibold text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4E0D6]/60 text-[#24332F]">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-[#66736E]">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#176B63]" />
                    Loading attempt records...
                  </td>
                </tr>
              ) : filteredAttempts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-[#66736E]">
                    No matching examination attempts found.
                  </td>
                </tr>
              ) : (
                filteredAttempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-[#FAF7F0]/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-[#24332F]">{attempt.student?.name}</div>
                      <div className="text-[11px] text-[#66736E] font-mono">
                        {attempt.student?.studentId || attempt.student?.email}
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <div className="font-medium text-[#24332F]">{attempt.exam?.title}</div>
                      <span className="font-mono text-[10px] text-[#8C7448] font-semibold">{attempt.exam?.code}</span>
                    </td>

                    <td className="px-5 py-3.5 text-center font-bold text-[#24332F] font-mono">
                      {attempt.score} / {attempt.totalMarks}
                    </td>

                    <td className="px-5 py-3.5 text-center font-bold font-mono">
                      {Math.round(attempt.percentage)}%
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {attempt.reviewStatus === "PENDING_REVIEW" || attempt.requiresReview ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] text-[10px] font-semibold">
                          <Clock className="w-3 h-3" /> Pending Review
                        </span>
                      ) : attempt.passed ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" /> Passed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold">
                          <XCircle className="w-3 h-3" /> Failed
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-center font-mono text-[#66736E]">
                      {formatSecondsToTime(attempt.timeSpentSeconds)}
                    </td>

                    <td className="px-5 py-3.5 text-center">
                      {attempt.tabSwitchCount > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[11px] font-bold">
                          <ShieldAlert className="w-3 h-3 text-amber-600" />
                          {attempt.tabSwitchCount}
                        </span>
                      ) : (
                        <span className="text-[#8A9690]">0</span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 text-[#66736E] text-[11px]">
                      {formatDate(attempt.submittedAt || attempt.createdAt)}
                    </td>

                    <td className="px-5 py-3.5 text-right flex items-center justify-end gap-2">
                      {(attempt.reviewStatus === "PENDING_REVIEW" || attempt.requiresReview) && (
                        <button
                          onClick={() => openReviewModal(attempt.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FAF7F0] hover:bg-[#F6F1E5] text-[#8C7448] font-bold text-[11px] border border-[#B59A68]/30 transition"
                        >
                          <span>Grade</span>
                        </button>
                      )}
                      <Link
                        href={`/student/results/${attempt.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#E8F3F1] hover:bg-[#D5EAE6] text-[#176B63] font-semibold text-[11px] border border-[#2E857A]/20 transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-[#E4E0D6] rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E4E0D6] flex items-center justify-between">
              <div>
                <h3 className="font-serif text-xl font-bold text-[#24332F]">Manual Classical Review</h3>
                <p className="text-xs text-[#66736E] mt-0.5 font-sans">
                  Scholar: <strong className="text-[#24332F]">{reviewAttempt.student?.name}</strong> • Exam: {reviewAttempt.exam?.title}
                </p>
              </div>
              <button
                onClick={() => setReviewAttempt(null)}
                className="text-[#8A9690] hover:text-[#24332F] p-1 rounded-lg hover:bg-[#FAF7F0] transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {reviewAttempt.answers?.filter((a: any) => a.question?.type === "SHORT_ANSWER").length === 0 ? (
                <p className="text-xs text-[#66736E] text-center py-6">No subjective short-answer questions found on this attempt.</p>
              ) : (
                reviewAttempt.answers
                  ?.filter((a: any) => a.question?.type === "SHORT_ANSWER")
                  .map((ans: any, idx: number) => {
                    const q = ans.question;
                    const grade = grades[ans.questionId] || { marks: 0, feedback: "" };

                    return (
                      <div key={ans.id} className="p-4 bg-[#FAF7F0]/40 border border-[#E4E0D6] rounded-2xl space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-xs font-bold text-[#24332F] leading-relaxed">
                            {idx + 1}. {q.prompt}
                          </p>
                          <span className="text-[10px] font-mono text-[#8C7448] font-bold shrink-0">
                            Max: {q.points} pts
                          </span>
                        </div>

                        <div className="p-3 bg-white border border-[#E4E0D6] rounded-xl">
                          <span className="text-[10px] uppercase font-bold text-[#66736E] block mb-1">Scholar Answer:</span>
                          <p className="text-xs text-[#24332F] italic whitespace-pre-wrap">
                            {ans.textAnswer || "(No answer submitted)"}
                          </p>
                        </div>

                        {q.explanation && (
                          <div className="p-2.5 bg-[#E8F3F1] border border-[#2E857A]/20 rounded-xl text-[11px] text-[#176B63]">
                            <strong>Classical Reference / Expected Solution:</strong> {q.explanation}
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                          <div>
                            <label className="text-[10px] uppercase font-bold text-[#66736E] block mb-1">
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
                              className="w-full bg-white border border-[#E4E0D6] rounded-xl px-3 py-1.5 text-xs text-[#24332F] font-mono font-bold focus:outline-none focus:ring-1 focus:ring-[#176B63]"
                            />
                          </div>

                          <div>
                            <label className="text-[10px] uppercase font-bold text-[#66736E] block mb-1">
                              Instructor Feedback (Optional)
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Well cited classical shloka"
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
                              className="w-full bg-white border border-[#E4E0D6] rounded-xl px-3 py-1.5 text-xs text-[#24332F] focus:outline-none focus:ring-1 focus:ring-[#176B63]"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-[#E4E0D6] bg-[#FAF7F0] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReviewAttempt(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#66736E] hover:text-[#24332F] hover:bg-white transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={reviewSubmitting}
                onClick={submitReview}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#176B63] hover:bg-[#12554E] text-white transition flex items-center gap-2 shadow-sm disabled:opacity-50"
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
