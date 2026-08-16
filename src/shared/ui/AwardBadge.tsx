"use client";

import { cn } from "@/lib/utils/cn";
import { getPrestigeMeta } from "@/lib/utils/ratings";
import type { PrestigeBadge } from "@/types/database.types";

interface AwardBadgeProps {
  badge: PrestigeBadge | null | undefined;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

export function AwardBadge({
  badge,
  size = "md",
  showLabel = false,
}: AwardBadgeProps) {
  const meta = getPrestigeMeta(badge);

  if (!badge || badge === 'none') return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-semibold rounded-full",
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-sm",
        size === "lg" && "px-3 py-1.5 text-base",
        meta.cssClass,
        "animate-in fade-in zoom-in-95 duration-300"
      )}
      title={meta.label}
    >
      <span aria-hidden="true">{meta.icon}</span>
      {showLabel && <span>{meta.label}</span>}
    </span>
  );
}

/**
 * Versão maior para hero de detalhes
 */
export function AwardBadgeLarge({ badge, className }: { badge: PrestigeBadge | null; className?: string }) {
  const meta = getPrestigeMeta(badge);

  if (!badge || badge === 'none') return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-full font-semibold text-zinc-950",
        meta.cssClass,
        className
      )}
      title={meta.label}
    >
      <span className="text-2xl" aria-hidden="true">{meta.icon}</span>
      <span className="text-base">{meta.label}</span>
    </div>
  );
}