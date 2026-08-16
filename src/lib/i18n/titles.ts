/**
 * Resolvedor de Título Multi-Idioma
 *
 * @spec §5.2 - Title Resolver (Split Language)
 *
 * Estratégia de fallback gracioso:
 * 1. Preferência do usuário (ex: 'pt-BR')
 * 2. Romaji (sempre presente para anime)
 * 3. Inglês (geralmente presente para mídias ocidentais)
 * 4. Título default (canônico)
 * 5. Fallback final: "Sem título"
 *
 * Edge case: usuário com pref 'native' pode receber hangul/kanji mesmo
 * sem falar — UI deve mostrar tooltip com leitura em romaji.
 */

export type LanguagePref = "pt-BR" | "en" | "romaji" | "native";

export interface MultiLangMedia {
  title_default: string;
  title_romaji?: string | null;
  title_english?: string | null;
  title_native?: string | null;
  title_ptbr?: string | null;
}

/**
 * Resolve o título ideal para um usuário com determinada preferência.
 *
 * @example
 * resolveTitle({ title_default: 'Naruto', title_romaji: 'Naruto' }, 'native')
 * // → 'ナルト' (se title_native existir) senão fallback chain
 *
 * @example
 * resolveTitle({ title_default: 'Spirited Away' }, 'pt-BR')
 * // → 'A Viagem de Chihiro' (se title_ptbr existir) senão 'Spirited Away'
 */
export function resolveTitle(
  media: MultiLangMedia,
  userPref: LanguagePref,
): string {
  const lookup: Record<LanguagePref, string | null | undefined> = {
    "pt-BR": media.title_ptbr,
    en: media.title_english,
    romaji: media.title_romaji,
    native: media.title_native,
  };

  const preferred = lookup[userPref];

  // Fallback chain: pref → romaji → en → default → placeholder
  return (
    preferred ||
    lookup.romaji ||
    lookup.en ||
    media.title_default ||
    "Sem título"
  );
}

/**
 * Versão "split" para contextos onde você quer mostrar ambos
 * (ex: header com romaji pequeno + nativo grande).
 */
export function resolveSplitTitle(media: MultiLangMedia): {
  primary: string;
  secondary: string | null;
} {
  // Se tem nativo e romaji, mostra nativo como primary e romaji como secondary
  if (media.title_native && media.title_romaji) {
    return {
      primary: media.title_native,
      secondary: media.title_romaji,
    };
  }

  // Se tem só nativo, primary = nativo, secondary = english (se houver)
  if (media.title_native) {
    return {
      primary: media.title_native,
      secondary: media.title_english ?? null,
    };
  }

  // Default = primary, pt-BR ou english como secondary
  return {
    primary: media.title_default,
    secondary: media.title_ptbr ?? media.title_english ?? null,
  };
}

/**
 * Helper para escolher a preferência de idioma baseada no tipo de mídia.
 * - Para anime/manga/manhwa: usa preferred_language_oriental
 * - Para movie/tv_series/book/game: usa preferred_language_western
 */
export function pickLanguagePref(
  mediaType: "anime" | "manga" | "manhwa" | "manhua" | "novel" | string,
  westernPref: "pt-BR" | "en" | "es",
  orientalPref: LanguagePref,
): LanguagePref {
  const orientalTypes = ["anime", "manga", "manhwa", "manhua", "novel"];
  if (orientalTypes.includes(mediaType)) {
    return orientalPref;
  }
  // Map western prefs para o tipo aceito (es → en fallback)
  if (westernPref === "es") return "en";
  return westernPref as LanguagePref;
}
