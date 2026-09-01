/**
 * Script de Enriquecimento: media_titles_i18n ← media_catalog
 * @spec §3.2 media_catalog + §3.5 i18n
 *
 * Populariza media_titles_i18n a partir dos títulos já armazenados em cada
 * registro de media_catalog (title_default, title_english, title_ptbr,
 * title_native, title_romaji). Se anilist_id existir e ANILIST_CLIENT_ID/SECRET
 * estiver configurado, consulta o AniList GraphQL para buscar synonyms e
 * as insere como language 'synonym'.
 *
 * Regras:
 * - Upsert por (media_id, language) para evitar duplicação em re-execuções.
 * - Pula campos NULL ou em branco — nunca insere uma linha sem título.
 * - Sem ANILIST_* o script funciona normalmente (mode offline).
 * - Log em ingestion_logs (source='titles_i18n_enrichment').
 * - Contagem final de títulos inseridos/upsertados.
 *
 * Nota sobre synonyms: a PK de media_titles_i18n é (media_id, language) —
 * não há um índice extra sobre o valor title. Portanto, todos os synonyms
 * de uma mesma mídia vão parar em uma única linha com language='synonym',
 * concatenados separados por "; ". Isso preserva a constraint PK e mantém
 * o índice idx_media_titles_lang funcional.
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const { URL } = require('url');
require('dotenv').config({ path: '.env.local' });

// ─── Config ───────────────────────────────────────────────────────────────
const PAGE_SIZE = 500;            // cursor pagination (range por offset)
const BATCH_UPSERT = 100;
const ANILIST_RATE_LIMIT = 60;    // req/min
const REQUEST_DELAY_MS = Math.ceil(60000 / ANILIST_RATE_LIMIT); // ~1000ms
const ANILIST_URL = 'https://graphql.anilist.co';
const MAX_RETRIES = 5;

// Mapeamento: campo title_* → language a ser inserido em media_titles_i18n
const TITLE_FIELDS = [
  ['title_default', 'default'],
  ['title_english', 'en'],
  ['title_ptbr', 'pt-BR'],
  ['title_native', 'native'],
  ['title_romaji', 'romaji'],
];

// ─── GraphQL Query (só synonyms) ─────────────────────────────────────────
const SYNONYMS_QUERY = `
query GetMediaSynonyms($id: Int) {
  Media(id: $id) {
    id
    synonyms
  }
}
`;

// ─── Supabase ─────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ─── Utilitários ──────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ─── Cliente AniList (GraphQL) ────────────────────────────────────────────
function makeGraphQLRequest(query, variables) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });
    const parsed = new URL(ANILIST_URL);

    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Content-Length': Buffer.byteLength(data),
      'User-Agent': 'HUBBLE/1.0 (titles_i18n enrichment)'
    };
    if (process.env.ANILIST_CLIENT_ID) {
      headers['X-Anilist-Client-ID'] = process.env.ANILIST_CLIENT_ID;
    }
    if (process.env.ANILIST_CLIENT_SECRET) {
      headers['X-Anilist-Client-Secret'] = process.env.ANILIST_CLIENT_SECRET;
    }

    const req = https.request(
      { hostname: parsed.hostname, path: parsed.pathname, method: 'POST', headers },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              const parsed = JSON.parse(body);
              if (parsed.errors) reject(new Error(parsed.errors.map((e) => e.message).join(', ')));
              else resolve(parsed.data);
            } catch (e) {
              reject(new Error(`JSON parse error: ${e.message}`));
            }
          } else if (res.statusCode === 429) {
            reject(new Error('RATE_LIMIT'));
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${body}`));
          }
        });
      }
    );

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function fetchSynonyms(anilistId, attempt = 1) {
  try {
    const data = await makeGraphQLRequest(SYNONYMS_QUERY, { id: anilistId });
    const synonyms = (data?.Media?.synonyms || [])
      .filter((s) => typeof s === 'string' && s.trim().length > 0);
    return synonyms;
  } catch (err) {
    if (err.message === 'RATE_LIMIT' && attempt < MAX_RETRIES) {
      const waitMs = Math.min(1000 * Math.pow(2, attempt), 30000);
      console.log(`[RATE LIMIT] AniList ${anilistId} — aguardando ${waitMs}ms (tentativa ${attempt}/${MAX_RETRIES})`);
      await sleep(waitMs);
      return fetchSynonyms(anilistId, attempt + 1);
    }
    if (attempt < MAX_RETRIES && (
      err.message.includes('ECONN') ||
      err.message.includes('ETIMEDOUT') ||
      err.message.includes('500')
    )) {
      const waitMs = 1000 * Math.pow(2, attempt);
      console.log(`[RETRY] AniList ${anilistId} — ${err.message} — aguardando ${waitMs}ms`);
      await sleep(waitMs);
      return fetchSynonyms(anilistId, attempt + 1);
    }
    return []; // não quebrar o script por falha AniList
  }
}

// ─── Ingestão ─────────────────────────────────────────────────────────────
async function fetchAllMedia() {
  const all = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('media_catalog')
      .select('*')
      .order('id')
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) {
      throw new Error(`Erro ao ler media_catalog (offset ${offset}): ${error.message}`);
    }
    if (!data || data.length === 0) {
      hasMore = false;
      continue;
    }
    all.push(...data);
    offset += data.length;
    hasMore = data.length === PAGE_SIZE;
  }

  return all;
}

function mediaToTitleRows(media) {
  const rows = [];
  for (const [field, lang] of TITLE_FIELDS) {
    const value = media[field];
    if (value && typeof value === 'string' && value.trim().length > 0) {
      rows.push({ media_id: media.id, language: lang, title: value.trim() });
    }
  }
  return rows;
}

async function upsertBatch(rows) {
  if (rows.length === 0) return 0;

  for (let i = 0; i < rows.length; i += BATCH_UPSERT) {
    const batch = rows.slice(i, i + BATCH_UPSERT);
    const { error } = await supabase
      .from('media_titles_i18n')
      .upsert(batch, { onConflict: 'media_id, language' });

    if (error) {
      console.error(`❌ Upsert falhou (batch ${i / BATCH_UPSERT + 1}): ${error.message}`);
      return 0;
    }
  }

  return rows.length;
}

// ─── Gerenciamento de logs ────────────────────────────────────────────────
async function createLog(metadata = {}) {
  const { data, error } = await supabase
    .from('ingestion_logs')
    .insert({
      source: 'titles_i18n_enrichment',
      status: 'running',
      records_processed: 0,
      records_inserted: 0,
      metadata
    })
    .select()
    .single();

  if (error) {
    console.error('⚠️ Erro ao criar log (continuando sem log):', error.message);
    return null;
  }
  return data?.id;
}

async function updateLog(logId, updates) {
  if (!logId) return;
  await supabase
    .from('ingestion_logs')
    .update(updates)
    .eq('id', logId);
}

// ─── Função principal ─────────────────────────────────────────────────────
async function enrich() {
  console.log('🚀 Iniciando enriquecimento de títulos i18n (media_catalog → media_titles_i18n)...');

  const hasAnilist =
    process.env.ANILIST_CLIENT_ID &&
    process.env.ANILIST_CLIENT_SECRET &&
    process.env.ANILIST_CLIENT_ID.length > 0 &&
    process.env.ANILIST_CLIENT_SECRET.length > 0;

  if (hasAnilist) {
    console.log('   ✅ Credenciais AniList disponíveis — synonyms serão buscadas.');
  } else {
    console.log('   ⚠️  Credenciais AniList ausentes — mode offline (apenas campos title_* do catálogo).');
  }

  // NOTA sobre o armazenamento de synonyms: o spec diz "um título por sinônimo"
  // com language='synonym', porém a tabela media_titles_i18n tem PK (media_id, language),
  // o que só permite UMA linha (media_id, 'synonym'). Adicionar um índice UNIQUE
  // em (media_id, language, title) resolveria, mas esse schema alteraria a tabela existente.
  // Portanto, concatenamos todos os synonyms em uma única linha, separados por "; ".

  const logId = await createLog({
    anilist_enabled: hasAnilist,
    title_fields: TITLE_FIELDS.map(([, l]) => l).join(', '),
    started_at: new Date().toISOString()
  });

  let totalProcessed = 0;
  let totalTitles = 0;
  let totalErrors = 0;
  let totalSynonymQueries = 0;
  let totalSynonyms = 0;

  try {
    console.log('📥 Lendo media_catalog...');
    const mediaList = await fetchAllMedia();
    console.log(`📊 Total de mídias no catálogo: ${mediaList.length}`);

    if (mediaList.length === 0) {
      console.log('⚠️ media_catalog vazio — nada para fazer.');
      await updateLog(logId, {
        status: 'success',
        completed_at: new Date().toISOString(),
        records_processed: 0,
        records_inserted: 0,
        error_message: null
      });
      console.log('✅ Finalizado (catálogo vazio).');
      return;
    }

    for (let i = 0; i < mediaList.length; i++) {
      const media = mediaList[i];
      const rows = mediaToTitleRows(media);

      if (rows.length > 0) {
        const upserted = await upsertBatch(rows);
        totalTitles += upserted;
        if (upserted === 0) totalErrors++;
      }

      // AniList synonyms (se credenciais disponíveis e media tem anilist_id)
      if (hasAnilist && media.anilist_id) {
        const synonyms = await fetchSynonyms(media.anilist_id);
        totalSynonymQueries++;

        if (synonyms.length > 0) {
          // Dedupe + filtra duplicatas em relação aos próprios campos da mídia
          const existingTitles = new Set(rows.map((r) => r.title.toLowerCase()));
          const seen = new Set();
          const unique = [];

          for (const s of synonyms) {
            const key = s.toLowerCase().trim();
            if (!key || seen.has(key) || existingTitles.has(key)) continue;
            seen.add(key);
            unique.push(s.trim());
          }

          if (unique.length > 0) {
            // Todos os synonyms em uma única linha language='synonym' (PK é media_id + language)
            const joined = unique.join('; ');
            const batch = [{ media_id: media.id, language: 'synonym', title: joined }];
            const upserted = await upsertBatch(batch);
            totalTitles += upserted;
            totalSynonyms += unique.length;
          }
        }

        // Rate limiting: pausa adicional a cada 10 requests para manter margem
        await sleep(REQUEST_DELAY_MS + (totalSynonymQueries % 10 === 0 ? REQUEST_DELAY_MS * 4 : 0));
      }

      totalProcessed++;

      if (totalProcessed % 100 === 0 || totalProcessed === mediaList.length) {
        const pct = ((totalProcessed / mediaList.length) * 100).toFixed(1);
        console.log(`📈 Progresso: ${totalProcessed}/${mediaList.length} (${pct}%) | Títulos: ${totalTitles} | Erros: ${totalErrors}`);
        if (logId && totalProcessed % 500 === 0) {
          await updateLog(logId, {
            records_processed: totalProcessed,
            records_inserted: totalTitles
          });
        }
      }
    }

    await updateLog(logId, {
      status: totalErrors > 0 ? 'failed' : 'success',
      completed_at: new Date().toISOString(),
      records_processed: totalProcessed,
      records_inserted: totalTitles,
      error_message: totalErrors > 0 ? `${totalErrors} erro(s) durante upsert` : null
    });

    console.log('\n✅ Enriquecimento de títulos finalizado!');
    console.log(`   Mídias processadas: ${totalProcessed}`);
    console.log(`   Títulos inseridos/upsertados: ${totalTitles}`);
    console.log(`   Consultas AniList: ${totalSynonymQueries}`);
    console.log(`   Synonyms capturados: ${totalSynonyms}`);
    console.log(`   Erros: ${totalErrors}`);
  } catch (err) {
    console.error('❌ Erro fatal:', err);
    await updateLog(logId, {
      status: 'failed',
      completed_at: new Date().toISOString(),
      records_processed: totalProcessed,
      records_inserted: totalTitles,
      error_message: err.message
    });
  }
}

// ─── Entrada ──────────────────────────────────────────────────────────────
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Variáveis de ambiente ausentes: NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY (em .env.local)');
  process.exit(1);
}

enrich().catch((err) => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
