"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { 
  Award, 
  Printer, 
  ArrowLeft, 
  Copy, 
  Check, 
  ShieldCheck, 
  Loader2 
} from "lucide-react";
import { formatShortDate } from "@/lib/utils";
import { YadaSutraIcon } from "@/components/BrandLogo";

export default function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const certId = resolvedParams.id;

  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadCert() {
      try {
        setLoading(true);
        const res = await fetch(`/api/certificates/${certId}`);
        const data = await res.json();
        if (res.ok && data.certificate) {
          setCert(data.certificate);
        }
      } catch (err) {
        console.error("Failed to load certificate:", err);
      } finally {
        setLoading(false);
      }
    }
    loadCert();
  }, [certId]);

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/verify/${cert?.verificationCode || cert?.id}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F5EF] flex items-center justify-center text-[#66736E]">
        <Loader2 className="w-8 h-8 animate-spin text-[#176B63] mb-2" />
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="min-h-screen bg-[#F7F5EF] flex flex-col items-center justify-center p-4 text-center">
        <p className="text-[#24332F] text-base font-semibold">Certificate record not found.</p>
        <Link
          href="/student/dashboard"
          className="mt-4 px-4 py-2 bg-[#176B63] text-white rounded-xl text-xs font-semibold"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F5EF] text-[#24332F] py-10 px-4 sm:px-6 relative selection:bg-[#E8F3F1] selection:text-[#176B63]">
      {/* Top action bar (Hidden during print) */}
      <div className="max-w-4xl mx-auto mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <Link
          href="/student/dashboard"
          className="inline-flex items-center gap-2 text-xs font-semibold text-[#176B63] hover:text-[#12554E] transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="px-3.5 py-2 bg-white hover:bg-[#FAF7F0] text-[#24332F] text-xs font-semibold rounded-xl border border-[#E4E0D6] transition flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-[#8C7448]" />}
            <span>{copied ? "Verification Link Copied!" : "Copy Verification Link"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-[#176B63] hover:bg-[#12554E] text-white text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4 text-[#B59A68]" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* The Printable Certificate Container */}
      {(() => {
        const orgName = cert.template?.organizationName || "YadaSutra — Tatha Paramparaya";
        const certTitle = cert.template?.title || "Certificate of Ayurvedic Proficiency";
        const passStatement = cert.template?.passStatement || "has successfully fulfilled the prescribed evaluation criteria and demonstrated academic proficiency in the examination:";
        const sigName = cert.template?.signatoryName || "Director of Academic Council";
        const sigTitle = cert.template?.signatoryTitle || "Neerozhukkil Vaidyasala · YadaSutra";
        const accentColor = cert.template?.primaryColor || "#B59A68";

        return (
          <div 
            className="max-w-4xl mx-auto bg-[#FAF7F0] text-[#24332F] rounded-3xl p-8 sm:p-14 border-8 border-double shadow-2xl relative overflow-hidden print:p-8 print:m-0 print:border-4 print:shadow-none print:w-full print-certificate"
            style={{ borderColor: accentColor }}
          >
            {/* Watermark in background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.04] pointer-events-none">
              <YadaSutraIcon className="w-96 h-96 text-[#B59A68]" />
            </div>

            {/* Decorative corner flourishes */}
            <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 rounded-tl-xl pointer-events-none" style={{ borderColor: accentColor }} />
            <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 rounded-tr-xl pointer-events-none" style={{ borderColor: accentColor }} />
            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 rounded-bl-xl pointer-events-none" style={{ borderColor: accentColor }} />
            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 rounded-br-xl pointer-events-none" style={{ borderColor: accentColor }} />

            {/* Certificate Content */}
            <div className="text-center space-y-6 relative z-10">
              {/* Header Seal */}
              <div 
                className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 mx-auto shadow-inner"
                style={{ backgroundColor: `${accentColor}15`, borderColor: accentColor, color: accentColor }}
              >
                <YadaSutraIcon className="w-10 h-12" fillColor={accentColor} />
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.25em] font-bold" style={{ color: accentColor }}>
                  {orgName}
                </p>
                <h1 className="text-3xl sm:text-4xl font-serif font-bold tracking-wide text-[#24332F] mt-1 uppercase">
                  {certTitle}
                </h1>
              </div>

              <p className="text-xs uppercase tracking-widest text-[#66736E] font-semibold pt-2">
                This is to formally certify that
              </p>

              {/* Student Name */}
              <div className="py-2">
                <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#176B63] underline decoration-[#B59A68]/60 underline-offset-8">
                  {cert.student?.name}
                </h2>
                {cert.student?.studentId && (
                  <p className="text-xs font-mono text-[#8C7448] mt-2 font-semibold">
                    Scholar ID: {cert.student.studentId}
                  </p>
                )}
              </div>

              <p className="text-sm text-[#24332F] max-w-xl mx-auto leading-relaxed italic font-serif">
                {passStatement}
              </p>

              {/* Exam Title */}
              <div className="p-3.5 bg-white/80 border border-[#E4E0D6] rounded-2xl max-w-lg mx-auto shadow-xs">
                <p className="text-base sm:text-lg font-bold text-[#24332F] font-serif">
                  {cert.exam?.title}
                </p>
                <p className="text-xs font-mono mt-0.5 font-semibold" style={{ color: accentColor }}>
                  Syllabus Code: {cert.exam?.code}
                </p>
              </div>

              {/* Score & Issue Details */}
              <div className="flex items-center justify-center gap-6 sm:gap-12 text-xs text-[#24332F] pt-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#66736E] block tracking-wider">Evaluation Score</span>
                  <span className="font-bold text-[#24332F] font-mono text-sm">
                    {cert.score} pts ({Math.round(cert.percentage)}%)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#66736E] block tracking-wider">Issue Date</span>
                  <span className="font-bold text-[#24332F] font-mono text-sm">
                    {formatShortDate(cert.issueDate)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-[#66736E] block tracking-wider">Serial Number</span>
                  <span className="font-bold font-mono text-sm" style={{ color: accentColor }}>
                    {cert.certificateNumber}
                  </span>
                </div>
              </div>

              {/* Signatures & Security Badge */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-10 border-t border-[#E4E0D6] items-end">
                <div className="text-center">
                  <div className="border-b border-[#24332F] w-36 mx-auto mb-1 font-serif italic text-sm text-[#24332F] font-semibold">
                    {sigName}
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-[#66736E] font-bold">
                    {sigTitle}
                  </p>
                </div>

                <div className="hidden sm:flex flex-col items-center justify-center">
                  <div 
                    className="w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-xs"
                    style={{ borderColor: accentColor, color: accentColor }}
                  >
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] uppercase font-bold mt-1 tracking-wider" style={{ color: accentColor }}>
                    Verified Credential
                  </span>
                </div>

                <div className="text-center">
                  <div className="border-b border-[#24332F] w-36 mx-auto mb-1 font-serif italic text-sm text-[#24332F] font-semibold">
                    Academic Council
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-[#66736E] font-bold">
                    Lead Classical Examiner
                  </p>
                </div>
              </div>

              {/* Verification Code Footer */}
              <div className="pt-4 text-center">
                <p className="text-[10px] text-[#8C7448] font-mono">
                  Verification Code: <strong className="text-[#24332F]">{cert.verificationCode}</strong> • Cryptographically Authenticated by YadaSutra Academic Registry
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
