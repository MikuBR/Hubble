#!/usr/bin/env node
'use strict';
/**
 * scripts/seed-demo.cjs
 * ═══════════════════════════════════════════════════════════════════════════
 * #24 — Seed de DEMONSTRAÇÃO para o HUBBLE.
 *
 * Seleciona as obras mais populares de `media_catalog` (ordenadas por
 * `user_score_global`) e gera, para UM usuário demo, dados plausíveis de:
 *   - user_media_progress  (status, current_unit, user_score, rewatch, datas)
 *   - private_insights / private_spoilers (Markdown)
 *   - user_tag_preferences (gêneros, temas, estúdios — agregados)
 *
 * Escrita via SUPABASE_SERVICE_ROLE_KEY (bypassa RLS). Nenhum endpoint HTTP
 * é criado — este é um script de CLI executado manualmente.
 *
 * Uso:
 *   node scripts/seed-demo.cjs                     # modo normal (escreve no banco)
 *   node scripts/seed-demo.cjs --dry-run           # só imprime o que faria
 *   node scripts/seed-demo.cjs --limit 50          # 50 obras em vez de 100
 *   node scripts/seed-demo.cjs --user <uuid>       # usuário demo (padrão: tester_hubble)
 *   node scripts/seed-demo.cjs --seed 42           # RNG determinístico
 *   node scripts/seed-demo.cjs --self-test         # testa funções puras (sem banco)
 *
 * Env (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * REPRODUZIBILIDADE: o RNG é semeado por hash(id da obra) ^ --seed, então
 * rodar duas vezes com o mesmo --seed gera exatamente os mesmos dados.
 *
 * AVISO DE IDEMPOTÊNCIA: user_media_progress tem UNIQUE(user_id, media_id) e
 * user_tag_preferences tem PK(user_id, tag_type, tag_name), ambos inseridos
 * via upsert. Re-executar NÃO duplica progresso, mas as preferências de tag
 * SOMAM em DUPLO (upsert manual: ON CONFLICT DO UPDATE score = score + delta
 * E trigger recompute_tag_preferences: soma EXCLUDED.score). Para zerar,
 * use o botão de reset documentado em docs/SETTING_RESET_BUTTON_LOC.md.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const fs = require('fs');
const path = require('path');

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTES DE ESQUEMA (lidas das migrations em supabase/migrations/*.sql)
// ═══════════════════════════════════════════════════════════════════════════

// user_media_progress.user_score NUMERIC(3,1) CHECK (>= 0 AND <= 10)
const SCORE_MIN = 0.0;
const SCORE_MAX = 10.0;

// user_tag_preferences.score INT CHECK (>= -50 AND <= 100)
const TAG_SCORE_MIN = -50;
const TAG_SCORE_MAX = 100;

// user_tag_preferences.tag_type CHECK (tag_type IN ('genre','theme','studio'))
const TAG_TYPES = ['genre', 'theme', 'studio'];

// user_status_enum (migration 001): NÃO existe 'reading' — enum real:
//   planning, watching, paused, completed, dropped, rewatching
const STATUSES = ['planning', 'watching', 'paused', 'completed', 'dropped', 'rewatching'];

// Tipos de leitura (usam current_unit como capítulo/volume) vs streaming (episódio).
const READING_TYPES = ['manga', 'manhwa', 'manhua', 'novel', 'book'];
const STREAMING_TYPES = ['movie', 'tv_series', 'anime'];

// release_status seguros para inserção de progresso.
// Exclui 'hiatus' porque o trigger block_hiatus_progress levanta exceção quando
// um UPDATE aumenta current_unit numa obra em hiatus — e upsert em registro
// pré-existente é um UPDATE. Também exclui 'upcoming'/'orphaned' (sem conteúdo).
const SAFE_RELEASE_STATUSES = ['finished', 'airing', 'cancelled'];

// Usuário de teste criado na migration 20260816000004 (username 'tester_hubble').
const DEFAULT_DEMO_USER_ID = '11111111-1111-1111-1111-111111111111';

const DEFAULT_LIMIT = 100;
const DEFAULT_SEED = 20260908;
const BATCH_SIZE = 50; // evita URI longa no PostgREST

// ═══════════════════════════════════════════════════════════════════════════
// ENV / CLIENTE
// ═══════════════════════════════════════════════════════════════════════════

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  const values = {};
  if (!fs.existsSync(envPath)) return values;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    values[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return values;
}

const ENV = loadEnv();
const SUPABASE_URL = ENV.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY;

function createSupabase() {
  // require tardio: permite rodar --self-test e --dry-run offline sem rede.
  const { createClient } = require('@supabase/supabase-js');
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// RNG determinístico (mulberry32 + hash FNV-1a)
// ═══════════════════════════════════════════════════════════════════════════

function hashSeed(str) {
  let h = 0x811c9dc5 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(key, baseSeed) {
  return mulberry32(hashSeed(String(key)) ^ (baseSeed >>> 0));
}

const round1 = (n) => Math.round(n * 10) / 10;
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// ═══════════════════════════════════════════════════════════════════════════
// UNIDADES DE PROGRESSO (semântica de current_unit varia por media_type)
// ═══════════════════════════════════════════════════════════════════════════

function unitsMeta(work) {
  if (READING_TYPES.includes(work.media_type)) {
    if (work.total_chapters > 0) return { kind: 'chapter', total: work.total_chapters, label: 'capítulo' };
    if (work.total_volumes > 0) return { kind: 'volume', total: work.total_volumes, label: 'volume' };
    return { kind: 'chapter', total: 12, label: 'capítulo' };
  }
  if (work.media_type === 'movie' || work.media_type === 'game') {
    return { kind: 'title', total: 1, label: 'título' };
  }
  if (STREAMING_TYPES.includes(work.media_type)) {
    if (work.total_episodes > 0) return { kind: 'episode', total: work.total_episodes, label: 'episódio' };
    return { kind: 'episode', total: 12, label: 'episódio' };
  }
  return { kind: 'chapter', total: 12, label: 'item' };
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÃO 1 — pickTopWorks(limit)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Seleciona as `limit` obras mais populares de media_catalog.
 *
 * Ordernação: user_score_global DESC NULLS LAST, com desempate por id ASC
 * (o score NUMERIC(3,1) tem muitos ties; sem desempate o resultado muda a
 * cada execução e o seed fica não reprodutível).
 *
 * Filtros deliberados (todos motivados pelo schema — ver docs):
 *   - user_score_global NOT NULL → só obras rankeáveis
 *   - is_adult = FALSE           → demo pública, sem conteúdo 18+
 *   - release_status IN (finished, airing, cancelled)
 *       → exclui 'hiatus' (o trigger block_hiatus_progress levanta exceção
 *         em UPDATE que aumente current_unit, o que quebraria o upsert),
 *         'upcoming' e 'orphaned' (sem progresso significativo possível).
 *
 * @param {number} limit
 * @param {{seed?: number, dryRun?: boolean}} [opts]
 * @returns {Promise<Array<object>>}
 */
