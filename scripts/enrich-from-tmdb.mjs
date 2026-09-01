import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const TMDB_BASE = 'https://api.themoviedb.org/3'
const API_KEY = process.env.TMDB_API_KEY

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function tmdbFetch(path, params = {}) {
  const qs = new URLSearchParams()
  qs.set('api_key', API_KEY)
  for (const [k, v] of Object.entries(params)) qs.set(k, String(v))
  const res = await fetch(`${TMDB_BASE}${path}?${qs}`)
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${await res.text()}`)
  return res.json()
}

async function fetchAll(path, params = {}, limit = 80) {
  const results = []
  let page = 1
  let totalPages = 999
  while (true) {
    const data = await tmdbFetch(path, { ...params, page, language: 'pt-BR' })
    totalPages = data.total_pages || data.total_pages
    const items = data.results || []
    results.push(...items)
    if (page >= Math.min(totalPages, 10) || results.length >= limit) break
    page++
    await new Promise(r => setTimeout(r, 100))
  }
  return results.slice(0, limit)
}

function simpleAgeRating(m) {
  if (m.adult) return '18'
  const title = (m.title || m.name || '').toLowerCase()
  if (title.includes('18') || title.includes('adult')) return '18'
  return 'L'
}

async function enrichMovies() {
  console.log('🎬 Fetching TMDB movies...')
  const movies = await fetchAll('/movie/popular', { sort_by: 'vote_average.desc' }, 80)
  console.log(`📦 Fetched ${movies.length} movies`)

  const data = movies.map(m => ({
    tmdb_id: m.id,
    media_type: 'movie',
    title_default: m.title || m.name || `Filme ${m.id}`,
    title_english: m.title,
    title_ptbr: m.title,
    title_native: m.original_title,
    title_romaji: m.original_title,
    synopsis: '',
    cover_url: m.poster_path ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    backdrop_url: m.backdrop_path ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : null,
    release_year: m.release_date ? parseInt(m.release_date.split('-')[0]) : null,
    release_status: 'finished',
    total_episodes: 0,
    total_chapters: 0,
    total_volumes: 0,
    duration_minutes: m.runtime || 0,
    episode_duration_minutes: null,
    age_rating_br: simpleAgeRating(m),
    is_adult: m.adult || false,
    prestige_badge: 'none',
    genres: (m.genre_ids || []).map(id => `GM${id}`),
    themes: [],
    studios: [],
    user_score_global: m.vote_average ? m.vote_average / 2 : null,
    anilist_id: null,
    mal_id: null,
    kitsu_id: null,
    updated_at: new Date().toISOString()
  }))

  for (let i = 0; i < data.length; i += 50) {
    const batch = data.slice(i, i + 50)
    const { error } = await supabase.from('media_catalog').upsert(batch, { onConflict: 'tmdb_id' })
    if (error) throw error
    console.log(`  📷 Movies batch ${i/50 + 1}: ${batch.length} inserted`)
  }
  console.log('✅ Movies upserted')
}

async function enrichTv() {
  console.log('📺 Fetching TMDB TV shows...')
  const shows = await fetchAll('/tv/popular', { sort_by: 'vote_average.desc' }, 50)
  console.log(`📦 Fetched ${shows.length} shows`)

  const data = shows.map(s => ({
    tmdb_id: s.id,
    media_type: 'tv_series',
    title_default: s.name || `Série ${s.id}`,
    title_english: s.name,
    title_ptbr: s.name,
    title_native: s.original_name,
    title_romaji: s.original_name,
    synopsis: '',
    cover_url: s.poster_path ? `https://image.tmdb.org/t/p/w500${s.poster_path}` : null,
    backdrop_url: s.backdrop_path ? `https://image.tmdb.org/t/p/original${s.backdrop_path}` : null,
    release_year: s.first_air_date ? parseInt(s.first_air_date.split('-')[0]) : null,
    release_status: 'finished',
    total_episodes: s.number_of_seasons || 0,
    total_chapters: 0,
    total_volumes: 0,
    duration_minutes: s.episode_run_time && s.episode_run_time[0] ? Math.round(s.episode_run_time[0]) : 0,
    episode_duration_minutes: s.episode_run_time && s.episode_run_time[0] ? Math.round(s.episode_run_time[0]) : null,
    age_rating_br: simpleAgeRating(s),
    is_adult: s.adult || false,
    prestige_badge: 'none',
    genres: (s.genre_ids || []).map(id => `GS${id}`),
    themes: [],
    studios: [],
    user_score_global: s.vote_average ? s.vote_average / 2 : null,
    anilist_id: null,
    mal_id: null,
    kitsu_id: null,
    updated_at: new Date().toISOString()
  }))

  for (let i = 0; i < data.length; i += 30) {
    const batch = data.slice(i, i + 30)
    const { error } = await supabase.from('media_catalog').upsert(batch, { onConflict: 'tmdb_id' })
    if (error) throw error
    console.log(`  📷 TV batch ${i/30 + 1}: ${batch.length} inserted`)
  }
  console.log('✅ TV shows upserted')
}

async function main() {
  if (!API_KEY) {
    console.error('❌ TMDB_API_KEY não configurado no .env.local')
    process.exit(1)
  }
  console.log(`🚀 TMDB enrichment starting (API key: ${API_KEY.slice(0, 8)}...)`)
  await enrichMovies()
  await enrichTv()
  console.log('✅ TMDB enrichment complete')
}

main().catch(err => {
  console.error('❌ TMDB enrichment failed:', err.message)
  if (err.message.includes('RATE_LIMIT')) {
    console.error('  → Espere um pouco e tente de novo (pode ser ratelimit do TMDB)')
  }
  process.exit(1)
})
