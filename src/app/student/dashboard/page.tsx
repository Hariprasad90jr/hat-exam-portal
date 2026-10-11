"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Award, 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  Play, 
  LogOut, 
  ShieldCheck, 
  Loader2,
  ExternalLink
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { BrandLogo, BrandWatermark } from "@/components/BrandLogo";

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
      <div className="min-h-screen bg-[#F7F5EF] flex items-center justify-center text-[#66736E]">
        <Loader2 className="w-8 h-8 animate-spin text-[#176B63] mb-2" />
      </div>
    );
  }

  const passedCount = pastAttempts.filter((a) => a.passed).length;

  return (
    <div className="min-h-screen bg-[#F7F5EF] text-[#24332F] flex flex-col relative selection:bg-[#E8F3F1] selection:text-[#176B63]">
      <BrandWatermark opacity="opacity-[0.03]" />

      {/* Top Navbar */}
      <header className="border-b border-[#E4E0D6] bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/student/dashboard" className="hover:opacity-90 transition">
            <BrandLogo size="sm" portalSubtitle="Scholar Portal" />
          </Link>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-[#24332F]">{student?.name}</p>
              <p className="text-[11px] text-[#8C7448] font-medium">{student?.studentId || student?.department || "Scholar"}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-[#8A9690] hover:text-rose-700 hover:bg-rose-50 rounded-xl transition cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 space-y-8 relative z-10">
        {/* Welcome & Stats */}
        <div className="bg-white border border-[#E4E0D6] rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-sm">
          <div className="relative z-10 max-w-2xl">
            <span className="px-3.5 py-1 rounded-full bg-[#E8F3F1] text-[#176B63] text-xs font-semibold border border-[#2E857A]/20 uppercase tracking-wider">
              Ayurvedic Scholar Portal
            </span>
            <h1 className="font-serif text-2xl sm:text-4xl font-bold text-[#24332F] mt-3">
              Pranam, {student?.name}!
            </h1>
            <p className="text-[#66736E] text-xs sm:text-sm mt-1.5 font-sans">
              Discipline: <strong className="text-[#24332F]">{student?.department || "General"}</strong> • Roll ID: <strong className="text-[#8C7448] font-mono">{student?.studentId || "N/A"}</strong>
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-[#E4E0D6]">
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#66736E] block tracking-wider">Available Exams</span>
              <span className="text-2xl font-bold text-[#24332F] font-mono">{assignments.length}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#66736E] block tracking-wider">Completed Tests</span>
              <span className="text-2xl font-bold text-[#176B63] font-mono">{pastAttempts.length}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#66736E] block tracking-wider">Tests Passed</span>
              <span className="text-2xl font-bold text-emerald-700 font-mono">{passedCount}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#66736E] block tracking-wider">Certificates</span>
              <span className="text-2xl font-bold text-[#8C7448] font-mono">{certificates.length}</span>
            </div>
          </div>
        </div>

        {/* Section 1: Assigned & Available Exams */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-xl font-bold text-[#24332F]">Curriculum Examinations</h2>
              <p className="text-xs text-[#66736E]">Assessments assigned to your scholarly profile</p>
            </div>
          </div>

          {assignments.length === 0 ? (
            <div className="bg-white border border-[#E4E0D6] rounded-2xl p-8 text-center text-[#66736E] text-xs shadow-sm">
              <BookOpen className="w-8 h-8 mx-auto mb-2 text-[#8A9690]" />
              You currently have no active examination assignments. Contact your academy administrator if expecting enrollment.
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
                    className="bg-white border border-[#E4E0D6] rounded-2xl p-5 hover:border-[#B59A68]/60 transition flex flex-col justify-between shadow-sm"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#FAF7F0] text-[#8C7448] border border-[#B59A68]/30 font-semibold">
                          {exam.code}
                        </span>
                        <span className="text-[11px] text-[#66736E] font-medium">
                          {attemptsRemaining} attempt(s) remaining
                        </span>
                      </div>

                      <h3 className="font-serif text-lg font-bold text-[#24332F] mt-1 leading-snug">{exam.title}</h3>
                      {exam.description && (
                        <p className="text-xs text-[#66736E] mt-1 line-clamp-2">{exam.description}</p>
                      )}

                      <div className="grid grid-cols-3 gap-2 my-4 p-3 rounded-xl bg-[#FAF7F0]/60 border border-[#E4E0D6] text-center">
                        <div>
                          <span className="text-[10px] text-[#66736E] block uppercase font-medium">Duration</span>
                          <span className="text-xs font-bold text-[#24332F]">{exam.durationMinutes}m</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#66736E] block uppercase font-medium">Questions</span>
                          <span className="text-xs font-bold text-[#176B63]">{exam._count?.questions || 0}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#66736E] block uppercase font-medium">Pass Mark</span>
                          <span className="text-xs font-bold text-[#8C7448]">{exam.passingScore}%</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#E4E0D6] flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-[#66736E]">
                        {exam.proctoringStrict && (
                          <span className="flex items-center gap-1 text-[#176B63] text-[11px] font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" /> Integrity Monitored
                          </span>
                        )}
                      </div>

                      {canTake ? (
                        <Link
                          href={`/student/exam/${exam.id}`}
                          className="px-4 py-2 bg-[#176B63] hover:bg-[#12554E] text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Begin Assessment</span>
                        </Link>
                      ) : attemptRequests.some((r) => r.examId === exam.id && r.status === "PENDING") ? (
                        <span className="px-3 py-1.5 rounded-xl bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] text-[11px] font-semibold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Request Pending
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            setRequestExam(exam);
                            setRequestReason("");
                            setRequestError(null);
                          }}
                          className="px-3.5 py-1.5 bg-[#FAF7F0] hover:bg-[#F6F1E5] text-[#8C7448] border border-[#B59A68]/30 rounded-xl text-xs font-semibold transition cursor-pointer"
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
              <h2 className="font-serif text-xl font-bold text-[#24332F]">Examination History & Review</h2>
              <p className="text-xs text-[#66736E]">Review past evaluations, scores, and classical question explanations</p>
            </div>
          </div>

          <div className="bg-white border border-[#E4E0D6] rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F0] text-[#66736E] border-b border-[#E4E0D6]">
                  <tr>
                    <th className="px-5 py-3.5 font-semibold">Curriculum Exam</th>
                    <th className="px-5 py-3.5 font-semibold text-center">Score</th>
                    <th className="px-5 py-3.5 font-semibold text-center">Percentage</th>
                    <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                    <th className="px-5 py-3.5 font-semibold">Submitted On</th>
                    <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E4E0D6]/60 text-[#24332F]">
                  {pastAttempts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-[#66736E]">
                        No completed examinations yet. Start your first assessment above.
                      </td>
                    </tr>
                  ) : (
                    pastAttempts.map((attempt) => (
                      <tr key={attempt.id} className="hover:bg-[#FAF7F0]/40 transition">
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-[#24332F]">{attempt.exam.title}</div>
                          <div className="text-[11px] text-[#8C7448] font-mono">{attempt.exam.code}</div>
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold text-[#24332F] font-mono">
                          {attempt.score} / {attempt.totalMarks}
                        </td>
                        <td className="px-5 py-3.5 text-center font-bold font-mono">
                          {Math.round(attempt.percentage)}%
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          {attempt.passed ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                              <CheckCircle2 className="w-3 h-3" />
                              Passed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-semibold">
                              <XCircle className="w-3 h-3" />
                              Failed
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-[#66736E] text-[11px]">
                          {formatDate(attempt.submittedAt)}
                        </td>
                        <td className="px-5 py-3.5 text-right space-x-2">
                          <Link
                            href={`/student/results/${attempt.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#E8F3F1] hover:bg-[#D5EAE6] text-[#176B63] font-semibold text-[11px] border border-[#2E857A]/20 transition"
                          >
                            <span>Review Answers</span>
                          </Link>
                          {attempt.passed && attempt.certificate && (
                            <Link
                              href={`/student/certificates/${attempt.certificate.id}`}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#FAF7F0] hover:bg-[#F6F1E5] text-[#8C7448] font-semibold text-[11px] border border-[#B59A68]/30 transition"
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
              <h2 className="font-serif text-xl font-bold text-[#24332F] flex items-center gap-2">
                <Award className="w-5 h-5 text-[#B59A68]" />
                <span>Earned Certificates of Ayurvedic Proficiency</span>
              </h2>
              <p className="text-xs text-[#66736E]">Download or share your officially verified certifications</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {certificates.map((cert) => (
                <div
                  key={cert.id}
                  className="bg-white border border-[#B59A68]/40 rounded-2xl p-5 hover:border-[#B59A68] transition flex flex-col justify-between shadow-sm relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-16 h-16 bg-[#FAF7F0] rounded-bl-full pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-[10px] text-[#8C7448] font-bold uppercase tracking-wider">
                        {cert.certificateNumber}
                      </span>
                      <Award className="w-5 h-5 text-[#B59A68]" />
                    </div>
                    <h3 className="font-serif text-base font-bold text-[#24332F]">{cert.exam.title}</h3>
                    <p className="text-[11px] text-[#66736E] mt-1">Issued: {formatDate(cert.issueDate)}</p>
                    <p className="text-[11px] text-emerald-700 font-semibold mt-1">
                      Score: {cert.score} ({Math.round(cert.percentage)}%)
                    </p>
                  </div>

                  <Link
                    href={`/student/certificates/${cert.id}`}
                    className="mt-4 w-full py-2 bg-[#FAF7F0] hover:bg-[#F6F1E5] text-[#8C7448] rounded-xl text-xs font-semibold transition text-center flex items-center justify-center gap-1.5 border border-[#B59A68]/30"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white border border-[#E4E0D6] rounded-3xl max-w-md w-full shadow-2xl overflow-hidden p-6 space-y-4">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#24332F]">Request Additional Attempt</h3>
              <p className="text-xs text-[#66736E] mt-0.5 font-sans">
                Examination: <strong className="text-[#24332F]">{requestExam.title}</strong>
              </p>
            </div>

            {requestError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                {requestError}
              </div>
            )}

            <div>
              <label className="text-[11px] uppercase font-bold text-[#66736E] block mb-1.5">
                Reason for Additional Attempt Request:
              </label>
              <textarea
                rows={4}
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="e.g. Encountered unexpected network disruption or requesting review for second chance."
                className="w-full bg-white border border-[#E4E0D6] rounded-2xl p-3 text-xs text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63] resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRequestExam(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#66736E] hover:text-[#24332F] hover:bg-[#FAF7F0] transition"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={requestSubmitting || requestReason.trim().length < 5}
                onClick={handleRequestAttempt}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#176B63] hover:bg-[#12554E] text-white transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 cursor-pointer"
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
