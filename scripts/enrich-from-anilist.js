/**
 * Script de Enriquecimento: offline_anime_mapping → media_catalog via AniList GraphQL
 * @spec §6.1 - Ingestão Offline-First + §3.2 media_catalog
 *
 * Este script:
 * 1. Lê mapeamentos com anilist_id de offline_anime_mapping
 * 2. Consulta AniList GraphQL (rate limit: 90 req/min)
 * 3. Faz upsert em media_catalog com metadados completos
 * 4. Processa em lotes com retry exponencial
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const { URL } = require('url');
require('dotenv').config({ path: '.env.local' });

// Config
const BATCH_SIZE = 30;          // Itens por lote de upsert (menor para não estourar rate limit)
const ANILIST_RATE_LIMIT = 60;  // req/min (conservador - abaixo do limite de 90)
const ANILIST_URL = 'https://graphql.anilist.co';
const REQUEST_DELAY_MS = Math.ceil(60000 / ANILIST_RATE_LIMIT); // ~1000ms entre requests
const MAX_RETRIES = 5;
const MAX_CONCURRENT = 1;       // APENAS 1 request por vez para garantir rate limit
const BATCH_DELAY_MS = 2000;    // Delay extra entre lotes

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GraphQL Query para buscar dados completos do anime
const ANILIST_QUERY = `
query GetMedia($id: Int) {
  Media(id: $id, type: ANIME) {
    id
    idMal
    title {
      romaji
      english
      native
    }
    synonyms
    type
    format
    status
    description
    startDate { year month day }
    endDate { year month day }
    season
    seasonYear
    episodes
    duration
    coverImage {
      extraLarge
      large
      medium
      color
    }
    bannerImage
    genres
    tags {
      name
      category
      isGeneralSpoiler
      isMediaSpoiler
      isAdult
      rank
    }
    studios {
      nodes {
        name
        isAnimationStudio
      }
      edges {
        isMain
      }
    }
    averageScore
    meanScore
    popularity
    isAdult
    countryOfOrigin
    source
    trailer {
      id
      site
      thumbnail
    }
    externalLinks {
      url
      site
      type
      language
      color
      icon
      notes
    }
    streamingEpisodes {
      title
      thumbnail
      url
      site
    }
    rankings {
      rank
      type
      format
      year
      season
      allTime
      context
    }
  }
}
`;

// Mapeamento de status AniList → release_status_enum
const STATUS_MAP = {
  'FINISHED': 'finished',
  'RELEASING': 'airing',
  'NOT_YET_RELEASED': 'upcoming',
  'CANCELLED': 'cancelled',
  'HIATUS': 'hiatus'
};

// Mapeamento de format AniList → media_type_enum
const FORMAT_MAP = {
  'TV': 'anime',
  'TV_SHORT': 'anime',
  'MOVIE': 'anime',
  'SPECIAL': 'anime',
  'OVA': 'anime',
  'ONA': 'anime',
  'MUSIC': 'anime',
  'MANGA': 'manga',
  'NOVEL': 'novel',
  'ONE_SHOT': 'manga'
};

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
        'User-Agent': 'HUBBLE/1.0 (enrichment script)'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(body);
            if (parsed.errors) {
              reject(new Error(parsed.errors.map(e => e.message).join(', ')));
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

// Retry com backoff exponencial
async function fetchWithRetry(anilistId, attempt = 1) {
  try {
    const data = await makeGraphQLRequest(ANILIST_QUERY, { id: anilistId });
    return data?.Media || null;
  } catch (err) {
    if (err.message === 'RATE_LIMIT' && attempt < MAX_RETRIES) {
      const waitMs = Math.min(1000 * Math.pow(2, attempt), 30000);
      console.log(`[RATE LIMIT] AniList ${anilistId} - aguardando ${waitMs}ms (tentativa ${attempt}/${MAX_RETRIES})`);
      await new Promise(r => setTimeout(r, waitMs));
      return fetchWithRetry(anilistId, attempt + 1);
    }
    if (attempt < MAX_RETRIES && (err.message.includes('ECONN') || err.message.includes('ETIMEDOUT') || err.message.includes('500'))) {
      const waitMs = 1000 * Math.pow(2, attempt);
      console.log(`[RETRY] AniList ${anilistId} - ${err.message} - aguardando ${waitMs}ms (tentativa ${attempt}/${MAX_RETRIES})`);
      await new Promise(r => setTimeout(r, waitMs));
      return fetchWithRetry(anilistId, attempt + 1);
    }
    throw err;
  }
}

// Converter resposta AniList para formato media_catalog
function transformToMediaCatalog(anime, mapping) {
  if (!anime) return null;

  const startYear = anime.startDate?.year;
  const endYear = anime.endDate?.year;
  
  // Extrair studios (apenas animation studios)
  const studios = anime.studios?.nodes
    ?.filter(s => s.isAnimationStudio)
    ?.map(s => s.name) || [];

  // Extrair tags relevantes (genres + themes)
  const tags = anime.tags || [];
  
  // Usar anime.genres se disponível, senão extrair de tags
  let genres = anime.genres || [];
  if (genres.length === 0) {
    genres = tags
      .filter(t => t.category === 'Genre' && !t.isAdult)
      .sort((a, b) => (b.rank || 0) - (a.rank || 0))
      .map(t => t.name);
  }
  
  const themes = tags
    .filter(t => t.category === 'Theme' && !t.isAdult)
    .sort((a, b) => (b.rank || 0) - (a.rank || 0))
    .map(t => t.name);

  // Score global (averageScore é 0-100, converter para 0-10)
  const userScoreGlobal = anime.averageScore ? (anime.averageScore / 10).toFixed(1) : null;

  // Cover image - prefer extraLarge
  const coverUrl = anime.coverImage?.extraLarge || anime.coverImage?.large || anime.coverImage?.medium;
  const backdropUrl = anime.bannerImage;

  // Synopsis - remover tags HTML
  let synopsis = anime.description || '';
  synopsis = synopsis.replace(/<[^>]*>/g, '').trim();
  if (synopsis.length > 5000) synopsis = synopsis.substring(0, 4997) + '...';

  // Determinar media_type
  const mediaType = FORMAT_MAP[anime.format] || 'anime';

  // Títulos
  const titleDefault = anime.title?.romaji || anime.title?.english || anime.title?.native || 'Sem título';
  const titleRomaji = anime.title?.romaji;
  const titleEnglish = anime.title?.english;
  const titleNative = anime.title?.native;
  const titlePtbr = anime.synonyms?.find(s => /[à-ú]/.test(s)) || null; // Heurística simples

  return {
    // IDs cruzados
    anilist_id: anime.id,
    mal_id: anime.idMal || mapping.mal_id || null,
    kitsu_id: mapping.kitsu_id || null,
    
    // Tipo
    media_type: mediaType,
    
    // Títulos
    title_default: titleDefault,
    title_romaji: titleRomaji,
    title_english: titleEnglish,
    title_native: titleNative,
    title_ptbr: titlePtbr,
    
    // Metadados
    synopsis: synopsis || null,
    cover_url: coverUrl,
    backdrop_url: backdropUrl,
    release_year: startYear || null,
    release_status: STATUS_MAP[anime.status] || 'finished',
    
    // Contagem
    total_episodes: anime.episodes || 0,
    total_chapters: 0,
    total_volumes: 0,
    duration_minutes: anime.duration || null,
    episode_duration_minutes: anime.duration || null,
    
    // Classificação
    age_rating_br: 'L', // Seria necessário mapear de tags/ratings externos
    is_adult: anime.isAdult || false,
    prestige_badge: 'none',
    
    // Tags
    genres: genres,
    themes: themes,
    studios: studios,
    
    // Score
    user_score_global: userScoreGlobal ? parseFloat(userScoreGlobal) : null,
    
    updated_at: new Date().toISOString()
  };
}

// Processar lote de anilist_ids
async function processBatch(anilistIds) {
  const results = [];
  
  // Processar com concorrência limitada
  for (let i = 0; i < anilistIds.length; i += MAX_CONCURRENT) {
    const chunk = anilistIds.slice(i, i + MAX_CONCURRENT);
    
    const promises = chunk.map(async ({ anilist_id, aodb_title, mal_id, kitsu_id }) => {
      try {
        const anime = await fetchWithRetry(anilist_id);
        if (!anime) {
          console.log(`[SKIP] AniList ${anilist_id} (${aodb_title}) - não encontrado`);
          return null;
        }
        
        const mediaData = transformToMediaCatalog(anime, { aodb_title, mal_id, kitsu_id });
        if (!mediaData) {
          console.log(`[SKIP] AniList ${anilist_id} (${aodb_title}) - transform falhou`);
          return null;
        }
        
        // Rate limit delay entre requests
        await new Promise(r => setTimeout(r, REQUEST_DELAY_MS));
        
        return mediaData;
      } catch (err) {
        console.error(`[ERROR] AniList ${anilist_id} (${aodb_title}):`, err.message);
        return null;
      }
    });
    
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults.filter(r => r !== null));
  }
  
  return results;
}

// Upsert em media_catalog
async function upsertBatch(mediaItems) {
  if (mediaItems.length === 0) return { inserted: 0, updated: 0 };
  
  // Deduplicar por anilist_id (manter o último)
  const seen = new Map();
  for (const item of mediaItems) {
    if (item.anilist_id) {
      seen.set(item.anilist_id, item);
    }
  }
  const uniqueData = Array.from(seen.values());
  
  const { data, error, count } = await supabase
    .from('media_catalog')
    .upsert(uniqueData, { 
      onConflict: 'anilist_id',
      ignoreDuplicates: false
    })
    .select('anilist_id');
  
  if (error) {
    console.error('❌ Erro no upsert media_catalog:', error.message);
    return { inserted: 0, updated: 0, error: error.message };
  }
  
  // Como não dá pra saber inserted vs updated fácil, assume count
  console.log(`📦 Upsert: ${uniqueData.length} itens (anilist_ids: ${data?.map(d => d.anilist_id).join(', ')})`);
  return { inserted: uniqueData.length, updated: 0 };
}

// Função principal
async function enrich() {
  console.log('🚀 Iniciando enriquecimento AODB → media_catalog via AniList...');
  
  // 1. Buscar mapeamentos que têm anilist_id e ainda não estão em media_catalog
  console.log('📥 Buscando mapeamentos pendentes...');
  
  const { data: mappings, error: mapError } = await supabase
    .from('offline_anime_mapping')
    .select('aodb_title, anilist_id, mal_id, kitsu_id')
    .not('anilist_id', 'is', null)
    .order('anilist_id');
  
  if (mapError) {
    console.error('❌ Erro ao buscar mapeamentos:', mapError.message);
    return;
  }
  
  console.log(`📊 Total de mapeamentos com anilist_id: ${mappings.length}`);
  
  // Verificar quais já existem em media_catalog (para log)
  const anilistIds = mappings.map(m => m.anilist_id);
  const { data: existing } = await supabase
    .from('media_catalog')
    .select('anilist_id')
    .in('anilist_id', anilistIds);
  
  const existingSet = new Set(existing?.map(e => e.anilist_id) || []);
  console.log(`✅ Já existem no catálogo: ${existingSet.size}`);
  console.log(`🔄 Processando TODOS os ${mappings.length} mapeamentos (atualização forçada)`);
  
  // Processar TODOS os mapeamentos (não apenas pendentes) para popular genres/themes
  const pending = mappings;
  
  // Log de início
  const { data: logData } = await supabase
    .from('ingestion_logs')
    .insert({ 
      source: 'anilist_enrichment', 
      status: 'running',
      records_processed: 0,
      records_inserted: 0
    })
    .select()
    .single();
  
  const logId = logData?.id;
  let totalProcessed = 0;
  let totalInserted = 0;
  let totalErrors = 0;
  
  try {
    // Processar em lotes
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      console.log(`\n📦 Lote ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(pending.length/BATCH_SIZE)} (${batch.length} itens)`);
      
      const mediaItems = await processBatch(batch);
      
      if (mediaItems.length > 0) {
        const result = await upsertBatch(mediaItems);
        totalInserted += result.inserted;
        if (result.error) totalErrors++;
      }
      
      totalProcessed += batch.length;
      
      // Delay extra entre lotes para evitar rate limit
      if (i + BATCH_SIZE < pending.length) {
        console.log(`⏳ Aguardando ${BATCH_DELAY_MS}ms antes do próximo lote...`);
        await new Promise(r => setTimeout(r, BATCH_DELAY_MS));
      }
      
      // Atualizar log a cada 5 lotes
      if ((i / BATCH_SIZE) % 5 === 0) {
        await supabase
          .from('ingestion_logs')
          .update({
            records_processed: totalProcessed,
            records_inserted: totalInserted
          })
          .eq('id', logId);
      }
      
      console.log(`📈 Progresso: ${totalProcessed}/${pending.length} | Inseridos/Atualizados: ${totalInserted} | Erros: ${totalErrors}`);
    }
    
    // Finalizar log
    await supabase
      .from('ingestion_logs')
      .update({
        status: totalErrors > 0 ? 'failed' : 'success',
        completed_at: new Date().toISOString(),
        records_processed: totalProcessed,
        records_inserted: totalInserted,
        error_message: totalErrors > 0 ? `${totalErrors} lotes com erro` : null
      })
      .eq('id', logId);
    
    console.log('\n✅ Enriquecimento finalizado!');
    console.log(`   Processados: ${totalProcessed}`);
    console.log(`   Inseridos/Atualizados: ${totalInserted}`);
    console.log(`   Erros: ${totalErrors}`);
    
  } catch (err) {
    console.error('❌ Erro fatal:', err);
    await supabase
      .from('ingestion_logs')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        records_processed: totalProcessed,
        records_inserted: totalInserted,
        error_message: err.message
      })
      .eq('id', logId);
  }
}

// Verificar credenciais e executar
if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
  enrich().catch(console.error);
} else {
  console.error('❌ Variáveis de ambiente não configuradas (SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL)');
  process.exit(1);
}