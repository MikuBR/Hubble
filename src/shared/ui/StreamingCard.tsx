"use client";

import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { AgeRatingBadge, AwardBadge } from "./index";
import type { MediaCatalog } from "@/types";

interface StreamingCardProps {
  media: MediaCatalog & { title?: string };
  variant?: "default" | "compact" | "hero";
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function StreamingCard({
  media,
  variant = "default",
  onClick,
  className,
  style,
}: StreamingCardProps) {
  const isAdult = media.is_adult;
  const hasBackdrop = media.backdrop_url;

  // Hero variant uses landscape backdrop if available
  const isHero = variant === "hero";

  return (
    <motion.article
      className={cn(
        "group relative cursor-pointer select-none",
        variant === "compact" && "w-32",
        variant === "hero" && "w-[400px] sm:w-[500px]",
        className
      )}
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -4, transition: { duration: 0.15 } }}
      style={style}
    >
      {/* Imagem principal */}
      <div
        className={cn(
          "relative overflow-hidden rounded-xl bg-zinc-800",
          isHero ? "aspect-video" : "aspect-[2/3]",
          !isHero && variant !== "compact" && "w-full"
        )}
      >
        {hasBackdrop ? (
          <Image
            src={media.backdrop_url!}
            alt={media.title || media.title_default}
            fill
            sizes={isHero ? "800px" : "(max-width: 640px) 100vw, 33vw"}
            className="object-cover transition-opacity duration-300 group-hover:opacity-80"
            placeholder="blur"
            blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
          />
        ) : media.cover_url ? (
          <Image
            src={media.cover_url}
            alt={media.title || media.title_default}
            fill
            sizes="(max-width: 640px) 100vw, 33vw"
            className="object-cover transition-opacity duration-300 group-hover:opacity-80"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800">
            <svg className="w-12 h-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Gradiente overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-zinc-950/20 to-transparent" />

        {/* Badges topo */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between gap-2 p-1">
          {media.prestige_badge && media.prestige_badge !== 'none' && (
            <AwardBadge badge={media.prestige_badge} size="sm" />
          )}
          {isAdult && (
            <AgeRatingBadge rating="18" size="sm" variant="pill" />
          )}
        </div>

        {/* Info overlay for Hero */}
        {isHero && (
          <div className="absolute bottom-3 left-3 right-3">
             <h3 className="font-bold text-white text-lg line-clamp-1">
              {media.title || media.title_default}
            </h3>
            <div className="flex items-center gap-2 text-xs text-zinc-300 mt-1">
              {media.release_year && <span>{media.release_year}</span>}
              {media.user_score_global && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  {media.user_score_global.toFixed(1)}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info text for non-hero */}
      {!isHero && variant !== "compact" && (
        <div className="mt-2 min-h-[60px]">
          <h3 className="font-medium text-white line-clamp-2 group-hover:text-indigo-400 transition-colors">
            {media.title || media.title_default}
          </h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
            {media.release_year && <span>{media.release_year}</span>}
            {media.user_score_global && (
              <span className="flex items-center gap-1 text-yellow-400">
                <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {media.user_score_global.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      )}
    </motion.article>
  );
}

export function StreamingGrid({
  mediaList,
  onClick,
  className,
}: {
  mediaList: (MediaCatalog & { title?: string })[];
  onClick?: (media: MediaCatalog) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-4",
        "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6",
        className
      )}
      role="list"
    >
      {mediaList.map((media, index) => (
        <StreamingCard
          key={media.id}
          media={media}
          onClick={() => onClick?.(media)}
          style={{ animationDelay: `${index * 30}ms` }}
        />
      ))}
    </div>
  );
}
