"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { BrandWatermark } from "@/components/BrandLogo";

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log sanitized error reference for server/telemetry
    console.error("Application error boundary triggered:", error.digest || error.message);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F7F5EF] text-[#24332F] flex flex-col items-center justify-center p-4 sm:p-6 relative selection:bg-[#E8F3F1] selection:text-[#176B63]">
      <BrandWatermark opacity="opacity-[0.04]" />

      <div className="w-full max-w-md bg-white border border-[#E4E0D6] rounded-3xl p-8 text-center shadow-sm space-y-6 relative z-10">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="font-serif text-2xl font-bold text-[#24332F]">Unexpected Condition Encountered</h1>
          <p className="text-xs text-[#66736E] leading-relaxed font-sans">
            The platform encountered an unexpected state while processing your request. Your examination data and integrity logs remain fully preserved.
          </p>
        </div>

        {error.digest && (
          <div className="p-3 bg-[#FAF7F0] border border-[#E4E0D6] rounded-xl">
            <span className="text-[10px] text-[#66736E] font-mono uppercase tracking-wider block">Incident Reference</span>
            <span className="text-xs font-mono font-bold text-[#8C7448]">{error.digest}</span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#176B63] hover:bg-[#12554E] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Action</span>
          </button>

          <Link
            href="/"
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-[#FAF7F0] text-[#24332F] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-[#E4E0D6] transition shadow-xs"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Portal Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
