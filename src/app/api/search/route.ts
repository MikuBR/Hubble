import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { resolveTitle, pickLanguagePref } from "@/lib/i18n/titles";

const SearchQuerySchema = z.object({
  q: z.string().min(1).max(100),
  type: z.enum(['movie', 'tv_series', 'anime', 'manga', 'manhwa', 'manhua', 'novel', 'book', 'game', 'all']).nullable().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  offset: z.coerce.number().min(0).default(0),
});

/**
 * GET /api/search?q=...&type=...&limit=...&offset=...
 *
 * Busca híbrida local-first:
 * 1. pg_trgm no media_catalog (instantâneo, offline)
 * 2. Se HIT → retorna
 * 3. Se MISS → fallback APIs externas (TMDB, AniList) - opcional
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  // Parse e validação
  const parseResult = SearchQuerySchema.safeParse({
    q: searchParams.get('q'),
    type: searchParams.get('type'),
    limit: searchParams.get('limit'),
    offset: searchParams.get('offset'),
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos', details: parseResult.error.flatten() },
      { status: 400 }
    );
  }

  const { q, type, limit, offset } = parseResult.data;

  // Pegar preferências de idioma do usuário (se logado)
  const { data: { user } } = await supabase.auth.getUser();
  let westernPref: 'pt-BR' | 'en' | 'es' = 'pt-BR';
  let orientalPref: 'pt-BR' | 'en' | 'romaji' | 'native' = 'romaji';

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_language_western, preferred_language_oriental')
      .eq('id', user.id)
      .single();
    if (profile) {
      westernPref = profile.preferred_language_western;
      orientalPref = profile.preferred_language_oriental;
    }
  }

  // 1. Busca local com pg_trgm
  let query = supabase
    .from('media_catalog')
    .select(`
      id,
      media_type,
      title_default,
      title_romaji,
      title_english,
      title_native,
      title_ptbr,
      cover_url,
      backdrop_url,
      release_year,
      release_status,
      total_episodes,
      total_chapters,
      total_volumes,
      duration_minutes,
      age_rating_br,
      is_adult,
      prestige_badge,
      genres,
      themes,
      studios,
      user_score_global,
      anilist_id,
      tmdb_id
    `)
    .textSearch('title_default', q, {
      type: 'websearch',
      config: 'portuguese'
    })
    .range(offset, offset + limit - 1)
    .order('user_score_global', { ascending: false, nullsLast: true });

  if (type && type !== 'all') {
    query = query.eq('media_type', type);
  }

  // Filtrar NSFW se usuário não quiser ver
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('enable_nsfw_filter')
      .eq('id', user.id)
      .single();
    if (profile?.enable_nsfw_filter) {
      query = query.eq('is_adult', false);
    }
  } else {
    // Não logado = filtro NSFW on por padrão
    query = query.eq('is_adult', false);
  }

  const { data: localResults, error } = await query;

  if (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Erro na busca' },
      { status: 500 }
    );
  }

  // Enriquecer resultados com título resolvido
  const enrichedResults = (localResults || []).map((media) => {
    const langPref = pickLanguagePref(
      media.media_type,
      westernPref,
      orientalPref
    );
    const resolvedTitle = resolveTitle(media, langPref);

    return {
      ...media,
      title: resolvedTitle,
      // Para UI: mostra tipo de mídia traduzido
      mediaTypeLabel: getMediaTypeLabel(media.media_type),
    };
  });

  return NextResponse.json({
    results: enrichedResults,
    pagination: {
      offset,
      limit,
      hasMore: enrichedResults.length === limit,
    },
    source: 'local',
  });
}

/**
 * Labels em PT-BR para os tipos de mídia
 */
function getMediaTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    movie: 'Filme',
    tv_series: 'Série',
    anime: 'Anime',
    manga: 'Mangá',
    manhwa: 'Manhwa',
    manhua: 'Manhua',
    novel: 'Novel',
    book: 'Livro',
    game: 'Jogo',
  };
  return labels[type] || type;
}