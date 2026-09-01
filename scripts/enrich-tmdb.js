#!/usr/bin/env node
/*
 * scripts/enrich-tmdb.js  (ESM, .mjs-compatible)
 *
 * Popula media_catalog com filmes e séries do TMDB:
 *   - /discover/movie  &  /discover/tv  (sort_by=vote_average.desc, pageado, cap 200 cada)
 *   - /movie/{id}      &  /tv/{id}      (detalhes por ID: gêneros com nomes, estúdios, sinopse)
 *   - Upsert em media_catalog via onConflict(tmdb_id)
 *   - Registra o job em ingestion_logs
 *
 * Uso:
 *   node scripts/enrich-tmdb.js          (padrão)
 *   node scripts/enrich-tmdb.js --skip-detail   (somente discover, sem /movie/{id})
 *   node scripts/enrich-tmdb.js --limit 50    (50 filmes + 50 séries)
 *   node scripts/enrich-tmdb.js --dry-run       (loga, não upsert)
 *
 * Env: TMDB_API_KEY  (deve estar em .env.local carregado via dotenv)
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

// ─── boot ────────────────────────────────────────────────────────────────────
dotenv.config({ path: '.env.local' })

const TMDB_BASE = 'https://api.themoviedb.org/3'
const API_KEY = process.env.TMDB_API_KEY

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase NÃO configurado: faltando NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// ─── CLI flags ───────────────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2))
const DRY_RUN = args.has('--dry-run')
const SKIP_DETAIL = args.has('--skip-detail')
const LIMIT_ARG = args.has('--limit')
const LIMIT = LIMIT_ARG ? Math.max(1, Math.min(200, parseInt(process.argv[process.argv.indexOf('--limit') + 1] || '200', 10))) : 200

const DEFAULTS = {
  PER_PAGE: 20,
  MAX_PER_TYPE: LIMIT,
  RATE_MS: 500,        // 0.5s entre requests (TMDB permite 40/10s = 250ms, usamos margem)
  UPSERT_BATCH: 50,
  DETAIL_BATCH: 25,     // requests de detail em série para ser seguro
  MAX_DETAIL_RETRIES: 2
}

// ─── utilidades ──────────────────────────────────────────────────────────────
let requestCounter = 0
let discoverCount = 0
let detailCount = 0
let upsertCount = 0
let errorCount = 0

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function log(msg) {
  const t = new Date().toISOString().slice(11, 19)
  console.log(`[${t}] ${msg}`)
}

function logErr(msg) {
  console.error(`[ERR] ${msg}`)
  errorCount++
}

// ─── TMDB HTTP ───────────────────────────────────────────────────────────────
async function tmdbFetch(path, params = {}) {
  const qs = new URLSearchParams()
  qs.set('api_key', API_KEY)
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) qs.set(k, String(v))
  }
  const url = `${TMDB_BASE}${path}?${qs}`
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' }
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`TMDB ${res.status} ${path}: ${body.slice(0, 200)}`)
  }
  return res.json()
}

/** Request com backoff entre chamadas e retry em caso de 429/5xx. */
async function tmdbFetchSafe(path, params = {}) {
  await sleep(DEFAULTS.RATE_MS)
  for (let attempt = 0; attempt <= DEFAULTS.MAX_DETAIL_RETRIES; attempt++) {
    try {
      requestCounter++
      const data = await tmdbFetch(path, params)
      if (requestCounter % 20 === 0) {
        log(`📡 ${requestCounter} requests feitos (discover: ${discoverCount}, detail: ${detailCount})`)
      }
      return data
    } catch (err) {
      if (attempt < DEFAULTS.MAX_DETAIL_RETRIES && /429|5\d\d|ECONN|ETIMEDOUT/.test(err.message)) {
        const backoff = 1000 * (attempt + 1)
        logErr(`retry ${attempt + 1}/${DEFAULTS.MAX_DETAIL_RETRIES} — ${err.message.slice(0, 120)}`)
        await sleep(backoff)
        continue
      }
      throw err
    }
  }
}

// ─── pagination ──────────────────────────────────────────────────────────────
async function fetchDiscover(endpoint, maxItems) {
  const out = []
  let page = 1
  let totalPages = 999

  while (out.length < maxItems) {
    const params = {
      page,
      sort_by: 'vote_average.desc',
      language: 'pt-BR'
    }
    const data = await tmdbFetchSafe(`/discover/${endpoint}`, params)
    totalPages = data.total_pages || 1
    const items = data.results || []
    out.push(...items)
    discoverCount += 1
    if (items.length === 0 || page >= totalPages) break
    page++
    if (out.length >= maxItems) break
  }
  return out.slice(0, maxItems)
}