async function pickTopWorks(limit, opts = {}) {
  const dryRun = !!opts.dryRun;
  const sb = createSupabase();

  const { data, error } = await sb
    .from('media_catalog')
    .select('*')
    .not('user_score_global', 'is', null)
    .eq('is_adult', false)
    .in('release_status', SAFE_RELEASE_STATUSES)
    .order('user_score_global', { ascending: false, nullsFirst: false })
    .order('id', { ascending: true })
    .limit(limit);

  if (error) {
    if (dryRun) {
      console.warn('⚠️  --dry-run: select em media_catalog falhou (%s)', error.message);
      console.warn('⚠️  Usando amostra OFFLINE embutida (10 obras sintéticas) para demonstrar o formato.');
      return buildOfflineSampleWorks();
    }
    throw new Error(`pickTopWorks falhou: ${error.message}`);
  }

  if (!data || data.length === 0) {
    if (dryRun) return buildOfflineSampleWorks();
    throw new Error(
      'pickTopWorks: media_catalog vazio (ou todos sem user_score_global). ' +
        'Rode antes os ingestores: scripts/enrich-tmdb.js e scripts/enrich-from-anilist.js'
    );
  }

  const minScore = round1(Math.min(...data.map(d => Number(d.user_score_global))));
  console.log(`📊 Selecionadas ${data.length}/${limit} obras (score global mín. ${minScore})`);
  return data;
}

