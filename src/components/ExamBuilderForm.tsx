"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  AlertCircle, 
  Loader2, 
  Check, 
  X,
  Settings,
  ListOrdered
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
            prompt: "Which of the following is considered the primary seat (Sthana) of Pitta Dosha according to Ashtanga Hridaya?",
            points: 2,
            negativePoints: 0.5,
            explanation: "According to Ashtanga Hridaya Sutrasthana, the primary seat of Pitta dosha is Nabhi and Amashaya (specifically Grahani/Pachaka sthana).",
            options: [
              { text: "Amashaya (Lower stomach / small intestine)", isCorrect: true },
              { text: "Hridaya (Heart)", isCorrect: false },
              { text: "Pakwashaya (Colon)", isCorrect: false },
              { text: "Shiras (Head)", isCorrect: false },
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4E0D6] pb-5">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-[#24332F]">
            {initialData?.id ? `Edit Examination: ${title || code}` : "Author Examination"}
          </h1>
          <p className="text-xs text-[#66736E] mt-1 font-sans">
            Configure curriculum questions, marking criteria, and examination parameters
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/exams")}
            className="px-4 py-2 bg-white hover:bg-[#FAF7F0] border border-[#E4E0D6] text-xs font-semibold text-[#24332F] rounded-xl transition cursor-pointer shadow-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-[#176B63] hover:bg-[#12554E] disabled:opacity-50 text-xs font-semibold text-white rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-[#B59A68]" />}
            <span>{initialData?.id ? "Update Examination" : "Save & Publish"}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Mode Tabs & Summary Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white border border-[#E4E0D6] p-2.5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab("questions")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "questions"
                ? "bg-[#176B63] text-white shadow-sm font-semibold"
                : "text-[#66736E] hover:text-[#24332F]"
            }`}
          >
            <ListOrdered className="w-4 h-4" />
            <span>Questions ({questions.length})</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === "settings"
                ? "bg-[#176B63] text-white shadow-sm font-semibold"
                : "text-[#66736E] hover:text-[#24332F]"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Parameters & Policy</span>
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs pr-2">
          <div className="text-[#66736E]">
            Total Points: <strong className="text-[#24332F] font-mono">{totalMarks}</strong>
          </div>
          <div className="text-[#66736E]">
            Pass Mark: <strong className="text-[#176B63] font-mono">{passingScore}%</strong>
          </div>
          <div className="text-[#66736E]">
            Duration: <strong className="text-[#8C7448] font-mono">{durationMinutes}m</strong>
          </div>
        </div>
      </div>

      {/* TAB 1: Questions Builder */}
      {activeTab === "questions" && (
        <div className="space-y-6">
          {questions.map((q, qIdx) => (
            <div
              key={qIdx}
              className="bg-white border border-[#E4E0D6] rounded-2xl p-5 shadow-sm space-y-4 relative"
            >
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-[#E4E0D6] pb-3">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-[#E8F3F1] text-[#176B63] border border-[#2E857A]/20 flex items-center justify-center font-bold text-xs">
                    {q.order}
                  </span>
                  <select
                    value={q.type}
                    onChange={(e) => handleQuestionChange(qIdx, "type", e.target.value as QuestionType)}
                    className="bg-white border border-[#E4E0D6] text-[#24332F] text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#176B63]"
                  >
                    <option value="MCQ_SINGLE">Single Choice (Radio)</option>
                    <option value="MCQ_MULTIPLE">Multiple Choice (Checkboxes)</option>
                    <option value="TRUE_FALSE">True / False</option>
                    <option value="SHORT_ANSWER">Short Answer / Subjective</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-[#FAF7F0] px-2.5 py-1 rounded-lg border border-[#E4E0D6]">
                    <span className="text-[10px] text-[#66736E] uppercase font-semibold">Points:</span>
                    <input
                      type="number"
                      min={0.5}
                      step={0.5}
                      value={q.points}
                      onChange={(e) => handleQuestionChange(qIdx, "points", parseFloat(e.target.value) || 1)}
                      className="w-12 bg-transparent text-[#24332F] text-xs font-mono font-bold focus:outline-none"
                    />
                  </div>

                  {negativeMarking && (
                    <div className="flex items-center gap-1.5 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 text-rose-800">
                      <span className="text-[10px] uppercase font-semibold">Negative:</span>
                      <input
                        type="number"
                        min={0}
                        step={0.25}
                        value={q.negativePoints}
                        onChange={(e) => handleQuestionChange(qIdx, "negativePoints", parseFloat(e.target.value) || 0)}
                        className="w-12 bg-transparent text-rose-700 text-xs font-mono font-bold focus:outline-none"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(qIdx, "up")}
                    disabled={qIdx === 0}
                    className="p-1.5 text-[#66736E] hover:text-[#24332F] disabled:opacity-30 rounded-lg hover:bg-[#FAF7F0]"
                    title="Move up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMoveQuestion(qIdx, "down")}
                    disabled={qIdx === questions.length - 1}
                    className="p-1.5 text-[#66736E] hover:text-[#24332F] disabled:opacity-30 rounded-lg hover:bg-[#FAF7F0]"
                    title="Move down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIdx)}
                    className="p-1.5 text-[#8A9690] hover:text-rose-700 rounded-lg hover:bg-rose-50"
                    title="Delete Question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Prompt Textarea */}
              <div>
                <label className="block text-[11px] font-semibold text-[#24332F] mb-1 uppercase tracking-wider">
                  Question Prompt / Problem Description
                </label>
                <textarea
                  rows={2}
                  value={q.prompt}
                  onChange={(e) => handleQuestionChange(qIdx, "prompt", e.target.value)}
                  placeholder="Enter the Ayurvedic question text here..."
                  className="w-full p-2.5 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-1 focus:ring-[#176B63] focus:border-[#176B63]"
                />
              </div>

              {/* Options Section */}
              {q.type !== "SHORT_ANSWER" && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-[#66736E] uppercase tracking-wider">
                      Options (Click checkmark to toggle correct answers)
                    </span>
                    {q.type !== "TRUE_FALSE" && (
                      <button
                        type="button"
                        onClick={() => handleAddOption(qIdx)}
                        className="text-[11px] text-[#176B63] hover:text-[#12554E] font-semibold flex items-center gap-1 cursor-pointer"
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
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                              : "bg-white text-[#8A9690] border-[#E4E0D6] hover:border-[#176B63]"
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
                          className="flex-1 px-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-1 focus:ring-[#176B63] focus:border-[#176B63]"
                        />

                        {q.type !== "TRUE_FALSE" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(qIdx, optIdx)}
                            className="p-1.5 text-[#8A9690] hover:text-rose-700 rounded-lg"
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
                <label className="block text-[11px] font-semibold text-[#66736E] mb-1">
                  Explanation / Classical Reference Notes (Revealed during student review)
                </label>
                <input
                  type="text"
                  value={q.explanation}
                  onChange={(e) => handleQuestionChange(qIdx, "explanation", e.target.value)}
                  placeholder="e.g. As per Charaka Samhita Chikitsa Sthana..."
                  className="w-full px-3 py-1.5 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-1 focus:ring-[#176B63] focus:border-[#176B63]"
                />
              </div>
            </div>
          ))}

          {/* Add Question Button Bar */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleAddQuestion("MCQ_SINGLE")}
              className="px-4 py-2.5 bg-white hover:bg-[#FAF7F0] border border-[#E4E0D6] rounded-xl text-xs font-semibold text-[#24332F] transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#176B63]" />
              <span>+ Add Single Choice MCQ</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion("MCQ_MULTIPLE")}
              className="px-4 py-2.5 bg-white hover:bg-[#FAF7F0] border border-[#E4E0D6] rounded-xl text-xs font-semibold text-[#24332F] transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#8C7448]" />
              <span>+ Add Multi-Select MCQ</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion("TRUE_FALSE")}
              className="px-4 py-2.5 bg-white hover:bg-[#FAF7F0] border border-[#E4E0D6] rounded-xl text-xs font-semibold text-[#24332F] transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#176B63]" />
              <span>+ Add True / False</span>
            </button>
            <button
              type="button"
              onClick={() => handleAddQuestion("SHORT_ANSWER")}
              className="px-4 py-2.5 bg-white hover:bg-[#FAF7F0] border border-[#E4E0D6] rounded-xl text-xs font-semibold text-[#24332F] transition flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#B59A68]" />
              <span>+ Add Short Answer</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Exam Settings */}
      {activeTab === "settings" && (
        <div className="bg-white border border-[#E4E0D6] rounded-2xl p-6 space-y-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#24332F] mb-1.5 uppercase tracking-wider">
                Exam Title
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Fundamental Principles of Ayurveda (Padartha Vijnana)"
                className="w-full px-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-1 focus:ring-[#176B63] focus:border-[#176B63]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#24332F] mb-1.5 uppercase tracking-wider">
                Unique Exam Code / Syllabus ID
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. AYUR-PV-101"
                className="w-full px-3 py-2 font-mono bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-1 focus:ring-[#176B63] focus:border-[#176B63]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#24332F] mb-1.5 uppercase tracking-wider">
              Description / Course Module
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief summary of classical syllabus, shlokas, and clinical reasoning covered..."
              className="w-full px-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-1 focus:ring-[#176B63] focus:border-[#176B63]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#24332F] mb-1.5 uppercase tracking-wider">
              Candidate Instructions
            </label>
            <textarea
              rows={3}
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="1. Read each classical question carefully.\n2. Negative marking is applied on incorrect selections.\n3. Complete submission before the countdown elapses."
              className="w-full px-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-1 focus:ring-[#176B63] focus:border-[#176B63]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-[#24332F] mb-1.5 uppercase tracking-wider">
                Duration (Minutes)
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(parseInt(e.target.value) || 30)}
                className="w-full px-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-1 focus:ring-[#176B63] focus:border-[#176B63]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#24332F] mb-1.5 uppercase tracking-wider">
                Passing Score (%)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={passingScore}
                onChange={(e) => setPassingScore(parseFloat(e.target.value) || 50)}
                className="w-full px-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-1 focus:ring-[#176B63] focus:border-[#176B63]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#24332F] mb-1.5 uppercase tracking-wider">
                Publication Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-1 focus:ring-[#176B63] focus:border-[#176B63]"
              >
                <option value="DRAFT">DRAFT (Hidden from candidates)</option>
                <option value="PUBLISHED">PUBLISHED (Available)</option>
                <option value="CLOSED">CLOSED (Assessment Finished)</option>
                <option value="ARCHIVED">ARCHIVED (Locked)</option>
              </select>
            </div>
          </div>

          {/* Anti-Cheating & Scoring Toggles */}
          <div className="pt-4 border-t border-[#E4E0D6] space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#66736E]">
              Proctoring & Assessment Rules
            </h3>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={proctoringStrict}
                  onChange={(e) => setProctoringStrict(e.target.checked)}
                  className="w-4 h-4 rounded text-[#176B63] bg-white border-[#E4E0D6] focus:ring-[#176B63]"
                />
                <div>
                  <span className="text-xs font-semibold text-[#24332F] block">Strict Examination Integrity</span>
                  <span className="text-[11px] text-[#66736E]">Warn candidate and log incidents when tabs are switched or window loses focus</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={negativeMarking}
                  onChange={(e) => setNegativeMarking(e.target.checked)}
                  className="w-4 h-4 rounded text-[#176B63] bg-white border-[#E4E0D6] focus:ring-[#176B63]"
                />
                <div>
                  <span className="text-xs font-semibold text-[#24332F] block">Negative Marking</span>
                  <span className="text-[11px] text-[#66736E]">Deduct marks for incorrect answers</span>
                </div>
              </label>

              {negativeMarking && (
                <div className="ml-7 flex items-center gap-2">
                  <span className="text-xs text-[#66736E]">Deduction per incorrect answer:</span>
                  <input
                    type="number"
                    step={0.25}
                    min={0}
                    value={negativeMarkPerQuestion}
                    onChange={(e) => setNegativeMarkPerQuestion(parseFloat(e.target.value) || 0.5)}
                    className="w-20 px-2 py-1 bg-white border border-[#E4E0D6] rounded-lg text-xs text-rose-700 font-mono font-bold"
                  />
                  <span className="text-xs text-[#66736E]">points</span>
                </div>
              )}

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="w-4 h-4 rounded text-[#176B63] bg-white border-[#E4E0D6] focus:ring-[#176B63]"
                />
                <div>
                  <span className="text-xs font-semibold text-[#24332F] block">Randomize Question Order</span>
                  <span className="text-[11px] text-[#66736E]">Shuffle question sequence for each candidate attempt</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="w-4 h-4 rounded text-[#176B63] bg-white border-[#E4E0D6] focus:ring-[#176B63]"
                />
                <div>
                  <span className="text-xs font-semibold text-[#24332F] block">Randomize Option Choices</span>
                  <span className="text-[11px] text-[#66736E]">Shuffle multiple choice alternatives per question</span>
                </div>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
