import { describe, it, expect } from 'vitest';
import { extractMappings, normalizeReleaseStatus, mapMediaType } from '@/lib/utils/aodb-parse';

describe('utils/aodb-parse', () => {
  describe('extractMappings', () => {
    it('extracts anilist_id correctly', () => {
      const sources = ['https://anilist.co/anime/21'];
      const result = extractMappings(sources);
      expect(result.anilist_id).toBe(21);
    });

    it('extracts mal_id correctly', () => {
      const sources = ['https://myanimelist.net/anime/21'];
      const result = extractMappings(sources);
      expect(result.mal_id).toBe(21);
    });

    it('extracts kitsu_id correctly with kitsu.app (FIXED)', () => {
      const sources = ['https://kitsu.app/anime/21'];
      const result = extractMappings(sources);
      expect(result.kitsu_id).toBe(21);
    });

    it('does NOT extract kitsu_id from kitsu.io (old broken URL)', () => {
      const sources = ['https://kitsu.io/anime/21'];
      const result = extractMappings(sources);
      expect(result.kitsu_id).toBeNull();
    });

    it('extracts anidb_id correctly', () => {
      const sources = ['https://anidb.net/anime/21'];
      const result = extractMappings(sources);
      expect(result.anidb_id).toBe(21);
    });

    it('handles multiple sources in one call', () => {
      const sources = [
        'https://anilist.co/anime/123',
        'https://myanimelist.net/anime/456',
        'https://kitsu.app/anime/789',
        'https://anidb.net/anime/999',
      ];
      const result = extractMappings(sources);
      expect(result.anilist_id).toBe(123);
      expect(result.mal_id).toBe(456);
      expect(result.kitsu_id).toBe(789);
      expect(result.anidb_id).toBe(999);
    });

    it('ignores unknown sources', () => {
      const sources = ['https://unknown.site/anime/123'];
      const result = extractMappings(sources);
      expect(result.anilist_id).toBeNull();
      expect(result.mal_id).toBeNull();
      expect(result.kitsu_id).toBeNull();
      expect(result.anidb_id).toBeNull();
    });

    it('handles empty array', () => {
      const result = extractMappings([]);
      expect(result.anilist_id).toBeNull();
      expect(result.mal_id).toBeNull();
      expect(result.kitsu_id).toBeNull();
      expect(result.anidb_id).toBeNull();
    });

    it('handles malformed URLs gracefully', () => {
      const sources = ['https://anilist.co/anime/not-a-number'];
      const result = extractMappings(sources);
      expect(result.anilist_id).toBeNull();
    });
  });

  describe('normalizeReleaseStatus', () => {
    it('maps finished_airing to finished', () => {
      expect(normalizeReleaseStatus('finished_airing')).toBe('finished');
    });

    it('maps currently_airing to airing', () => {
      expect(normalizeReleaseStatus('currently_airing')).toBe('airing');
    });

    it('maps not_yet_aired to upcoming', () => {
      expect(normalizeReleaseStatus('not_yet_aired')).toBe('upcoming');
    });

    it('maps cancelled to cancelled', () => {
      expect(normalizeReleaseStatus('cancelled')).toBe('cancelled');
    });

    it('maps on_hiatus to hiatus', () => {
      expect(normalizeReleaseStatus('on_hiatus')).toBe('hiatus');
    });

    it('defaults to finished for unknown status', () => {
      expect(normalizeReleaseStatus('unknown_status')).toBe('finished');
      expect(normalizeReleaseStatus('')).toBe('finished');
    });
  });

  describe('mapMediaType', () => {
    it('maps TV to anime', () => {
      expect(mapMediaType('TV')).toBe('anime');
    });

    it('maps TV_short to anime', () => {
      expect(mapMediaType('TV_short')).toBe('anime');
    });

    it('maps OVA to anime', () => {
      expect(mapMediaType('OVA')).toBe('anime');
    });

    it('maps ONA to anime', () => {
      expect(mapMediaType('ONA')).toBe('anime');
    });

    it('maps movie to movie', () => {
      expect(mapMediaType('movie')).toBe('movie');
    });

    it('maps special to anime', () => {
      expect(mapMediaType('special')).toBe('anime');
    });

    it('maps music to anime', () => {
      expect(mapMediaType('music')).toBe('anime');
    });

    it('defaults to anime for unknown type', () => {
      expect(mapMediaType('unknown')).toBe('anime');
      expect(mapMediaType('')).toBe('anime');
    });
  });
});