"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  StreamingCard,
  InsightsEditor,
  AgeRatingCard,
  AwardBadgeLarge,
  AgeRatingBadge,
  AwardBadge,
  Carousel,
  TrailerModal,
} from "@/shared/ui";
import { cn, formatDate, formatCompactNumber } from "@/lib/utils/cn";
import { useToast } from "@/shared/ui/Toast";
import { progressApi, insightsApi, recommendationsApi } from "@/shared/lib/api-client";
import { resolveTitle } from "@/lib/i18n/titles";
import { getRatingMeta, getPrestigeMeta } from "@/lib/utils/ratings";
import type { UserStatus, MediaWithProgress, Profile } from "@/types";
import { useRouter } from "next/navigation";
import Image from "next/image";

const STATUS_LABELS: Record<UserStatus, string> = {
  planning: "Planejo assistir/ler",
  watching: "Assistindo",
  paused: "Pausado",
  completed: "Concluído",
  dropped: "Abandonado",
  rewatching: "Reassistindo/Relendo",
};

const STATUS_COLORS: Record<UserStatus, string> = {
  planning: "bg-zinc-700 text-zinc-300",
  watching: "bg-blue-600 text-white",
  paused: "bg-yellow-600 text-white",
  completed: "bg-green-600 text-white",
  dropped: "bg-red-600 text-white",
  rewatching: "bg-purple-600 text-white",
};