// ─── mapeamento detail → media_catalog ───────────────────────────────────────
function mapMovie(detail, baseFromDiscover) {
  const genreNames = (detail.genres || []).map(g => g.name).filter(Boolean)
  const studioNames = (detail.production_companies || []).map(s => s.name).filter(Boolean)
    .concat((detail.production_countries || []).map(c => c.iso_3166_code).filter(Boolean))

  // Pontuação: TMDB vota 0-10 → user_score_global 0-10 (numérico(3,1))
  const score = detail.vote_average != null ? Math.round((detail.vote_average / 10) * 100) / 10 : null

  const adult = !!detail.adult

  return {
    tmdb_id: detail.id,
    media_type: 'movie',
    title_default: baseFromDiscover.title || detail.title || `Filme ${detail.id}`,
    title_english: detail.title || baseFromDiscover.title || null,
    title_ptbr: baseFromDiscover.title || detail.title || null,
    title_native: detail.original_title || null,
    title_romaji: null,
    synopsis: detail.overview || null,
    cover_url: detail.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : null,
    backdrop_url: detail.backdrop_path ? `https://image.tmdb.org/t/p/original${detail.backdrop_path}` : null,
    release_year: detail.release_date ? parseInt(detail.release_date.split('-')[0], 10) : null,
    release_status: mapMovieStatus(detail),
    duration_minutes: detail.runtime || null,
    age_rating_br: adult ? '18' : 'L',
    is_adult: adult,
    prestige_badge: 'none',
    genres: genreNames.length > 0 ? genreNames : (baseFromDiscover.genre_ids || []).map(id => `GM${id}`),
    themes: [],
    studios: studioNames,
    user_score_global: score,
    total_episodes: 0,
    total_chapters: 0,
    total_volumes: 0,
    episode_duration_minutes: null,
    anilist_id: null,
    mal_id: null,
    kitsu_id: null,
    updated_at: new Date().toISOString()
  }
}

function mapMovieStatus(detail) {
  if (detail.status === 'Released') return 'finished'
  if (detail.status === 'Post Production') return 'upcoming'
  if (detail.status === 'In Production') return 'upcoming'
  return 'finished'
}

function mapTv(detail, baseFromDiscover) {
  const genreNames = (detail.genres || []).map(g => g.name).filter(Boolean)
  const studioNames = (detail.networks || []).map(n => n.name).filter(Boolean)
    .concat((detail.production_companies || []).map(s => s.name).filter(Boolean))
    .concat((detail.production_countries || []).map(c => c.iso_3166_code).filter(Boolean))

  const score = detail.vote_average != null ? Math.round((detail.vote_average / 10) * 100) / 10 : null
  const adult = !!detail.adult

  // Épocas (seasons) e episódios
  const totalEpisodes = detail.number_of_episodes || 0
  const totalSeasons = detail.number_of_seasons || 0
  const avgRuntime = detail.episode_run_time && detail.episode_run_time.length > 0
    ? Math.round(detail.episode_run_time[0])
    : null

  return {
    tmdb_id: detail.id,
    media_type: 'tv_series',
    title_default: baseFromDiscover.name || detail.name || `Série ${detail.id}`,
    title_english: detail.name || baseFromDiscover.name || null,
    title_ptbr: baseFromDiscover.name || detail.name || null,
    title_native: detail.original_name || null,
    title_romaji: null,
    synopsis: detail.overview || null,
    cover_url: detail.poster_path ? `https://image.tmdb.org/t/p/w500${detail.poster_path}` : null,
    backdrop_url: detail.backdrop_path ? `https://image.tmdb.org/t/p/original${detail.backdrop_path}` : null,
    release_year: detail.first_air_date ? parseInt(detail.first_air_date.split('-')[0], 10) : null,
    release_status: mapTvStatus(detail),
    duration_minutes: null,        // séries não têm duração total como filme
    age_rating_br: adult ? '18' : 'L',
    is_adult: adult,
    prestige_badge: 'none',
    genres: genreNames.length > 0 ? genreNames : (baseFromDiscover.genre_ids || []).map(id => `GS${id}`),
    themes: [],
    studios: [...new Set(studioNames)],
    user_score_global: score,
    total_episodes: totalEpisodes,
    total_chapters: 0,
    total_volumes: totalSeasons,
    episode_duration_minutes: avgRuntime,
    anilist_id: null,
    mal_id: null,
    kitsu_id: null,
    updated_at: new Date().toISOString()
  }
}

function mapTvStatus(detail) {
  const s = detail.status
  if (s === 'Returning Series' || s === 'In Production') return 'airing'
  if (s === 'Canceled') return 'cancelled'
  if (s === 'Ended') return 'finished'
  return 'finished'
}

