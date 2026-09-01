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
  const qs = new URLSearchParams({ api_key: API_KEY, ...params })
  const res = await fetch(`${TMDB_BASE}${path}?${qs}`)
  if (!res.ok) throw new Error(`TMDB ${res.status}`)
  return res.json()
}

async function fetchAll(path, params = {}, limit = 50) {
  const results = []
  let page = 1
  while (true) {
    const data = await tmdbFetch(path, { ...params, page, language: 'pt-BR', include_adult: false, with_watchability: 'Watchable' })
    const items = data.results || []
    results.push(...items)
    if (!data.total_pages || page >= Math.min(data.total_pages, 20)) break
    page++
    if (results.length >= limit) break
  }
  return results.slice(0, limit)
}

function transformMovie(m, existingTags = {}) {
  const existing = existingTags[m.id] || {}
  const genres = (m.genre_ids || []).map(id => {
    const name = existing.movies?.[id]?.name || `GM${id}`
    return name
  })
  const hasBackdrop = m.backdrop_path
  const hasPoster = m.poster_path
  const ageRating = existing.rating?.content_rating?.includes('18') ? '18' : existing.rating?.content_rating?.includes('16') ? '16' : 'L'

  return {
    tmdb_id: m.id,
    media_type: 'movie',
    title_default: m.title || m.name || `Filme ${m.id}`,
    title_english: m.title,
    title_ptbr: m.title,
    title_native: m.original_title,
    title_romaji: m.original_title,
    synopsis: '',
    cover_url: hasPoster ? `https://image.tmdb.org/t/p/w500${m.poster_path}` : null,
    backdrop_url: hasBackdrop ? `https://image.tmdb.org/t/p/original${m.backdrop_path}` : null,
    release_year: m.release_date ? parseInt(m.release_date?.split('-')[0]) : null,
    release_status: 'finished',
    total_episodes: null,
    total_chapters: null,
    total_volumes: null,
    duration_minutes: m.runtime,
    episode_duration_minutes: null,
    age_rating_br: ageRating,
    is_adult: false,
    prestige_badge: 'none',
    genres,
    themes: [],
    studios: [],
    user_score_global: null,
    anilist_id: null,
    mal_id: null,
    kitsu_id: null,
    updated_at: new Date().toISOString()
  }
}

async function enrichMovies() {
  console.log('🎬 Fetching TMDB movies...')
  const movies = await fetchAll('/movie/popular', { sort_by: 'vote_average.desc' }, 200)
  console.log(`📦 Fetched ${movies.length} movies`)

  const data = movies.map(m => transformMovie(m))
  const { error } = await supabase.from('media_catalog').upsert(data, { onConflict: 'tmdb_id' })
  if (error) throw error
  console.log('✅ Movies upserted')
}

async function enrichTv() {
  console.log('📺 Fetching TMDB TV shows...')
  const shows = await fetchAll('/tv/popular', { sort_by: 'vote_average.desc' }, 150)
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
    release_year: s.first_air_date ? parseInt(s.first_air_date?.split('-')[0]) : null,
    release_status: 'finished',
    total_episodes: s.number_of_seasons,
    total_chapters: null,
    total_volumes: null,
    duration_minutes: s.episode_run_time ? Math.round(s.episode_run_time[0] || 0) : null,
    episode_duration_minutes: s.episode_run_time ? Math.round(s.episode_run_time[0] || 0) : null,
    age_rating_br: 'L',
    is_adult: false,
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

  const { error } = await supabase.from('media_catalog').upsert(data, { onConflict: 'tmdb_id' })
  if (error) throw error
  console.log('✅ TV shows upserted')
}

async function main() {
  if (!API_KEY) {
    console.error('❌ TMDB_API_KEY não configurado no .env.local')
    process.exit(1)
  }
  console.log(`🚀 TMDB enrichment starting (API key: ${API_KEY?.substring(0, 8)}...)`)
  await enrichMovies()
  await enrichTv()
  console.log('✅ TMDB enrichment complete')
}

main().catch(err => {
  console.error('❌ TMDB enrichment failed:', err.message)
  process.exit(1)
})
