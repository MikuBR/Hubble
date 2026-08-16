"use client";

import { cn } from "@/lib/utils/cn";
import { getRatingMeta } from "@/lib/utils/ratings";
import type { AgeRatingBR } from "@/types/database.types";

interface AgeRatingBadgeProps {
  rating: AgeRatingBR | null | undefined;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  variant?: "badge" | "pill" | "minimal";
}

export function AgeRatingBadge({
  rating,
  size = "md",
  showLabel = false,
  variant = "badge",
}: AgeRatingBadgeProps) {
  const meta = getRatingMeta(rating);

  if (!rating || rating === 'L' && variant === 'minimal') {
    return (
      <span
        className={cn(
          "inline-flex items-center font-bold rounded",
          size === "sm" && "px-2 py-0.5 text-xs",
          size === "md" && "px-2.5 py-1 text-sm",
          size === "lg" && "px-3 py-1.5 text-base",
          variant === "badge" && meta.cssClass,
          variant === "pill" && `bg-[${meta.colorVar}]/20 text-[${meta.colorVar}] border border-[${meta.colorVar}]/30 rounded-full`,
          variant === "minimal" && "text-zinc-400"
        )}
        title={meta.description}
      >
        {variant !== "minimal" && meta.code}
        {showLabel && <span className="ml-1 hidden sm:inline">{meta.label}</span>}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center font-bold rounded",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-sm",
        size === "lg" && "px-3 py-1.5 text-base",
        variant === "badge" && meta.cssClass,
        variant === "pill" && `bg-[${meta.colorVar}]/20 text-[${meta.colorVar}] border border-[${meta.colorVar}]/30 rounded-full`,
      )}
      title={meta.description}
    >
      {meta.code}
      {showLabel && <span className="ml-1 hidden sm:inline">{meta.label}</span>}
    </span>
  );
}

/**
 * Componente de classificação etária para cards (versão visual maior)
 */
export function AgeRatingCard({ rating, className }: { rating: AgeRatingBR | null; className?: string }) {
  const meta = getRatingMeta(rating);

  return (
    <div
      className={cn(
        "flex items-center justify-center w-10 h-10 rounded-lg font-bold text-white",
        `bg-[${meta.colorVar}]`,
        className
      )}
      title={meta.description}
    >
      {meta.code}
    </div>
  );
}