"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  ExternalLink,
  Loader2
} from "lucide-react";
import { formatShortDate } from "@/lib/utils";
import { BrandLogo, BrandWatermark, YadaSutraIcon } from "@/components/BrandLogo";

export default function VerifyCertificatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const resolvedParams = use(params);
  const code = resolvedParams.code;

  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function verify() {
      try {
        setLoading(true);
        const res = await fetch(`/api/certificates/${code}`);
        const data = await res.json();
        if (res.ok && data.certificate) {
          setCert(data.certificate);
        } else {
          setNotFound(true);
        }
      } catch (err) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }
    verify();
  }, [code]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F5EF] flex items-center justify-center text-[#66736E]">
        <Loader2 className="w-8 h-8 animate-spin text-[#176B63] mb-2" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5EF] text-[#24332F] flex flex-col items-center justify-center p-4 sm:p-6 relative selection:bg-[#E8F3F1] selection:text-[#176B63]">
      <BrandWatermark opacity="opacity-[0.04]" />

      <div className="w-full max-w-lg relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block hover:opacity-90 transition">
            <BrandLogo
              variant="vertical"
              size="md"
              portalSubtitle="Public Credential Verification Registry"
            />
          </Link>
        </div>

        {notFound || !cert ? (
          <div className="bg-white border border-rose-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="font-serif text-xl font-bold text-[#24332F]">Unverified Credential Record</h2>
            <p className="text-xs text-[#66736E] leading-relaxed">
              No official certificate matching validation key <code className="text-rose-700 font-mono font-bold">{code}</code> was found in the YadaSutra academic registry.
            </p>
            <Link
              href="/"
              className="inline-block px-5 py-2.5 bg-[#176B63] hover:bg-[#12554E] text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              Return to Portal Home
            </Link>
          </div>
        ) : (
          <div className="bg-white border border-[#E4E0D6] rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#E8F3F1] border border-[#2E857A]/20 text-[#176B63] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-7 h-7 text-[#B59A68]" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#176B63] uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Authenticity Confirmed
                </span>
                <h2 className="font-serif text-lg font-bold text-[#24332F] mt-0.5">Verified Academic Credential</h2>
              </div>
            </div>

            <div className="space-y-3 bg-[#FAF7F0] border border-[#E4E0D6] rounded-2xl p-5 text-xs text-[#24332F] divide-y divide-[#E4E0D6]">
              <div className="pb-3 flex justify-between items-center">
                <span className="text-[#66736E]">Certificate Serial:</span>
                <span className="font-mono font-bold text-[#8C7448]">{cert.certificateNumber}</span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="text-[#66736E]">Conferred To:</span>
                <span className="font-serif font-bold text-base text-[#24332F]">{cert.student?.name}</span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="text-[#66736E]">Curriculum Exam:</span>
                <span className="font-semibold text-[#176B63] text-right">{cert.exam?.title}</span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="text-[#66736E]">Evaluation Score:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  {cert.score} pts ({Math.round(cert.percentage)}%)
                </span>
              </div>
              <div className="pt-3 flex justify-between items-center">
                <span className="text-[#66736E]">Issue Date:</span>
                <span className="font-mono text-[#24332F] font-medium">{formatShortDate(cert.issueDate)}</span>
              </div>
            </div>

            <div className="pt-2 text-center">
              <Link
                href={`/student/certificates/${cert.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#176B63] hover:bg-[#12554E] text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                <span>View Full Official Certificate</span>
                <ExternalLink className="w-3.5 h-3.5 text-[#B59A68]" />
              </Link>
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-xs text-[#8A9690]">
          YadaSutra &copy; {new Date().getFullYear()} · Tatha Paramparaya
        </div>
      </div>
    </div>
  );
}
