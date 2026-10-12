"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, AlertCircle, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { BrandLogo, BrandWatermark } from "@/components/BrandLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to process request");
      }

      setSuccess(true);
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
    <div className="min-h-screen bg-[#FBF9F4] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <BrandWatermark />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-8">
          <Link href="/" className="hover:opacity-95 transition">
            <BrandLogo
              variant="vertical"
              size="lg"
              portalSubtitle="Ayurvedic Examination & Certification Portal"
            />
          </Link>
        </div>

        <div className="bg-white border border-[#E4E0D6] rounded-2xl p-8 sm:p-10 shadow-lg shadow-[#176B63]/5">
          <div className="mb-6">
            <h2 className="font-serif text-2xl font-bold text-[#24332F]">Reset Password</h2>
            <p className="text-xs text-[#66736E] mt-1.5 font-sans">
              Enter your registered email address to receive password reset instructions
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {success ? (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-900 text-sm">
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-950">Reset Request Dispatched</p>
                  <p className="text-xs text-emerald-800 mt-1">
                    If an account is associated with <strong>{email}</strong>, instructions to reset your password have been generated. The reset link expires in 30 minutes.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-[#E4E0D6]">
                <Link
                  href="/login"
                  className="w-full py-2.5 px-4 bg-[#FAF7F0] hover:bg-[#F6F1E5] border border-[#E4E0D6] rounded-xl text-xs font-semibold text-[#24332F] transition flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#24332F] mb-1.5 uppercase tracking-wider">
                  Registered Email Address
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-[#176B63] hover:bg-[#12554E] disabled:bg-[#176B63]/60 text-white font-medium rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="pt-4 border-t border-[#E4E0D6] text-center">
                <Link
                  href="/login"
                  className="text-xs text-[#176B63] hover:text-[#12554E] font-semibold transition inline-flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
