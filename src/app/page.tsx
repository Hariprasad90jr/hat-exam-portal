import Link from "next/link";
import { GraduationCap, ShieldCheck, Award, CheckCircle2, Clock, BarChart3, Users, BookOpen, ArrowRight } from "lucide-react";
import { getSessionUser } from "@/lib/auth";

export default async function HomePage() {
  const session = await getSessionUser();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <span className="font-bold text-lg text-white">ExamPortal</span>
              <span className="text-[10px] ml-2 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-medium">v1.0</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-400">Signed in as <strong className="text-white">{session.name}</strong></span>
                <Link
                  href={session.role === "ADMIN" ? "/admin" : "/student/dashboard"}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition"
                >
                  Go to Dashboard
                </Link>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm text-slate-300 hover:text-white transition font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition shadow-lg shadow-indigo-600/20"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/80 border border-indigo-800/60 text-indigo-400 text-xs font-medium mb-6">
          <ShieldCheck className="w-4 h-4" />
          Secure, Proctored Assessment Engine
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          Modern Online Examinations, <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">Streamlined & Automated</span>
        </h1>

        <p className="mt-6 text-lg text-slate-400 max-w-2xl leading-relaxed">
          From authoring timed tests with rich questions and negative marking, to proctored student exam rooms, auto-grading, and instant verifiable certificates.
        </p>

        {/* Action Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-base transition flex items-center gap-2 shadow-xl shadow-indigo-600/30"
          >
            <span>Launch Exam Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/register"
            className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium rounded-xl text-base transition"
          >
            Student Signup
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full text-left">
          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-white">Exam Builder</h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Create MCQs, multi-select, true/false, and subjective questions with negative marking and time controls.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-white">Proctored Engine</h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Distraction-free exam room, realtime countdown timer, auto-saving, and tab switch monitoring.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-white">Instant Scoring</h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Automated grading with complete question breakdowns, answer reviews, explanations, and audit logs.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-3">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="text-base font-semibold text-white">Digital Certificates</h2>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Passing students receive auto-generated verifiable certificates with unique serial numbers.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        Exam Portal System &copy; 2026. Built with Next.js, Prisma, PostgreSQL & Tailwind CSS.
      </footer>
    </div>
  );
}
