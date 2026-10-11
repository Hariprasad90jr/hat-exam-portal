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
import { YadaSutraIcon } from "@/components/BrandLogo";

export default function CertificateTemplatesPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState({
    organizationName: "YadaSutra — Tatha Paramparaya",
    title: "Certificate of Ayurvedic Proficiency",
    passStatement: "has successfully fulfilled the prescribed evaluation criteria and demonstrated academic proficiency in the examination:",
    signatoryName: "Director of Academic Council",
    signatoryTitle: "Neerozhukkil Vaidyasala · YadaSutra",
    primaryColor: "#B59A68",
  });

  useEffect(() => {
    async function loadTemplate() {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/certificate-template");
        const data = await res.json();
        if (res.ok && data.template) {
          setFormData({
            organizationName: data.template.organizationName || "YadaSutra — Tatha Paramparaya",
            title: data.template.title || "Certificate of Ayurvedic Proficiency",
            passStatement: data.template.passStatement || "has successfully fulfilled the prescribed evaluation criteria and demonstrated academic proficiency in the examination:",
            signatoryName: data.template.signatoryName || "Director of Academic Council",
            signatoryTitle: data.template.signatoryTitle || "Neerozhukkil Vaidyasala · YadaSutra",
            primaryColor: data.template.primaryColor || "#B59A68",
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
    { name: "Heritage Gold", hex: "#B59A68" },
    { name: "Primary Teal", hex: "#176B63" },
    { name: "Deep Gold", hex: "#8C7448" },
    { name: "Forest Dark", hex: "#0E3834" },
    { name: "Classical Amber", hex: "#D97706" },
  ];

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#176B63]" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div className="border-b border-[#E4E0D6] pb-6">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-[#24332F] flex items-center gap-3">
          <Award className="w-8 h-8 text-[#B59A68]" />
          Certificate Template Designer
        </h1>
        <p className="text-xs text-[#66736E] mt-1 font-sans">
          Customize official credentials, signatory authority, institutional seal, and styling issued to qualifying scholars.
        </p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-3 text-emerald-800 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Editor Form */}
        <form onSubmit={handleSubmit} className="lg:col-span-6 bg-white border border-[#E4E0D6] rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
          <h2 className="font-serif text-base font-bold text-[#24332F] border-b border-[#E4E0D6] pb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#176B63]" />
            Template Content & Authority
          </h2>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#24332F] mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-[#8A9690]" />
              Issuing Organization / Board Name
            </label>
            <input
              type="text"
              value={formData.organizationName}
              onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-[#E4E0D6] rounded-xl text-sm text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#24332F] mb-1.5">
              Certificate Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-[#E4E0D6] rounded-xl text-sm text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#24332F] mb-1.5">
              Certification / Proficiency Statement
            </label>
            <textarea
              rows={3}
              value={formData.passStatement}
              onChange={(e) => setFormData({ ...formData, passStatement: e.target.value })}
              className="w-full px-4 py-2.5 bg-white border border-[#E4E0D6] rounded-xl text-sm text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63]"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#24332F] mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#8A9690]" />
                Signatory Authority Name
              </label>
              <input
                type="text"
                value={formData.signatoryName}
                onChange={(e) => setFormData({ ...formData, signatoryName: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-[#E4E0D6] rounded-xl text-sm text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#24332F] mb-1.5">
                Signatory Title / Board
              </label>
              <input
                type="text"
                value={formData.signatoryTitle}
                onChange={(e) => setFormData({ ...formData, signatoryTitle: e.target.value })}
                className="w-full px-4 py-2.5 bg-white border border-[#E4E0D6] rounded-xl text-sm text-[#24332F] placeholder-[#8A9690] focus:outline-none focus:ring-2 focus:ring-[#176B63]/20 focus:border-[#176B63]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#24332F] mb-2 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#8A9690]" />
              Theme Primary Accent Color
            </label>
            <div className="flex flex-wrap items-center gap-2.5">
              {presetColors.map((color) => (
                <button
                  key={color.hex}
                  type="button"
                  onClick={() => setFormData({ ...formData, primaryColor: color.hex })}
                  className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-2 transition cursor-pointer ${
                    formData.primaryColor === color.hex
                      ? "border-[#176B63] bg-[#E8F3F1] text-[#176B63]"
                      : "border-[#E4E0D6] bg-white text-[#66736E] hover:border-[#B59A68]"
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-black/10"
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

          <div className="pt-3 border-t border-[#E4E0D6] flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[#176B63] hover:bg-[#12554E] text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 text-[#B59A68]" />}
              <span>Save Template</span>
            </button>
          </div>
        </form>

        {/* Live Preview */}
        <div className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#66736E]">
              Live Certificate Preview
            </h2>
            <span className="text-[11px] text-[#8C7448] font-mono">Dynamic Scaling</span>
          </div>

          <div 
            className="bg-[#FAF7F0] text-[#24332F] rounded-3xl p-6 sm:p-8 border-4 border-double shadow-xl relative overflow-hidden"
            style={{ borderColor: formData.primaryColor }}
          >
            {/* Watermark in preview */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none">
              <YadaSutraIcon className="w-64 h-64 text-[#B59A68]" />
            </div>

            {/* Corner decorations */}
            <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 pointer-events-none" style={{ borderColor: formData.primaryColor }} />
            <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 pointer-events-none" style={{ borderColor: formData.primaryColor }} />
            <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 pointer-events-none" style={{ borderColor: formData.primaryColor }} />
            <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 pointer-events-none" style={{ borderColor: formData.primaryColor }} />

            <div className="text-center space-y-4 relative z-10">
              <div 
                className="inline-flex items-center justify-center w-14 h-14 rounded-full mx-auto"
                style={{ backgroundColor: `${formData.primaryColor}18`, color: formData.primaryColor }}
              >
                <YadaSutraIcon className="w-8 h-10" fillColor={formData.primaryColor} />
              </div>

              <div>
                <p 
                  className="text-[11px] uppercase tracking-[0.25em] font-bold"
                  style={{ color: formData.primaryColor }}
                >
                  {formData.organizationName}
                </p>
                <h3 className="text-xl sm:text-2xl font-serif font-bold tracking-wide text-[#24332F] mt-1 uppercase">
                  {formData.title}
                </h3>
              </div>

              <p className="text-[10px] uppercase tracking-widest text-[#66736E] font-semibold">
                This is to formally certify that
              </p>

              <div>
                <h4 className="text-2xl sm:text-3xl font-serif font-bold text-[#176B63] underline decoration-[#B59A68]/60 underline-offset-4">
                  Acharya Jane Doe
                </h4>
                <p className="text-[10px] font-mono text-[#8C7448] mt-1 font-semibold">Candidate ID: YS-2026-0042</p>
              </div>

              <p className="text-xs text-[#66736E] max-w-md mx-auto leading-relaxed italic">
                {formData.passStatement}
              </p>

              <div className="p-3 bg-white/90 border border-[#E4E0D6] rounded-xl max-w-sm mx-auto shadow-sm">
                <p className="text-sm font-bold text-[#24332F] font-serif">
                  Ayurvedic Pharmacology & Clinical Formulations
                </p>
                <p className="text-[10px] font-mono text-[#8C7448] font-semibold">Course Code: AYUR-PHARM-301</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#E4E0D6] items-end">
                <div className="text-center">
                  <div className="border-b border-[#24332F] w-32 mx-auto mb-1 font-serif italic text-xs text-[#24332F] font-semibold">
                    {formData.signatoryName}
                  </div>
                  <p className="text-[9px] uppercase tracking-wider text-[#66736E] font-bold">
                    {formData.signatoryTitle}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 flex items-center justify-center" style={{ borderColor: formData.primaryColor, color: formData.primaryColor }}>
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <span className="text-[8px] uppercase font-bold mt-1 tracking-wider" style={{ color: formData.primaryColor }}>
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
