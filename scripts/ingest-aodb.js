/**
 * Script de Ingestão: Anime Offline Database (AODB)
 * @spec §6.1 - Ingestão Offline-First
 *
 * Este script faz o download do dataset AODB (~80MB), realiza o parse
 * em streaming para economizar RAM e faz o batch upsert no Supabase.
 *
 * Correções aplicadas (F15):
 * - Kitsu regex atualizado para kitsu.app (não kitsu.io)
 */

const fs = require('fs');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');
const JSONStream = require('JSONStream'); // Assumindo que foi instalado ou usaremos alternativo

// Config
const AODB_URL = 'https://github.com/manami-project/anime-offline-database/releases/latest/download/anime-offline-database-minified.json';
const BATCH_SIZE = 1000;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Requer service_role para bypass RLS
);

async function ingest() {
  console.log('🚀 Iniciando ingestão AODB...');

  const logId = await startLog();

  https.get(AODB_URL, (res) => {
    const parser = JSONStream.parse('data.*');
    let batch = [];
    let processed = 0;
    let inserted = 0;

    res.pipe(parser);

    parser.on('data', async (anime) => {
      processed++;

      // Extrair IDs via Regex
      const mappings = extractMappings(anime.sources);
      if (mappings.anilist_id || mappings.mal_id || mappings.kitsu_id) {
        batch.push({
          aodb_title: anime.title,
          anilist_id: mappings.anilist_id,
          mal_id: mappings.mal_id,
          kitsu_id: mappings.kitsu_id,
          anidb_id: mappings.anidb_id,
          updated_at: new Date().toISOString()
        });
      }

      if (batch.length >= BATCH_SIZE) {
        parser.pause();
        const count = await flush(batch);
        inserted += count;
        batch = [];
        console.log(`📦 Processados: ${processed} | Inseridos: ${inserted}`);
        parser.resume();
      }
    });

    parser.on('end', async () => {
      if (batch.length > 0) {
        inserted += await flush(batch);
      }
      await endLog(logId, 'success', processed, inserted);
      console.log('✅ Ingestão finalizada com sucesso!');
    });

    parser.on('error', async (err) => {
      await endLog(logId, 'failed', processed, inserted, err.message);
      console.error('❌ Erro no parser:', err);
    });

  }).on('error', (err) => {
    console.error('❌ Erro no download:', err);
  });
}

function extractMappings(sources) {
  const result = {};
  sources.forEach(src => {
    if (src.includes('anilist.co/anime/')) {
      result.anilist_id = parseInt(src.split('/').pop());
    } else if (src.includes('myanimelist.net/anime/')) {
      result.mal_id = parseInt(src.split('/').pop());
    } else if (src.includes('kitsu.app/anime/')) { // FIXED: kitsu.app
      result.kitsu_id = parseInt(src.split('/').pop());
    } else if (src.includes('anidb.net/anime/')) {
      result.anidb_id = parseInt(src.split('/').pop());
    }
  });
  return result;
}

async function flush(data) {
  const { error } = await supabase
    .from('offline_anime_mapping')
    .upsert(data, { onConflict: 'aodb_title' });

  if (error) {
    console.error('❌ Erro no upsert:', error.message);
    return 0;
  }
  return data.length;
}

async function startLog() {
  const { data } = await supabase
    .from('ingestion_logs')
    .insert({ source: 'aodb', status: 'running' })
    .select()
    .single();
  return data.id;
}

async function endLog(id, status, processed, inserted, error = null) {
  await supabase
    .from('ingestion_logs')
    .update({
      status,
      completed_at: new Date().toISOString(),
      records_processed: processed,
      records_inserted: inserted,
      error_message: error
    })
    .eq('id', id);
}

// Executar
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  ingest();
} else {
  console.error('❌ Erro: SUPABASE_SERVICE_ROLE_KEY não encontrada.');
}
