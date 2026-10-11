"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, User, BookOpen, Hash, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { BrandLogo, BrandWatermark } from "@/components/BrandLogo";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, studentId, department }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to register");
      }

      router.push("/student/dashboard");
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5EF] p-4 sm:p-6 relative selection:bg-[#E8F3F1] selection:text-[#176B63]">
      <BrandWatermark opacity="opacity-[0.04]" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block hover:opacity-90 transition">
            <BrandLogo
              variant="vertical"
              size="md"
              portalSubtitle="Student Enrollment Portal"
            />
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E4E0D6] rounded-2xl p-7 sm:p-8 shadow-lg shadow-[#176B63]/5">
          <div className="mb-6">
            <h2 className="font-serif text-2xl font-bold text-[#24332F]">Student Registration</h2>
            <p className="text-xs text-[#66736E] mt-1 font-sans">
              Create your institutional account to participate in examinations
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#24332F] mb-1 uppercase tracking-wider">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Acharya Ananya Varma"
                  className="w-full pl-10 pr-4 py-2 bg-white border border-[#E4E0D6] rounded-xl text-[#24332F] placeholder-[#8A9690] text-xs focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63] transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#24332F] mb-1 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="scholar@yadasutra.com"
                  className="w-full pl-10 pr-4 py-2 bg-white border border-[#E4E0D6] rounded-xl text-[#24332F] placeholder-[#8A9690] text-xs focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63] transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#24332F] mb-1 uppercase tracking-wider">
                  Roll / Scholar ID
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
                  <input
                    type="text"
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="YS-2026-01"
                    className="w-full pl-10 pr-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-[#24332F] placeholder-[#8A9690] text-xs focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63] transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#24332F] mb-1 uppercase tracking-wider">
                  Discipline / Dept
                </label>
                <div className="relative">
                  <BookOpen className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Kayachikitsa"
                    className="w-full pl-10 pr-3 py-2 bg-white border border-[#E4E0D6] rounded-xl text-[#24332F] placeholder-[#8A9690] text-xs focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63] transition"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#24332F] mb-1 uppercase tracking-wider">
                Password (min 6 characters)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 bg-white border border-[#E4E0D6] rounded-xl text-[#24332F] placeholder-[#8A9690] text-xs focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63] transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#176B63] hover:bg-[#12554E] disabled:bg-[#176B63]/60 text-white font-medium rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-sm cursor-pointer mt-3"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enrolling...</span>
                </>
              ) : (
                <>
                  <span>Complete Enrollment</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login link */}
          <div className="mt-5 text-center pt-4 border-t border-[#E4E0D6]">
            <p className="text-xs text-[#66736E]">
              Already enrolled in the academy?{" "}
              <Link href="/login" className="text-[#176B63] hover:text-[#12554E] font-semibold underline underline-offset-4">
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-[#8A9690]">
          YadaSutra &copy; {new Date().getFullYear()} · Tatha Paramparaya
        </div>
      </div>
    </div>
  );
}
