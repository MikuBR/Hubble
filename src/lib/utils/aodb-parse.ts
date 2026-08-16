/**
 * AODB Parse Helper - Testable extraction logic
 * Extracted from scripts/ingest-aodb.js for unit testing
 */

/**
 * Extract cross-reference IDs from AODB sources array
 * @param sources - Array of source URLs from AODB entry
 * @returns Object with extracted IDs
 */
export function extractMappings(sources: string[]): {
  anilist_id: number | null;
  mal_id: number | null;
  kitsu_id: number | null;
  anidb_id: number | null;
} {
  const result = {
    anilist_id: null as number | null,
    mal_id: null as number | null,
    kitsu_id: null as number | null,
    anidb_id: null as number | null,
  };

  sources.forEach(src => {
    if (src.includes('anilist.co/anime/')) {
      const id = src.split('/').pop();
      if (id && !isNaN(Number(id))) {
        result.anilist_id = Number(id);
      }
    } else if (src.includes('myanimelist.net/anime/')) {
      const id = src.split('/').pop();
      if (id && !isNaN(Number(id))) {
        result.mal_id = Number(id);
      }
    } else if (src.includes('kitsu.app/anime/')) {
      // FIXED: kitsu.app NOT kitsu.io
      const id = src.split('/').pop();
      if (id && !isNaN(Number(id))) {
        result.kitsu_id = Number(id);
      }
    } else if (src.includes('anidb.net/anime/')) {
      const id = src.split('/').pop();
      if (id && !isNaN(Number(id))) {
        result.anidb_id = Number(id);
      }
    }
  });

  return result;
}

/**
 * Normalize AODB status to our release_status_enum
 * @param aodbStatus - Status from AODB (e.g., 'finished_airing', 'currently_airing')
 * @returns Normalized release_status
 */
export function normalizeReleaseStatus(aodbStatus: string): 'airing' | 'finished' | 'hiatus' | 'cancelled' | 'upcoming' | 'orphaned' {
  const statusMap: Record<string, 'airing' | 'finished' | 'hiatus' | 'cancelled' | 'upcoming' | 'orphaned'> = {
    'finished_airing': 'finished',
    'currently_airing': 'airing',
    'not_yet_aired': 'upcoming',
    'cancelled': 'cancelled',
    'on_hiatus': 'hiatus',
  };
  return statusMap[aodbStatus] || 'finished';
}

/**
 * Map AODB type to our media_type_enum
 * @param aodbType - Type from AODB (e.g., 'TV', 'movie', 'OVA')
 * @returns Mapped media type
 */
export function mapMediaType(aodbType: string): 'movie' | 'tv_series' | 'anime' {
  const typeMap: Record<string, 'movie' | 'tv_series' | 'anime'> = {
    'TV': 'anime',
    'TV_short': 'anime',
    'OVA': 'anime',
    'ONA': 'anime',
    'movie': 'movie',
    'special': 'anime',
    'music': 'anime',
  };
  return typeMap[aodbType] || 'anime';
}