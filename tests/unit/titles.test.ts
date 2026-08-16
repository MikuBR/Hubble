import { describe, it, expect } from 'vitest';
import { resolveTitle, resolveSplitTitle, pickLanguagePref } from '@/lib/i18n/titles';

describe('i18n/titles', () => {
  const sampleMedia = {
    title_default: 'Attack on Titan',
    title_romaji: 'Shingeki no Kyojin',
    title_english: 'Attack on Titan',
    title_native: '進撃の巨人',
    title_ptbr: 'Ataque dos Titãs',
  };

  describe('resolveTitle', () => {
    it('returns pt-BR title when available and requested', () => {
      expect(resolveTitle(sampleMedia, 'pt-BR')).toBe('Ataque dos Titãs');
    });

    it('falls back to romaji when pt-BR not available', () => {
      const media = { ...sampleMedia, title_ptbr: null };
      expect(resolveTitle(media, 'pt-BR')).toBe('Shingeki no Kyojin');
    });

    it('falls back to english when romaji not available', () => {
      const media = { ...sampleMedia, title_ptbr: null, title_romaji: null };
      expect(resolveTitle(media, 'pt-BR')).toBe('Attack on Titan');
    });

    it('falls back to default when nothing else available', () => {
      const media = { 
        ...sampleMedia, 
        title_ptbr: null, 
        title_romaji: null, 
        title_english: null 
      };
      expect(resolveTitle(media, 'pt-BR')).toBe('Attack on Titan');
    });

    it('returns native title when requested', () => {
      expect(resolveTitle(sampleMedia, 'native')).toBe('進撃の巨人');
    });

    it('falls back chain for native: native -> romaji -> en -> default', () => {
      const media = { ...sampleMedia, title_native: null };
      expect(resolveTitle(media, 'native')).toBe('Shingeki no Kyojin');
    });

    it('returns "Sem título" for completely empty media', () => {
      const emptyMedia = {
        title_default: '',
        title_romaji: null,
        title_english: null,
        title_native: null,
        title_ptbr: null,
      };
      expect(resolveTitle(emptyMedia, 'pt-BR')).toBe('Sem título');
    });
  });

  describe('resolveSplitTitle', () => {
    it('returns native as primary and romaji as secondary when both exist', () => {
      const result = resolveSplitTitle(sampleMedia);
      expect(result.primary).toBe('進撃の巨人');
      expect(result.secondary).toBe('Shingeki no Kyojin');
    });

    it('returns native as primary and english as secondary when romaji missing', () => {
      const media = { ...sampleMedia, title_romaji: null };
      const result = resolveSplitTitle(media);
      expect(result.primary).toBe('進撃の巨人');
      expect(result.secondary).toBe('Attack on Titan');
    });

    it('returns default as primary when native missing', () => {
      const media = { ...sampleMedia, title_native: null };
      const result = resolveSplitTitle(media);
      expect(result.primary).toBe('Attack on Titan');
      expect(result.secondary).toBe('Ataque dos Titãs');
    });
  });

  describe('pickLanguagePref', () => {
    it('returns oriental preference for anime', () => {
      expect(pickLanguagePref('anime', 'pt-BR', 'romaji')).toBe('romaji');
    });

    it('returns oriental preference for manga', () => {
      expect(pickLanguagePref('manga', 'pt-BR', 'native')).toBe('native');
    });

    it('returns oriental preference for manhwa', () => {
      expect(pickLanguagePref('manhwa', 'pt-BR', 'romaji')).toBe('romaji');
    });

    it('returns occidental preference for movie', () => {
      expect(pickLanguagePref('movie', 'pt-BR', 'romaji')).toBe('pt-BR');
    });

    it('returns occidental preference for tv_series', () => {
      expect(pickLanguagePref('tv_series', 'en', 'romaji')).toBe('en');
    });

    it('falls back to en for unsupported occidental lang (es)', () => {
      expect(pickLanguagePref('movie', 'es', 'romaji')).toBe('en');
    });
  });
});