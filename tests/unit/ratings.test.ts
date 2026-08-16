import { describe, it, expect } from 'vitest';
import { getRatingMeta, canViewAge, RATING_ORDER, getPrestigeMeta, PRESTIGE_METADATA } from '@/lib/utils/ratings';
import type { AgeRatingBR, PrestigeBadge } from '@/types/database.types';

describe('utils/ratings', () => {
  describe('getRatingMeta', () => {
    it('returns correct meta for each rating', () => {
      expect(getRatingMeta('L').label).toBe('Livre');
      expect(getRatingMeta('10').label).toBe('Não recomendado para menores de 10 anos');
      expect(getRatingMeta('12').label).toBe('Não recomendado para menores de 12 anos');
      expect(getRatingMeta('14').label).toBe('Não recomendado para menores de 14 anos');
      expect(getRatingMeta('16').label).toBe('Não recomendado para menores de 16 anos');
      expect(getRatingMeta('18').label).toBe('Não recomendado para menores de 18 anos');
    });

    it('returns correct color class for each rating', () => {
      expect(getRatingMeta('L').cssClass).toBe('rating-L');
      expect(getRatingMeta('10').cssClass).toBe('rating-10');
      expect(getRatingMeta('12').cssClass).toBe('rating-12');
      expect(getRatingMeta('14').cssClass).toBe('rating-14');
      expect(getRatingMeta('16').cssClass).toBe('rating-16');
      expect(getRatingMeta('18').cssClass).toBe('rating-18');
    });

    it('returns L as safe default for null/undefined/invalid', () => {
      expect(getRatingMeta(null).code).toBe('L');
      expect(getRatingMeta(undefined).code).toBe('L');
      expect(getRatingMeta('invalid' as AgeRatingBR).code).toBe('L');
    });

    it('has correct minAge for each rating', () => {
      expect(getRatingMeta('L').minAge).toBe(0);
      expect(getRatingMeta('10').minAge).toBe(10);
      expect(getRatingMeta('12').minAge).toBe(12);
      expect(getRatingMeta('14').minAge).toBe(14);
      expect(getRatingMeta('16').minAge).toBe(16);
      expect(getRatingMeta('18').minAge).toBe(18);
    });
  });

  describe('canViewAge', () => {
    it('allows viewing when age >= minAge', () => {
      expect(canViewAge('L', 5)).toBe(true);
      expect(canViewAge('10', 10)).toBe(true);
      expect(canViewAge('12', 15)).toBe(true);
      expect(canViewAge('14', 14)).toBe(true);
      expect(canViewAge('16', 18)).toBe(true);
      expect(canViewAge('18', 20)).toBe(true);
    });

    it('blocks viewing when age < minAge', () => {
      expect(canViewAge('10', 9)).toBe(false);
      expect(canViewAge('12', 11)).toBe(false);
      expect(canViewAge('14', 13)).toBe(false);
      expect(canViewAge('16', 15)).toBe(false);
      expect(canViewAge('18', 17)).toBe(false);
    });

    it('always allows L rating', () => {
      expect(canViewAge('L', 0)).toBe(true);
      expect(canViewAge('L', 5)).toBe(true);
    });
  });

  describe('RATING_ORDER', () => {
    it('has correct order from least to most restrictive', () => {
      expect(RATING_ORDER).toEqual(['L', '10', '12', '14', '16', '18']);
    });
  });

  describe('getPrestigeMeta', () => {
    it('returns correct meta for winner', () => {
      const meta = getPrestigeMeta('winner');
      expect(meta.label).toBe('Vencedor de prêmio');
      expect(meta.icon).toBe('🏆');
      expect(meta.cssClass).toBe('prestige-winner');
    });

    it('returns correct meta for nominee', () => {
      const meta = getPrestigeMeta('nominee');
      expect(meta.label).toBe('Indicado a prêmio');
      expect(meta.icon).toBe('🎖');
      expect(meta.cssClass).toBe('prestige-nominee');
    });

    it('returns none meta for none/null/undefined/invalid', () => {
      expect(getPrestigeMeta('none').label).toBe('Sem distinção');
      expect(getPrestigeMeta(null).label).toBe('Sem distinção');
      expect(getPrestigeMeta(undefined).label).toBe('Sem distinção');
      expect(getPrestigeMeta('invalid' as PrestigeBadge).label).toBe('Sem distinção');
    });
  });

  describe('PRESTIGE_METADATA completeness', () => {
    it('has entries for all badge types', () => {
      expect(PRESTIGE_METADATA.none).toBeDefined();
      expect(PRESTIGE_METADATA.nominee).toBeDefined();
      expect(PRESTIGE_METADATA.winner).toBeDefined();
    });

    it('winner has higher visual priority than nominee', () => {
      expect(PRESTIGE_METADATA.winner.cssClass).toContain('prestige-winner');
      expect(PRESTIGE_METADATA.nominee.cssClass).toContain('prestige-nominee');
    });
  });
});