// ─── ingestion log ───────────────────────────────────────────────────────────
async function initIngestionLog() {
  const startedAt = new Date().toISOString()
  const { data, error } = await supabase
    .from('ingestion_logs')
    .insert({
      source: 'tmdb',
      started_at: startedAt,
      status: 'running',
      records_processed: 0,
      records_inserted: 0,
      records_updated: 0
    })
    .select()
    .single()
  if (error) {
    logErr(`ingestion_logs insert failed: ${error.message}`)
    return null
  }
  return data
}

async function finishIngestionLog(logId, status, records, inserted, updated, error) {
  if (!logId) return
  const { error: updErr } = await supabase
    .from('ingestion_logs')
    .update({
      completed_at: new Date().toISOString(),
      status,
      records_processed: records,
      records_inserted: inserted,
      records_updated: updated,
      error_message: error ? error.slice(0, 2000) : null
    })
    .eq('id', logId)
  if (updErr) logErr(`ingestion_logs update failed: ${updErr.message}`)
}

// ─── core enrichment ─────────────────────────────────────────────────────────
async function enrichMedia(type, mediaType) {
  const endpoint = type === 'movie' ? 'movie' : 'tv'
  const mapFn = type === 'movie' ? mapMovie : mapTv
  log(`🎬 ${type === 'movie' ? 'Filmes' : 'Séries'} — descoberta de até ${DEFAULTS.MAX_PER_TYPE} registros...`)

  const discovered = await fetchDiscover(endpoint, DEFAULTS.MAX_PER_TYPE)
  log(`📦 Descobriu ${discovered.length} ${type === 'movie' ? 'filmes' : 'séries'}`)
  let records = []
  let inserted = 0
  let updated = 0

  if (!SKIP_DETAIL && discovered.length > 0) {
    log(`🔍 Buscando detalhes por ID para ${discovered.length} registros...`)
  }

  for (let i = 0; i < discovered.length; i++) {
    const base = discovered[i]
    let detail = base
    if (!SKIP_DETAIL) {
      try {
        detail = await tmdbFetchSafe(`/${endpoint}/${base.id}`, { language: 'pt-BR' })
        detailCount += 1
      } catch (err) {
        logErr(`${type}/${base.id}: detail falhou (${err.message.slice(0, 80)}), usando dados do discover`)
        detail = base
      }
    }
    records.push(mapFn(detail, base))
    if ((i + 1) % 20 === 0) log(`  detalhado ${i + 1}/${discovered.length}`)
  }

  // Upsert em batches
  for (let i = 0; i < records.length; i += DEFAULTS.UPSERT_BATCH) {
    const batch = records.slice(i, i + DEFAULTS.UPSERT_BATCH)
    const { data: batchData, error } = await supabase
      .from('media_catalog')
      .upsert(batch, { onConflict: 'tmdb_id' })

    if (error) {
      logErr(`batch ${i / DEFAULTS.UPSERT_BATCH + 1} falhou: ${error.message}`)
      throw error
    }
    const n = batchData ? batchData.length : batch.length
    upsertCount += n
    inserted += n
    log(`  💾 ${type} batch ${(i / DEFAULTS.UPSERT_BATCH) + 1}: ${n} registros upsertados`)
  }

  log(`✅ ${type === 'movie' ? 'Filmes' : 'Séries'} concluídos — ${records.length} registros processados`)
  return { records: records.length, inserted, updated }
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
  if (!API_KEY) {
    console.error('❌ TMDB_API_KEY NÃO configurado no .env.local')
    console.error('   → Crie uma chave em https://www.themoviedb.org/settings/api e defina TMDB_API_KEY=.env.local')
    process.exit(1)
  }

  log(`🚀 Hubble TMDB Enrich — mode=${DRY_RUN ? 'DRY-RUN' : 'live'} skip_detail=${SKIP_DETAIL} limit=${DEFAULTS.MAX_PER_TYPE}`)
  log(`   API key: ${API_KEY.slice(0, 8)}...${API_KEY.slice(-4)}  |  Supabase: ${SUPABASE_URL}`)

  const logId = await initIngestionLog()
  const t0 = Date.now()

  try {
    const movieRes = await enrichMedia('movie', 'movie')
    const tvRes = await enrichMedia('tv', 'tv_series')

    const total = movieRes.records + tvRes.records
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    log(`🎉 Enrichment completo em ${elapsed}s — ${total} registros, ${requestCounter} requests TMDB, ${errorCount} erros`)
    await finishIngestionLog(logId, 'success', total, upsertCount, 0)
  } catch (err) {
    logErr(`Enrichment interrompido: ${err.message}`)
    await finishIngestionLog(logId, 'failed', requestCounter, 0, 0, err.message)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('❌ Fatal:', err.message)
  process.exit(1)
})