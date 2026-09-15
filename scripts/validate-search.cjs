#!/usr/bin/env node
/**
 * Script: validate-search.cjs
 *
 * Testa conectividade com Supabase + AniList GraphQL público.
 * Útil como smoke test pós-enriquecimento para confirmar que o banco
 * está acessível e as credenciais funcionam.
 *
 * Uso:
 *   node scripts/validate-search.cjs [termo]
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { createClient } = require('@supabase/supabase-js');

function loadEnv() {
  const envPath = path.join(process.cwd(), '.env.local');
  const content = fs.readFileSync(envPath, 'utf8');
  const values = {};
  for (const line of content.split('\n')) {
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    values[key] = value;
  }
  return values;
}

function httpsPost(url, payload) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const data = JSON.stringify(payload);
    const req = https.request({ hostname: u.hostname, path: u.pathname, method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Content-Length': Buffer.byteLength(data) } }, (res) => {
      let body = '';
      res.on('data', chunk => (body += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); } catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function main() {
  const term = process.argv[2] || 'Naruto';
  const env = loadEnv();

  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { count } = await supabase.from('media_catalog').select('*', { count: 'exact', head: true });
  console.log(`📊 media_catalog count: ${count ?? 0}`);

  // Fail fast se o banco estiver vazio — executar builders #5/#6 primeiro
  if ((count ?? 0) === 0) {
    console.error('❌ media_catalog está vazio. Execute os scripts de enriquecimento antes de validar.');
    process.exit(1);
  }

  const query = `query Search($search: String) { Page(page: 1, perPage: 3) { media(search: $search, type: ANIME) { id title { romaji english } } } }`;
  const data = await httpsPost('https://graphql.anilist.co', { query, variables: { search: term } });
  const media = data?.data?.Page?.media || [];
  console.log(`🔎 AniList public search for "${term}": ${media.length} results`);
  for (const m of media.slice(0, 3)) {
    console.log(` - #${m.id}: ${m.title?.english || m.title?.romaji}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