export default function MediaDetailPage() {
  const params = useParams();
  const mediaId = params.id as string;
  const router = useRouter();
  const { addToast } = useToast();

  const [media, setMedia] = useState<MediaWithProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProgress, setSavingProgress] = useState(false);
  const [savingInsights, setSavingInsights] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [recommendations, setRecommendations] = useState<MediaWithProgress[]>([]);

  // Fetch media + user progress
  useEffect(() => {
    fetchMedia();
  }, [mediaId]);

  async function fetchMedia() {
    setLoading(true);
    try {
      const res = await fetch(`/api/media/${mediaId}`);
      if (!res.ok) throw new Error("Mídia não encontrada");
      const data = await res.json();
      setMedia({ ...data.media, title: data.media.title_default, progress: data.progress });
      
      // Fetch recommendations for carousel
      try {
        const recRes = await fetch(`/api/recommendations`);
        if (recRes.ok) {
          const recData = await recRes.json();
          setRecommendations(recData.recommendations || []);
        }
      } catch {
        // ignore recommendations failure
      }
    } catch {
      addToast({ message: "Erro ao carregar mídia", type: "error" });
      router.push("/library");
    } finally {
      setLoading(false);
    }
  }

  async function handleProgressUpdate(updates: { unit?: number; status?: UserStatus; score?: number; increment?: boolean }) {
    if (!media?.progress) return;
    setSavingProgress(true);
    try {
      await progressApi.update(mediaId, updates);
      setMedia(prev => prev ? {
        ...prev,
        progress: {
          ...prev.progress!,
          ...updates,
          current_unit: updates.increment ? (prev.progress!.current_unit || 0) + 1 : (updates.unit ?? prev.progress!.current_unit),
          status: updates.status ?? prev.progress!.status,
          user_score: updates.score ?? prev.progress!.user_score,
        }
      } : null);
      addToast({ message: "Progresso salvo", type: "success" });
    } catch {
      addToast({ message: "Falha ao salvar progresso", type: "error" });
    } finally {
      setSavingProgress(false);
    }
  }

  async function handleInsightsSave(content: string) {
    setSavingInsights(true);
    try {
      await insightsApi.update(mediaId, content);
      setMedia(prev => prev ? { ...prev, progress: { ...prev.progress!, private_insights: content } } : null);
      addToast({ message: "Insights salvos", type: "success" });
    } catch {
      addToast({ message: "Falha ao salvar insights", type: "error" });
    } finally {
      setSavingInsights(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!media) return null;

  // Resolve title based on user preferences (simplified - would come from profile)
  const resolvedTitle = resolveTitle(media, "pt-BR");
  const splitTitle = media.title_native && media.title_romaji
    ? { primary: media.title_native, secondary: media.title_romaji }
    : { primary: resolvedTitle, secondary: media.title_english || media.title_ptbr || null };

  const isStreaming = ["movie", "tv_series", "anime"].includes(media.media_type);
  const isReading = ["manga", "manhwa", "manhua", "novel", "book"].includes(media.media_type);
  const isGame = media.media_type === "game";
  const totalUnits = isStreaming ? media.total_episodes : (isReading ? media.total_chapters : 0);
  const hasTotal = totalUnits && totalUnits > 0;
  const currentUnit = media.progress?.current_unit ?? 0;
  const progressPercent = hasTotal ? Math.min(100, (currentUnit / totalUnits) * 100) : 0;
  const ratingMeta = getRatingMeta(media.age_rating_br);
  const prestigeMeta = getPrestigeMeta(media.prestige_badge);

  return (
    <article className="space-y-8">
      {/* Hero / Backdrop Section - Cinema Mode */}
      <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800">
        {/* Backdrop hero */}
        {media.backdrop_url && (
          <div className="relative h-[50vh] min-h-[400px] lg:min-h-[550px]">
            <Image
              src={media.backdrop_url}
              alt=""
              fill
              priority
              className="object-cover"
              sizes="100vw"
            />
            {/* Dynamic gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/95 via-zinc-950/30 to-transparent" />
            
            {/* Badges on backdrop */}
            <div className="absolute top-6 left-6 right-6 flex items-start justify-between gap-2">
              {media.prestige_badge && media.prestige_badge !== 'none' && (
                <AwardBadge badge={media.prestige_badge} size="md" />
              )}
              {media.is_adult && (
                <AgeRatingBadge rating="18" size="md" variant="pill" />
              )}
            </div>
            
            {/* Bottom badges - age rating */}
            {!media.is_adult && media.age_rating_br && media.age_rating_br !== 'L' && (
              <div className="absolute bottom-6 left-6">
                <AgeRatingBadge rating={media.age_rating_br} size="lg" />
              </div>
            )}

            {/* Release status on backdrop */}
            {media.release_status !== 'finished' && (
              <div className="absolute bottom-6 right-6">
                <span
                  className={cn(
                    "px-3 py-1 text-sm font-medium rounded-full capitalize",
                    media.release_status === 'airing' && 'bg-green-600/90 text-white',
                    media.release_status === 'hiatus' && 'bg-yellow-600/90 text-white',
                    media.release_status === 'cancelled' && 'bg-red-600/90 text-white',
                    media.release_status === 'upcoming' && 'bg-blue-600/90 text-white',
                    media.release_status === 'orphaned' && 'bg-zinc-600/90 text-white',
                  )}
                >
                  {media.release_status}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Content overlay */}
        <div className="relative p-6 sm:p-8 lg:p-12 flex flex-col lg:flex-row gap-8 items-start lg:items-center">
          {/* Cover */}
          <div className="relative w-full sm:w-52 lg:w-64 flex-shrink-0">
            {media.cover_url ? (
              <Image
                src={media.cover_url}
                alt={media.title_default}
                width={208}
                height={312}
                className="rounded-lg shadow-2xl object-cover"
                priority
              />
            ) : (
              <div className="aspect-[2/3] rounded-lg bg-zinc-800 flex items-center justify-center shadow-2xl">
                <svg className="w-24 h-24 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            {media.is_adult && (
              <div className="absolute top-2 right-2">
                <span className="px-2 py-0.5 bg-red-600/90 text-white text-xs font-bold rounded">18+</span>
              </div>
            )}
            {media.prestige_badge && media.prestige_badge !== 'none' && (
              <AwardBadgeLarge badge={media.prestige_badge} className="absolute top-2 left-2" />
            )}
            {!media.is_adult && media.age_rating_br && media.age_rating_br !== 'L' && (
              <AgeRatingCard rating={media.age_rating_br} className="absolute bottom-2 left-2" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-2 py-0.5 bg-zinc-800 text-zinc-400 text-xs font-medium rounded-full capitalize">
                {media.media_type.replace("_", " ")}
              </span>
              {media.release_status !== "finished" && (
                <span className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded-full capitalize",
                  media.release_status === "airing" && "bg-green-600/90 text-white",
                  media.release_status === "hiatus" && "bg-yellow-600/90 text-white",
                  media.release_status === "cancelled" && "bg-red-600/90 text-white",
                  media.release_status === "upcoming" && "bg-blue-600/90 text-white",
                )}>
                  {media.release_status}
                </span>
              )}
              {media.is_adult && (
                <span className="px-2 py-0.5 bg-red-600/90 text-white text-xs font-medium rounded-full">Adulto</span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
              {splitTitle.primary}
            </h1>
            {splitTitle.secondary && (
              <h2 className="text-lg text-zinc-400 font-normal mb-4">{splitTitle.secondary}</h2>
            )}

            <div className="flex flex-wrap items-center gap-4 text-zinc-400 mb-4">
              {media.release_year && <span>{media.release_year}</span>}
              {hasTotal && (
                <span>{formatCompactNumber(totalUnits)} {isStreaming ? "episódios" : "capítulos"}</span>
              )}
              {media.duration_minutes && <span>{media.duration_minutes} min</span>}
              {media.episode_duration_minutes && <span>{media.episode_duration_minutes} min/ep</span>}
              {media.user_score_global && (
                <span className="flex items-center gap-1 text-yellow-400">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  {media.user_score_global.toFixed(1)}
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {media.genres?.slice(0, 5).map((g) => (
                <span key={g} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 text-xs rounded-full">{g}</span>
              ))}
            </div>

            {/* Trailer button */}
            {media.trailer_url && (
              <button
                onClick={() => setShowTrailer(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                aria-label={`Assistir trailer de ${splitTitle.primary}`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Assistir Trailer
              </button>
            )}

            {media.synopsis && (
              <p className="text-zinc-300 text-base leading-relaxed max-w-3xl mt-6 line-clamp-4">
                {media.synopsis}
              </p>
            )}
          </div>
        </div>

        {/* Trailer Modal */}
        <TrailerModal
          open={showTrailer}
          onClose={() => setShowTrailer(false)}
          trailerUrl={media.trailer_url}
          title={splitTitle.primary}
        />
      </div>

      {/* Progress Section */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Seu Progresso</h2>

        <div className="grid gap-4 md:grid-cols-4">
          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-2">Status</label>
            <select
              value={media.progress?.status || "planning"}
              onChange={(e) => handleProgressUpdate({ status: e.target.value as UserStatus })}
              disabled={savingProgress}
              className={cn(
                "w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer",
                STATUS_COLORS[((media.progress?.status || "planning") as UserStatus)]
              )}
            >
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Progress */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-2">
              Progresso {hasTotal ? `(${currentUnit} / ${totalUnits})` : `(${currentUnit} / ?)`}
            </label>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleProgressUpdate({ increment: true })}
                  disabled={savingProgress || Boolean(hasTotal && currentUnit >= totalUnits)}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 hover:text-white transition-colors disabled:opacity-50"
                  aria-label="Incrementar"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <span className="font-mono text-white w-16 text-right">{currentUnit}</span>
              </div>
            </div>
            <input
              type="number"
              min={0}
              max={hasTotal ? totalUnits : undefined}
              value={currentUnit}
              onChange={(e) => handleProgressUpdate({ unit: parseInt(e.target.value) || 0 })}
              className="mt-2 w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-center focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder={hasTotal ? `0-${totalUnits}` : "Número"}
            />
          </div>

          {/* Score */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-2">Nota</label>
            <select
              value={media.progress?.user_score !== undefined && media.progress?.user_score !== null ? media.progress.user_score.toString() : ""}
              onChange={(e) => handleProgressUpdate({ score: e.target.value ? parseFloat(e.target.value) : undefined })}
              disabled={savingProgress}
              className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              <option value="">—</option>
              {[10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0].map((v) => (
                <option key={v} value={v.toFixed(1)}>{v.toFixed(1)}</option>
              ))}
            </select>
          </div>

          {/* Rewatch */}
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-2">Reassistindo</label>
            <div className="flex items-center gap-2">
              <span className="px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white font-mono text-lg w-16 text-center">
                {media.progress?.rewatch_count || 0}
              </span>
              <button
                onClick={() => handleProgressUpdate({ status: "rewatching" })}
                disabled={savingProgress}
                className="px-3 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-600/30 rounded-lg text-purple-400 text-sm font-medium transition-colors disabled:opacity-50"
              >
                +1 Rewatch
              </button>
            </div>
          </div>
        </div>

        {/* Dates */}
        {(media.progress?.started_at || media.progress?.completed_at) && (
          <div className="mt-4 grid gap-2 md:grid-cols-2 text-sm text-zinc-400">
            {media.progress?.started_at && (
              <span>Iniciado: <span className="text-white">{formatDate(media.progress.started_at)}</span></span>
            )}
            {media.progress?.completed_at && (
              <span>Concluído: <span className="text-white">{formatDate(media.progress.completed_at)}</span></span>
            )}
          </div>
        )}
      </section>

      {/* Insights Section */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <InsightsEditor
          initialContent={media.progress?.private_insights || ""}
          mediaId={mediaId}
          onSave={handleInsightsSave}
          isOwner={true}
        />
      </section>

      {/* Recommendations Carousel - Cinema Mode */}
      {recommendations.length > 0 && (
        <section>
          <Carousel title="Recomendados para você" count={recommendations.length}>
            {recommendations.map((rec) => (
              <StreamingCard
                key={rec.id}
                media={rec}
                variant="default"
              />
            ))}
          </Carousel>
        </section>
      )}

      {/* Metadata */}
      <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Detalhes</h2>
        <dl className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 text-sm">
          <div><dt className="text-zinc-500">Título original</dt><dd className="text-white font-mono">{media.title_default}</dd></div>
          {media.title_romaji && <div><dt className="text-zinc-500">Romaji</dt><dd className="text-white">{media.title_romaji}</dd></div>}
          {media.title_english && <div><dt className="text-zinc-500">Inglês</dt><dd className="text-white">{media.title_english}</dd></div>}
          {media.title_native && <div><dt className="text-zinc-500">Nativo</dt><dd className="text-white">{media.title_native}</dd></div>}
          {media.title_ptbr && <div><dt className="text-zinc-500">Português</dt><dd className="text-white">{media.title_ptbr}</dd></div>}
          <div><dt className="text-zinc-500">Classificação</dt><dd className="text-white">{ratingMeta.label}</dd></div>
          <div><dt className="text-zinc-500">Estúdios</dt><dd className="text-white">{media.studios?.join(", ") || "—"}</dd></div>
          <div><dt className="text-zinc-500">Gêneros</dt><dd className="text-white">{media.genres?.join(", ") || "—"}</dd></div>
          <div><dt className="text-zinc-500">Temas</dt><dd className="text-white">{media.themes?.join(", ") || "—"}</dd></div>
          <div><dt className="text-zinc-500">IDs externos</dt><dd className="text-white font-mono text-xs">
            {media.anilist_id && <div>AniList: {media.anilist_id}</div>}
            {media.mal_id && <div>MAL: {media.mal_id}</div>}
            {media.tmdb_id && <div>TMDB: {media.tmdb_id}</div>}
            {media.kitsu_id && <div>Kitsu: {media.kitsu_id}</div>}
          </dd></div>
        </dl>
      </section>
    </article>
  );
}