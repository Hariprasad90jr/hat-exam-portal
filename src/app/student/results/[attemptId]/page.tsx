"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";
import { 
  CheckCircle2, 
  XCircle, 
  Award, 
  Clock, 
  ArrowLeft, 
  FileText, 
  HelpCircle, 
  ShieldAlert, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  Loader2
} from "lucide-react";
import { formatSecondsToTime, formatDate } from "@/lib/utils";

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
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function loadAttempt() {
      try {
        setLoading(true);
        const res = await fetch(`/api/student/attempts/${attemptId}`);
        const data = await res.json();
        if (res.ok && data.attempt) {
          setAttempt(data.attempt);
          if (data.attempt.passed) {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
        }
      } catch (err) {
        console.error("Failed to load attempt:", err);
      } finally {
        setLoading(false);
      }
    }
    loadAttempt();
  }, [attemptId]);

  const toggleExpand = (qId: string) => {
    setExpandedQuestions((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
      </div>
    );
  }

  if (!attempt) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <p className="text-white text-base font-semibold">Evaluation details not found.</p>
        <Link
          href="/student/dashboard"
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
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
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/student/dashboard"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <span className="text-xs text-slate-500 font-mono">
            Submitted on {formatDate(attempt.submittedAt)}
          </span>
        </div>

        {/* Big Score Card */}
        <div
          className={`border rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl ${
            isPendingReview
              ? "bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40"
              : attempt.passed
              ? "bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/40"
              : "bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border-rose-500/40"
          }`}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {exam.code}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                    isPendingReview
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                      : attempt.passed
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  }`}
                >
                  {isPendingReview ? (
                    <>
                      <Clock className="w-3.5 h-3.5" /> PENDING REVIEW
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

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{exam.title}</h1>
              <p className="text-xs text-slate-400 mt-1">
                Candidate: <strong className="text-white">{attempt.student?.name}</strong> • Passing Threshold: {exam.passingScore}%
              </p>
            </div>

            {/* Score pill */}
            <div className="text-right shrink-0 bg-slate-950/60 p-4 rounded-2xl border border-slate-800">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                {isPendingReview ? "Provisional Score" : "Final Score"}
              </span>
              <div className="text-3xl sm:text-4xl font-black text-white font-mono mt-0.5">
                {attempt.score} <span className="text-slate-500 text-xl font-normal">/ {attempt.totalMarks}</span>
              </div>
              <div
                className={`text-sm font-bold mt-1 ${
                  isPendingReview
                    ? "text-amber-400"
                    : attempt.passed
                    ? "text-emerald-400"
                    : "text-rose-400"
                }`}
              >
                {Math.round(attempt.percentage)}%
              </div>
            </div>
          </div>

          {/* Pending Review Notice Banner */}
          {isPendingReview && (
            <div className="mt-6 p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-3 text-xs text-amber-200">
              <Clock className="w-5 h-5 text-amber-400 shrink-0" />
              <p>
                <strong>Instructor Evaluation In Progress:</strong> This examination contains subjective short-answer responses awaiting manual grading. Your final score and qualification status will update once instructor review is completed.
              </p>
            </div>
          )}

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-slate-800/80 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>
                Time Spent: <strong className="text-white font-mono">{formatSecondsToTime(attempt.timeSpentSeconds)}</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-slate-400" />
              <span>
                Tab Warnings: <strong className="text-white font-mono">{attempt.tabSwitchCount || 0}</strong>
              </span>
            </div>
            {attempt.certificate && (
              <div className="flex items-center gap-2 col-span-2 sm:col-span-1">
                <Award className="w-4 h-4 text-amber-400" />
                <span className="text-amber-300 font-semibold font-mono">
                  {attempt.certificate.certificateNumber}
                </span>
              </div>
            )}
          </div>

          {/* Certificate Download CTA if passed */}
          {attempt.passed && attempt.certificate && (
            <div className="mt-6 pt-5 border-t border-emerald-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-emerald-300">
                Congratulations! You successfully qualified for the verified Certificate of Completion.
              </p>
              <Link
                href={`/student/certificates/${attempt.certificate.id}`}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 shrink-0"
              >
                <Award className="w-4 h-4" />
                <span>View & Print Certificate</span>
              </Link>
            </div>
          )}
        </div>

        {/* Question-by-Question Detailed Review */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Answer Breakdown & Explanations</h2>
            <span className="text-xs text-slate-400">
              {exam.questions.length} Questions Evaluated
            </span>
          </div>

          <div className="space-y-4">
            {exam.questions.map((q: any, idx: number) => {
              const ans = answersMap.get(q.id);
              const isCorrect = ans?.isCorrect === true;
              const isWrong = ans?.isCorrect === false;
              const isUnanswered = ans?.isCorrect === null || (!ans?.selectedOptionIds?.length && !ans?.textAnswer);

              return (
                <div
                  key={q.id}
                  className={`bg-slate-900/80 border rounded-2xl p-5 space-y-4 transition ${
                    isCorrect
                      ? "border-emerald-500/30"
                      : isWrong
                      ? "border-rose-500/30"
                      : "border-slate-800"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-white leading-relaxed">{q.prompt}</p>
                        <span className="text-[11px] text-slate-500 uppercase font-mono mt-1 block">
                          Type: {q.type.replace("_", " ")}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {q.type === "SHORT_ANSWER" && ans?.requiresReview ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                          <Clock className="w-3.5 h-3.5" /> Pending Review ({ans?.marksAwarded || 0} / {q.points} pts)
                        </span>
                      ) : isCorrect ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" /> +{ans?.marksAwarded} pts
                        </span>
                      ) : isWrong ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                          <XCircle className="w-3.5 h-3.5" /> {ans?.marksAwarded} pts
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-medium">
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

                        let rowStyle = "bg-slate-950/40 border-slate-800 text-slate-400";
                        if (isActualCorrect) {
                          rowStyle = "bg-emerald-500/10 border-emerald-500/50 text-emerald-200 font-medium";
                        } else if (isStudentPick && !isActualCorrect) {
                          rowStyle = "bg-rose-500/10 border-rose-500/50 text-rose-300 line-through";
                        }

                        return (
                          <div
                            key={opt.id}
                            className={`p-3 rounded-xl border text-xs flex items-center justify-between ${rowStyle}`}
                          >
                            <span className="flex items-center gap-2">
                              {isActualCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                              {isStudentPick && !isActualCorrect && <XCircle className="w-4 h-4 text-rose-400 shrink-0" />}
                              <span>{opt.text}</span>
                            </span>

                            <span className="text-[10px] font-mono shrink-0">
                              {isActualCorrect && isStudentPick && "✓ Correct Pick"}
                              {isActualCorrect && !isStudentPick && "✓ Expected Answer"}
                              {!isActualCorrect && isStudentPick && "✗ Your Pick"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-slate-950/60 border border-slate-800 p-3 rounded-xl space-y-2 text-xs">
                      <div>
                        <span className="text-[11px] text-slate-400 font-semibold block uppercase">Your Response:</span>
                        <p className="text-white italic mt-0.5">{ans?.textAnswer || "No answer provided."}</p>
                      </div>
                      {ans?.feedback && (
                        <div className="pt-2 border-t border-slate-800/80">
                          <span className="text-[10px] text-indigo-400 uppercase font-bold block">Instructor Feedback:</span>
                          <p className="text-indigo-200 mt-0.5">{ans.feedback}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Explanation note */}
                  {q.explanation && (
                    <div className="p-3 bg-indigo-950/30 border border-indigo-900/40 rounded-xl text-xs text-indigo-300 space-y-1">
                      <span className="font-bold flex items-center gap-1.5 text-indigo-400 text-[11px]">
                        <HelpCircle className="w-3.5 h-3.5" /> Solution Note:
                      </span>
                      <p className="text-slate-300">{q.explanation}</p>
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
