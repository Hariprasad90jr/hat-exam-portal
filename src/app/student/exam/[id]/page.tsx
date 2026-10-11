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
  AlertCircle
} from "lucide-react";
import { formatSecondsToTime } from "@/lib/utils";
import { BrandLogo, BrandWatermark, YadaSutraIcon } from "@/components/BrandLogo";

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

      // Populate existing answer snapshot if resumed
      if (data.existingAnswers && Array.isArray(data.existingAnswers)) {
        const restored: Record<string, AnswerState> = {};
        for (const ans of data.existingAnswers) {
          restored[ans.questionId] = {
            selectedOptionIds: ans.selectedOptionIds || [],
            textAnswer: ans.textAnswer || "",
          };
        }
        setAnswers(restored);
      }

      setHasStarted(true);
    } catch (err: unknown) {
      setInitError(err instanceof Error ? err.message : "Initialization failed");
    } finally {
      setInitLoading(false);
    }
  };

  // Timer tick
  useEffect(() => {
    if (!hasStarted || secondsLeft <= 0) return;

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleFinalSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasStarted, secondsLeft]);

  // Anti-cheating & proctoring listeners
  const reportProctorViolation = useCallback(async (type: string, details?: string) => {
    if (!hasStarted || !examData?.proctoringStrict) return;

    try {
      await fetch(`/api/student/exams/${examId}/proctor-event`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          type,
          details,
        }),
      });
    } catch (err) {
      console.error("Proctor event failed to send:", err);
    }
  }, [hasStarted, examData, examId, attemptId]);

  useEffect(() => {
    if (!hasStarted || !examData?.proctoringStrict) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchWarnings((prev) => prev + 1);
        setProctorWarningMsg("Warning: Window focus lost or tab switched. This incident has been logged in the assessment security journal.");
        setShowProctorWarning(true);
        reportProctorViolation("TAB_SWITCH", "User navigated away from active examination tab.");
      }
    };

    const handleBlur = () => {
      reportProctorViolation("WINDOW_BLUR", "Browser window lost focus.");
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [hasStarted, examData, reportProctorViolation]);

  // Save single answer
  const autoSaveAnswer = async (questionId: string, answerState: AnswerState) => {
    try {
      await fetch(`/api/student/exams/${examId}/save-answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          questionId,
          selectedOptionIds: answerState.selectedOptionIds,
          textAnswer: answerState.textAnswer,
        }),
      });
    } catch (err) {
      console.error("Autosave error:", err);
    }
  };

  // Option selection handlers
  const handleSelectSingleOption = (questionId: string, optionId: string) => {
    const nextState: AnswerState = {
      ...answers[questionId],
      selectedOptionIds: [optionId],
    };
    setAnswers((prev) => ({ ...prev, [questionId]: nextState }));
    autoSaveAnswer(questionId, nextState);
  };

  const handleToggleMultipleOption = (questionId: string, optionId: string) => {
    const current = answers[questionId]?.selectedOptionIds || [];
    const nextOptions = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId];

    const nextState: AnswerState = {
      ...answers[questionId],
      selectedOptionIds: nextOptions,
    };
    setAnswers((prev) => ({ ...prev, [questionId]: nextState }));
    autoSaveAnswer(questionId, nextState);
  };

  const handleTextAnswerChange = (questionId: string, val: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        textAnswer: val,
      },
    }));
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
      <div className="min-h-screen bg-[#F7F5EF] text-[#24332F] flex items-center justify-center p-4 relative selection:bg-[#E8F3F1] selection:text-[#176B63]">
        <BrandWatermark opacity="opacity-[0.04]" />

        <div className="max-w-xl w-full bg-white border border-[#E4E0D6] rounded-3xl p-8 shadow-xl space-y-6 relative z-10">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#E8F3F1] text-[#176B63] flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-7 h-7 text-[#B59A68]" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-[#24332F]">Proctored Examination Gate</h1>
            <p className="text-xs text-[#66736E] font-sans">Review assessment parameters before entering the formal exam environment</p>
          </div>

          {initError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{initError}</span>
            </div>
          )}

          <div className="space-y-3 bg-[#FAF7F0] border border-[#E4E0D6] rounded-2xl p-5 text-xs text-[#24332F]">
            <h3 className="font-semibold text-[#176B63] uppercase tracking-wider text-[11px] mb-2">
              Examination Guidelines & Academic Integrity:
            </h3>
            <ul className="space-y-2 list-disc list-inside text-[#66736E]">
              <li>
                <strong className="text-[#24332F]">Server-Authoritative Timer:</strong> The countdown clock runs continuously. Upon expiry, the assessment will auto-submit.
              </li>
              <li>
                <strong className="text-[#24332F]">Integrity Logging:</strong> Window unfocus, tab switching, and minimizing are logged into the audit journal.
              </li>
              <li>
                <strong className="text-[#24332F]">Continuous Auto-Save:</strong> Responses are cryptographically synchronized as each choice is selected.
              </li>
              <li>
                <strong className="text-[#24332F]">Question Navigation:</strong> Use the question palette to jump between classical questions or flag them for review.
              </li>
            </ul>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/student/dashboard")}
              className="w-1/3 py-3 px-4 bg-white hover:bg-[#FAF7F0] border border-[#E4E0D6] text-[#24332F] font-semibold rounded-xl text-xs transition text-center cursor-pointer shadow-sm"
            >
              Back to Dashboard
            </button>
            <button
              onClick={handleStartExam}
              disabled={initLoading}
              className="w-2/3 py-3 px-4 bg-[#176B63] hover:bg-[#12554E] disabled:opacity-50 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              {initLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Maximize2 className="w-4 h-4 text-[#B59A68]" />}
              <span>Enter Examination Room</span>
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
    <div className="min-h-screen bg-[#F7F5EF] text-[#24332F] flex flex-col select-none relative selection:bg-[#E8F3F1] selection:text-[#176B63]">
      <BrandWatermark opacity="opacity-[0.02]" />

      {/* Top Exam Navigation Bar */}
      <header className="border-b border-[#E4E0D6] bg-white/95 backdrop-blur-md px-6 h-18 flex items-center justify-between sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="min-w-0">
            <span className="font-mono text-[10px] text-[#8C7448] font-bold uppercase">{examData?.code}</span>
            <h1 className="font-serif text-base font-bold text-[#24332F] truncate max-w-xs sm:max-w-md">{examData?.title}</h1>
          </div>
        </div>

        {/* Live Timer */}
        <div
          className={`flex items-center gap-2 px-4 py-1.5 rounded-full border font-mono text-sm font-bold transition shadow-xs ${
            timerCritical
              ? "bg-rose-50 text-rose-700 border-rose-300 animate-pulse"
              : timerWarning
              ? "bg-[#FAF7F0] text-[#8C7448] border-[#B59A68]"
              : "bg-[#E8F3F1] text-[#176B63] border-[#2E857A]/30"
          }`}
        >
          <Clock className="w-4 h-4 text-[#B59A68]" />
          <span>{formatSecondsToTime(secondsLeft)}</span>
        </div>

        {/* Submit Action */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 bg-[#176B63] hover:bg-[#12554E] text-white rounded-xl text-xs font-semibold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Finish & Submit</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 relative z-10">
        {/* Left Column: Current Question Card */}
        <div className="lg:col-span-3 flex flex-col justify-between space-y-6">
          <div className="bg-white border border-[#E4E0D6] rounded-3xl p-6 sm:p-8 space-y-6 shadow-sm">
            {/* Question Progress and Type badge */}
            <div className="flex items-center justify-between border-b border-[#E4E0D6] pb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#24332F] uppercase tracking-wider">
                  Question {currentIdx + 1} of {questions.length}
                </span>
                <span className="text-[#8A9690]">•</span>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#FAF7F0] text-[#8C7448] font-semibold border border-[#B59A68]/30">
                  {currentQuestion?.type.replace("_", " ")}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-[#176B63] font-bold">
                  +{currentQuestion?.points} pt{currentQuestion?.points > 1 ? "s" : ""}
                </span>
                {examData?.negativeMarking && currentQuestion?.negativePoints > 0 && (
                  <span className="text-xs font-mono text-rose-700 font-medium">
                    (-{currentQuestion.negativePoints})
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => handleToggleReview(currentQuestion.id)}
                  className={`p-1.5 rounded-lg border transition cursor-pointer ${
                    currentAnswer?.isMarkedForReview
                      ? "bg-[#FAF7F0] text-[#8C7448] border-[#B59A68]"
                      : "bg-white text-[#8A9690] border-[#E4E0D6] hover:text-[#24332F]"
                  }`}
                  title="Mark for review"
                >
                  <Bookmark className="w-4 h-4 fill-current" />
                </button>
              </div>
            </div>

            {/* Prompt text */}
            <div className="font-serif text-[#24332F] text-lg sm:text-xl font-bold leading-relaxed">
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
                          ? "bg-[#E8F3F1] border-2 border-[#176B63] text-[#176B63] shadow-xs font-semibold"
                          : "bg-white border-[#E4E0D6] text-[#24332F] hover:bg-[#FAF7F0]/60 hover:border-[#B59A68]/60"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border transition ${
                          isSelected
                            ? "bg-[#176B63] border-[#176B63] text-white"
                            : "border-[#E4E0D6] text-transparent"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <span className="text-sm font-sans">{opt.text}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-[#66736E] mb-2 uppercase tracking-wider">
                  Your Answer / Clinical Formulation:
                </label>
                <textarea
                  rows={6}
                  value={currentAnswer?.textAnswer || ""}
                  onChange={(e) => handleTextAnswerChange(currentQuestion.id, e.target.value)}
                  onBlur={() => handleTextAnswerBlur(currentQuestion.id)}
                  placeholder="Type your complete solution or classical Ayurvedic response here..."
                  className="w-full p-4 bg-white border border-[#E4E0D6] rounded-2xl text-[#24332F] text-sm focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63]"
                />
              </div>
            )}
          </div>

          {/* Bottom Bar: Prev / Next */}
          <div className="flex items-center justify-between bg-white border border-[#E4E0D6] p-4 rounded-2xl shadow-xs">
            <button
              onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
              disabled={currentIdx === 0}
              className="px-4 py-2 bg-white hover:bg-[#FAF7F0] border border-[#E4E0D6] disabled:opacity-30 text-[#24332F] text-xs font-semibold rounded-xl transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="text-xs text-[#66736E] font-medium">
              Answered <strong className="text-[#176B63]">{answeredCount}</strong> of {questions.length}
            </span>

            {isLastQuestion ? (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="px-5 py-2 bg-[#176B63] hover:bg-[#12554E] text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Submit Exam</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setCurrentIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                className="px-5 py-2 bg-[#176B63] hover:bg-[#12554E] text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Next Question</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Question Palette */}
        <div className="bg-white border border-[#E4E0D6] rounded-3xl p-5 space-y-5 h-fit shadow-sm">
          <div>
            <h2 className="font-serif text-sm font-bold text-[#24332F]">Question Palette</h2>
            <p className="text-[11px] text-[#66736E] mt-0.5">Click any number to navigate</p>
          </div>

          {/* Palette Grid */}
          <div className="grid grid-cols-5 gap-2">
            {questions.map((q, idx) => {
              const ans = answers[q.id];
              const isAnswered = ans && (ans.selectedOptionIds.length > 0 || (ans.textAnswer && ans.textAnswer.trim() !== ""));
              const isMarked = ans?.isMarkedForReview;
              const isCurrent = idx === currentIdx;

              let style = "bg-white border-[#E4E0D6] text-[#66736E] hover:border-[#176B63]";
              if (isCurrent) {
                style = "bg-[#176B63] text-white border-[#176B63] font-bold shadow-xs";
              } else if (isMarked) {
                style = "bg-[#FAF7F0] text-[#8C7448] border-[#B59A68] font-bold";
              } else if (isAnswered) {
                style = "bg-[#E8F3F1] text-[#176B63] border-[#2E857A]/40 font-bold";
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
          <div className="pt-4 border-t border-[#E4E0D6] space-y-2 text-[11px] text-[#66736E]">
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded bg-[#E8F3F1] border border-[#2E857A]/40" />
              <span>Answered ({answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded bg-[#FAF7F0] border border-[#B59A68]" />
              <span>Marked for Review</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded bg-white border border-[#E4E0D6]" />
              <span>Unanswered ({questions.length - answeredCount})</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 rounded bg-[#176B63] border border-[#176B63]" />
              <span>Current Question</span>
            </div>
          </div>
        </div>
      </div>

      {/* Proctoring Warning Modal */}
      {showProctorWarning && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border-2 border-rose-300 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="font-serif text-lg font-bold text-[#24332F]">Examination Integrity Warning</h2>
            </div>

            <p className="text-xs text-rose-800 leading-relaxed bg-rose-50 p-3.5 rounded-xl border border-rose-200">
              {proctorWarningMsg}
            </p>

            <p className="text-[11px] text-[#66736E]">
              Please keep this examination window active at all times. Repeated incidents are recorded and presented to instructors during certification review.
            </p>

            <button
              onClick={() => setShowProctorWarning(false)}
              className="w-full py-2.5 bg-[#176B63] hover:bg-[#12554E] text-white text-xs font-semibold rounded-xl transition cursor-pointer shadow-sm"
            >
              I Understand, Return to Test
            </button>
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4E0D6] rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-5">
            <h2 className="font-serif text-xl font-bold text-[#24332F]">Submit Examination?</h2>

            <div className="p-4 bg-[#FAF7F0] border border-[#E4E0D6] rounded-2xl space-y-2 text-xs text-[#24332F]">
              <div className="flex justify-between">
                <span>Total Questions:</span>
                <strong className="font-mono">{questions.length}</strong>
              </div>
              <div className="flex justify-between">
                <span>Questions Answered:</span>
                <strong className="text-[#176B63] font-mono">{answeredCount}</strong>
              </div>
              <div className="flex justify-between">
                <span>Unanswered:</span>
                <strong className="text-[#8C7448] font-mono">{questions.length - answeredCount}</strong>
              </div>
            </div>

            <p className="text-xs text-[#66736E]">
              Once submitted, your answers will be graded and you will immediately receive your final evaluation breakdown.
            </p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                className="w-1/2 py-2.5 bg-white hover:bg-[#FAF7F0] border border-[#E4E0D6] text-[#24332F] rounded-xl text-xs font-semibold transition cursor-pointer shadow-xs"
              >
                Keep Reviewing
              </button>
              <button
                onClick={() => handleFinalSubmit(false)}
                disabled={submitting}
                className="w-1/2 py-2.5 bg-[#176B63] hover:bg-[#12554E] disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
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
