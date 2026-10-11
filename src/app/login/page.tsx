"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck, AlertCircle, Loader2 } from "lucide-react";
import { BrandLogo, BrandWatermark } from "@/components/BrandLogo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to log in");
      }

      const destination = redirectPath || data.redirectTo || "/";
      router.push(destination);
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

  const handleQuickLogin = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <div className="bg-white border border-[#E4E0D6] rounded-2xl p-8 sm:p-10 shadow-lg shadow-[#176B63]/5">
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold text-[#24332F]">Portal Sign In</h2>
        <p className="text-xs text-[#66736E] mt-1.5 font-sans">
          Access your examinations, evaluations, and verified certificates
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#24332F] mb-1.5 uppercase tracking-wider">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="practitioner@yadasutra.com"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E0D6] rounded-xl text-[#24332F] placeholder-[#8A9690] text-sm focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63] transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#24332F] mb-1.5 uppercase tracking-wider">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-[#E4E0D6] rounded-xl text-[#24332F] placeholder-[#8A9690] text-sm focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63] transition"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 bg-[#176B63] hover:bg-[#12554E] disabled:bg-[#176B63]/60 text-white font-medium rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Quick Access Helper */}
      <div className="mt-8 pt-6 border-t border-[#E4E0D6]">
        <p className="text-[11px] uppercase tracking-widest text-[#8A9690] font-semibold mb-3 text-center">
          Fast-Fill Credentials
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleQuickLogin("admin@examportal.com", "admin123")}
            className="py-2.5 px-3 bg-[#FAF7F0] hover:bg-[#F6F1E5] border border-[#E4E0D6] rounded-lg text-xs font-medium text-[#24332F] transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#B59A68]" />
            <span>Admin Demo</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickLogin("john.doe@student.com", "student123")}
            className="py-2.5 px-3 bg-[#F0F7F6] hover:bg-[#E8F3F1] border border-[#2E857A]/20 rounded-lg text-xs font-medium text-[#176B63] transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#176B63]" />
            <span>Student Demo</span>
          </button>
        </div>
      </div>

      {/* Registration link */}
      <div className="mt-6 text-center">
        <p className="text-xs text-[#66736E]">
          Seeking institutional enrollment?{" "}
          <Link href="/register" className="text-[#176B63] hover:text-[#12554E] font-semibold underline underline-offset-4">
            Register as Student
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F7F5EF] p-4 sm:p-6 relative selection:bg-[#E8F3F1] selection:text-[#176B63]">
      <BrandWatermark opacity="opacity-[0.04]" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block hover:opacity-90 transition">
            <BrandLogo
              variant="vertical"
              size="lg"
              portalSubtitle="Institutional Examination Portal"
            />
          </Link>
        </div>

        <Suspense
          fallback={
            <div className="bg-white border border-[#E4E0D6] p-8 rounded-2xl text-center text-[#66736E] shadow-sm">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#176B63]" />
              Loading portal...
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        <div className="mt-8 text-center text-xs text-[#8A9690]">
          YadaSutra &copy; {new Date().getFullYear()} · Tatha Paramparaya
        </div>
      </div>
    </div>
  );
}
