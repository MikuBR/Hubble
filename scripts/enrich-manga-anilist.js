/**
 * Script de Enriquecimento: Manga/Manhwa/Manhua → media_catalog via AniList GraphQL
 * @spec §6.1 - Ingestão Offline-First + §3.2 media_catalog
 *
 * Este script é STANDALONE: descobre títulos diretamente via AniList GraphQL
 * (consulta paginada por popularidade) sem depender de offline_anime_mapping.
 *
 * ANILIST NOTE: O enum MediaListType só tem ANIME e MANGA.
 * Manhwa e manhua são MANGA filtrados por countryOfOrigin (KR / CN).
 *
 * 1. Consulta AniList GraphQL paginada para MANGA/JP, MANGA/KR, MANGA/CN
 * 2. Transforma para formato media_catalog (media_type: manga/manhwa/manhua)
 * 3. Faz upsert em media_catalog por anilist_id
 * 4. Rate limiting conservador (60 req/min, 1 concorrente)
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const { URL } = require('url');
require('dotenv').config({ path: '.env.local' });

// ─── Config ───────────────────────────────────────────────────────────────
const BATCH_SIZE = 30;
const ANILIST_RATE_LIMIT = 60;            // req/min
const ANILIST_URL = 'https://graphql.anilist.co';
const REQUEST_DELAY_MS = Math.ceil(60000 / ANILIST_RATE_LIMIT); // ~1000ms
const MAX_RETRIES = 5;
const MAX_CONCURRENT = 1;
const BATCH_DELAY_MS = 2000;
const PER_PAGE = 50;                       // AniList máximo = 50

// Alvos configuráveis por tipo
// AniList só tem type=MANGA; Manhwa/Manhua filtrados por countryOfOrigin
const TARGETS = {
  MANGA:  { target: 500, country: 'JP' },
  MANHWA: { target: 100, country: 'KR' },
  MANHUA: { target:  50, country: 'CN' }
};

// Mapeamento target key → media_type para media_catalog
const TYPE_MAP = {
  MANGA:  'manga',
  MANHWA: 'manhwa',
  MANHUA: 'manhua'
};

// Mapeamento status AniList → release_status_enum
const STATUS_MAP = {
  FINISHED: 'finished',
  RELEASING: 'airing',
  NOT_YET_RELEASED: 'upcoming',
  CANCELLED: 'cancelled',
  HIATUS: 'hiatus'
};

// ─── Credenciais ──────────────────────────────────────────────────────────
function checkCredentials() {
  const missing = [];
  if (!process.env.ANILIST_CLIENT_ID) missing.push('ANILIST_CLIENT_ID');
  if (!process.env.ANILIST_CLIENT_SECRET) missing.push('ANILIST_CLIENT_SECRET');
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL');

  if (missing.length > 0) {
    console.error('❌ Credenciais ausentes em .env.local:', missing.join(', '));
    console.error('   Defina ANILIST_CLIENT_ID, ANILIST_CLIENT_SECRET, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL');
    process.exit(1);
  }
}

// ─── Supabase ─────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── GraphQL Query (paginada por popularidade, filtrada por país) ─────────
// Page.media suporta countryOfOrigin filter. type é sempre MANGA.
const MEDIA_DISCOVER_QUERY = `
query GetMediaPage($type: MediaListType!, $page: Int, $perPage: Int, $country: CountryCode) {
  Page(page: $page, perPage: $perPage) {
    media(type: $type, sort: POPULARITY_DESC, countryOfOrigin: $country) {
      id
      title { romaji english native }
      synonyms
      type
      format
      status
      description
      startDate { year month day }
      endDate { year month day }
      chapters
      volumes
      coverImage { extraLarge large medium color }
      bannerImage
      genres
      tags { name category isGeneralSpoiler isMediaSpoiler isAdult rank }
      studios {
        nodes { name isAnimationStudio }
        edges { isMain }
      }
      averageScore
      meanScore
      popularity
      isAdult
      source
      countryOfOrigin
    }
  }
}
`;

// ─── HTTP Client ──────────────────────────────────────────────────────────
function makeGraphQLRequest(query, variables) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });
    const parsed = new URL(ANILIST_URL);

    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'HUBBLE/1.0 (manga enrichment)',
        'X-Anilist-Client-ID': process.env.ANILIST_CLIENT_ID,
        'X-Anilist-Client-Secret': process.env.ANILIST_CLIENT_SECRET
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(body);
            if (parsed.errors) {
              reject(new Error(parsed.errors.map((e) => e.message).join(', ')));
            } else {
              resolve(parsed.data);
            }
          } catch (e) {
            reject(new Error(`JSON parse error: ${e.message}`));
          }
        } else if (res.statusCode === 429) {
          reject(new Error('RATE_LIMIT'));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function fetchPage(targetKey, page, attempt = 1) {
  const cfg = TARGETS[targetKey];
  try {
    const data = await makeGraphQLRequest(MEDIA_DISCOVER_QUERY, {
      type: 'MANGA',
      page,
      perPage: PER_PAGE,
      country: cfg.country
    });
    return data?.Page?.media || [];
  } catch (err) {
    if (err.message === 'RATE_LIMIT' && attempt < MAX_RETRIES) {
      const waitMs = Math.min(1000 * Math.pow(2, attempt), 30000);
      console.log(`[RATE LIMIT] ${targetKey}/${cfg.country} page ${page} — aguardando ${waitMs}ms (tentativa ${attempt}/${MAX_RETRIES})`);
      await new Promise((r) => setTimeout(r, waitMs));
      return fetchPage(targetKey, page, attempt + 1);
    }
    if (attempt < MAX_RETRIES && (err.message.includes('ECONN') || err.message.includes('ETIMEDOUT') || err.message.includes('500'))) {
      const waitMs = 1000 * Math.pow(2, attempt);
      console.log(`[RETRY] ${targetKey}/${cfg.country} page ${page} — ${err.message} — aguardando ${waitMs}ms (tentativa ${attempt}/${MAX_RETRIES})`);
      await new Promise((r) => setTimeout(r, waitMs));
      return fetchPage(targetKey, page, attempt + 1);
    }
    throw err;
  }
}

// ─── Transform AniList Media → media_catalog ─────────────────────────────
function transformToMediaCatalog(media, targetKey) {
  if (!media) return null;

  // Studios: AniList retorna publishing companies via studios.nodes para manga
  const studios =
    media.studios?.nodes
      ?.filter((s) => s.isAnimationStudio)
      ?.map((s) => s.name) || [];

  // Genres
  const genres = media.genres || [];

  // Temas extras das tags (categoria 'Theme')
  const themes =
    (media.tags || [])
      .filter((t) => t.category === 'Theme' && !t.isAdult)
      .sort((a, b) => (b.rank || 0) - (a.rank || 0))
      .map((t) => t.name) || [];

  // Score (AniList 0-100 → 0-10)
  const userScoreGlobal = media.averageScore ? parseFloat((media.averageScore / 10).toFixed(1)) : null;

  // Imagens
  const coverUrl =
    media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium;
  const backdropUrl = media.bannerImage;

  // Sinopse: remover HTML tags
  let synopsis = media.description || '';
  synopsis = synopsis.replace(/<[^>]*>/g, '').trim();
  if (synopsis.length > 5000) synopsis = synopsis.substring(0, 4997) + '...';

  // Títulos
  const titleDefault =
    media.title?.romaji || media.title?.english || media.title?.native || 'Sem título';
  const titlePtbr = media.synonyms?.find((s) => /[à-úÀ-Ú]/.test(s)) || null;

  return {
    // IDs cruzados
    anilist_id: media.id,
    mal_id: null,
    kitsu_id: null,

    // Tipo
    media_type: TYPE_MAP[targetKey] || 'manga',

    // Títulos
    title_default: titleDefault,
    title_romaji: media.title?.romaji,
    title_english: media.title?.english,
    title_native: media.title?.native,
    title_ptbr: titlePtbr,

    // Metadados
    synopsis: synopsis || null,
    cover_url: coverUrl,
    backdrop_url: backdropUrl,
    release_year: media.startDate?.year || null,
    release_status: STATUS_MAP[media.status] || 'finished',

    // Contagem (manga específico)
    total_episodes: 0,
    total_chapters: media.chapters || 0,
    total_volumes: media.volumes || 0,
    duration_minutes: null,
    episode_duration_minutes: null,

    // Classificação
    age_rating_br: media.isAdult ? 'R' : 'L',
    is_adult: media.isAdult || false,
    prestige_badge: media.averageScore >= 80 ? 'premium' : 'none',
    popularity: media.popularity || null,
    mean_score: media.meanScore || null,
    source: media.source || null,
    format: media.format || null,

    // Tags
    genres: genres,
    themes: themes,
    studios: studios,

    // Score
    user_score_global: userScoreGlobal,

    updated_at: new Date().toISOString()
  };
}

// ─── Descoberta paginada ─────────────────────────────────────────────────
async function discoverMedia(targetKey, targetCount) {
  const cfg = TARGETS[targetKey];
  console.log(`\n🔍 Descobrindo ${targetCount} títulos ${targetKey} (country=${cfg.country}) via AniList...`);
  const allMedia = [];
  let page = 1;
  const maxPages = Math.ceil(targetCount / PER_PAGE) + 1; // +1 safety
  let pageCounter = 0;

  while (allMedia.length < targetCount && pageCounter < maxPages) {
    console.log(`   📄 Page ${page} (coletados ${allMedia.length}/${targetCount})`);

    const mediaList = await fetchPage(targetKey, page);

    // Paginação correta: parar se não houver resultados (fim da lista)
    if (!mediaList || mediaList.length === 0) {
      console.log(`   ⏹ Página ${page} vazia — encerrando ${targetKey}`);
      break;
    }

    // Adicionar apenas o necessário para atingir o alvo
    const remaining = targetCount - allMedia.length;
    const newItems = mediaList.slice(0, remaining);
    allMedia.push(...newItems);
    page++;
    pageCounter++;

    // Safety: nunca loop infinito
    if (pageCounter >= maxPages) {
      console.log(`   ⚠️ Limite de páginas atingido (${maxPages})`);
      break;
    }

    // Rate limit delay entre requests
    await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
  }

  console.log(`   ✅ ${targetKey}: ${allMedia.length} títulos descobertos (alvo: ${targetCount})`);
  return allMedia;
}

// ─── Upsert batch ─────────────────────────────────────────────────────────
async function upsertBatch(mediaItems) {
  if (mediaItems.length === 0) return { upserted: 0 };

  // Deduplicar por anilist_id (manter o último)
  const seen = new Map();
  for (const item of mediaItems) {
    if (item.anilist_id) seen.set(item.anilist_id, item);
  }
  const uniqueData = Array.from(seen.values());

  const { data, error } = await supabase
    .from('media_catalog')
    .upsert(uniqueData, { onConflict: 'anilist_id', ignoreDuplicates: false })
    .select('anilist_id');

  if (error) {
    console.error(`   ❌ Upsert falhou: ${error.message}`);
    return { upserted: 0, error: error.message };
  }

  const ids = (data || []).map((d) => d.anilist_id);
  const preview = ids.slice(0, 5).join(', ');
  console.log(`   📦 Upsert: ${uniqueData.length} itens (${preview}${ids.length > 5 ? '...' : ''})`);
  return { upserted: uniqueData.length };
}

// ─── Main ─────────────────────────────────────────────────────────────────
async function enrich() {
  checkCredentials();

  console.log('🚀 Iniciando enriquecimento Manga/Manhwa/Manhua via AniList GraphQL...');
  console.log(`   Alvos: MANGA=${TARGETS.MANGA.target}, MANHWA=${TARGETS.MANHWA.target}, MANHUA=${TARGETS.MANHUA.target}`);
  console.log(`   Rate limit: ${ANILIST_RATE_LIMIT} req/min, delay ${REQUEST_DELAY_MS}ms`);
  console.log(`   Estratégia: Page.media(type: MANGA, countryOfOrigin: JP/KR/CN)`);

  // Criar log de ingestão
  const { data: logData, error: logErr } = await supabase
    .from('ingestion_logs')
    .insert({
      source: 'anilist_manga_discovery',
      status: 'running',
      records_processed: 0,
      records_inserted: 0,
      metadata: { targets: TARGETS }
    })
    .select()
    .single();

  if (logErr) {
    console.error('⚠️ Erro ao criar log (continuando sem log):', logErr.message);
  }
  const logId = logData?.id;

  let totalProcessed = 0;
  let totalUpserted = 0;
  let totalErrors = 0;

  try {
    // 1. Descoberta paginada por tipo
    const discoveryResults = {};
    for (const [targetKey] of Object.entries(TARGETS)) {
      try {
        const cfg = TARGETS[targetKey];
        const media = await discoverMedia(targetKey, cfg.target);
        discoveryResults[targetKey] = media;
        totalProcessed += media.length;
      } catch (err) {
        console.error(`❌ Erro descobreindo ${targetKey}:`, err.message);
        discoveryResults[targetKey] = [];
        totalErrors++;
      }
    }

    // 2. Transformar e upsert por tipo
    for (const [targetKey, mediaList] of Object.entries(discoveryResults)) {
      if (mediaList.length === 0) continue;

      console.log(`\n📋 Transformando ${mediaList.length} itens tipo ${targetKey}...`);

      const allTransformed = mediaList
        .map((m) => transformToMediaCatalog(m, targetKey))
        .filter(Boolean);

      // Upsert em lotes
      for (let i = 0; i < allTransformed.length; i += BATCH_SIZE) {
        const batch = allTransformed.slice(i, i + BATCH_SIZE);
        console.log(`   📦 Lote ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(allTransformed.length / BATCH_SIZE)} (${batch.length} itens)`);

        const result = await upsertBatch(batch);
        totalUpserted += result.upserted;
        if (result.error) totalErrors++;

        // Delay entre lotes
        if (i + BATCH_SIZE < allTransformed.length) {
          await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
        }
      }
    }

    // 3. Finalizar log
    if (logId) {
      await supabase
        .from('ingestion_logs')
        .update({
          status: totalErrors > 0 ? 'failed' : 'success',
          completed_at: new Date().toISOString(),
          records_processed: totalProcessed,
          records_inserted: totalUpserted,
          error_message: totalErrors > 0 ? `${totalErrors} erro(s)` : null
        })
        .eq('id', logId);
    }

    console.log('\n✅ Enriquecimento finalizado!');
    console.log(`   Processados: ${totalProcessed}`);
    console.log(`   Upsertados: ${totalUpserted}`);
    console.log(`   Erros: ${totalErrors}`);
  } catch (err) {
    console.error('❌ Erro fatal:', err);
    if (logId) {
      await supabase
        .from('ingestion_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          records_processed: totalProcessed,
          records_inserted: totalUpserted,
          error_message: err.message
        })
        .eq('id', logId);
    }
  }
}

// Executar
enrich().catch((err) => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});