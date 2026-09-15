import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { BackdropHero, Carousel, StreamingCard } from "@/shared/ui";
import type { MediaCatalog, UserMediaProgress } from "@/types";

// Type assertion for Supabase relation joins: relationships are unresolved in
// database.types.ts (tracked in QA_CRITICO_REPORT.md). Regenerating types would
// require the Supabase project to be online — it is currently NXDOMAIN.
type WatchedMedia = UserMediaProgress & { media: MediaCatalog };

// Horizons result shape — matches get_horizons RPC return type
interface HorizonsItem {
  id: string;
  title_default: string;
  poster_url: string | null;
  backdrop_url: string | null;
  media_type: string;
}

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null; // Layout handles redirect

  // Buscar progressos recentes (watching + reading)
  const { data: watching } = await supabase
    .from("user_media_progress")
    .select(`
      *,
      media:media_catalog(*)
    `)
    .eq("user_id", user.id)
    .in("status", ["watching", "reading", "rewatching"])
    .order("last_interaction_at", { ascending: false })
    .limit(10);

  // Continue watching/reading — Supabase's generated `.select()` with joined
  // tables returns `never[]` until Relationships are resolved in
  // src/lib/database.types.ts (tracked in QA_CRITICO_REPORT.md). Cast to the
  // expected joined shape: UserMediaProgress + media_catalog sub-object.
  const continueItems = (watching as WatchedMedia[] || []).map((p) => ({
    ...p.media,
    title: p.media.title_default,
    progress: {
      current_unit: p.current_unit,
      status: p.status,
      user_score: p.user_score,
      rewatch_count: p.rewatch_count,
    },
  }));

  // Recomendações rápidas (Novos Horizontes)
  // RPC args typed as `undefined` due to unresolved Relationships in db types.
  // Cast via explicit interface; would be removed once types are regenerated.
  const { data: recs } = await supabase.rpc(
    "get_horizons",
    { p_user_id: user.id, p_limit: 12 } as unknown as Parameters<typeof supabase.rpc>[1],
  ) as { data: HorizonsItem[] | null; error: unknown };
  const recommendations = (recs ?? []) as HorizonsItem[];

  // Featured media for Backdrop Hero
  const heroMedia = recommendations[0] || continueItems[0] || null;

  return (
    <div className="flex flex-col gap-12 pb-12 -mt-8">
      {/* Backdrop Hero */}
      {heroMedia ? (
        <BackdropHero
          media={heroMedia as unknown as MediaCatalog & { title?: string }}
          href={`/media/${heroMedia.id}`}
        />
      ) : (
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600/20 via-zinc-900 to-zinc-950 p-8 border border-zinc-800 mx-4 mt-8">
          <div className="max-w-2xl">
            <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
              Bem-vindo de volta, <span className="text-indigo-400">explorador</span> 🔭
            </h1>
            <p className="text-zinc-400 text-lg">
              Continue suas jornadas ou descubra novos mundos.
            </p>
          </div>
        </section>
      )}

      {/* Continue Watching/Reading */}
      {continueItems.length > 0 && (
        <section className="px-4">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-xl font-semibold text-white">Continue onde parou</h2>
            <Link href="/library?status=watching" className="text-sm text-zinc-400 hover:text-indigo-400 transition-colors">
              Ver todos →
            </Link>
          </div>
          <Carousel count={continueItems.length}>
            {continueItems.map((m) => (
              <Link key={m.id} href={`/media/${m.id}`} className="flex-shrink-0 no-underline">
                <StreamingCard media={m} />
              </Link>
            ))}
          </Carousel>
        </section>
      )}

      {/* Novos Horizontes */}
      {recommendations.length > 0 && (
        <section className="px-4">
          <div className="flex items-center justify-between mb-4 px-2">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              <span>🌌</span> Novos Horizontes
            </h2>
            <Link href="/recommendations" className="text-sm text-zinc-400 hover:text-indigo-400 transition-colors">
              Explorar →
            </Link>
          </div>
          <Carousel count={recommendations.length}>
            {recommendations.map((r) => (
              <Link key={r.id} href={`/media/${r.id}`} className="flex-shrink-0 no-underline">
                <StreamingCard media={r as unknown as MediaCatalog} />
              </Link>
            ))}
          </Carousel>
        </section>
      )}

      {/* Empty state */}
      {continueItems.length === 0 && recommendations.length === 0 && (
        <section className="text-center py-16 px-4">
          <div className="text-6xl mb-4">🔭</div>
          <h2 className="text-xl font-semibold text-white mb-2">Sua biblioteca está vazia</h2>
          <p className="text-zinc-400 mb-6 max-w-md mx-auto">
            Comece adicionando sua primeira obra na busca.
          </p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-base bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            Explorar catálogo
          </Link>
        </section>
      )}
    </div>
  );
}
