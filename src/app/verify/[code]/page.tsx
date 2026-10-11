"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  Award, 
  CheckCircle2, 
  XCircle, 
  GraduationCap, 
  ExternalLink,
  Calendar,
  User,
  BookOpen,
  Loader2
} from "lucide-react";
import { formatShortDate } from "@/lib/utils";

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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-2" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-3 shadow-lg">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white">ExamPortal Verification Engine</h1>
          <p className="text-xs text-slate-400">Public Academic Credential Validator</p>
        </div>

        {notFound || !cert ? (
          <div className="bg-slate-900 border border-rose-500/30 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center justify-center">
              <XCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-bold text-white">Invalid or Unverified Credential</h2>
            <p className="text-xs text-slate-400">
              No official certificate matching code <code className="text-rose-400 font-mono">{code}</code> could be verified in the institutional registry.
            </p>
            <Link
              href="/"
              className="inline-block px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
            >
              Go to Homepage
            </Link>
          </div>
        ) : (
          <div className="bg-slate-900/90 border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Authenticity Confirmed
                </span>
                <h2 className="text-lg font-bold text-white mt-0.5">Verified Academic Certificate</h2>
              </div>
            </div>

            <div className="space-y-3 bg-slate-950/70 border border-slate-800 rounded-2xl p-5 text-xs text-slate-300 divide-y divide-slate-800/80">
              <div className="pb-3 flex justify-between items-center">
                <span className="text-slate-400">Certificate Serial:</span>
                <span className="font-mono font-bold text-amber-400">{cert.certificateNumber}</span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="text-slate-400">Awarded To:</span>
                <span className="font-bold text-white">{cert.student?.name}</span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="text-slate-400">Examination:</span>
                <span className="font-semibold text-indigo-300 text-right">{cert.exam?.title}</span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="text-slate-400">Grade / Performance:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  {cert.score} pts ({Math.round(cert.percentage)}%)
                </span>
              </div>
              <div className="pt-3 flex justify-between items-center">
                <span className="text-slate-400">Issue Date:</span>
                <span className="font-mono text-slate-200">{formatShortDate(cert.issueDate)}</span>
              </div>
            </div>

            <div className="pt-2 text-center">
              <Link
                href={`/student/certificates/${cert.id}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/30 transition"
              >
                <span>View Full Certificate Sheet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
