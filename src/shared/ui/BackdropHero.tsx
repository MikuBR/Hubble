"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { AgeRatingBadge, AwardBadge } from "./index";
import type { MediaCatalog } from "@/types";

interface BackdropHeroProps {
  media: MediaCatalog & { title?: string };
  onClick: (media: MediaCatalog) => void;
}

export function BackdropHero({ media, onClick }: BackdropHeroProps) {
  const title = media.title || media.title_default;
  const isAdult = media.is_adult;
  const hasBackdrop = media.backdrop_url;

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative w-full overflow-hidden rounded-3xl mx-4 -mt-4"
      style={{ minHeight: "60vh", maxHeight: "700px" }}
    >
      {/* Backdrop Image */}
      {hasBackdrop ? (
        <Image
          src={media.backdrop_url!}
          alt=""
          fill
          priority
          sizes="100vw"
          className={cn(
            "object-cover",
            "absolute inset-0",
            "will-change-transform"
          )}
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 via-zinc-900 to-zinc-950" />
      )}

      {/* Dynamic Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-600/10 via-transparent to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full p-6 sm:p-10 md:p-16">
        <div className="max-w-3xl flex flex-col h-full justify-end">
          {/* Top Badges */}
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            {media.prestige_badge && media.prestige_badge !== 'none' && (
              <AwardBadge badge={media.prestige_badge} size="md" />
            )}
            {isAdult ? (
              <AgeRatingBadge rating="18" size="md" variant="pill" />
            ) : media.age_rating_br && media.age_rating_br !== 'L' && (
              <AgeRatingBadge rating={media.age_rating_br} size="md" />
            )}
            {media.release_status !== 'finished' && (
              <span className={cn(
                "px-3 py-1 text-sm font-medium rounded-full capitalize",
                media.release_status === 'airing' && 'bg-green-600/90 text-white',
                media.release_status === 'hiatus' && 'bg-yellow-600/90 text-white',
                media.release_status === 'cancelled' && 'bg-red-600/90 text-white',
                media.release_status === 'upcoming' && 'bg-blue-600/90 text-white',
                media.release_status === 'orphaned' && 'bg-zinc-600/90 text-white',
              )}>
                {media.release_status}
              </span>
            )}
          </div>

          {/* Title & Meta */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4 line-clamp-2"
          >
            {title}
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="flex flex-wrap items-center gap-4 text-zinc-300 text-sm md:text-base mb-6"
          >
            {media.release_year && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-white/5 rounded-full backdrop-blur-sm">
                {media.release_year}
              </span>
            )}
            {media.user_score_global && (
              <span className="flex items-center gap-1.5 px-3 py-1 bg-yellow-500/10 text-yellow-400 rounded-full backdrop-blur-sm">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                {media.user_score_global.toFixed(1)}
              </span>
            )}
            {media.duration_minutes && (
              <span className="px-3 py-1 bg-white/5 rounded-full backdrop-blur-sm">
                {media.duration_minutes} min
              </span>
            )}
            {media.total_episodes && media.total_episodes > 0 && (
              <span className="px-3 py-1 bg-white/5 rounded-full backdrop-blur-sm">
                {media.total_episodes} eps
              </span>
            )}
          </motion.div>

          {/* Synopsis */}
          {media.synopsis && (
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-zinc-300 text-base md:text-lg line-clamp-3 mb-8 max-w-2xl"
            >
              {media.synopsis}
            </motion.p>
          )}

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-wrap gap-3"
          >
            <button
              onClick={(e) => { e.stopPropagation(); onClick(media); }}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-base",
                "bg-white text-zinc-950 hover:bg-white/90",
                "transition-all duration-200",
                "shadow-lg shadow-white/10",
                "focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-zinc-950"
              )}
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Assistir Agora
            </button>

            <Link
              href={`/media/${media.id}`}
              className={cn(
                "flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-base",
                "bg-white/10 text-white hover:bg-white/20",
                "transition-all duration-200",
                "backdrop-blur-sm border border-white/10",
                "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
              )}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Detalhes
            </Link>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}