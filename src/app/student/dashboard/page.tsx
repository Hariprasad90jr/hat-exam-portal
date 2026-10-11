"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  GraduationCap, 
  Award, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  Play, 
  LogOut, 
  FileText, 
  AlertCircle, 
  ShieldCheck, 
  Loader2,
  Calendar,
  ExternalLink
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function StudentDashboardPage() {
  const router = useRouter();

  const [student, setStudent] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [pastAttempts, setPastAttempts] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [attemptRequests, setAttemptRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Attempt Request Modal State
  const [requestExam, setRequestExam] = useState<any | null>(null);
  const [requestReason, setRequestReason] = useState("");
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/dashboard");
      const data = await res.json();
      if (res.ok) {
        setStudent(data.student);
        setAssignments(data.assignments || []);
        setPastAttempts(data.pastAttempts || []);
        setCertificates(data.certificates || []);
        setAttemptRequests(data.attemptRequests || []);
      }
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAttempt = async () => {
    if (!requestExam) return;
    setRequestError(null);
    try {
      setRequestSubmitting(true);
      const res = await fetch(`/api/student/exams/${requestExam.id}/request-attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: requestReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setRequestExam(null);
        setRequestReason("");
        fetchDashboard();
      } else {
        setRequestError(data.error || "Failed to submit attempt request.");
      }
    } catch (err) {
      setRequestError("Network error. Please try again.");
    } finally {
      setRequestSubmitting(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
      </div>
    );
  }

  const passedCount = pastAttempts.filter((a) => a.passed).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-white text-base leading-none block">ExamPortal</span>
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Student Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white">{student?.name}</p>
              <p className="text-[11px] text-slate-400">{student?.studentId || student?.department || "Student"}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-8">
        {/* Welcome & Stats */}
        <div className="bg-gradient-to-r from-indigo-950/60 via-slate-900 to-slate-900 border border-indigo-900/40 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
          <div className="relative z-10 max-w-2xl">
            <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
              Candidate Portal
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-3">
              Welcome back, {student?.name}!
            </h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              Department: <strong className="text-slate-200">{student?.department || "General"}</strong> • Roll ID: <strong className="text-slate-200 font-mono">{student?.studentId || "N/A"}</strong>
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Available Exams</span>
              <span className="text-2xl font-bold text-white font-mono">{assignments.length}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Completed Tests</span>
              <span className="text-2xl font-bold text-indigo-400 font-mono">{pastAttempts.length}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Tests Passed</span>
              <span className="text-2xl font-bold text-emerald-400 font-mono">{passedCount}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">Certificates</span>
              <span className="text-2xl font-bold text-amber-400 font-mono">{certificates.length}</span>
            </div>
          </div>
        </div>

        {/* Section 1: Assigned & Available Exams */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Assigned Examinations</h2>
              <p className="text-xs text-slate-400">Tests scheduled for you to attempt</p>
            </div>
          </div>

          {assignments.length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-500 text-xs">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              You currently have no active exam assignments. Contact your administrator if you are expecting one.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {assignments.map((assignment) => {
                const exam = assignment.exam;
                const completedCount = assignment.attempts?.length || 0;
                const attemptsRemaining = Math.max(0, assignment.maxAttempts - completedCount);
                const canTake = attemptsRemaining > 0;

                return (
                  <div
                    key={assignment.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-semibold">
                          {exam.code}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {attemptsRemaining} attempt(s) left
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white mt-1 leading-snug">{exam.title}</h3>
                      {exam.description && (
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{exam.description}</p>
                      )}

                      <div className="grid grid-cols-3 gap-2 my-4 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Duration</span>
                          <span className="text-xs font-bold text-white">{exam.durationMinutes}m</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Questions</span>
                          <span className="text-xs font-bold text-indigo-400">{exam._count?.questions || 0}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Pass Mark</span>
                          <span className="text-xs font-bold text-emerald-400">{exam.passingScore}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        {exam.proctoringStrict && (
                          <span className="flex items-center gap-1 text-indigo-400 text-[11px]">
                            <ShieldCheck className="w-3.5 h-3.5" /> Proctored
                          </span>
                        )}
                      </div>

                      {canTake ? (
                        <Link
                          href={`/student/exam/${exam.id}`}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Start Assessment</span>
                        </Link>
                      ) : attemptRequests.some((r) => r.examId === exam.id && r.status === "PENDING") ? (
                        <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Request Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setRequestExam(exam);
                            setRequestReason("");
                            setRequestError(null);
                          }}
                          className="px-3.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition cursor-pointer"
                        >
                          Request Attempt
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 2: Completed Test History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Test History & Submissions</h2>
              <p className="text-xs text-slate-400">Review your past scores and questions</p>
            </div>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Exam Title</th>
                    <th className="px-5 py-3.5 font-semibold text-center">Score</th>
                    <th className="px-5 py-3.5 font-semibold text-center">Percentage</th>
                    <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                    <th className="px-5 py-3.5 font-semibold">Submitted On</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {pastAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                        No completed exams yet. Take your first test above!
                      </td>
                    </tr>
                  ) : (
                    pastAttempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-slate-800/40">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-white">{attempt.exam.title}</div>
                          <div className="text-[11px] text-slate-400 font-mono">{attempt.exam.code}</div>
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold text-white font-mono">
                          {attempt.score} / {attempt.totalMarks}
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold font-mono">
                          {Math.round(attempt.percentage)}%
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {attempt.passed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              Passed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
                              <XCircle className="w-3 h-3" />
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-400 text-[11px]">
                          {formatDate(attempt.submittedAt)}
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-2">
                          <Link
                            href={`/student/results/${attempt.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 font-medium text-[11px] border border-indigo-500/30 transition"
                          >
                            <span>Review Answers</span>
                          </Link>
                          {attempt.passed && attempt.certificate && (
                            <Link
                              href={`/student/certificates/${attempt.certificate.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-medium text-[11px] border border-amber-500/30 transition"
                            >
                              <Award className="w-3 h-3" />
                              <span>Certificate</span>
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section 3: Earned Certificates */}
        {certificates.length > 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span>My Certificates of Completion</span>
              </h2>
              <p className="text-xs text-slate-400">Download or share your officially verified certifications</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-5 hover:border-amber-500/60 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                        {cert.certificateNumber}
                      </span>
                      <Award className="w-5 h-5 text-amber-400" />
                    </div>
                    <h3 className="text-sm font-bold text-white">{cert.exam.title}</h3>
                    <p className="text-[11px] text-slate-400 mt-1">Issued: {formatDate(cert.issueDate)}</p>
                    <p className="text-[11px] text-emerald-400 font-semibold mt-1">
                      Score: {cert.score} ({Math.round(cert.percentage)}%)
                    </p>
                  </div>

                  <Link
                    href={`/student/certificates/${cert.id}`}
                    className="mt-4 w-full py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-xs font-semibold transition text-center flex items-center justify-center gap-1.5 border border-amber-500/40"
                  >
                    <span>View & Download</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Additional Attempt Request Modal */}
      {requestExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-4">
            <div>
              <h3 className="text-base font-bold text-white">Request Additional Attempt</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Examination: <strong className="text-white">{requestExam.title}</strong>
              </p>
            </div>

            {requestError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
                {requestError}
              </div>
            )}

            <div>
              <label className="text-[11px] uppercase font-bold text-slate-400 block mb-1.5">
                Reason for Additional Attempt Request:
              </label>
              <textarea
                rows={4}
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="e.g. Encountered unexpected network disruption or requesting review for second chance."
                className="w-full bg-slate-950/80 border border-slate-700 rounded-2xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRequestExam(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={requestSubmitting || requestReason.trim().length < 5}
                onClick={handleRequestAttempt}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
              >
                {requestSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <span>Submit Request</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
