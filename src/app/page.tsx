import Link from "next/link";
import { ShieldCheck, Award, Clock, BarChart3, BookOpen, ArrowRight } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { BrandLogo, BrandWatermark } from "@/components/BrandLogo";

export default async function HomePage() {
  const session = await getSessionUser();

  return (
    <div className="min-h-screen bg-[#F7F5EF] text-[#24332F] flex flex-col relative selection:bg-[#E8F3F1] selection:text-[#176B63]">
      <BrandWatermark opacity="opacity-[0.04]" />

      {/* Top Header */}
      <header className="border-b border-[#E4E0D6] bg-white/85 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition">
            <BrandLogo size="md" portalSubtitle="Examination & Certification Portal" />
          </Link>

          <nav className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#66736E] hidden sm:inline">
                  Welcome, <strong className="text-[#24332F]">{session.name}</strong>
                </span>
                <Link
                  href={(session.role === "ADMIN" || session.role === "SUPER_ADMIN") ? "/admin" : "/student/dashboard"}
                  className="px-4 py-2 bg-[#176B63] hover:bg-[#12554E] text-white text-sm font-medium rounded-lg transition shadow-sm"
                >
                  Enter Portal
                </Link>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm text-[#24332F] hover:text-[#176B63] transition font-medium"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 bg-[#176B63] hover:bg-[#12554E] text-white text-sm font-medium rounded-lg transition shadow-sm"
                >
                  Student Portal
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 text-center max-w-5xl mx-auto relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8F3F1] border border-[#2E857A]/20 text-[#176B63] text-xs font-semibold tracking-wider uppercase mb-8">
          <ShieldCheck className="w-4 h-4 text-[#B59A68]" />
          <span>Authentic Ayurvedic Assessment Engine</span>
        </div>

        <h1 className="font-serif text-4xl sm:text-6xl font-bold tracking-tight text-[#24332F] max-w-4xl leading-[1.15]">
          Scholarly Tradition, <br />
          <span className="text-[#176B63] italic">Rigorous Modern Evaluation</span>
        </h1>

        <p className="mt-6 text-base sm:text-lg text-[#66736E] max-w-2xl leading-relaxed font-sans">
          A dedicated institutional portal for Ayurvedic students and practitioners. 
          Authoring timed examinations, proctored evaluations, verified grading, 
          and authentic digital certification honoring centuries of tradition.
        </p>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/login"
            className="px-6 py-3.5 bg-[#176B63] hover:bg-[#12554E] text-white font-medium rounded-xl text-base transition flex items-center gap-2 shadow-md hover:shadow-lg shadow-[#176B63]/15"
          >
            <span>Access Portal</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/register"
            className="px-6 py-3.5 bg-white hover:bg-[#F9F6EE] border border-[#E4E0D6] text-[#24332F] font-medium rounded-xl text-base transition shadow-sm"
          >
            Student Registration
          </Link>
        </div>

        {/* Feature Highlights Grid */}
        <div className="mt-20 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 w-full text-left">
          <div className="p-6 rounded-2xl bg-white border border-[#E4E0D6] hover:border-[#B59A68]/60 transition shadow-sm hover:shadow-md">
            <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#176B63] flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h2 className="font-serif text-lg font-bold text-[#24332F]">Curriculum Modules</h2>
            <p className="text-xs text-[#66736E] mt-2 leading-relaxed font-sans">
              Single and multiple-choice questions, subjective Ayurvedic formulation reviews, negative marking, and topic mastery.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E4E0D6] hover:border-[#B59A68]/60 transition shadow-sm hover:shadow-md">
            <div className="w-10 h-10 rounded-xl bg-[#F6F1E5] text-[#8C7448] flex items-center justify-center mb-4">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="font-serif text-lg font-bold text-[#24332F]">Server-Timed Sessions</h2>
            <p className="text-xs text-[#66736E] mt-2 leading-relaxed font-sans">
              Distraction-free examination environment with server-authoritative timers, auto-save snapshots, and integrity monitoring.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E4E0D6] hover:border-[#B59A68]/60 transition shadow-sm hover:shadow-md">
            <div className="w-10 h-10 rounded-xl bg-[#E8F3F1] text-[#176B63] flex items-center justify-center mb-4">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h2 className="font-serif text-lg font-bold text-[#24332F]">Scholarly Analytics</h2>
            <p className="text-xs text-[#66736E] mt-2 leading-relaxed font-sans">
              Instant evaluation breakdowns, detailed answer explanations, attempt histories, and performance tracking.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-[#E4E0D6] hover:border-[#B59A68]/60 transition shadow-sm hover:shadow-md">
            <div className="w-10 h-10 rounded-xl bg-[#F6F1E5] text-[#8C7448] flex items-center justify-center mb-4">
              <Award className="w-5 h-5" />
            </div>
            <h2 className="font-serif text-lg font-bold text-[#24332F]">Digital Certification</h2>
            <p className="text-xs text-[#66736E] mt-2 leading-relaxed font-sans">
              Verifiable academic certificates with unique serial keys and public QR verification, preserving institutional credibility.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#E4E0D6] bg-white py-8 text-center text-xs text-[#66736E] relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-serif font-bold text-[#176B63]">|| YadaSutra ||</span>
            <span className="text-[#B59A68] text-[10px] tracking-widest uppercase font-semibold">Tatha Paramparaya</span>
          </div>
          <div>
            &copy; {new Date().getFullYear()} YadaSutra. Examination & Certification Portal. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
