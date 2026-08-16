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
const JSONStream = require('JSONStream');
const { URL } = require('url');
require('dotenv').config({ path: '.env.local' }); // Carrega .env.local

// Config
const AODB_URL = 'https://github.com/manami-project/anime-offline-database/releases/download/2026-27/anime-offline-database-minified.json';
const BATCH_SIZE = 1000;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // Requer service_role para bypass RLS
);

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const options = {
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Node.js',
        'Accept': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        // Redirect
        const redirectUrl = res.headers.location;
        console.log('[DEBUG] Redirect to:', redirectUrl);
        makeRequest(redirectUrl).then(resolve).catch(reject);
        return;
      }
      resolve(res);
    });

    req.on('error', reject);
    req.end();
  });
}

async function ingest() {
  console.log('🚀 Iniciando ingestão AODB...');

  const logId = await startLog();

  try {
    const res = await makeRequest(AODB_URL);
    console.log('[DEBUG] Response status:', res.statusCode);
    console.log('[DEBUG] Content-Type:', res.headers['content-type']);
    console.log('[DEBUG] Content-Encoding:', res.headers['content-encoding']);
    
    // Check if response is gzipped
    const isGzipped = res.headers['content-encoding'] === 'gzip';
    let stream = res;
    if (isGzipped) {
      const zlib = require('zlib');
      stream = res.pipe(zlib.createGunzip());
    }
    
    const parser = JSONStream.parse('data.*');
    let batch = [];
    let processed = 0;
    let inserted = 0;

    stream.pipe(parser);
    
    // Debug: check if data is flowing (only first few)
    let debugCount = 0;
    stream.on('data', (chunk) => {
      if (debugCount < 3) {
        console.log('[DEBUG] Stream data chunk length:', chunk.length);
        debugCount++;
      }
    });
    
    stream.on('end', () => {
      console.log('[DEBUG] Stream ended');
    });

    parser.on('data', async (anime) => {
      processed++;
      if (processed % 5000 === 0) {
        console.log(`[DEBUG] Processed ${processed}: ${anime.title}`);
      }

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
      console.log('[DEBUG] Parser ended. Total processed:', processed, 'Batch remaining:', batch.length);
      if (batch.length > 0) {
        inserted += await flush(batch);
      }
      await endLog(logId, 'success', processed, inserted);
      console.log('✅ Ingestão finalizada com sucesso!');
    });

    parser.on('error', async (err) => {
      console.error('[DEBUG] Parser error:', err);
      await endLog(logId, 'failed', processed, inserted, err.message);
      console.error('❌ Erro no parser:', err);
    });

  } catch (err) {
    console.error('[DEBUG] Download error:', err);
    console.error('❌ Erro no download:', err);
  }
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
  // Deduplicar por aodb_title (manter o último)
  const seen = new Map();
  for (const item of data) {
    seen.set(item.aodb_title, item);
  }
  const uniqueData = Array.from(seen.values());
  
  const { error } = await supabase
    .from('offline_anime_mapping')
    .upsert(uniqueData, { onConflict: 'aodb_title' });

  if (error) {
    console.error('❌ Erro no upsert:', error.message);
    return 0;
  }
  return uniqueData.length;
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