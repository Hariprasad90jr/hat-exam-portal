"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { 
  Award, 
  Printer, 
  ArrowLeft, 
  CheckCircle2, 
  Copy, 
  Check, 
  Share2, 
  ShieldCheck, 
  Loader2 
} from "lucide-react";
import { formatShortDate } from "@/lib/utils";

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-2" />
      </div>
    );
  }

  if (!cert) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <p className="text-white text-base font-semibold">Certificate record not found.</p>
        <Link
          href="/student/dashboard"
          className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6">
      {/* Top action bar (Hidden during print) */}
      <div className="max-w-4xl mx-auto mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <Link
          href="/student/dashboard"
          className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyLink}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition flex items-center gap-1.5 cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "Link Copied!" : "Verification Link"}</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-amber-500/25 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print / Save as PDF</span>
          </button>
        </div>
      </div>

      {/* The Printable Certificate Container */}
      {(() => {
        const orgName = cert.template?.organizationName || "Official Examination Board";
        const certTitle = cert.template?.title || "Certificate of Achievement";
        const passStatement = cert.template?.passStatement || "has successfully fulfilled the prescribed evaluation criteria and demonstrated academic proficiency in the examination:";
        const sigName = cert.template?.signatoryName || "Dr. Eleanor Vance";
        const sigTitle = cert.template?.signatoryTitle || "Director of Examinations";
        const accentColor = cert.template?.primaryColor || "#d97706";

        return (
          <div 
            className="max-w-4xl mx-auto bg-amber-50 text-slate-900 rounded-3xl p-8 sm:p-14 border-8 border-double shadow-2xl relative overflow-hidden print:p-8 print:m-0 print:border-4 print:shadow-none print:w-full"
            style={{ borderColor: accentColor }}
          >
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
                <Award className="w-10 h-10" />
              </div>

              <div>
                <p className="text-xs uppercase tracking-[0.25em] font-bold" style={{ color: accentColor }}>
                  {orgName}
                </p>
                <h1 className="text-3xl sm:text-4xl font-serif font-black tracking-wide text-slate-900 mt-1 uppercase">
                  {certTitle}
                </h1>
              </div>

              <p className="text-xs uppercase tracking-widest text-slate-600 font-medium pt-2">
                This is to formally certify that
              </p>

              {/* Student Name */}
              <div className="py-2">
                <h2 className="text-3xl sm:text-5xl font-serif font-bold text-slate-900 underline decoration-slate-300 underline-offset-8">
                  {cert.student?.name}
                </h2>
                {cert.student?.studentId && (
                  <p className="text-xs font-mono text-slate-600 mt-2">
                    Candidate ID: {cert.student.studentId}
                  </p>
                )}
              </div>

              <p className="text-sm text-slate-700 max-w-xl mx-auto leading-relaxed">
                {passStatement}
              </p>

              {/* Exam Title */}
              <div className="p-3 bg-white/70 border border-slate-300 rounded-2xl max-w-lg mx-auto shadow-sm">
                <p className="text-base sm:text-lg font-bold text-slate-900 font-serif">
                  {cert.exam?.title}
                </p>
                <p className="text-xs font-mono mt-0.5 font-semibold" style={{ color: accentColor }}>
                  Course Code: {cert.exam?.code}
                </p>
              </div>

              {/* Score & Issue Details */}
              <div className="flex items-center justify-center gap-6 sm:gap-12 text-xs text-slate-700 pt-2">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Grade Score</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {cert.score} pts ({Math.round(cert.percentage)}%)
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Issue Date</span>
                  <span className="font-bold text-slate-900 font-mono text-sm">
                    {formatShortDate(cert.issueDate)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Serial Number</span>
                  <span className="font-bold font-mono text-sm" style={{ color: accentColor }}>
                    {cert.certificateNumber}
                  </span>
                </div>
              </div>

              {/* Signatures & Security Badge */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 pt-10 border-t border-slate-300 items-end">
                <div className="text-center">
                  <div className="border-b border-slate-700 w-36 mx-auto mb-1 font-serif italic text-sm text-slate-700">
                    {sigName}
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    {sigTitle}
                  </p>
                </div>

                <div className="hidden sm:flex flex-col items-center justify-center">
                  <div 
                    className="w-12 h-12 rounded-full border flex items-center justify-center"
                    style={{ borderColor: accentColor, color: accentColor }}
                  >
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <span className="text-[9px] uppercase font-bold mt-1" style={{ color: accentColor }}>
                    Verified Credential
                  </span>
                </div>

                <div className="text-center">
                  <div className="border-b border-slate-700 w-36 mx-auto mb-1 font-serif italic text-sm text-slate-700">
                    Academic Board
                  </div>
                  <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                    Lead Examiner
                  </p>
                </div>
              </div>

              {/* Verification Code Footer */}
              <div className="pt-4 text-center">
                <p className="text-[10px] text-slate-500 font-mono">
                  Verification Code: <strong className="text-slate-700">{cert.verificationCode}</strong> • Validated by ExamPortal Cryptographic Verification Engine
                </p>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
