"use client";

import { useState } from "react";
import {
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Info,
} from "lucide-react";

export default function AdminSecurityPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const criteria = [
    { label: "Minimum 12 characters", met: newPassword.length >= 12 },
    { label: "At least one uppercase letter (A-Z)", met: /[A-Z]/.test(newPassword) },
    { label: "At least one lowercase letter (a-z)", met: /[a-z]/.test(newPassword) },
    { label: "At least one number (0-9)", met: /[0-9]/.test(newPassword) },
    { label: "At least one special symbol (!@#$%^&*)", met: /[^A-Za-z0-9]/.test(newPassword) },
  ];

  const metCount = criteria.filter((c) => c.met).length;
  const allCriteriaMet = metCount === criteria.length;
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const getStrengthLabel = () => {
    if (newPassword.length === 0) return { label: "Not entered", color: "bg-gray-200" };
    if (metCount <= 2) return { label: "Weak", color: "bg-rose-500" };
    if (metCount <= 4) return { label: "Moderate", color: "bg-amber-500" };
    return { label: "Strong & Compliant", color: "bg-emerald-500" };
  };

  const strength = getStrengthLabel();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!allCriteriaMet) {
      setFeedback({
        type: "error",
        message: "Your new password does not meet the institutional complexity requirements.",
      });
      return;
    }

    if (!passwordsMatch) {
      setFeedback({
        type: "error",
        message: "New password and confirmation do not match.",
      });
      return;
    }

    if (currentPassword === newPassword) {
      setFeedback({
        type: "error",
        message: "New password cannot be identical to your current password.",
      });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to change password");

      setFeedback({
        type: "success",
        message: data.message || "Your password has been changed successfully. Other active sessions have been invalidated.",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      setFeedback({ type: "error", message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      {/* Header */}
      <div className="pb-5 border-b border-[#E4E0D6]">
        <div className="flex items-center gap-2.5">
          <KeyRound className="w-6 h-6 text-[#176B63]" />
          <h1 className="font-serif text-2xl font-bold text-[#24332F]">Security & Credentials</h1>
        </div>
        <p className="text-xs text-[#66736E] mt-1">
          Update your institutional administrator credentials and manage your session security.
        </p>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-4 rounded-xl flex items-start gap-3 text-sm ${
            feedback.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-900"
              : "bg-rose-50 border border-rose-200 text-rose-900"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-xs">
            <p className="font-semibold">{feedback.type === "success" ? "Password Updated" : "Update Failed"}</p>
            <p className="mt-0.5">{feedback.message}</p>
          </div>
        </div>
      )}

      {/* Main Card */}
      <div className="bg-white border border-[#E4E0D6] rounded-2xl p-6 sm:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Current Password */}
          <div>
            <label className="block text-xs font-semibold text-[#24332F] mb-1.5 uppercase tracking-wider">
              Current Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
              <input
                type={showCurrent ? "text" : "password"}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter your current password"
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63] transition"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A9690] hover:text-[#24332F]"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-semibold text-[#24332F] mb-1.5 uppercase tracking-wider">
              New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
              <input
                type={showNew ? "text" : "password"}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter minimum 12-character strong password"
                className="w-full pl-10 pr-10 py-2.5 bg-white border border-[#E4E0D6] rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63] transition"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8A9690] hover:text-[#24332F]"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Strength Meter Bar */}
            {newPassword.length > 0 && (
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-[#66736E]">Password Strength:</span>
                  <span className="font-semibold text-[#24332F]">{strength.label}</span>
                </div>
                <div className="w-full h-1.5 bg-[#FAF7F0] rounded-full overflow-hidden border border-[#E4E0D6]">
                  <div
                    className={`h-full transition-all duration-300 ${strength.color}`}
                    style={{ width: `${(metCount / 5) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-semibold text-[#24332F] mb-1.5 uppercase tracking-wider">
              Confirm New Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8A9690]" />
              <input
                type={showNew ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your new password"
                className={`w-full pl-10 pr-4 py-2.5 bg-white border rounded-xl text-xs text-[#24332F] focus:outline-none focus:ring-2 transition ${
                  confirmPassword && !passwordsMatch
                    ? "border-rose-400 focus:ring-rose-200"
                    : "border-[#E4E0D6] focus:ring-[#176B63]/20 focus:border-[#176B63]"
                }`}
              />
            </div>
          </div>

          {/* Policy Checklist */}
          <div className="p-4 bg-[#FAF7F0] border border-[#E4E0D6] rounded-xl space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#24332F] uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5 text-[#176B63]" />
              <span>Institutional Password Policy</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {criteria.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {item.met ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  ) : (
                    <X className="w-3.5 h-3.5 text-[#8A9690] shrink-0" />
                  )}
                  <span className={item.met ? "text-emerald-800 font-medium text-[11px]" : "text-[#66736E] text-[11px]"}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Revocation Notice */}
          <div className="flex items-start gap-2.5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              Updating your credentials will instantly invalidate any other active browser sessions across all devices for this account.
            </p>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !allCriteriaMet || !passwordsMatch || !currentPassword}
            className="w-full py-3 px-4 bg-[#176B63] hover:bg-[#12554E] disabled:bg-[#176B63]/40 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Updating Credentials...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Update Administrator Password</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
