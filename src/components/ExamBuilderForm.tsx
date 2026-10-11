"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2, 
  HelpCircle, 
  Save, 
  AlertCircle, 
  Loader2, 
  Check, 
  X,
  Settings,
  ListOrdered,
  Sparkles
} from "lucide-react";

export type QuestionType = "MCQ_SINGLE" | "MCQ_MULTIPLE" | "TRUE_FALSE" | "SHORT_ANSWER";

export interface BuilderOption {
  id?: string;
  text: string;
  isCorrect: boolean;
}

export interface BuilderQuestion {
  id?: string;
  order: number;
  type: QuestionType;
  prompt: string;
  points: number;
  negativePoints: number;
  explanation: string;
  options: BuilderOption[];
}

export interface ExamData {
  id?: string;
  title: string;
  code: string;
  description: string;
  instructions: string;
  durationMinutes: number;
  passingScore: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  negativeMarking: boolean;
  negativeMarkPerQuestion: number;
  proctoringStrict: boolean;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED" | "CLOSED";
  questions: BuilderQuestion[];
}

export function ExamBuilderForm({ initialData }: { initialData?: Partial<ExamData> }) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"questions" | "settings">("questions");

  // Exam level settings
  const [title, setTitle] = useState(initialData?.title || "");
  const [code, setCode] = useState(initialData?.code || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [instructions, setInstructions] = useState(initialData?.instructions || "");
  const [durationMinutes, setDurationMinutes] = useState(initialData?.durationMinutes || 45);
  const [passingScore, setPassingScore] = useState(initialData?.passingScore || 50);
  const [shuffleQuestions, setShuffleQuestions] = useState(initialData?.shuffleQuestions || false);
  const [shuffleOptions, setShuffleOptions] = useState(initialData?.shuffleOptions || false);
  const [negativeMarking, setNegativeMarking] = useState(initialData?.negativeMarking || false);
  const [negativeMarkPerQuestion, setNegativeMarkPerQuestion] = useState(initialData?.negativeMarkPerQuestion || 0.5);
  const [proctoringStrict, setProctoringStrict] = useState(initialData?.proctoringStrict ?? true);
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED" | "CLOSED">(initialData?.status || "DRAFT");

  // Questions
  const [questions, setQuestions] = useState<BuilderQuestion[]>(
    initialData?.questions && initialData.questions.length > 0
      ? initialData.questions
      : [
          {
            order: 1,
            type: "MCQ_SINGLE",
            prompt: "What is the primary benefit of React Server Components?",
            points: 2,
            negativePoints: 0.5,
            explanation: "RSC reduces client bundle size by executing on the server.",
            options: [
              { text: "Zero client bundle size for server dependencies", isCorrect: true },
              { text: "Automatic database indexing", isCorrect: false },
              { text: "Replaces client state management entirely", isCorrect: false },
              { text: "Increases browser memory usage", isCorrect: false },
            ],
          },
        ]
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculations
  const totalMarks = questions.reduce((acc, q) => acc + (Number(q.points) || 0), 0);

  // Question manipulation
  const handleAddQuestion = (type: QuestionType = "MCQ_SINGLE") => {
    let defaultOptions: BuilderOption[] = [];
    if (type === "TRUE_FALSE") {
      defaultOptions = [
        { text: "True", isCorrect: true },
        { text: "False", isCorrect: false },
      ];
    } else if (type === "MCQ_SINGLE" || type === "MCQ_MULTIPLE") {
      defaultOptions = [
        { text: "Option A", isCorrect: true },
        { text: "Option B", isCorrect: false },
        { text: "Option C", isCorrect: false },
        { text: "Option D", isCorrect: false },
      ];
    }

    const newQ: BuilderQuestion = {
      order: questions.length + 1,
      type,
      prompt: "",
      points: 2,
      negativePoints: negativeMarking ? negativeMarkPerQuestion : 0,
      explanation: "",
      options: defaultOptions,
    };
    setQuestions([...questions, newQ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    if (questions.length <= 1) {
      alert("An exam must have at least one question.");
      return;
    }
    const updated = questions.filter((_, i) => i !== idx).map((q, i) => ({ ...q, order: i + 1 }));
    setQuestions(updated);
  };

  const handleMoveQuestion = (idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= questions.length) return;
    const copy = [...questions];
    const temp = copy[idx];
    copy[idx] = copy[targetIdx];
    copy[targetIdx] = temp;
    setQuestions(copy.map((q, i) => ({ ...q, order: i + 1 })));
  };

  const handleQuestionChange = (idx: number, field: keyof BuilderQuestion, value: any) => {
    const copy = [...questions];
    copy[idx] = { ...copy[idx], [field]: value };
    setQuestions(copy);
  };

  const handleOptionChange = (qIdx: number, optIdx: number, text: string) => {
    const copy = [...questions];
    copy[qIdx].options[optIdx].text = text;
    setQuestions(copy);
  };

  const handleToggleCorrectOption = (qIdx: number, optIdx: number) => {
    const copy = [...questions];
    const q = copy[qIdx];
    if (q.type === "MCQ_SINGLE" || q.type === "TRUE_FALSE") {
      q.options.forEach((opt, i) => {
        opt.isCorrect = i === optIdx;
      });
    } else if (q.type === "MCQ_MULTIPLE") {
      q.options[optIdx].isCorrect = !q.options[optIdx].isCorrect;
    }
    setQuestions(copy);
  };

  const handleAddOption = (qIdx: number) => {
    const copy = [...questions];
    copy[qIdx].options.push({ text: `Option ${copy[qIdx].options.length + 1}`, isCorrect: false });
    setQuestions(copy);
  };

  const handleRemoveOption = (qIdx: number, optIdx: number) => {
    const copy = [...questions];
    if (copy[qIdx].options.length <= 2) {
      alert("Must have at least 2 options for multiple choice questions.");
      return;
    }
    copy[qIdx].options = copy[qIdx].options.filter((_, i) => i !== optIdx);
    setQuestions(copy);
  };

  const handleSave = async () => {
    setError(null);

    if (!title.trim() || !code.trim()) {
      setError("Please specify both Title and unique Exam Code");
      setActiveTab("settings");
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.prompt.trim()) {
        setError(`Question #${i + 1} has an empty prompt.`);
        setActiveTab("questions");
        return;
      }
      if (q.type !== "SHORT_ANSWER") {
        const hasCorrect = q.options.some((o) => o.isCorrect);
        if (!hasCorrect) {
          setError(`Question #${i + 1} has no correct option selected.`);
          setActiveTab("questions");
          return;
        }
      }
    }

    setSaving(true);
    try {
      const payload = {
        title,
        code,
        description,
        instructions,
        durationMinutes: Number(durationMinutes),
        passingScore: Number(passingScore),
        shuffleQuestions,
        shuffleOptions,
        negativeMarking,
        negativeMarkPerQuestion: Number(negativeMarkPerQuestion),
        proctoringStrict,
        status,
        questions,
      };

      const url = initialData?.id ? `/api/admin/exams/${initialData.id}` : "/api/admin/exams";
      const method = initialData?.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save exam");

      router.push("/admin/exams");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save exam");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {initialData?.id ? `Edit Examination: ${title || code}` : "Create Examination"}
          </h1>
          <p className="text-xs text-slate-400 mt-1">Configure questions, marking criteria, and anti-cheating policies</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/exams")}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 rounded-xl transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{initialData?.id ? "Update Exam" : "Save & Publish"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Mode Tabs & Summary Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-2.5 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("questions")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "questions"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>Questions ({questions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "settings"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/25"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Exam Settings</span>
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs pr-2">
          <div className="text-slate-400">
            Total Points: <strong className="text-white font-mono">{totalMarks}</strong>
          </div>
          <div className="text-slate-400">
            Pass Mark: <strong className="text-emerald-400 font-mono">{passingScore}%</strong>
          </div>
          <div className="text-slate-400">
            Duration: <strong className="text-indigo-400 font-mono">{durationMinutes}m</strong>
          </div>
        </div>
      </div>

      {/* TAB 1: Questions Builder */}
      {activeTab === "questions" && (
        <div className="space-y-6">
          {questions.map((q, qIdx) => (
            <div
              key={qIdx}
              className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 relative"
            >
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-xs">
                    {q.order}
                  </span>
                  <select
                    value={q.type}
                    onChange={(e) => handleQuestionChange(qIdx, "type", e.target.value as QuestionType)}
                    className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="MCQ_SINGLE">Single Choice (Radio)</option>
                    <option value="MCQ_MULTIPLE">Multiple Choice (Checkboxes)</option>
                    <option value="TRUE_FALSE">True / False</option>
                    <option value="SHORT_ANSWER">Short Answer / Subjective</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Points:</span>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={q.points}
                      onChange={(e) => handleQuestionChange(qIdx, "points", parseFloat(e.target.value) || 1)}
                      className="w-12 bg-transparent text-white text-xs font-mono focus:outline-none"
                    />
                  </div>

                  {negativeMarking && (
                    <div className="flex items-center gap-1.5 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800 text-rose-300">
                      <span className="text-[10px] uppercase font-semibold">Negative:</span>
                      <input
                        type="number"
                        min={0}
                        step={0.25}
                        value={q.negativePoints}
                        onChange={(e) => handleQuestionChange(qIdx, "negativePoints", parseFloat(e.target.value) || 0)}
                        className="w-12 bg-transparent text-rose-400 text-xs font-mono focus:outline-none"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(qIdx, "up")}
                    disabled={qIdx === 0}
                    className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(qIdx, "down")}
                    disabled={qIdx === questions.length - 1}
                    className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 rounded-lg hover:bg-slate-800"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIdx)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10"
                    title="Delete Question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Prompt Textarea */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Question Prompt / Problem Description
                </label>
                <textarea
                  rows={2}
                  value={q.prompt}
                  onChange={(e) => handleQuestionChange(qIdx, "prompt", e.target.value)}
                  placeholder="Enter the question text here..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Options Section */}
              {q.type !== "SHORT_ANSWER" && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Options (Click checkmark to toggle correct answers)
                    </span>
                    {q.type !== "TRUE_FALSE" && (
                      <button
                        type="button"
                        onClick={() => handleAddOption(qIdx)}
                        className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Add Option</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => (
                      <div key={optIdx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleCorrectOption(qIdx, optIdx)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition cursor-pointer ${
                            opt.isCorrect
                              ? "bg-emerald-600 text-white border-emerald-500 shadow-sm shadow-emerald-600/30"
                              : "bg-slate-950 text-slate-500 border-slate-800 hover:border-slate-700"
                          }`}
                          title={opt.isCorrect ? "Correct answer" : "Mark as correct"}
                        >
                          <Check className="w-4 h-4" />
                        </button>

                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                          placeholder={`Option ${optIdx + 1}`}
                          className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />

                        {q.type !== "TRUE_FALSE" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(qIdx, optIdx)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                            title="Remove Option"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Explanation notes */}
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">
                  Explanation / Solution Notes (Revealed during student review)
                </label>
                <input
                  type="text"
                  value={q.explanation}
                  onChange={(e) => handleQuestionChange(qIdx, "explanation", e.target.value)}
                  placeholder="e.g. This is correct because..."
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          ))}

          {/* Add Question Button Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleAddQuestion("MCQ_SINGLE")}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-indigo-400" />
              <span>+ Add Single Choice MCQ</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion("MCQ_MULTIPLE")}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-purple-400" />
              <span>+ Add Multi-Select MCQ</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion("TRUE_FALSE")}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>+ Add True / False</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion("SHORT_ANSWER")}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs font-semibold text-white transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>+ Add Short Answer</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Exam Settings */}
      {activeTab === "settings" && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Exam Title</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Distributed Systems & Microservices Exam"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Unique Exam Code / Slug</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. CS-401-FINAL"
                className="w-full px-3 py-2 font-mono bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of test syllabus and topics..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Candidate Instructions</label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="1. You have 45 minutes to finish.\n2. Do not switch tabs.\n3. Keep your webcam clear."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Duration (Minutes)</label>
              <input
                type="number"
                min={5}
                max={300}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Passing Score (%)</label>
              <input
                type="number"
                min={1}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(parseFloat(e.target.value) || 50)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Publication Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="DRAFT">DRAFT (Hidden from students)</option>
                <option value="PUBLISHED">PUBLISHED (Available)</option>
                <option value="CLOSED">CLOSED (Assessment Finished)</option>
                <option value="ARCHIVED">ARCHIVED (Locked)</option>
              </select>
            </div>
          </div>

          {/* Anti-Cheating & Scoring Toggles */}
          <div className="pt-4 border-t border-slate-800 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Proctoring & Assessment Rules
            </h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={proctoringStrict}
                  onChange={(e) => setProctoringStrict(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-medium text-white block">Strict Proctoring</span>
                  <span className="text-[11px] text-slate-400">Warn candidate and record incidents when tabs are switched or fullscreen is exited</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={negativeMarking}
                  onChange={(e) => setNegativeMarking(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-medium text-white block">Negative Marking</span>
                  <span className="text-[11px] text-slate-400">Deduct marks for incorrect answers</span>
                </div>
              </label>

              {negativeMarking && (
                <div className="ml-7 flex items-center gap-2">
                  <span className="text-xs text-slate-400">Deduction per incorrect answer:</span>
                  <input
                    type="number"
                    step={0.25}
                    min={0}
                    value={negativeMarkPerQuestion}
                    onChange={(e) => setNegativeMarkPerQuestion(parseFloat(e.target.value) || 0.5)}
                    className="w-20 px-2 py-1 bg-slate-950 border border-slate-800 rounded-lg text-xs text-rose-300 font-mono"
                  />
                  <span className="text-xs text-slate-400">points</span>
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-medium text-white block">Randomize Question Order</span>
                  <span className="text-[11px] text-slate-400">Shuffle question order for each student attempt to prevent copying</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 bg-slate-950 border-slate-800 focus:ring-indigo-500"
                />
                <div>
                  <span className="text-xs font-medium text-white block">Randomize Option Choices</span>
                  <span className="text-[11px] text-slate-400">Shuffle multiple choice option alternatives</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