/** Amostra offline — usada SOMENTE em --dry-run quando o banco está inacessível. */
function buildOfflineSampleWorks() {
  return [
    { id: 'aaaa0000-0000-0000-0000-000000000001', media_type: 'anime', title_default: 'Attack on Titan', title_ptbr: 'Ataque aos Titãs', user_score_global: 8.7, genres: ['Action', 'Drama', 'Fantasy'], themes: ['Post-apocalyptic', 'War'], studios: ['Wit Studio', 'MAPPA'], total_episodes: 87, total_chapters: 0, total_volumes: 0, release_status: 'finished', release_year: 2013 },
    { id: 'aaaa0000-0000-0000-0000-000000000002', media_type: 'movie', title_default: 'The Shawshank Redemption', title_ptbr: 'A Força do Destino', user_score_global: 8.9, genres: ['Drama', 'Crime'], themes: ['Prison', 'Hope'], studios: ['Castle Rock Entertainment'], total_episodes: 0, total_chapters: 0, total_volumes: 0, release_status: 'finished', release_year: 1994 },
    { id: 'aaaa0000-0000-0000-0000-000000000003', media_type: 'tv_series', title_default: 'Breaking Bad', title_ptbr: 'Breaking Bad', user_score_global: 8.9, genres: ['Drama', 'Crime', 'Thriller'], themes: ['Transformation', 'Revenge'], studios: ['Sony Pictures Television'], total_episodes: 62, total_chapters: 0, total_volumes: 5, release_status: 'finished', release_year: 2008 },
    { id: 'aaaa0000-0000-0000-0000-000000000004', media_type: 'manga', title_default: 'One Piece', title_ptbr: 'One Piece', user_score_global: 8.4, genres: ['Action', 'Adventure', 'Comedy'], themes: ['Pirates', 'Friendship'], studios: ['Shueisha'], total_episodes: 0, total_chapters: 1100, total_volumes: 110, release_status: 'airing', release_year: 1997 },
    { id: 'aaaa0000-0000-0000-0000-000000000005', media_type: 'anime', title_default: 'Fullmetal Alchemist: Brotherhood', title_ptbr: null, user_score_global: 8.9, genres: ['Action', 'Adventure', 'Fantasy'], themes: ['Brothers', 'Alchemy'], studios: ['Bones'], total_episodes: 64, total_chapters: 0, total_volumes: 0, release_status: 'finished', release_year: 2009 },
    { id: 'aaaa0000-0000-0000-0000-000000000006', media_type: 'movie', title_default: 'Spirited Away', title_ptbr: 'A Viagem de Chihiro', user_score_global: 8.6, genres: ['Animation', 'Fantasy', 'Adventure'], themes: ['Coming of age', 'Mysticism'], studios: ['Studio Ghibli'], total_episodes: 0, total_chapters: 0, total_volumes: 0, release_status: 'finished', release_year: 2001 },
    { id: 'aaaa0000-0000-0000-0000-000000000007', media_type: 'manga', title_default: 'Berserk', title_ptbr: 'Berserk', user_score_global: 8.6, genres: ['Action', 'Drama', 'Horror'], themes: ['Dark fantasy', 'Tragedy'], studios: ['Hakusensha'], total_episodes: 0, total_chapters: 378, total_volumes: 42, release_status: 'hiatus', release_year: 1989 },
    { id: 'aaaa0000-0000-0000-0000-000000000008', media_type: 'tv_series', title_default: 'Stranger Things', title_ptbr: 'Stranger Things', user_score_global: 8.6, genres: ['Drama', 'Horror', 'Mystery'], themes: ['Supernatural', '1980s'], studios: ['Shuffle Productions'], total_episodes: 42, total_chapters: 0, total_volumes: 4, release_status: 'airing', release_year: 2016 },
    { id: 'aaaa0000-0000-0000-0000-000000000009', media_type: 'manhwa', title_default: 'Solo Leveling', title_ptbr: null, user_score_global: 8.3, genres: ['Action', 'Fantasy', 'Adventure'], themes: ['System', 'Power fantasy'], studios: ['Kakao Page'], total_episodes: 0, total_chapters: 179, total_volumes: 15, release_status: 'airing', release_year: 2018 },
    { id: 'aaaa0000-0000-0000-0000-000000000010', media_type: 'anime', title_default: 'Death Note', title_ptbr: null, user_score_global: 8.4, genres: ['Thriller', 'Mystery', 'Supernatural'], themes: ['Judgment', 'Mind games'], studios: ['Madhouse'], total_episodes: 37, total_chapters: 0, total_volumes: 0, release_status: 'finished', release_year: 2006 },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÃO 2 — generateMockInsights(work, title)
// ═══════════════════════════════════════════════════════════════════════════

const INSIGHT_TEMPLATES = [
  (t, genre, unitLabel) => `## ${t}\n\n**Por que me marcou:** a progressão de ${genre.toLowerCase()} me prendeu. A partir do ${unitLabel} 3 em diante cada arco ganhou peso emocional — difícil não reassistir.\n\n**Cena favorita:** a virada do segundo ato. A montagem muda o tom inteiro.\n\n**O que eu quero em próximas escolhas:**\n- mais arcos longos\n- vilões com motivação coerente`,
  (t, genre) => `## ${t}\n\nMídia **curta e cirúrgica**. Não enrola — o primeiro ato já estabelece a voz narrativa.\n\n### Pontos fortes\n- ritmo (${genre.toLowerCase()} bem dosado)\n- elenco, do começo ao fim\n\n### Ressalva\nGiro final previsível. Ainda assim, vale pela execução.`,
  (t, studio) => `## ${t}\n\n**Studio:** ${studio}. O padrão de qualidade do estúdio se mantém aqui — direção de fotografia consistente.\n\n**Nota pessoal:** terminei e imediatamente fui pro catálogo procurar mais do mesmo autor/diretor.`,
  (t, genre, unitLabel) => `## ${t}\n\nLi/assisti em ritmo espaçado, uns ${unitLabel}s por sessão. Mídia que recompensa pausa: cada ${unitLabel} fecha como mini-arco.\n\n**Vou relembrar** antes de recomendar pra alguém — quero lembrar o tom exato.`,
  (t, genre) => `## ${t}\n\n**Classificação:** essential na categoria ${genre.toLowerCase()}.\n\nO mundo é denso, mas nunca sufocante. A regra do universo é apresentada cedo e respeitada até o fim — raro.\n\n**Para evitar spoiler, registro aqui:** a revelação central muda a leitura dos dois primeiros arcos. Anotar quando puder conversar about.`.replace('about.', 'sobre.'),
];

const SPOILER_TEMPLATES = [
  (t) => `> ⚠️ SPOILER TOTAL\n\nA identidade revelada no final do último ato recontextualiza tudo desde o ato 1. Não leio isso antes de recomendar pra ninguém.\n\n**${t}** — recomendar **sem spoilers** pra iniciantes; detalhar só com quem chegou perto do fim.`,
  (t) => `> ⚠️ SPOILER PARCIAL (meio da obra)\n\nA traição do aliado recorrente no terço final. Depois disso a obra deixa de ser leve e vira estudo de perda.\n\nDecidi que só marco spoilers **após o terço final**.`,
  (t) => `> ⚠️ SPOILER DE ELENCO\n\nO personagem considerado coadjuvante no início é, na verdade, o motor da trama inteira. A revelação vem tarde — propositalmente.\n\n${t ? 'Vale reassistir sabendo.' : ''}`.trim(),
];

/**
 * Gera os dois campos Markdown privados de user_media_progress.
 *
 * - `private_insights`: diário pessoal (nunca exibido publicamente).
 * - `private_spoilers`: só preenchido quando status final + score curto/baixo.
 *
 * Segurança: as strings são Markdown puro, sem HTML. O frontend renderiza com
 * react-markdown + rehype-sanitize (ver src/shared/ui/InsightsEditor.tsx),
 * então `<script>`/`onerror=` nunca executam. Ainda assim NÃO emitimos HTML
 * tag nenhuma aqui — só Markdown de blocos/texto.
 *
 * @param {object} work registro de media_catalog
 * @param {string} title título de exibição (fallback p/ heading)
 * @param {{seed?: number, score?: number|null, status?: string}} [opts]
 */
function generateMockInsights(work, title, opts = {}) {
  const rng = makeRng(work.id + ':insights', opts.seed ?? 0);
  const safeTitle = (title || work.title_default || 'Sem título').replace(/#/g, '#');
  const meta = unitsMeta(work);
  const genre = (work.genres || [])[0] || 'aventura';
  const studio = (work.studios || [])[0] || 'Indie';

  const t1 = INSIGHT_TEMPLATES[Math.floor(rng() * INSIGHT_TEMPLATES.length)];
  const insights = t1(safeTitle, genre, meta.label);

  const scored = typeof opts.score === 'number';
  const hasSpoiler = opts.status === 'completed'
    || opts.status === 'rewatching'
    || (scored && opts.score <= 6)
    || opts.status === 'dropped';

  let spoilers = '';
  if (hasSpoiler) {
    const s = SPOILER_TEMPLATES[Math.floor(rng() * SPOILER_TEMPLATES.length)];
    spoilers = s(safeTitle);
  }
  return { private_insights: insights, private_spoilers: spoilers };
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÃO 3 — generateMockProgress(work)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gera uma linha de user_media_progress plausível para uma obra.
 *
 * Restrições de schema respeitadas:
 *   - status ∈ user_status_enum (sem 'reading' — não existe no enum!)
 *   - user_score: NUMERIC(3,1), CHECK 0..10, arredondada para 1 casa
 *   - current_unit ≥ 0 e ≤ total (nunca estoura o total da obra)
 *   - current_unit 0 quando status = 'planning'
 *   - completed_at preenchido SOMENTE quando status ∈ (completed, rewatching)
 *
 * Determinismo: TODAS as datas derivam do RNG (sem Date.now()), então
 * mesmo (work, seed) ⇒ mesma saída. O único ponto temporal é meia-noite UTC
 * de hoje, idêntico em toda chamada no mesmo dia.
 *
 * @param {object} work registro de media_catalog
 * @param {{seed?: number}} [opts]
 * @returns {object} valores prontos para INSERT (sem user_id)
 */
function generateMockProgress(work, opts = {}) {
  const rng = makeRng(work.id, opts.seed ?? 0);
  const meta = unitsMeta(work);
  const globalScore = work.user_score_global != null ? Number(work.user_score_global) : 8.0;

  // Distribuição de status ponderada: 62% completed, 18% watching, 12% planning,
  // 4% paused, 3% dropped, 1% rewatching.
  const r = rng();
  let status;
  if (r < 0.62) status = 'completed';
  else if (r < 0.80) status = 'watching';
  else if (r < 0.92) status = 'planning';
  else if (r < 0.96) status = 'paused';
  else if (r < 0.99) status = 'dropped';
  else status = 'rewatching';

  // Score pessoal: âncora no score global + ruído. Mantém-se dentro de [0,10].
  const noise = (rng() - 0.5) * 2.4;
  const userScore = round1(clamp(globalScore + noise, SCORE_MIN, SCORE_MAX));
  const scored = status === 'completed' || status === 'rewatching' || (status === 'dropped' && rng() < 0.5);
  const score = scored ? userScore : null;

  let currentUnit = 0;
  let totalUnitsAtCompletion = null;
  if (status === 'completed' || status === 'rewatching') {
    currentUnit = meta.total;
    totalUnitsAtCompletion = meta.total;
  } else if (status === 'watching') {
    currentUnit = Math.max(1, Math.floor(meta.total * (0.1 + rng() * 0.75)));
  } else if (status === 'dropped') {
    currentUnit = Math.max(1, Math.floor(meta.total * (0.05 + rng() * 0.6)));
  } else if (status === 'paused') {
    currentUnit = Math.max(0, Math.floor(meta.total * rng() * 0.8));
  }
  currentUnit = clamp(currentUnit, 0, Math.max(0, meta.total));

  // Datas — todas derivadas do RNG (sem Date.now()).
  //   started_at          = hoje − daysAgo            (28..730 dias)
  //   completed_at        = started_at + offset       (offset ∈ [1, daysAgo]
  //                       → garante completed_at >= started_at em todo dia)
  //   last_interaction_at = hoje − (0..44 dias + hora aleatória)
  const dayMs = 86400000;
  const todayMs = Date.parse(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  const isoDate = (ms) => new Date(ms).toISOString().slice(0, 10);

  const daysAgo = 28 + Math.floor(rng() * 703);
  const completionOffset = 1 + Math.floor(rng() * daysAgo);
  const lastInteraction = rng() * 45 * dayMs + Math.floor(rng() * dayMs);

  const startedAt = isoDate(todayMs - daysAgo * dayMs);
  const completedAt = (status === 'completed' || status === 'rewatching')
    ? isoDate(todayMs - (daysAgo - completionOffset) * dayMs)
    : null;
  const lastInteractionAt = new Date(todayMs - lastInteraction).toISOString();

  const insights = generateMockInsights(work, work.title_ptbr || work.title_default, {
    seed: opts.seed, score, status,
  });

  return {
    status,
    current_unit: currentUnit,
    total_units_at_completion: totalUnitsAtCompletion,
    user_score: score,
    rewatch_count: status === 'rewatching' ? 1 + Math.floor(rng() * 2) : 0,
    started_at: startedAt,
    completed_at: completedAt,
    last_interaction_at: lastInteractionAt,
    private_insights: insights.private_insights,
    private_spoilers: insights.private_spoilers,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÃO 4 — generateMockTagPreferences(work)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gera preferências de tag brutas (uma linha por tag) derivadas da obra.
 *
 * Pesos base (mesma filosofia do trigger update_tag_preferences, mas menores —
 * o trigger soma 10/-5 por gênero de obra COMPLETA; aqui usamos ±3/±1 para que
 * 100 obras ainda respeitem o CHECK score ∈ [-50, 100]):
 *   genre  base ±3 | theme base ±2 | studio base ±1
 *
 * ⚠️ Retorno NÃO agregado: chame aggregateTagPreferences() antes de inserir,
 * pois user_tag_preferences tem PK(user_id, tag_type, tag_name) e o INSERT
 * em lote com tags duplicadas (o mesmo gênero em 30 obras) falharia.
 *
 * @param {object} work registro de media_catalog
 * @param {{seed?: number, score?: number}} [opts] score usada p/ sinal da afinidade
 */
function generateMockTagPreferences(work, opts = {}) {
  const rng = makeRng(work.id + ':tags', opts.seed ?? 0);
  const score = typeof opts.score === 'number' ? opts.score : Number(work.user_score_global) || 8.0;
  const likes = score >= 7.5;
  const dislikes = score <= 5.0;
  const out = [];

  const push = (tagType, arr, base) => {
    for (const name of arr || []) {
      if (!name || typeof name !== 'string') continue;
      if (!TAG_TYPES.includes(tagType)) continue;
      const sign = likes ? 1 : dislikes ? -1 : (rng() < 0.7 ? 1 : 0);
      if (sign === 0) continue;
      const jitter = Math.round((rng() - 0.5) * 2);
      out.push({ tag_type: tagType, tag_name: name, score: sign * base + jitter });
    }
  };

  push('genre', work.genres, 3);
  push('theme', work.themes, 2);
  push('studio', work.studios, 1);
  return out;
}

/**
 * Agrega linhas de tag brutas por (tag_type, tag_name), somando os deltas e
 * prendendo dentro de CHECK (score >= -50 AND score <= 100).
 *
 * @param {Array<{tag_type: string, tag_name: string, score: number}>} rows
 * @returns {Array<{tag_type: string, tag_name: string, score: number}>}
 */
function aggregateTagPreferences(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = `${r.tag_type}\u0001${r.tag_name}`;
    const cur = map.get(key);
    if (cur) cur.score += r.score;
    else map.set(key, { tag_type: r.tag_type, tag_name: r.tag_name, score: r.score });
  }
  const out = [];
  for (const v of map.values()) {
    v.score = clamp(Math.round(v.score), TAG_SCORE_MIN, TAG_SCORE_MAX);
    out.push(v);
  }
  return out.sort((a, b) => b.score - a.score || a.tag_name.localeCompare(b.tag_name));
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNÇÃO 5 — insertDemoData(userId, works)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Insere progresso + preferências de tag para `userId` nas `works` dadas.
 *
 * @param {string} userId UUID que JÁ deve existir em profiles (FK ON DELETE CASCADE)
 * @param {Array<object>} works registros de media_catalog
 * @param {{seed?: number, dryRun?: boolean}} [opts]
 * @returns {Promise<{dryRun?: boolean, progress: Array, tags: Array}>}
 */
async function insertDemoData(userId, works, opts = {}) {
  const dryRun = !!opts.dryRun;
  const sb = createSupabase();
  const progress = [];
  const allTagRows = [];

  for (const work of works) {
    const prog = generateMockProgress(work, { seed: opts.seed });
    progress.push({ user_id: userId, media_id: work.id, ...prog });
    allTagRows.push(...generateMockTagPreferences(work, { seed: opts.seed, score: prog.user_score ?? undefined }));
  }

  const tags = aggregateTagPreferences(allTagRows);

  if (dryRun) return { dryRun: true, progress, tags };

  // ── progresso ────────────────────────────────────────────────────────────
  for (let i = 0; i < progress.length; i += BATCH_SIZE) {
    const batch = progress.slice(i, i + BATCH_SIZE);
    const { error } = await sb
      .from('user_media_progress')
      .upsert(batch, { onConflict: 'user_id,media_id' });
    if (error) throw new Error(`user_media_progress batch ${i / BATCH_SIZE + 1} falhou: ${error.message}`);
  }

  // ── preferências de tag ───────────────────────────────────────────────────
  for (let i = 0; i < tags.length; i += BATCH_SIZE) {
    const batch = tags.slice(i, i + BATCH_SIZE).map(t => ({ ...t, user_id: userId }));
    const { error } = await sb
      .from('user_tag_preferences')
      .upsert(batch, { onConflict: 'user_id,tag_type,tag_name' });
    if (error) throw new Error(`user_tag_preferences batch ${i / BATCH_SIZE + 1} falhou: ${error.message}`);
  }

  return { progress, tags };
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDITORIA (ingestion_logs) — mesmo padrão de scripts/enrich-*.js
// ═══════════════════════════════════════════════════════════════════════════

async function openIngestionLog(sb) {
  const { data, error } = await sb
    .from('ingestion_logs')
    .insert({ source: 'seed-demo', status: 'running', records_processed: 0, records_inserted: 0, records_updated: 0 })
    .select()
    .single();
  if (error) {
    console.warn('⚠️  ingestion_logs indisponível (%s) — seguindo sem auditoria', error.message.slice(0, 120));
    return null;
  }
  return data;
}

async function closeIngestionLog(sb, logId, status, processed, inserted, updated, error) {
  if (!logId) return;
  const { error: e } = await sb
    .from('ingestion_logs')
    .update({
      completed_at: new Date().toISOString(),
      status,
      records_processed: processed,
      records_inserted: inserted,
      records_updated: updated,
      error_message: error ? String(error).slice(0, 2000) : null,
    })
    .eq('id', logId);
  if (e) console.warn('⚠️  fechamento de ingestion_logs falhou: %s', e.message.slice(0, 120));
}

// ═══════════════════════════════════════════════════════════════════════════
// VERIFICAÇÃO DE PRÉ-REQUISITO: o usuário demo precisa existir em profiles
// ═══════════════════════════════════════════════════════════════════════════

/**
 * profiles.id REFERENCES auth.users(id) — não dá para criar o usuário via
 * supabase-js service_role (auth.users não tem política de escrita para
 * service_role no schema padrão). Então: verificar e orientar.
 */
async function verifyDemoUser(sb, userId) {
  const { data: profile, error } = await sb
    .from('profiles')
    .select('id,username,display_name')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error(
        [
          `❌ Usuário demo ${userId} NÃO existe em profiles.`,
          '   profiles.id é FK de auth.users — crie o usuário no Studio (Authentication → Users → Add user)',
          '   ou rode a migration 20260816000004_fix_signup_and_test_user.sql no Studio SQL Editor',
          '   e deixe o trigger on_auth_user_created criar o profile.',
        ].join('\n')
      );
    }
    throw new Error(`verifyDemoUser: ${error.message}`);
  }
  return profile;
}

// ═══════════════════════════════════════════════════════════════════════════
// SELF-TEST (offline, sem banco — valida funções puras contra as restrições)
// ═══════════════════════════════════════════════════════════════════════════

async function selfTest() {
  const works = buildOfflineSampleWorks();
  let failures = 0;
  const check = (name, cond, extra = '') => {
    console.log(`${cond ? '✅' : '❌'} ${name}${extra ? ` — ${extra}` : ''}`);
    if (!cond) failures++;
  };

  for (const w of works) {
    const p = generateMockProgress(w, { seed: 1 });
    check('status ∈ enum', STATUSES.includes(p.status), p.status);
    check('user_score null ou 0..10', p.user_score === null || (p.user_score >= SCORE_MIN && p.user_score <= SCORE_MAX), String(p.user_score));
    check('1 casa decimal', p.user_score === null || Math.round(p.user_score * 10) / 10 === p.user_score, String(p.user_score));
    check('current_unit >= 0', p.current_unit >= 0);
    const total = unitsMeta(w).total;
    check('current_unit <= total', p.current_unit <= total, `${p.current_unit}/${total}`);
    check('completed => current_unit == total', p.status !== 'completed' || p.current_unit === total);
    check('completed => completed_at set', p.status !== 'completed' || !!p.completed_at);
    check('completed_at >= started_at', !p.completed_at || p.completed_at >= p.started_at);
    check('planning => current_unit 0', p.status !== 'planning' || p.current_unit === 0);
    check('rewatch_count coerente', (p.status === 'rewatching' ? p.rewatch_count > 0 : p.rewatch_count === 0));
    check('insights não vazio', p.private_insights.length > 40);
    check('insights sem HTML tag', !/<\s*\/?(script|img|iframe|a)\b/i.test(p.private_insights + p.private_spoilers));
  }

  // Agregação de tags respeita CHECK [-50, 100] mesmo somando todas as obras.
  let rows = [];
  for (const w of works) {
    const p = generateMockProgress(w, { seed: 1 });
    rows.push(...generateMockTagPreferences(w, { seed: 1, score: p.user_score ?? undefined }));
  }
  const agg = aggregateTagPreferences(rows);
  check('agregação preserva faixa [-50,100]', agg.every(t => t.score >= TAG_SCORE_MIN && t.score <= TAG_SCORE_MAX),
    `máx=${Math.max(...agg.map(t => t.score))} mín=${Math.min(...agg.map(t => t.score))}`);
  check('agregação não duplica (type,name)', new Set(agg.map(t => t.tag_type + '\u0001' + t.tag_name)).size === agg.length);
  check('tag_type válido', agg.every(t => TAG_TYPES.includes(t.tag_type)));
  check('tags geradas', agg.length > 0, `${agg.length} tags únicas`);

  // Reprodutibilidade: mesmo seed => mesmo output.
  const w = works[0];
  const a = JSON.stringify(generateMockProgress(w, { seed: 7 }));
  const b = JSON.stringify(generateMockProgress(w, { seed: 7 }));
  const c = JSON.stringify(generateMockProgress(w, { seed: 8 }));
  check('mesmo seed => idêntico', a === b);
  check('seed diferente => diferente', a !== c);

  // insertDemoData em dry-run não toca rede.
  const { dryRun, progress, tags } = await insertDemoData('11111111-1111-1111-1111-111111111111', works, { seed: 1, dryRun: true });
  check('insertDemoData dry-run não escreve', dryRun === true);
  check('insertDemoData gera 1 progresso/obra', progress.length === works.length);
  check('insertDemoData agrega tags únicas', tags.length < rows.length && tags.length > 0);

  console.log(failures === 0 ? '\n🎉 Self-test OK' : `\n💥 ${failures} falha(s)`);
  process.exit(failures === 0 ? 0 : 1);
}

// ═══════════════════════════════════════════════════════════════════════════
// CLI
// ═══════════════════════════════════════════════════════════════════════════

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

async function main() {
  const args = process.argv.slice(2);
  const DRY_RUN = args.includes('--dry-run');
  const LIMIT = Math.max(1, Math.min(500, parseInt(argValue('--limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));
  const USER_ID = argValue('--user') || DEFAULT_DEMO_USER_ID;
  const SEED = parseInt(argValue('--seed') || String(DEFAULT_SEED), 10);

  console.log('─'.repeat(64));
  console.log('HUBBLE — seed-demo (#24)');
  console.log(`  modo      : ${DRY_RUN ? 'DRY-RUN (nada será escrito)' : 'LIVE (escreverá no banco)'}`);
  console.log(`  limit     : ${LIMIT} obras`);
  console.log(`  user      : ${USER_ID}`);
  console.log(`  seed      : ${SEED}`);
  console.log(`  supabase  : ${SUPABASE_URL ? SUPABASE_URL : '(AUSENTE)'}`);
  console.log('─'.repeat(64));

  const works = await pickTopWorks(LIMIT, { seed: SEED, dryRun: DRY_RUN });
  const { progress, tags } = await insertDemoData(USER_ID, works, { seed: SEED, dryRun: DRY_RUN });

  if (DRY_RUN) {
    console.log(`\n🔎 DRY-RUN — resumo do que SERIA escrito para ${USER_ID}:`);
    console.log(`   • user_media_progress : ${progress.length} linhas`);
    console.log(`   • user_tag_preferences: ${tags.length} linhas únicas (agregadas)`);
    const counts = {};
    for (const p of progress) counts[p.status] = (counts[p.status] || 0) + 1;
    console.log(`   • status: ${JSON.stringify(counts)}`);
    const scored = progress.filter(p => p.user_score != null);
    if (scored.length) {
      const avg = scored.reduce((s, p) => s + p.user_score, 0) / scored.length;
      console.log(`   • score médio: ${round1(avg)} (${scored.length} avaliadas)`);
    }
    console.log('\n   Amostras (5 primeiras linhas de progresso):');
    for (const p of progress.slice(0, 5)) {
      const w = works.find(x => x.id === p.media_id);
      console.log(`     - ${w.title_default} | ${p.status} | unit ${p.current_unit} | score ${p.user_score ?? '—'} | insights ${p.private_insights.length} chars`);
    }
    console.log('\n   Top 10 preferências de tag (agregadas):');
    for (const t of tags.slice(0, 10)) console.log(`     - ${t.tag_type}/${t.tag_name}: ${t.score > 0 ? '+' : ''}${t.score}`);
    console.log('\n✅ Dry-run concluído — NENHUM dado escrito.');
    return;
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('SUPABASE_URL/SUPABASE_KEY ausentes no .env.local — rode com --dry-run para visualizar');
  }

  // ── LIVE: inserção real no banco ──────────────────────────────────────────
  const sb = createSupabase();
  const profile = await verifyDemoUser(sb, USER_ID);
  console.log(`👤 Perfil verificado: ${profile.username} (${profile.display_name || profile.username})`);

  const logId = await openIngestionLog(sb);
  const t0 = Date.now();
  try {
    const works = await pickTopWorks(LIMIT, { seed: SEED, dryRun: DRY_RUN });
    const { progress, tags } = await insertDemoData(USER_ID, works, { seed: SEED, dryRun: DRY_RUN });

    await closeIngestionLog(sb, logId, 'success', works.length, progress.length, tags.length, 0, null);
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n🎉 Seed concluído em ${elapsed}s — ${progress.length} progressos, ${tags.length} tags para ${USER_ID}`);
    console.log('   Verifique: /dashboard (biblioteca), aba Preferências, e a função RPC get_user_stats.');
  } catch (err) {
    await closeIngestionLog(sb, logId, 'failed', works?.length ?? 0, 0, 0, err.message);
    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTAÇÕES (testáveis isoladamente)
// ═══════════════════════════════════════════════════════════════════════════

module.exports = {
  pickTopWorks,
  generateMockProgress,
  generateMockInsights,
  generateMockTagPreferences,
  aggregateTagPreferences,
  insertDemoData,
  unitsMeta,
  verifyDemoUser,
  hashSeed,
  mulberry32,
  makeRng,
  buildOfflineSampleWorks,
  SCHEMA_CONSTANTS: { SCORE_MIN, SCORE_MAX, TAG_SCORE_MIN, TAG_SCORE_MAX, TAG_TYPES, STATUSES, SAFE_RELEASE_STATUSES, DEFAULT_DEMO_USER_ID },
};

if (require.main === module) {
  if (process.argv.includes('--self-test')) selfTest();
  else main().catch(err => { console.error(`\n❌ ${err.message}`); process.exit(1); });
}
