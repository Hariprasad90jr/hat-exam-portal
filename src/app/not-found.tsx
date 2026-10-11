import Link from "next/link";
import { Compass, Home, ArrowLeft } from "lucide-react";
import { BrandWatermark } from "@/components/BrandLogo";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-[#F7F5EF] text-[#24332F] flex flex-col items-center justify-center p-4 sm:p-6 relative selection:bg-[#E8F3F1] selection:text-[#176B63]">
      <BrandWatermark opacity="opacity-[0.04]" />

      <div className="w-full max-w-md bg-white border border-[#E4E0D6] rounded-3xl p-8 text-center shadow-sm space-y-6 relative z-10">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#E8F3F1] text-[#176B63] flex items-center justify-center">
          <Compass className="w-8 h-8 text-[#B59A68]" />
        </div>

        <div className="space-y-2">
          <span className="font-serif text-5xl font-black text-[#176B63] tracking-wider block">404</span>
          <h1 className="font-serif text-xl font-bold text-[#24332F]">Resource Not Found</h1>
          <p className="text-xs text-[#66736E] leading-relaxed font-sans">
            The page, examination record, or curriculum module you requested does not exist or may have been relocated.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/student/dashboard"
            className="w-full sm:w-auto px-5 py-2.5 bg-[#176B63] hover:bg-[#12554E] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition shadow-sm"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Scholar Dashboard</span>
          </Link>

          <Link
            href="/admin"
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-[#FAF7F0] text-[#24332F] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-[#E4E0D6] transition shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Admin Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
