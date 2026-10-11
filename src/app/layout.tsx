import type { Metadata } from "next";
import { Cormorant_Garamond, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "YadaSutra | Examination & Certification Portal",
    template: "%s | YadaSutra",
  },
  description:
    "YadaSutra — Tatha Paramparaya. Authentic Ayurvedic Learning, Assessments, and Institutional Certification.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${cormorantGaramond.variable} ${plusJakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
