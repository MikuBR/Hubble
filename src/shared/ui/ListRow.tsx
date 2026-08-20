"use client";

import { useOptimistic, useTransition, startTransition, useState } from "react";
import { cn, formatCompactNumber } from "@/lib/utils/cn";
import { AgeRatingBadge, AwardBadge } from "./index";
import { Button } from "./Button";
import { useToast } from "./Toast";
import { Plus, ChevronDown } from "lucide-react";
import type { MediaCatalog } from "@/types/database.types";
import type { UserStatus } from "@/types/database.types";

interface ListRowProps {
  media: MediaCatalog & { 
    title?: string;
    progress?: {
      current_unit: number;
      total_units_at_completion: number | null;
      status: UserStatus;
      user_score: number | null;
      rewatch_count: number;
    };
  };
  onUpdate: (updates: { unit?: number; status?: UserStatus; score?: number; increment?: boolean }) => Promise<void>;
  variant?: "default" | "compact";
  className?: string;
}

const STATUS_LABELS: Record<UserStatus, string> = {
  planning: "Planejo",
  watching: "Assistindo",
  paused: "Pausado",
  completed: "Completo",
  dropped: "Dropado",
  rewatching: "Reassistindo",
};

const STATUS_COLORS: Record<UserStatus, string> = {
  planning: "bg-zinc-700 text-zinc-300",
  watching: "bg-blue-600/90 text-white",
  paused: "bg-yellow-600/90 text-white",
  completed: "bg-green-600/90 text-white",
  dropped: "bg-red-600/90 text-white",
  rewatching: "bg-purple-600/90 text-white",
};

