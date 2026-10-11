"use client";

import { useState, useEffect } from "react";
import { 
  Award, 
  Save, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  Palette, 
  Building2, 
  FileText, 
  UserCheck 
} from "lucide-react";

export default function CertificateTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    organizationName: "National Examination Board",
    title: "Certificate of Achievement",
    passStatement: "has successfully fulfilled the prescribed evaluation criteria and demonstrated academic proficiency in the examination:",
    signatoryName: "Dr. Eleanor Vance",
    signatoryTitle: "Director of Examinations",
    primaryColor: "#d97706",
  });

  useEffect(() => {
    async function loadTemplate() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/certificate-template");
        const data = await res.json();
        if (res.ok && data.template) {
          setFormData({
            organizationName: data.template.organizationName || "National Examination Board",
            title: data.template.title || "Certificate of Achievement",
            passStatement: data.template.passStatement || "has successfully fulfilled the prescribed evaluation criteria and demonstrated academic proficiency in the examination:",
            signatoryName: data.template.signatoryName || "Dr. Eleanor Vance",
            signatoryTitle: data.template.signatoryTitle || "Director of Examinations",
            primaryColor: data.template.primaryColor || "#d97706",
          });
        }
      } catch (err) {
        console.error("Failed to load certificate template", err);
      } finally {
        setLoading(false);
      }
    }
    loadTemplate();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/certificate-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccessMsg("Certificate template updated successfully!");
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        setErrorMsg(data.error || "Failed to save template.");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An error occurred while saving.");
    } finally {
      setSaving(false);
    }
  };

  const presetColors = [
    { name: "Academic Gold", hex: "#d97706" },
    { name: "Royal Indigo", hex: "#4f46e5" },
    { name: "Emerald Honor", hex: "#059669" },
    { name: "Crimson Scholar", hex: "#e11d48" },
    { name: "Slate Authority", hex: "#334155" },
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
          <Award className="w-7 h-7 text-amber-500" />
          Certificate Template Designer
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Customize official credentials, signatory authority, institutional branding, and styling issued to qualifying students.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Editor Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-6 bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
          <h2 className="text-base font-semibold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-400" />
            Template Content & Authority
          </h2>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              Issuing Organization / Board Name
            </label>
            <input
              type="text"
              value={formData.organizationName}
              onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Certificate Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Certification / Proficiency Statement
            </label>
            <textarea
              rows={3}
              value={formData.passStatement}
              onChange={(e) => setFormData({ ...formData, passStatement: e.target.value })}
              className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-slate-500" />
                Signatory Authority Name
              </label>
              <input
                type="text"
                value={formData.signatoryName}
                onChange={(e) => setFormData({ ...formData, signatoryName: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Signatory Title / Board
              </label>
              <input
                type="text"
                value={formData.signatoryTitle}
                onChange={(e) => setFormData({ ...formData, signatoryTitle: e.target.value })}
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-slate-500" />
              Theme Primary Accent Color
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {presetColors.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setFormData({ ...formData, primaryColor: color.hex })}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition ${
                    formData.primaryColor === color.hex
                      ? "border-white bg-slate-800 text-white"
                      : "border-slate-800 bg-slate-950 text-slate-400 hover:text-white"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: color.hex }}
                  />
                  <span>{color.name}</span>
                </button>
              ))}
              <input
                type="color"
                value={formData.primaryColor}
                onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                title="Custom Color"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Template</span>
            </button>
          </div>
        </form>

        {/* Live Preview */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Live Certificate Preview
            </h2>
            <span className="text-[11px] text-slate-500 font-mono">Dynamic Scaling</span>
          </div>

          <div 
            className="bg-amber-50/95 text-slate-900 rounded-3xl p-6 sm:p-8 border-4 border-double shadow-2xl relative overflow-hidden"
            style={{ borderColor: formData.primaryColor }}
          >
            {/* Corner decorations */}
            <div className="absolute top-2 left-2 w-8 h-8 border-t border-l pointer-events-none" style={{ borderColor: formData.primaryColor }} />
            <div className="absolute top-2 right-2 w-8 h-8 border-t border-r pointer-events-none" style={{ borderColor: formData.primaryColor }} />
            <div className="absolute bottom-2 left-2 w-8 h-8 border-b border-l pointer-events-none" style={{ borderColor: formData.primaryColor }} />
            <div className="absolute bottom-2 right-2 w-8 h-8 border-b border-r pointer-events-none" style={{ borderColor: formData.primaryColor }} />

            <div className="text-center space-y-4">
              <div 
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mx-auto shadow-inner"
                style={{ backgroundColor: `${formData.primaryColor}20`, color: formData.primaryColor }}
              >
                <Award className="w-8 h-8" />
              </div>

              <div>
                <p 
                  className="text-[10px] uppercase tracking-[0.25em] font-bold"
                  style={{ color: formData.primaryColor }}
                >
                  {formData.organizationName}
                </p>
                <h3 className="text-xl sm:text-2xl font-serif font-black tracking-wide text-slate-900 mt-1 uppercase">
                  {formData.title}
                </h3>
              </div>

              <p className="text-[11px] uppercase tracking-widest text-slate-600 font-medium">
                This is to formally certify that
              </p>

              <div>
                <h4 className="text-2xl sm:text-3xl font-serif font-bold text-slate-900 underline decoration-slate-300 underline-offset-4">
                  Jane Doe
                </h4>
                <p className="text-[10px] font-mono text-slate-500 mt-1">Candidate ID: STU-2026-0042</p>
              </div>

              <p className="text-xs text-slate-700 max-w-md mx-auto leading-relaxed italic">
                {formData.passStatement}
              </p>

              <div className="p-2.5 bg-white/80 border border-slate-200 rounded-xl max-w-sm mx-auto shadow-sm">
                <p className="text-sm font-bold text-slate-900 font-serif">
                  Advanced Data Structures & Algorithms
                </p>
                <p className="text-[10px] font-mono text-slate-500">Course Code: CS-301</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200 items-end">
                <div className="text-center">
                  <div className="border-b border-slate-700 w-28 mx-auto mb-1 font-serif italic text-xs text-slate-800">
                    {formData.signatoryName}
                  </div>
                  <p className="text-[9px] uppercase tracking-wider text-slate-500 font-semibold">
                    {formData.signatoryTitle}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="w-8 h-8 rounded-full border flex items-center justify-center" style={{ borderColor: formData.primaryColor, color: formData.primaryColor }}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-[8px] uppercase font-bold mt-0.5" style={{ color: formData.primaryColor }}>
                    Verified Credential
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
