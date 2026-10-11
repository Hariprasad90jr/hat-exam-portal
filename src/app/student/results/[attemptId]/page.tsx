"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  CheckCircle2, 
  XCircle, 
  Award, 
  Clock, 
  ArrowLeft, 
  HelpCircle, 
  ShieldAlert, 
  Loader2
} from "lucide-react";
import { formatSecondsToTime, formatDate } from "@/lib/utils";
import { BrandWatermark } from "@/components/BrandLogo";

export default function ExamResultsPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const resolvedParams = use(params);
  const attemptId = resolvedParams.attemptId;
  const router = useRouter();

  const [attempt, setAttempt] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAttempt() {
      try {
        setLoading(true);
        const res = await fetch(`/api/student/attempts/${attemptId}`);
        const data = await res.json();
        if (res.ok && data.attempt) {
          setAttempt(data.attempt);
        }
      } catch (err) {
        console.error("Failed to load attempt:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAttempt();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F5EF] flex items-center justify-center text-[#66736E]">
        <Loader2 className="w-8 h-8 animate-spin text-[#176B63] mb-2" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen bg-[#F7F5EF] flex flex-col items-center justify-center p-4 text-center">
        <p className="text-[#24332F] text-base font-semibold">Evaluation details not found.</p>
        <Link
          href="/student/dashboard"
          className="mt-4 px-4 py-2 bg-[#176B63] text-white rounded-xl text-xs font-semibold"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const exam = attempt.exam;
  const answersMap = new Map<string, any>();
  for (const ans of attempt.answers || []) {
    answersMap.set(ans.questionId, ans);
  }

  const isPendingReview = attempt.reviewStatus === "PENDING_REVIEW" || attempt.requiresReview;

  return (
    <div className="min-h-screen bg-[#F7F5EF] text-[#24332F] py-10 px-4 sm:px-6 relative selection:bg-[#E8F3F1] selection:text-[#176B63]">
      <BrandWatermark opacity="opacity-[0.03]" />

      <div className="max-w-4xl mx-auto space-y-8 relative z-10">
        {/* Header navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#176B63] hover:text-[#12554E] transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <span className="text-xs text-[#66736E] font-mono">
            Submitted on {formatDate(attempt.submittedAt)}
          </span>
        </div>

        {/* Big Score Card */}
        <div
          className={`border rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-sm bg-white ${
            isPendingReview
              ? "border-[#FDE68A]"
              : attempt.passed
              ? "border-emerald-300"
              : "border-rose-300"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#FAF7F0] text-[#8C7448] border border-[#B59A68]/30 font-semibold">
                  {exam.code}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    isPendingReview
                      ? "bg-[#FFFBEB] text-[#92400E] border-[#FDE68A]"
                      : attempt.passed
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  {isPendingReview ? (
                    <>
                      <Clock className="w-3.5 h-3.5" /> PENDING INSTRUCTOR REVIEW
                    </>
                  ) : attempt.passed ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" /> PASSED
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" /> FAILED
                    </>
                  )}
                </span>
              </div>

              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-[#24332F]">{exam.title}</h1>
              <p className="text-xs text-[#66736E] mt-1 font-sans">
                Scholar: <strong className="text-[#24332F]">{attempt.student?.name}</strong> • Qualification Cutoff: {exam.passingScore}%
              </p>
            </div>

            {/* Score pill */}
            <div className="text-right shrink-0 bg-[#FAF7F0] p-5 rounded-2xl border border-[#E4E0D6]">
              <span className="text-[10px] uppercase font-bold text-[#66736E] block tracking-wider">
                {isPendingReview ? "Provisional Score" : "Final Evaluation Score"}
              </span>
              <div className="text-3xl sm:text-4xl font-black text-[#24332F] font-mono mt-0.5">
                {attempt.score} <span className="text-[#8A9690] text-xl font-normal">/ {attempt.totalMarks}</span>
              </div>
              <div
                className={`text-sm font-bold mt-1 ${
                  isPendingReview
                    ? "text-[#92400E]"
                    : attempt.passed
                    ? "text-emerald-700"
                    : "text-rose-700"
                }`}
              >
                {Math.round(attempt.percentage)}%
              </div>
            </div>
          </div>

          {/* Pending Review Notice Banner */}
          {isPendingReview && (
            <div className="mt-6 p-4 bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl flex items-center gap-3 text-xs text-[#92400E]">
              <Clock className="w-5 h-5 text-[#92400E] shrink-0" />
              <p>
                <strong>Subjective Classical Evaluation In Progress:</strong> This examination contains short-answer formulations awaiting instructor evaluation. Your final score and digital certificate eligibility will reflect upon grading completion.
              </p>
            </div>
          )}

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#E4E0D6] text-xs text-[#66736E]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#8A9690]" />
              <span>
                Time Spent: <strong className="text-[#24332F] font-mono">{formatSecondsToTime(attempt.timeSpentSeconds)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#8A9690]" />
              <span>
                Integrity Warnings: <strong className="text-[#24332F] font-mono">{attempt.tabSwitchCount || 0}</strong>
              </span>
            </div>
            {attempt.certificate && (
              <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                <Award className="w-4 h-4 text-[#B59A68]" />
                <span className="text-[#8C7448] font-bold font-mono">
                  {attempt.certificate.certificateNumber}
                </span>
              </div>
            )}
          </div>

          {/* Certificate Download CTA if passed */}
          {attempt.passed && attempt.certificate && (
            <div className="mt-6 pt-5 border-t border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-emerald-800 font-medium">
                You have fulfilled the evaluation criteria for the official Certificate of Ayurvedic Proficiency.
              </p>
              <Link
                href={`/student/certificates/${attempt.certificate.id}`}
                className="px-5 py-2.5 bg-[#B59A68] hover:bg-[#8C7448] text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-sm shrink-0"
              >
                <Award className="w-4 h-4" />
                <span>View Official Certificate</span>
              </Link>
            </div>
          )}
        </div>

        {/* Question-by-Question Detailed Review */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-bold text-[#24332F]">Curriculum Answer Breakdown</h2>
            <span className="text-xs text-[#66736E]">
              {exam.questions.length} Questions Evaluated
            </span>
          </div>

          <div className="space-y-4">
            {exam.questions.map((q: any, idx: number) => {
              const ans = answersMap.get(q.id);
              const isCorrect = ans?.isCorrect === true;
              const isWrong = ans?.isCorrect === false;

              return (
                <div
                  key={q.id}
                  className={`bg-white border rounded-2xl p-5 space-y-4 transition shadow-xs ${
                    isCorrect
                      ? "border-emerald-200"
                      : isWrong
                      ? "border-rose-200"
                      : "border-[#E4E0D6]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="w-7 h-7 rounded-lg bg-[#FAF7F0] text-[#8C7448] border border-[#B59A68]/30 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-serif text-base font-bold text-[#24332F] leading-relaxed">{q.prompt}</p>
                        <span className="text-[11px] text-[#8A9690] uppercase font-mono mt-1 block">
                          Type: {q.type.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {q.type === "SHORT_ANSWER" && ans?.requiresReview ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] text-[10px] font-bold">
                          <Clock className="w-3.5 h-3.5" /> Pending Review ({ans?.marksAwarded || 0} / {q.points} pts)
                        </span>
                      ) : isCorrect ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> +{ans?.marksAwarded} pts
                        </span>
                      ) : isWrong ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                          <XCircle className="w-3.5 h-3.5" /> {ans?.marksAwarded} pts
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FAF7F0] text-[#66736E] text-[10px] font-medium border border-[#E4E0D6]">
                          Unanswered (0 pts)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Options with markers */}
                  {q.type !== "SHORT_ANSWER" ? (
                    <div className="space-y-2 pt-1">
                      {q.options.map((opt: any) => {
                        const isStudentPick = ans?.selectedOptionIds?.includes(opt.id);
                        const isActualCorrect = opt.isCorrect;

                        let rowStyle = "bg-white border-[#E4E0D6] text-[#66736E]";
                        if (isActualCorrect) {
                          rowStyle = "bg-emerald-50/80 border-emerald-300 text-emerald-900 font-semibold";
                        } else if (isStudentPick && !isActualCorrect) {
                          rowStyle = "bg-rose-50/80 border-rose-300 text-rose-900 line-through";
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${rowStyle}`}
                          >
                            <span className="flex items-center gap-2">
                              {isActualCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                              {isStudentPick && !isActualCorrect && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                              <span>{opt.text}</span>
                            </span>

                            <span className="text-[10px] font-mono shrink-0 font-bold">
                              {isActualCorrect && isStudentPick && "✓ Correct Selection"}
                              {isActualCorrect && !isStudentPick && "✓ Expected Classical Answer"}
                              {!isActualCorrect && isStudentPick && "✗ Your Selection"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-[#FAF7F0] border border-[#E4E0D6] p-4 rounded-xl space-y-2 text-xs">
                      <div>
                        <span className="text-[11px] text-[#66736E] font-semibold block uppercase">Your Response:</span>
                        <p className="text-[#24332F] italic mt-0.5 whitespace-pre-wrap">{ans?.textAnswer || "No answer provided."}</p>
                      </div>
                      {ans?.feedback && (
                        <div className="pt-2 border-t border-[#E4E0D6]">
                          <span className="text-[10px] text-[#176B63] uppercase font-bold block">Instructor Feedback:</span>
                          <p className="text-[#176B63] mt-0.5">{ans.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Explanation note */}
                  {q.explanation && (
                    <div className="p-3.5 bg-[#E8F3F1] border border-[#2E857A]/20 rounded-xl text-xs text-[#176B63] space-y-1">
                      <span className="font-bold flex items-center gap-1.5 text-[#176B63] text-[11px]">
                        <HelpCircle className="w-3.5 h-3.5 text-[#B59A68]" /> Classical Reference & Explanation:
                      </span>
                      <p className="text-[#24332F]">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