export function ListRow({
  media,
  onUpdate,
  variant = "default",
  className,
}: ListRowProps) {
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();
  const progress = media.progress;
  const isAdult = media.is_adult;
  const totalUnits = media.media_type === 'anime' || media.media_type === 'tv_series'
    ? media.total_episodes
    : media.total_chapters;
  const currentUnit = progress?.current_unit ?? 0;
  const hasTotal = totalUnits && totalUnits > 0;

  const handleIncrement = () => {
    startTransition(async () => {
      try {
        await onUpdate({ increment: true });
      } catch {
        addToast({ message: "Falha ao incrementar. Tente novamente.", type: "error" });
      }
    });
  };

  const handleStatusChange = (newStatus: UserStatus) => {
    startTransition(async () => {
      try {
        await onUpdate({ status: newStatus });
      } catch {
        addToast({ message: "Falha ao alterar status.", type: "error" });
      }
    });
  };

  const handleScoreChange = (newScore: number) => {
    startTransition(async () => {
      try {
        await onUpdate({ score: newScore });
      } catch {
        addToast({ message: "Falha ao salvar nota.", type: "error" });
      }
    });
  };

  if (isAdult) {
    return (
      <div className={cn("relative group", className)}>
        <div className="nsfw-blur rounded-lg overflow-hidden bg-zinc-800 min-h-[80px] flex items-center justify-center">
          <div className="text-center p-4">
            <p className="text-zinc-400 text-sm mb-2">Conteúdo adulto</p>
            <button
              className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              Revelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid gap-3 transition-colors duration-150 hover:bg-zinc-900/50 rounded-lg p-3",
        "grid-cols-[auto_1fr_auto_auto_auto] items-center",
        "border-b border-zinc-800/50 last:border-0",
        className
      )}
    >
      {/* Cover */}
      <div className="relative w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800">
        {media.cover_url ? (
          <img
            src={media.cover_url}
            alt={media.title_default}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-600">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {media.prestige_badge && media.prestige_badge !== 'none' && (
          <AwardBadge badge={media.prestige_badge} size="sm" className="absolute top-1 left-1" />
        )}
        {media.age_rating_br && media.age_rating_br !== 'L' && (
          <AgeRatingBadge rating={media.age_rating_br} size="sm" className="absolute bottom-1 left-1" />
        )}
      </div>

      {/* Title + Meta */}
      <div className="min-w-0">
        <h4 className="font-medium text-white truncate group-hover:text-indigo-400 transition-colors">
          {media.title}
        </h4>
        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-500">
          {media.release_year && <span>{media.release_year}</span>}
          {media.release_year && media.user_score_global && <span className="text-zinc-600">·</span>}
          {media.user_score_global && (
            <span className="flex items-center gap-1 text-yellow-400">
              <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              {media.user_score_global.toFixed(1)}
            </span>
          )}
          {hasTotal && (
            <span className="text-zinc-600">· {formatCompactNumber(totalUnits)} {media.media_type === 'anime' || media.media_type === 'tv_series' ? 'eps' : 'caps'}</span>
          )}
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {hasTotal ? (
          <>
            <span className="text-sm font-mono text-zinc-300 w-16 text-right">
              {currentUnit} / {totalUnits}
            </span>
            <Button
              size="icon"
              variant="secondary"
              onClick={handleIncrement}
              disabled={isPending || (totalUnits && currentUnit >= totalUnits)}
              aria-label={`Incrementar ${media.media_type === 'anime' || media.media_type === 'tv_series' ? 'episódio' : 'capítulo'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </Button>
          </>
        ) : (
          <span className="text-sm font-mono text-zinc-300">
            {currentUnit} / ?
          </span>
        )}
      </div>

      {/* Status */}
      <div className="flex items-center">
        {progress?.status && (
          <select
            value={progress.status}
            onChange={(e) => handleStatusChange(e.target.value as UserStatus)}
            disabled={isPending}
            className={cn(
              "px-2 py-1 text-xs font-medium rounded-full border-0 appearance-none cursor-pointer",
              STATUS_COLORS[progress.status],
              "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950",
              "hover:opacity-90"
            )}
          >
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        )}
      </div>

      {/* Score */}
      <div className="flex items-center gap-1">
        {progress?.user_score !== null && progress?.user_score !== undefined ? (
          <span className="text-sm font-mono text-yellow-400 w-10 text-right">
            {progress.user_score.toFixed(1)}
          </span>
        ) : (
          <select
            value=""
            onChange={(e) => handleScoreChange(parseFloat(e.target.value))}
            disabled={isPending}
            className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            aria-label="Avaliar"
          >
            <option value="">—</option>
            {[10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0].map((v) => (
              <option key={v} value={v}>{v.toFixed(1)}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

/**
 * Tabela completa para modo leitura - Premium Reading Table
 * Compact spreadsheet-style layout with optimistic +1 Chapter button
 */
interface ReadingTableProps {
  mediaList: (MediaCatalog & { 
    title?: string;
    progress?: {
      current_unit: number;
      total_units_at_completion: number | null;
      status: UserStatus;
      user_score: number | null;
      rewatch_count: number;
    };
  })[];
  onUpdate: (mediaId: string, updates: { unit?: number; status?: UserStatus; score?: number; increment?: boolean }) => Promise<void>;
  className?: string;
}

const READING_TYPES = ['manga', 'manhwa', 'manhua', 'novel', 'book'] as const;
const MEDIA_TYPE_LABELS: Record<string, string> = {
  anime: 'Anime',
  tv_series: 'Série TV',
  manga: 'Mangá',
  manhwa: 'Manhwa',
  manhua: 'Manhua',
  novel: 'Novel',
  book: 'Livro',
  movie: 'Filme',
  ova: 'OVA',
  special: 'Especial',
  music: 'Música',
};

const READING_STATUS_LABELS: Record<UserStatus, string> = {
  planning: 'Planejo',
  watching: 'Lendo',
  paused: 'Pausado',
  completed: 'Completo',
  dropped: 'Dropado',
  rewatching: 'Relendo',
};

const READING_STATUS_COLORS: Record<UserStatus, string> = {
  planning: 'bg-zinc-700 text-zinc-300',
  watching: 'bg-blue-600/90 text-white',
  paused: 'bg-yellow-600/90 text-white',
  completed: 'bg-green-600/90 text-white',
  dropped: 'bg-red-600/90 text-white',
  rewatching: 'bg-purple-600/90 text-white',
};

export function ReadingTable({ mediaList, onUpdate, className }: ReadingTableProps) {
  const [optimisticMedia, setOptimisticMedia] = useOptimistic(
    mediaList,
    (state: typeof mediaList, update: { mediaId: string; updates: { unit?: number; increment?: boolean } }) => {
      return state.map(m => {
        if (m.id !== update.mediaId) return m;
        const progress = m.progress ? { ...m.progress } : { current_unit: 0, total_units_at_completion: null, status: 'planning' as UserStatus, user_score: null, rewatch_count: 0 };
        if (update.updates.increment) {
          progress.current_unit = (progress.current_unit ?? 0) + 1;
        } else if (update.updates.unit !== undefined) {
          progress.current_unit = update.updates.unit;
        }
        return { ...m, progress };
      });
    }
  );
  const [isPending, startTransition] = useTransition();
  const { addToast } = useToast();

  const filtered = optimisticMedia.filter(m => READING_TYPES.includes(m.media_type as typeof READING_TYPES[number]));

  const handleIncrement = (mediaId: string) => {
    startTransition(async () => {
      try {
        await onUpdate(mediaId, { increment: true });
      } catch {
        addToast({ message: 'Falha ao incrementar capítulo. Tente novamente.', type: 'error' });
      }
    });
  };

  const handleStatusChange = (mediaId: string, newStatus: UserStatus) => {
    startTransition(async () => {
      try {
        await onUpdate(mediaId, { status: newStatus });
      } catch {
        addToast({ message: 'Falha ao alterar status.', type: 'error' });
      }
    });
  };

  const handleScoreChange = (mediaId: string, newScore: number) => {
    startTransition(async () => {
      try {
        await onUpdate(mediaId, { score: newScore });
      } catch {
        addToast({ message: 'Falha ao salvar nota.', type: 'error' });
      }
    });
  };

  const getTotalUnits = (media: MediaCatalog) => {
    return media.media_type === 'anime' || media.media_type === 'tv_series'
      ? media.total_episodes
      : media.total_chapters;
  };

  const getUnitLabel = (media: MediaCatalog) => {
    return media.media_type === 'anime' || media.media_type === 'tv_series' ? 'ep' : 'cap';
  };

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse" role="grid">
        <thead>
          <tr className="border-b border-zinc-800 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
            <th className="px-3 py-2 w-16">Capa</th>
            <th className="px-3 py-2">Título</th>
            <th className="px-3 py-2 w-24">Tipo</th>
            <th className="px-3 py-2 w-36">Progresso</th>
            <th className="px-3 py-2 w-36">Status</th>
            <th className="px-3 py-2 w-24">Nota</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((media) => {
            const progress = media.progress;
            const currentUnit = progress?.current_unit ?? 0;
            const totalUnits = getTotalUnits(media);
            const hasTotal = totalUnits && totalUnits > 0;
            const isAdult = media.is_adult;

            if (isAdult) {
              return (
                <tr key={media.id} className="border-b border-zinc-800/50">
                  <td colSpan={6} className="px-3 py-4">
                    <div className="nsfw-blur rounded-lg overflow-hidden bg-zinc-800 min-h-[60px] flex items-center justify-center">
                      <div className="text-center p-4">
                        <p className="text-zinc-400 text-sm mb-2">Conteúdo adulto</p>
                        <button className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs rounded transition-colors">
                          Revelar
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            }

            return (
              <tr key={media.id} className="border-b border-zinc-800/50 hover:bg-zinc-900/50 transition-colors">
                {/* Cover */}
                <td className="px-3 py-2 w-16">
                  <div className="relative w-12 h-18 flex-shrink-0 rounded overflow-hidden bg-zinc-800">
                    {media.cover_url ? (
                      <img
                        src={media.cover_url}
                        alt={media.title_default}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-600">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                    {media.prestige_badge && media.prestige_badge !== 'none' && (
                      <AwardBadge badge={media.prestige_badge} size="sm" />
                    )}
                    {media.age_rating_br && media.age_rating_br !== 'L' && (
                      <AgeRatingBadge rating={media.age_rating_br} size="sm" />
                    )}
                  </div>
                </td>

                {/* Title + Year + Global Score */}
                <td className="px-3 py-2 min-w-0">
                  <div className="font-medium text-white truncate group-hover:text-indigo-400 transition-colors">
                    {media.title}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-500">
                    {media.release_year && <span>{media.release_year}</span>}
                    {media.release_year && media.user_score_global && <span className="text-zinc-600">·</span>}
                    {media.user_score_global && (
                      <span className="flex items-center gap-1 text-yellow-400">
                        <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                        {media.user_score_global.toFixed(1)}
                      </span>
                    )}
                  </div>
                </td>

                {/* Media Type Badge */}
                <td className="px-3 py-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {MEDIA_TYPE_LABELS[media.media_type] || media.media_type}
                  </span>
                </td>

                {/* Progress: Current/Total + +1 Cap button */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-zinc-300 w-20 text-right">
                      {currentUnit} / {hasTotal ? totalUnits : '?'}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleIncrement(media.id)}
                      disabled={isPending || (hasTotal && currentUnit >= totalUnits)}
                      aria-label={`Incrementar ${getUnitLabel(media)}`}
                      className="whitespace-nowrap gap-1.5 px-2 py-1"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span className="hidden sm:inline">+1 {getUnitLabel(media)}</span>
                      <span className="inline sm:hidden">+1</span>
                    </Button>
                  </div>
                </td>

                {/* Status Select */}
                <td className="px-3 py-2">
                  {progress?.status && (
                    <select
                      value={progress.status}
                      onChange={(e) => handleStatusChange(media.id, e.target.value as UserStatus)}
                      disabled={isPending}
                      className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full border-0 appearance-none cursor-pointer w-full",
                        STATUS_COLORS[progress.status],
                        "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950",
                        "hover:opacity-90"
                      )}
                    >
                      {Object.entries(READING_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  )}
                </td>

                {/* Score */}
                <td className="px-3 py-2">
                  {progress?.user_score !== null && progress?.user_score !== undefined ? (
                    <span className="text-sm font-mono text-yellow-400 w-10 text-right">
                      {progress.user_score.toFixed(1)}
                    </span>
                  ) : (
                    <select
                      value=""
                      onChange={(e) => handleScoreChange(media.id, parseFloat(e.target.value))}
                      disabled={isPending}
                      className="px-2 py-1 text-xs bg-zinc-800 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer w-full"
                      aria-label="Avaliar"
                    >
                      <option value="">—</option>
                      {[10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0].map((v) => (
                        <option key={v} value={v}>{v.toFixed(1)}</option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            );
          })}
          {filtered.length === 0 && (
            <tr>
              <td colSpan={6} className="px-3 py-12 text-center text-zinc-500">
                Nenhuma mídia de leitura na lista
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}