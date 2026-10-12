"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowRight, AlertCircle, Loader2, CheckCircle2, Eye, EyeOff, Check, X } from "lucide-react";
import { BrandLogo, BrandWatermark } from "@/components/BrandLogo";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Real-time strength criteria checks
  const criteria = [
    { label: "At least 12 characters", met: password.length >= 12 },
    { label: "At least one uppercase letter (A-Z)", met: /[A-Z]/.test(password) },
    { label: "At least one lowercase letter (a-z)", met: /[a-z]/.test(password) },
    { label: "At least one number (0-9)", met: /[0-9]/.test(password) },
    { label: "At least one special character (!@#$%^&*)", met: /[^A-Za-z0-9]/.test(password) },
  ];

  const allMet = criteria.every((c) => c.met);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Missing password reset token. Please request a new link.");
      return;
    }

    if (!allMet) {
      setError("Please ensure your new password meets all security complexity requirements.");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match. Please verify.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
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

  if (!token) {
    return (
      <div className="bg-white border border-[#E4E0D6] rounded-2xl p-8 sm:p-10 shadow-lg shadow-[#176B63]/5">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-center space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
          <h3 className="font-serif text-lg font-bold text-rose-950">Invalid Reset Link</h3>
          <p className="text-xs text-rose-800">
            This password reset link is missing a valid security token. Please request a new link to proceed.
          </p>
          <div className="pt-2">
            <Link
              href="/forgot-password"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#176B63] hover:bg-[#12554E] text-white text-xs font-semibold rounded-lg transition"
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E4E0D6] rounded-2xl p-8 sm:p-10 shadow-lg shadow-[#176B63]/5">
      <div className="mb-6">
        <h2 className="font-serif text-2xl font-bold text-[#24332F]">Choose New Password</h2>
        <p className="text-xs text-[#66736E] mt-1.5 font-sans">
          Configure a strong institutional password for your account
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {success ? (
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-serif text-lg font-bold text-[#24332F]">Password Reset Complete</h3>
          <p className="text-xs text-[#66736E]">
            Your password has been updated and all previous sessions have been securely terminated.
          </p>
          <div className="pt-4">
            <button
              onClick={() => router.push("/login")}
              className="w-full py-3 px-4 bg-[#176B63] hover:bg-[#12554E] text-white font-medium rounded-xl text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <span>Sign In with New Password</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#24332F] mb-1.5 uppercase tracking-wider">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter new strong password"
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#E4E0D6] rounded-xl text-[#24332F] placeholder-[#8A9690] text-sm focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63] transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A9690] hover:text-[#24332F] transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#24332F] mb-1.5 uppercase tracking-wider">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-[#24332F] placeholder-[#8A9690] text-sm focus:outline-none focus:ring-2 transition ${
                  confirmPassword && !passwordsMatch
                    ? "border-rose-400 focus:ring-rose-200"
                    : "border-[#E4E0D6] focus:ring-[#176B63]/20 focus:border-[#176B63]"
                }`}
              />
            </div>
          </div>

          {/* Complexity Requirements Checklist */}
          <div className="p-3.5 bg-[#FAF7F0] border border-[#E4E0D6] rounded-xl space-y-1.5 text-xs">
            <p className="font-semibold text-[#24332F] mb-2 uppercase tracking-wider text-[10px]">
              Password Requirements
            </p>
            {criteria.map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                {item.met ? (
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                ) : (
                  <X className="w-3.5 h-3.5 text-[#8A9690] shrink-0" />
                )}
                <span className={item.met ? "text-emerald-800 font-medium" : "text-[#66736E]"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={loading || !allMet || !passwordsMatch}
            className="w-full py-3 px-4 bg-[#176B63] hover:bg-[#12554E] disabled:bg-[#176B63]/40 text-white font-medium rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-sm cursor-pointer mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              <>
                <span>Save New Password</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
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

        <Suspense
          fallback={
            <div className="bg-white border border-[#E4E0D6] rounded-2xl p-8 text-center text-[#66736E]">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#176B63]" />
              <p className="text-xs mt-2">Loading security verification...</p>
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
