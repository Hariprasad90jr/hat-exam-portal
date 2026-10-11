import React from "react";
import Image from "next/image";

interface BrandLogoProps {
  variant?: "horizontal" | "vertical" | "icon" | "full";
  theme?: "light" | "dark" | "gold";
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  taglineText?: string;
  portalSubtitle?: string;
  className?: string;
}

/**
 * Official YadaSutra Motif (16 stylized seeds in diamond matrix)
 */
export function YadaSutraIcon({
  className = "w-8 h-10",
  fillColor,
}: {
  className?: string;
  fillColor?: string;
}) {
  return (
    <svg
      viewBox="0 0 200 240"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <g fill={fillColor || "currentColor"}>
        {/* Center Column (x=100) */}
        <path d="M100 20 C92 30 92 50 100 60 C108 50 108 30 100 20 Z" />
        <path d="M100 65 C88 80 88 110 100 125 C112 110 112 80 100 65 Z" />
        <path d="M100 130 C90 145 90 170 100 185 C110 170 110 145 100 130 Z" />
        <path d="M100 190 C93 198 93 212 100 220 C107 212 107 198 100 190 Z" />

        {/* Left Column 1 (x=70) */}
        <path d="M70 45 C62 55 62 75 70 85 C78 75 78 55 70 45 Z" />
        <path d="M70 90 C58 105 58 135 70 150 C82 135 82 105 70 90 Z" />
        <path d="M70 155 C62 165 62 185 70 195 C78 185 78 165 70 155 Z" />

        {/* Right Column 1 (x=130) */}
        <path d="M130 45 C122 55 122 75 130 85 C138 75 138 55 130 45 Z" />
        <path d="M130 90 C118 105 118 135 130 150 C142 135 142 105 130 90 Z" />
        <path d="M130 155 C122 165 122 185 130 195 C138 185 138 165 130 155 Z" />

        {/* Left Column 2 (x=40) */}
        <path d="M40 75 C32 85 32 105 40 115 C48 105 48 85 40 75 Z" />
        <path d="M40 120 C32 130 32 150 40 160 C48 150 48 130 40 120 Z" />

        {/* Right Column 2 (x=160) */}
        <path d="M160 75 C152 85 152 105 160 115 C168 105 168 85 160 75 Z" />
        <path d="M160 120 C152 130 152 150 160 160 C168 150 168 130 160 120 Z" />

        {/* Outer Nodes */}
        <path d="M10 98 C3 108 3 128 10 138 C17 128 17 108 10 98 Z" />
        <path d="M190 98 C183 108 183 128 190 138 C197 128 197 108 190 98 Z" />
      </g>
    </svg>
  );
}

/**
 * Subtle repetitive geometric heritage background watermark
 */
export function BrandWatermark({
  opacity = "opacity-[0.04]",
  className = "",
}: {
  opacity?: string;
  className?: string;
}) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden ${opacity} ${className}`}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(#B59A68_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      <div className="absolute -top-24 -right-24 w-96 h-96 text-[#B59A68] rotate-12">
        <YadaSutraIcon className="w-full h-full" />
      </div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 text-[#176B63] -rotate-12">
        <YadaSutraIcon className="w-full h-full" />
      </div>
    </div>
  );
}

export function BrandLogo({
  variant = "horizontal",
  theme = "light",
  size = "md",
  showTagline = true,
  taglineText = "TATHA PARAMPARAYA",
  portalSubtitle,
  className = "",
}: BrandLogoProps) {
  // Color tokens based on theme
  const isDark = theme === "dark";
  const isGold = theme === "gold";

  const motifColor = isDark
    ? "#D4AF37"
    : isGold
    ? "#B59A68"
    : "#B59A68";

  const titleColor = isDark
    ? "text-white"
    : isGold
    ? "text-[#8C7448]"
    : "text-[#176B63]";

  const taglineColor = isDark
    ? "text-[#D4AF37]/90"
    : isGold
    ? "text-[#8C7448]"
    : "text-[#8C7448]";

  const subtitleColor = isDark
    ? "text-teal-200/70"
    : "text-[#66736E]";

  // Size mapping
  const iconSizes = {
    sm: "w-6 h-7",
    md: "w-8 h-10",
    lg: "w-11 h-14",
    xl: "w-16 h-20",
  };

  const titleSizes = {
    sm: "text-lg tracking-wide",
    md: "text-xl tracking-wider",
    lg: "text-2xl sm:text-3xl tracking-widest",
    xl: "text-3xl sm:text-4xl tracking-widest",
  };

  const tagSizes = {
    sm: "text-[8px] tracking-[0.2em]",
    md: "text-[9.5px] tracking-[0.25em]",
    lg: "text-[11px] tracking-[0.3em]",
    xl: "text-[13px] tracking-[0.35em]",
  };

  if (variant === "icon") {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <YadaSutraIcon className={iconSizes[size]} fillColor={motifColor} />
      </div>
    );
  }

  if (variant === "vertical") {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <div className="relative mb-2">
          <YadaSutraIcon className={iconSizes[size]} fillColor={motifColor} />
        </div>
        <h1
          className={`font-serif font-bold ${titleSizes[size]} ${titleColor} leading-none`}
        >
          <span className="opacity-70 mr-1 text-sm font-light">||</span>
          YadaSutra
          <span className="opacity-70 ml-1 text-sm font-light">||</span>
        </h1>
        {showTagline && (
          <p
            className={`font-sans font-semibold uppercase mt-1 ${tagSizes[size]} ${taglineColor}`}
          >
            {taglineText}
          </p>
        )}
        {portalSubtitle && (
          <p
            className={`text-xs font-sans mt-1.5 uppercase tracking-wider ${subtitleColor}`}
          >
            {portalSubtitle}
          </p>
        )}
      </div>
    );
  }

  // Default: horizontal
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="shrink-0 flex items-center justify-center">
        <YadaSutraIcon className={iconSizes[size]} fillColor={motifColor} />
      </div>
      <div className="flex flex-col">
        <div
          className={`font-serif font-bold ${titleSizes[size]} ${titleColor} leading-tight flex items-center`}
        >
          <span className="opacity-60 mr-1 text-xs sm:text-sm font-normal">||</span>
          <span>YadaSutra</span>
          <span className="opacity-60 ml-1 text-xs sm:text-sm font-normal">||</span>
        </div>
        {showTagline && (
          <div
            className={`font-sans font-semibold uppercase ${tagSizes[size]} ${taglineColor} mt-0.5`}
          >
            {taglineText}
          </div>
        )}
        {portalSubtitle && (
          <div
            className={`text-[10px] uppercase tracking-wider ${subtitleColor} mt-0.5 font-medium`}
          >
            {portalSubtitle}
          </div>
        )}
      </div>
    </div>
  );
}
