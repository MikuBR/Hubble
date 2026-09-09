# DEMO_SEED_EXECUTION_CHECKLIST — Como rodar o seed de demonstração (#24)

> Contexto: esta tarefa (#24) foi feita **100% offline** — o banco Supabase
> estava inacessível (NXDOMAIN) e a API AniList fora do ar (403). Nada foi
> executado contra banco ou API. Este documento é o guia para o operador
> quando a infra voltar.
>
> Script: `scripts/seed-demo.cjs`
> Docs de apoio: `docs/SETTING_RESET_BUTTON_LOC.md` (botão de reset na UI)
>
> **Interface real do script:** `--dry-run`, `--limit N`, `--user <uuid>`,
> `--seed <n>`, `--self-test`. Não existe `--user-id` — é `--user`.

---

## Blocos externos atuais (impedem execução real, não implementação)

O seed e os scripts de enriquecimento já estão implementados, revisados e
commitados (`94a6b7f`). Nada pode ser executado contra banco ou API enquanto
estes blocos não forem resolvidos:

**B1 — Supabase deletado (bloqueia tudo que toca banco)**
- Projeto Supabase apagado. DNS não resolve (`NXDOMAIN`).
- `.env.local` tem `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`,
  mas apontam para projeto inexistente.
- Afeta: seed de demonstração, enriquecimento AniList/TMDb, validação de
  busca E2E, teste de signup com email provider.
- Resolver: recriar ou restaurar o projeto no Supabase e atualizar
  `.env.local` com as novas credenciais (`NEXT_PUBLIC_SUPABASE_URL`,
  `SUPABASE_SERVICE_ROLE_KEY`). O `SUPABASE_SERVICE_ROLE_KEY` é gerado na
  recriação.

**B2 — AniList retornando 403 (bloqueia enriquecimento via AniList)**
- API AniList respondendo `403 "instabilidade severa"` em testes de saúde
  (`curl`).
- Mesmo com `ANILIST_CLIENT_ID` e `ANILIST_CLIENT_SECRET` no `.env.local`,
  a API não atende.
- Afeta: `enrich-from-anilist.js`, `enrich-manga-anilist.js` — não podem
  rodar até a API voltar.
- Resolver: aguardar retorno da AniList (monitorar status.anilist.co).
  Enquanto isso, usar fallback TMDB (independente de AniList) conforme
  `docs/ANILIST_FALLBACK_PLAN.md`.

**B3 — Credenciais AniList ausentes (.env.local)**
- `ANILIST_CLIENT_ID` e `ANILIST_CLIENT_SECRET` não estão presentes no
  `.env.local`.
- Registrar app em anilist.co/settings/developer e adicionar os valores ao
  `.env.local`.
- Nota: mesmo com credenciais, o B2 (API 403) prevalece até a AniList voltar.

**Resumo de dependência:**
```
Backend real (DB + API) ← B1 (Supabase existe) AND B2 (AniList responde)
Enriquecimento AniList   ← B1 AND B2 AND B3 (credenciais presentes)
Enriquecimento TMDb      ← B1 apenas (independente de AniList)
Seed de demonstração      ← B1 apenas (roda offline com --dry-run; insert
                            real precisa de DB)
```

---

## Fase 0 — Pré-requisitos

```bash
cd /home/caue/Documentos/projetos/vscode-projects/Hubble

# 0.1 Credenciais presentes (ambas devem retornar linhas não vazias)
grep -E '^(NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY)=' .env.local
```

**NÃO é preciso rede para as próximas duas fases** — `--self-test` e
`--dry-run` funcionam offline graças à amostra embutida
(`buildOfflineSampleWorks()`).

---

## Fase 1 — Validações offline (30 s, sem tocar banco)

```bash
# 1.1 Testa TODAS as funções puras contra as restrições do schema.
node scripts/seed-demo.cjs --self-test
# esperado: 🎉 Self-test OK  (13 checks por obra × 10 obras + 5 de agregação
#                                + 2 de RNG + 3 do insertDemoData)

# 1.2 Preview do que seria escrito, sem escrever nada.
node scripts/seed-demo.cjs --dry-run --limit 100
# se o banco estiver vivo: "📊 Selecionadas 100/100 obras (score global mín. X)"
# se o banco estiver caído: avisa e usa a amostra offline de 10 obras

# 1.3 Reprodutibilidade — mesmo --seed => saída idêntica.
node scripts/seed-demo.cjs --dry-run --seed 1 > /tmp/a.txt
node scripts/seed-demo.cjs --dry-run --seed 1 > /tmp/b.txt
diff /tmp/a.txt /tmp/b.txt && echo "✅ reprodutível"

# 1.4 Seed diferente => dados diferentes (garante que o --seed tem efeito).
node scripts/seed-demo.cjs --dry-run --seed 1 | md5sum
node scripts/seed-demo.cjs --dry-run --seed 8 | md5sum
```

**Critério de prosseguimento:** os quatro comandos terminam com exit code 0
e nenhum `❌`.

---

## Fase 2 — Verificar que o banco voltou

```bash
node -e "
const {createClient}=require('@supabase/supabase-js');
const fs=require('fs');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1)]));
createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  .from('media_catalog').select('*', {count:'exact', head:true})
  .then(r => console.log('✅ media_catalog OK, registros:', r.count))
  .catch(e => { console.log('⛔ banco fora do ar:', e.message); process.exit(1); });
"
```

`TypeError: fetch failed` / `ENOTFOUND` = infra ainda caída. **Pare aqui.**

---

## Fase 3 — Garantir que o usuário demo existe

O seed escreve para `profiles.id`, que é FK de `auth.users`. O
`service_role` **não** consegue criar usuários (não há política de escrita
em `auth.users`; a tabela é gerida pelo GoTrue). O script **verifica** e
orienta — ele não cria.

```bash
node -e "
const {createClient}=require('@supabase/supabase-js');const fs=require('fs');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1)]));
createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  .from('profiles').select('id,username,display_name')
  .eq('id','11111111-1111-1111-1111-111111111111').single()
  .then(({data,error}) => error ? console.log('❌ ausente:', error.message)
                                : console.log('✅', data));
"
```

Se `❌ ausente` (code `PGRST116`):

- **Recomendado:** Supabase Studio → **Authentication → Users → Add user**,
  e-mail `tester@hubble.local`, senha qualquer, e
  `raw_user_meta_data = {"username":"tester_hubble","display_name":"Tester Hubble"}`.
  O trigger `on_auth_user_created` (`20260816000002_triggers.sql`) cria o
  `profiles` automaticamente.
- Alternativa: aplicar a migration `20260816000004_fix_signup_and_test_user.sql`
  no **Studio SQL Editor** (não via `supabase db push` — este não permite
  escrever em schema `auth`).

**Usando outro UID:** `node scripts/seed-demo.cjs --user <uuid>`.

---

## Fase 4 — Verificar que o catálogo tem dados elegíveis

```bash
node -e "
const {createClient}=require('@supabase/supabase-js');const fs=require('fs');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1)]));
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
(async()=>{
  const {count}=await sb.from('media_catalog').select('*', {count:'exact', head:true});
  console.log('total media_catalog:', count);
  if(!count){ console.log('⛔ catálogo vazio — rode os ingestores (docs/RUN_B0.md):');
    console.log('   node scripts/enrich-tmdb.js            (filmes+séries)');
    console.log('   node scripts/enrich-from-anilist.js    (anime/novels via offline_anime_mapping)');
    console.log('   node scripts/enrich-manga-anilist.js   (manga/manhwa/manhua)');
    console.log('   node scripts/enrich-titles-i18n.js     (títulos multi-idioma, opcional)');
    process.exit(1); }
  const {data}=await sb.from('media_catalog').select('user_score_global,release_status,media_type')
    .not('user_score_global','is',null).eq('is_adult',false)
    .in('release_status',['finished','airing','cancelled']);
  console.log('obras elegíveis (filtros do seed):', data.length);
  console.log('mín. score global elegível:', data.length?Math.min(...data.map(d=>d.user_score_global)):'—');
})();
"
```

Se "obras elegíveis" for 0 com `count` > 0, o catálogo existe mas nada
satisfaz os filtros — veja "Problemas de schema" abaixo (P1 em particular).

---

## Fase 5 — Executar o seed

```bash
node scripts/seed-demo.cjs --limit 100 --seed 20260908
```

Saída esperada:

```
📊 Selecionadas 100/100 obras (score global mín. ...)
👤 Perfil verificado: tester_hubble (Tester Hubble)
🎉 Seed concluído em 4.2s — 100 progressos, 47 tags para 11111111-...
```

O job também grava em `ingestion_logs` (`source='seed-demo'`), seguindo o
padrão de `scripts/enrich-*.js`:

```sql
SELECT status, records_processed, records_inserted, error_message, started_at, completed_at
FROM ingestion_logs WHERE source = 'seed-demo' ORDER BY started_at DESC LIMIT 3;
```

`status='failed'` + `error_message` preenchida = leia a mensagem e volte à
fase correspondente. `openIngestionLog` é tolerante: se a tabela não existir,
o script avisa e segue sem auditoria.

---

## Fase 6 — Verificar os dados escritos

```bash
node -e "
const {createClient}=require('@supabase/supabase-js');const fs=require('fs');
const env=Object.fromEntries(fs.readFileSync('.env.local','utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>[l.slice(0,l.indexOf('=')).trim(),l.slice(l.indexOf('=')+1)]));
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const UID='11111111-1111-1111-1111-111111111111';
(async()=>{
  const {count:prog}=await sb.from('user_media_progress').select('*', {count:'exact', head:true}).eq('user_id',UID);
  const {count:tags}=await sb.from('user_tag_preferences').select('*', {count:'exact', head:true}).eq('user_id',UID);
  console.log('user_media_progress :', prog, prog===100?'✅':'⚠️ esperado 100');
  console.log('user_tag_preferences:', tags, tags>0?'✅':'⚠️ zerado');

  // RPCs que o dashboard consome
  const {data:stats,error}=await sb.rpc('get_user_stats',{p_user_id:UID});
  if(error) console.log('❌ get_user_stats:', error.message);
  else console.log('get_user_stats:', {total:stats.total_items, done:stats.completed_items, avg:stats.avg_score, top:stats.top_genres?.slice(0,3)});

  const {data:recs}=await sb.rpc('get_recommendations',{p_user_id:UID, p_limit:5});
  console.log('get_recommendations:', (recs||[]).length, 'obras');
  const {data:hz}=await sb.rpc('get_horizons',{p_user_id:UID, p_limit:5});
  console.log('get_horizons:', (hz||[]).length, 'obras');

  // Integridade de constraints — TODAS devem ser 0.
  const {count:badScore}=await sb.from('user_media_progress').select('*', {count:'exact', head:true})
    .eq('user_id',UID).not('user_score','is',null).or('user_score.lt.0,user_score.gt.10');
  const {count:badUnit}=await sb.from('user_media_progress').select('*', {count:'exact', head:true})
    .eq('user_id',UID).lt('current_unit',0);
  const {count:badTag}=await sb.from('user_tag_preferences').select('*', {count:'exact', head:true})
    .eq('user_id',UID).or('score.lt.-50,score.gt.100');
  console.log('violações (todas devem ser 0): score=%d unit=%d tag=%d', badScore, badUnit, badTag);
})();
"
```

**Critério:** `user_media_progress=100`, `tags>0`, `get_user_stats.total_items=100`,
`get_recommendations>0`, `get_horizons>0`, e as três contagens de violação em 0.

### Verificação visual (dashboard)

1. `npm run dev`
2. Login como `tester@hubble.local`
3. **Dashboard** — ~100 obras, maioria `completed`. Obras de leitura
   (manga/manhwa/manhua) mostram capítulos; de streaming, episódios.
4. **Abrir 3–5 obras** — `private_insights` renderizado como Markdown
   (react-markdown + rehype-sanitize). Nunca deve conter HTML executável.
5. **Estatísticas** — números devem bater com o JSON acima.
6. **Recomendações / Novos Horizontes** — listas não vazias.

---

## Fase 7 — Testar o botão de reset

> **Bloqueado nesta tarefa:** o botão ainda não existe na UI. Ver
> `docs/SETTING_RESET_BUTTON_LOC.md` para o local exato e o trecho proposto
> (não aplicado — decisão do time).

Quando implementado:

1. Login como usuário demo → Settings → **Privacidade** →
   seção "Dados de demonstração" → **Resetar dados de demonstração**.
2. Confirmar no `confirm()` → toast "Dados de demonstração removidos."
3. Volte à Fase 6: `user_media_progress` **e** `user_tag_preferences` ambas 0,
   `get_user_stats.total_items=0`.
4. Re-seed: `node scripts/seed-demo.cjs --limit 100 --seed 20260908` →
   dados devem voltar **idênticos** (mesmo seed ⇒ mesma amostra, mesmo
   progresso, mesmas datas).

---

## Observações / armadilhas conhecidas

1. **O seed NÃO é idempotente para `user_tag_preferences`.**
   `user_media_progress` tem `UNIQUE(user_id, media_id)` e o upsert só
   atualiza. Já `user_tag_preferences` tem `PK(user_id, tag_type, tag_name)`
   e o upsert usa o **mesmo** `ON CONFLICT DO UPDATE` do trigger
   `update_tag_preferences` — que **soma** o delta. Rodar o seed duas vezes
   sem resetar dobra os scores. O clamp em `[-50, 100]` evita violação de
   constraint, mas degrada a semântica do ranking de afinidade.
   **Reset sempre antes de re-seed.**
2. **`started_at`/`completed_at` são `DATE`, não `TIMESTAMPTZ`.** O script
   emite `YYYY-MM-DD`, conforme o tipo da coluna. Não trocar para ISO
   completo ou o PostgREST rejeita (`invalid input syntax for type date`).
3. **`--seed` padrão é `20260908`.** Fixado para que qualquer operador, em
   qualquer máquina, obtenha o mesmo snapshot. Trocar o seed muda TODOS os
   dados.
4. **`--limit` é clampado a [1, 500].** `media_catalog` provavelmente tem
   menos que 500; valores altos só atrasam o preview.
5. **`--self-test` nunca toca a rede** — seguro para rodar em CI ou quando o
   banco está caído. Use-o para validar o schema após qualquer migration nova.
6. **Obediência de constraints foi verificada apenas contra as migrations**,
   não contra um banco real. Se o ambiente remoto divergir das migrations
   locais (ex.: constraint manual criada no Studio), a Fase 5 pode falhar;
   `--dry-run` continua funcionando nesse cenário.

---

## Problemas no schema que podem impedir o seed

Todos levantados lendo as migrations em `supabase/migrations/*.sql`.

### P1 — ⛔ BLOQUEANTE (mitigado no script): trigger `block_hiatus_progress`

`20260816000002_triggers.sql:92` — `validate_progress_increment()` levanta
`RAISE EXCEPTION 'Cannot increment progress on hiatus media'` quando
`release_status = 'hiatus'` **e** `NEW.current_unit > OLD.current_unit`.

O seed usa `upsert` com `onConflict:'user_id,media_id'`. Detalhe importante:

- Obra em `hiatus` que o usuário **não** tinha: upsert faz INSERT, `OLD` é
  `NULL`, `NEW.current_unit > NULL` retorna `NULL` (falsy) → **não bloqueia**.
- Obra em `hiatus` que **já** existe na biblioteca e cujo `current_unit` o
  seed aumentaria: é UPDATE → **bloqueia com exceção**.

**Mitigação aplicada no script:** `pickTopWorks` usa
`.in('release_status', ['finished','airing','cancelled'])`, excluindo
`'hiatus'`, `'upcoming'` e `'orphaned'` da fonte. Constante
`SAFE_RELEASE_STATUSES` exportada para inspeção. A amostra offline contém
deliberadamente uma obra em hiatus (`Berserk`) para que esse filtro seja
exercitado no `--self-test`.

⚠️ **Resíduo:** se o usuário demo já tiver progresso pré-existente em obras
em hiatus (criado manualmente antes), o upsert do seed colide. Resetar antes
de re-seed (obs. 1).

### P2 — ℹ️ NÃO é problema: `user_score NUMERIC(3,1) CHECK (>= 0 AND <= 10)`

`20260816000001_init_schema.sql:156`. O valor é clamped em `[0, 10]` **e**
arredondado para 1 casa (`round1`). Check `✅ 1 casa decimal` no self-test.
O score global já vive nessa faixa (TMDB `vote_average`/10, AniList
`meanScore`/100); o ruído `(rng()-0.5)*2.4` não estoura na prática, e o
clamp torna o script robusto mesmo se estourasse.

### P3 — ℹ️ NÃO é problema, mas exige design: `user_tag_preferences.score CHECK (>= -50 AND <= 100)`

`20260816000001_init_schema.sql:189`. O trigger `update_tag_preferences`
soma `+10` por gênero de cada obra completada com score ≥ 8.0 — com 100
obras completas e 3 gêneros comuns, chegar a 100 é trivial, e o trigger
já aplica `GREATEST(-50, LEAST(100, ...))`.

**Mitigação aplicada:** `generateMockTagPreferences` usa pesos bem menores
(genre ±3, theme ±2, studio ±1) e `aggregateTagPreferences` faz o clamp
explícito. Self-test: `✅ aggregação preserva faixa [-50,100] — máx=16 mín=0`.

**Consequência:** o ranking de afinidade fica mais raso que o de um usuário
real. Para uma demo "veterano", subir `genre` para ±6 no base de
`generateMockTagPreferences` — o clamp continua protegendo.

### P4 — ⛔ O script NÃO cria o usuário demo (limitação deliberada)

`profiles.id UUID REFERENCES auth.users(id) ON DELETE CASCADE`
(`20260816000001_init_schema.sql:44`). O trigger `handle_new_user`
(`20260816000002_triggers.sql:107`, versões corrigidas em `20260816000004`
e `20260819000001`) roda `AFTER INSERT ON auth.users`.

O `service_role` não escreve em `auth.users` via PostgREST (sem política
RLS; tabela gerida pelo GoTrue). Então `verifyDemoUser` checa e lança erro
orientando, em vez de tentar criar. Fase 3 cobre.

### P5 — ℹ️ `profiles.username CHECK (length BETWEEN 3 AND 30)` — intocado pelo seed

`20260816000001_init_schema.sql:45`. O seed não escreve em `profiles`.
Mencionado porque a chain de fallback do `handle_new_user`
(`20260819000001`) existe justamente para não violá-lo — relevante se o
operador for criar um usuário demo com username curto.

### P6 — ℹ️ Sem view no schema que dependa do seed

Nenhuma view declarada nas migrations. As três funções
`get_recommendations` / `get_horizons` / `get_user_stats`
(`20260816000003_rpc_functions.sql`) são as superfícies de leitura; todas
`JOIN media_catalog` sobre `user_media_progress` e `user_tag_preferences`,
então qualquer linha do seed as alimenta. Verificado na Fase 6.

### P7 — ℹ️ Sem trigger `BEFORE INSERT` em `profiles` — o que é *bom*

A busca por "trigger que bloqueia inserts sem profile" não achou nada:
`user_media_progress` e `user_tag_preferences` só têm FK + RLS, sem trigger
de validação de perfil. Ou seja, o `service_role` pode inserir progresso
para **qualquer** `user_id` existente em `profiles` — sem checar e-mail ou
confirmação. `verifyDemoUser` cumpre essa checagem no lado do script.

### P8 — ⚠️ Enum `user_status_enum` NÃO contém `'reading'`

`20260816000001_init_schema.sql:23`. Uma versão antiga da RPC
`get_user_stats` (`20260816000003_rpc_functions.sql:108`) referenciava
`status IN ('reading', ...)` — corrigido em `20260816000006_fix_get_user_stats*.sql`.
Relevante para o seed: o gerador **não** emite `'reading'` (nem deveria —
seria `invalid value for enum`). Verificado no self-test por
`✅ status ∈ enum`.

---

## Resumo de saída

| Arquivo | Função |
|---|---|
| `scripts/seed-demo.cjs` | Script CLI — funções puras + live / dry-run / self-test |
| `docs/SETTING_RESET_BUTTON_LOC.md` | Local exato + trecho do botão de reset (não aplicado) |
| `docs/DEMO_SEED_EXECUTION_CHECKLIST.md` | Este arquivo — run passo a passo + problemas de schema |
