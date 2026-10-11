"use client";

import { useState, useEffect, use, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Clock, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  Bookmark, 
  Maximize2, 
  Send, 
  Loader2, 
  Check, 
  HelpCircle,
  AlertCircle
} from "lucide-react";
import { formatSecondsToTime } from "@/lib/utils";

interface Option {
  id: string;
  text: string;
  order: number;
}

interface Question {
  id: string;
  order: number;
  type: "MCQ_SINGLE" | "MCQ_MULTIPLE" | "TRUE_FALSE" | "SHORT_ANSWER";
  prompt: string;
  points: number;
  negativePoints: number;
  options: Option[];
}

interface AnswerState {
  selectedOptionIds: string[];
  textAnswer?: string;
  isMarkedForReview?: boolean;
}

export default function ExamEnginePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const examId = resolvedParams.id;
  const router = useRouter();

  // Initialization states
  const [hasStarted, setHasStarted] = useState(false);
  const [initLoading, setInitLoading] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Exam Data
  const [attemptId, setAttemptId] = useState<string>("");
  const [examData, setExamData] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  // Candidate Answers: key = questionId
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});

  // Countdown timer
  const [secondsLeft, setSecondsLeft] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  // Proctoring Violations
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState(0);
  const [showProctorWarning, setShowProctorWarning] = useState(false);
  const [proctorWarningMsg, setProctorWarningMsg] = useState("");

  // Start exam session
  const handleStartExam = async () => {
    setInitLoading(true);
    setInitError(null);

    try {
      // Attempt fullscreen
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }

      const res = await fetch(`/api/student/exams/${examId}/start`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start examination");
      }

      setAttemptId(data.attemptId);
      setExamData(data.exam);
      setQuestions(data.exam.questions || []);
      setSecondsLeft(data.remainingSeconds || data.exam.durationMinutes * 60);

      // Restore existing answers if resuming
      const initialAnswers: Record<string, AnswerState> = {};
      if (Array.isArray(data.existingAnswers)) {
        for (const ans of data.existingAnswers) {
          initialAnswers[ans.questionId] = {
            selectedOptionIds: ans.selectedOptionIds || [],
            textAnswer: ans.textAnswer || "",
            isMarkedForReview: false,
          };
        }
      }
      setAnswers(initialAnswers);
      setHasStarted(true);
    } catch (err: unknown) {
      setInitError(err instanceof Error ? err.message : "Error initiating exam");
    } finally {
      setInitLoading(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!hasStarted || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit(true); // Auto-submit on expiration
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted, secondsLeft]);

  // Anti-Cheat & Tab Switch Proctoring Detection
  const handleProctorViolation = useCallback(
    async (eventType: "TAB_SWITCH" | "FULLSCREEN_EXIT") => {
      if (!attemptId || !hasStarted || submitting) return;

      try {
        const res = await fetch(`/api/student/exams/${examId}/proctor-event`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ attemptId, eventType }),
        });
        const data = await res.json();
        if (res.ok) {
          setTabSwitchWarnings(data.tabSwitchCount || tabSwitchWarnings + 1);
          setProctorWarningMsg(
            `Proctor Alert: Tab switch / Window blur detected! (Incident #${data.tabSwitchCount || 1}). This action has been logged into your test audit record.`
          );
          setShowProctorWarning(true);
        }
      } catch (err) {
        console.error("Proctor event error:", err);
      }
    },
    [attemptId, hasStarted, submitting, examId, tabSwitchWarnings]
  );

  useEffect(() => {
    if (!hasStarted || !examData?.proctoringStrict) return;

    const onVisibilityChange = () => {
      if (document.hidden) {
        handleProctorViolation("TAB_SWITCH");
      }
    };

    const onBlur = () => {
      handleProctorViolation("TAB_SWITCH");
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", onContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", onContextMenu);
    };
  }, [hasStarted, examData?.proctoringStrict, handleProctorViolation]);

  // Background auto-save answer
  const autoSaveAnswer = async (questionId: string, state: AnswerState) => {
    if (!attemptId) return;
    try {
      await fetch(`/api/student/exams/${examId}/save-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          questionId,
          selectedOptionIds: state.selectedOptionIds,
          textAnswer: state.textAnswer,
        }),
      });
    } catch (err) {
      console.error("Auto-save failed:", err);
    }
  };

  // Option selection handlers
  const handleSelectSingleOption = (questionId: string, optionId: string) => {
    const current = answers[questionId] || { selectedOptionIds: [] };
    const updated: AnswerState = {
      ...current,
      selectedOptionIds: [optionId],
    };
    setAnswers((prev) => ({ ...prev, [questionId]: updated }));
    autoSaveAnswer(questionId, updated);
  };

  const handleToggleMultipleOption = (questionId: string, optionId: string) => {
    const current = answers[questionId] || { selectedOptionIds: [] };
    const exists = current.selectedOptionIds.includes(optionId);
    const updatedIds = exists
      ? current.selectedOptionIds.filter((id) => id !== optionId)
      : [...current.selectedOptionIds, optionId];

    const updated: AnswerState = {
      ...current,
      selectedOptionIds: updatedIds,
    };
    setAnswers((prev) => ({ ...prev, [questionId]: updated }));
    autoSaveAnswer(questionId, updated);
  };

  const handleTextAnswerChange = (questionId: string, text: string) => {
    const current = answers[questionId] || { selectedOptionIds: [] };
    const updated: AnswerState = {
      ...current,
      textAnswer: text,
    };
    setAnswers((prev) => ({ ...prev, [questionId]: updated }));
  };

  const handleTextAnswerBlur = (questionId: string) => {
    const current = answers[questionId];
    if (current) {
      autoSaveAnswer(questionId, current);
    }
  };

  const handleToggleReview = (questionId: string) => {
    const current = answers[questionId] || { selectedOptionIds: [] };
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...current,
        isMarkedForReview: !current.isMarkedForReview,
      },
    }));
  };

  // Submit assessment
  const handleFinalSubmit = async (isAutoTimedOut: boolean = false) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      const answersPayload = Object.entries(answers).map(([qId, val]) => ({
        questionId: qId,
        selectedOptionIds: val.selectedOptionIds,
        textAnswer: val.textAnswer,
      }));

      const res = await fetch(`/api/student/exams/${examId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          answers: answersPayload,
          isAutoTimedOut,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit assessment");

      // Exit fullscreen if active
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }

      router.push(`/student/results/${data.attemptId}`);
    } catch (err) {
      console.error("Submission failed:", err);
      alert("Failed to submit exam. Please verify your connection.");
      setSubmitting(false);
    }
  };

  // PRE-EXAM INSTRUCTIONS SCREEN
  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-xl w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shadow-lg">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-bold text-white">Proctored Examination Gate</h1>
            <p className="text-xs text-slate-400">Review guidelines before launching the secure exam room</p>
          </div>

          {initError && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{initError}</span>
            </div>
          )}

          <div className="space-y-3 bg-slate-950/70 border border-slate-800/80 rounded-2xl p-5 text-xs text-slate-300">
            <h3 className="font-semibold text-white uppercase tracking-wider text-[11px] mb-2">
              Assessment Instructions & Policies:
            </h3>
            <ul className="space-y-2 list-disc list-inside text-slate-400">
              <li>
                <strong className="text-slate-200">Strict Anti-Cheating:</strong> Switching tabs, minimizing the browser, or losing window focus is continuously logged and reported.
              </li>
              <li>
                <strong className="text-slate-200">Live Timer:</strong> When the countdown reaches 0:00, your exam will automatically submit.
              </li>
              <li>
                <strong className="text-slate-200">Auto-Saving:</strong> Every option you click is immediately saved in the background.
              </li>
              <li>
                <strong className="text-slate-200">Question Palette:</strong> You can jump between questions and mark questions for review anytime.
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/student/dashboard")}
              className="w-1/3 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-xl text-xs transition text-center cursor-pointer"
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleStartExam}
              disabled={initLoading}
              className="w-2/3 py-3 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-xl shadow-indigo-600/30 cursor-pointer"
            >
              {initLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Maximize2 className="w-4 h-4" />}
              <span>I Understand, Begin Assessment</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE EXAM ENGINE ROOM
  const currentQuestion = questions[currentIdx];
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined;
  const isLastQuestion = currentIdx === questions.length - 1;

  // Palette counts
  const answeredCount = questions.filter(
    (q) => answers[q.id]?.selectedOptionIds?.length > 0 || (answers[q.id]?.textAnswer && answers[q.id]?.textAnswer?.trim() !== "")
  ).length;

  const timerWarning = secondsLeft < 300; // < 5 mins
  const timerCritical = secondsLeft < 60; // < 1 min

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col select-none">
      {/* Top Exam Navigation Bar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-6 h-16 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <span className="font-mono text-[10px] text-indigo-400 font-bold uppercase">{examData?.code}</span>
            <h1 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">{examData?.title}</h1>
          </div>
        </div>

        {/* Live Timer */}
        <div
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full border font-mono text-sm font-bold transition ${
            timerCritical
              ? "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse"
              : timerWarning
              ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
              : "bg-indigo-950/80 text-indigo-300 border-indigo-800"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{formatSecondsToTime(secondsLeft)}</span>
        </div>

        {/* Submit Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/25 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Finish & Submit</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Current Question Card */}
        <div className="lg:col-span-3 flex flex-col justify-between space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            {/* Question Progress and Type badge */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Question {currentIdx + 1} of {questions.length}
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                  {currentQuestion?.type.replace("_", " ")}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-indigo-400 font-bold">
                  +{currentQuestion?.points} pt{currentQuestion?.points > 1 ? "s" : ""}
                </span>
                {examData?.negativeMarking && currentQuestion?.negativePoints > 0 && (
                  <span className="text-xs font-mono text-rose-400 font-medium">
                    (-{currentQuestion.negativePoints})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleToggleReview(currentQuestion.id)}
                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                    currentAnswer?.isMarkedForReview
                      ? "bg-purple-600/30 text-purple-300 border-purple-500"
                      : "bg-slate-800 text-slate-400 border-slate-700 hover:text-white"
                  }`}
                  title="Mark for review"
                >
                  <Bookmark className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>

            {/* Prompt text */}
            <div className="text-white text-base font-medium leading-relaxed">
              {currentQuestion?.prompt}
            </div>

            {/* Options UI */}
            {currentQuestion && currentQuestion.type !== "SHORT_ANSWER" ? (
              <div className="space-y-3 pt-2">
                {currentQuestion.options.map((opt, oIdx) => {
                  const isSelected = currentAnswer?.selectedOptionIds?.includes(opt.id);
                  const isMulti = currentQuestion.type === "MCQ_MULTIPLE";

                  return (
                    <div
                      key={opt.id}
                      onClick={() =>
                        isMulti
                          ? handleToggleMultipleOption(currentQuestion.id, opt.id)
                          : handleSelectSingleOption(currentQuestion.id, opt.id)
                      }
                      className={`p-4 rounded-2xl border transition flex items-center gap-3.5 cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600/20 border-indigo-500/80 text-white shadow-md shadow-indigo-600/10"
                          : "bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800/40 hover:border-slate-700"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition ${
                          isSelected
                            ? "bg-indigo-600 border-indigo-500 text-white"
                            : "border-slate-700 text-transparent"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span className="text-sm font-medium">{opt.text}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-slate-400 mb-2">
                  Your Answer:
                </label>
                <textarea
                  rows={6}
                  value={currentAnswer?.textAnswer || ""}
                  onChange={(e) => handleTextAnswerChange(currentQuestion.id, e.target.value)}
                  onBlur={() => handleTextAnswerBlur(currentQuestion.id)}
                  placeholder="Type your complete solution or response here..."
                  className="w-full p-4 bg-slate-950/80 border border-slate-800 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            )}
          </div>

          {/* Bottom Bar: Prev / Next */}
          <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
            <button
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs text-slate-400 font-medium">
              Answered <strong className="text-white">{answeredCount}</strong> of {questions.length}
            </span>

            {isLastQuestion ? (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                <span>Submit Exam</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Question Palette */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5 space-y-5 h-fit">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Question Palette</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">Click any number to navigate</p>
          </div>

          {/* Palette Grid */}
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const ans = answers[q.id];
              const isAnswered = ans && (ans.selectedOptionIds.length > 0 || (ans.textAnswer && ans.textAnswer.trim() !== ""));
              const isMarked = ans?.isMarkedForReview;
              const isCurrent = idx === currentIdx;

              let style = "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700";
              if (isCurrent) {
                style = "bg-indigo-600 text-white border-indigo-400 font-bold ring-2 ring-indigo-500/50";
              } else if (isMarked) {
                style = "bg-purple-600/30 text-purple-300 border-purple-500/80 font-bold";
              } else if (isAnswered) {
                style = "bg-emerald-600/30 text-emerald-300 border-emerald-500/80 font-bold";
              }

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIdx(idx)}
                  className={`h-9 rounded-xl border text-xs font-mono transition flex items-center justify-center cursor-pointer ${style}`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>

          {/* Palette Legend */}
          <div className="pt-4 border-t border-slate-800 space-y-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded bg-emerald-600/30 border border-emerald-500" />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded bg-purple-600/30 border border-purple-500" />
              <span>Marked for Review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded bg-slate-950 border border-slate-800" />
              <span>Unanswered ({questions.length - answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded bg-indigo-600 border border-indigo-400" />
              <span>Current Question</span>
            </div>
          </div>
        </div>
      </div>

      {/* Proctoring Warning Modal */}
      {showProctorWarning && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-rose-500/60 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-white">Security Violation Warning</h2>
            </div>

            <p className="text-xs text-rose-300 leading-relaxed bg-rose-500/10 p-3.5 rounded-xl border border-rose-500/20">
              {proctorWarningMsg}
            </p>

            <p className="text-[11px] text-slate-400">
              Please keep this examination window active in fullscreen at all times. Repeated violations may result in immediate test termination.
            </p>

            <button
              onClick={() => setShowProctorWarning(false)}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              I Understand, Return to Test
            </button>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-white">Submit Examination?</h2>

            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2 text-xs text-slate-300">
              <div className="flex justify-between">
                <span>Total Questions:</span>
                <strong className="text-white font-mono">{questions.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Questions Answered:</span>
                <strong className="text-emerald-400 font-mono">{answeredCount}</strong>
              </div>
              <div className="flex justify-between">
                <span>Unanswered:</span>
                <strong className="text-amber-400 font-mono">{questions.length - answeredCount}</strong>
              </div>
            </div>

            <p className="text-xs text-slate-400">
              Once submitted, your answers will be automatically graded and you will immediately receive your final evaluation score.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="w-1/2 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium transition cursor-pointer"
              >
                Keep Reviewing
              </button>
              <button
                onClick={() => handleFinalSubmit(false)}
                disabled={submitting}
                className="w-1/2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                <span>Confirm & Submit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
