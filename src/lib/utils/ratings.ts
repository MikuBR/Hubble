/**
 * Classificação Etária Brasileira (DJCTQ)
 *
 * @spec §3.1 - age_rating_br_enum
 * @see https://www.gov.br/mj/pt-br/assuntos/seus-direitos/classificacao-indicativa
 *
 * Cores seguem padrão internacional similar ao ESRB/PEGI, mas adaptadas:
 * - L (Livre): verde (público geral)
 * - 10: azul (crianças)
 * - 12: ciano (pré-adolescentes)
 * - 14: amarelo (adolescentes)
 * - 16: laranja (jovens adultos)
 * - 18: vermelho (adultos)
 */

import type { AgeRatingBR } from "@/types/database.types";

export interface RatingMeta {
  code: AgeRatingBR;
  label: string;
  description: string;
  colorVar: string;
  cssClass: string;
  minAge: number;
}

/**
 * Metadados completos de cada classificação etária BR.
 *
 * Mantém compatibilidade com o tipo `AgeRatingBR` do database.types.
 */
export const RATING_METADATA: Record<AgeRatingBR, RatingMeta> = {
  L: {
    code: "L",
    label: "Livre",
    description: "Conteúdo adequado para todas as idades.",
    colorVar: "var(--color-rating-L)",
    cssClass: "rating-L",
    minAge: 0,
  },
  "10": {
    code: "10",
    label: "Não recomendado para menores de 10 anos",
    description: "Conteúdo com violência leve ou temas moderados.",
    colorVar: "var(--color-rating-10)",
    cssClass: "rating-10",
    minAge: 10,
  },
  "12": {
    code: "12",
    label: "Não recomendado para menores de 12 anos",
    description:
      "Pode conter violência moderada, linguagem inapropriada ou temas sensíveis.",
    colorVar: "var(--color-rating-12)",
    cssClass: "rating-12",
    minAge: 12,
  },
  "14": {
    code: "14",
    label: "Não recomendado para menores de 14 anos",
    description:
      "Pode conter violência intensa, conteúdo sexual leve ou uso de substâncias.",
    colorVar: "var(--color-rating-14)",
    cssClass: "rating-14",
    minAge: 14,
  },
  "16": {
    code: "16",
    label: "Não recomendado para menores de 16 anos",
    description:
      "Pode conter violência extrema, conteúdo sexual moderado ou uso explícito de drogas.",
    colorVar: "var(--color-rating-16)",
    cssClass: "rating-16",
    minAge: 16,
  },
  "18": {
    code: "18",
    label: "Não recomendado para menores de 18 anos",
    description: "Conteúdo adulto: violência extrema, sexo explícito ou ambos.",
    colorVar: "var(--color-rating-18)",
    cssClass: "rating-18",
    minAge: 18,
  },
};

/**
 * Retorna os metadados de uma classificação etária.
 */
export function getRatingMeta(code: AgeRatingBR | null | undefined): RatingMeta {
  if (!code || !(code in RATING_METADATA)) {
    return RATING_METADATA.L; // Safe default
  }
  return RATING_METADATA[code];
}

/**
 * Verifica se um usuário de certa idade pode ver o conteúdo.
 */
export function canViewAge(rating: AgeRatingBR, userAge: number): boolean {
  return userAge >= getRatingMeta(rating).minAge;
}

/**
 * Lista ordenada de classificações (para filtros e selects).
 */
export const RATING_ORDER: AgeRatingBR[] = ["L", "10", "12", "14", "16", "18"];

/**
 * Distintivo de Prestígio (Prêmios)
 *
 * @spec §3.1 - prestige_badge_enum
 *
 * Mostra se a obra venceu ou foi indicada a premiações relevantes.
 * Dados populados pela tabela `awards` (admin-only).
 */

import type { PrestigeBadge } from "@/types/database.types";

export interface PrestigeMeta {
  code: PrestigeBadge;
  label: string;
  icon: string;
  cssClass: string;
}

export const PRESTIGE_METADATA: Record<PrestigeBadge, PrestigeMeta> = {
  none: {
    code: "none",
    label: "Sem distinção",
    icon: "",
    cssClass: "",
  },
  nominee: {
    code: "nominee",
    label: "Indicado a prêmio",
    icon: "🎖",
    cssClass: "prestige-nominee",
  },
  winner: {
    code: "winner",
    label: "Vencedor de prêmio",
    icon: "🏆",
    cssClass: "prestige-winner",
  },
};

export function getPrestigeMeta(
  badge: PrestigeBadge | null | undefined,
): PrestigeMeta {
  if (!badge || !(badge in PRESTIGE_METADATA)) {
    return PRESTIGE_METADATA.none;
  }
  return PRESTIGE_METADATA[badge];
}
