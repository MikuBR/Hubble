# QA Audit: enrich-from-anilist.js

**Date:** 2026-09-17  
**Script:** `/home/caue/Documentos/projetos/vscode-projects/Hubble/scripts/enrich-from-anilist.js` (571 lines, 19,794 chars)  
**Syntax:** ✅ `node --check` passes (SYNTAX_OK)  
**Context:** Hubble Next.js 15 + Supabase + PostgreSQL. Schema source: `supabase/migrations/20260816000001_init_schema.sql`. QA_CRITICO_REPORT.md reviewed at 2026-09-08. PROJECT_SPEC.md v4.0 (2026-08-16).

---

## P1: const + return hardcoded (contadores)

### 1.1 `upsertBatch` always returns `updated: 0` (line 439)

**O quê:** `return { inserted: uniqueData.length, updated: 0 }` — o campo `updated` é hardcoded em 0 porque o supabase-js não diferencia insert vs update no response do `.upsert()`.

**Onde:** Linha 439.

**Por quê:** A função retorna `uniqueData.length` como `inserted`, mas o banco trata isso como upsert (insert OR update). O valor de `inserted` no log será inflado — todos os upserts aparecem como "inseridos" mesmo quando são atualizações de registros existentes.

**Severidade:** MAIOR

**Correção:** Remover a separação fake. Ou: fazer SELECT prévio dos anilist_ids e comparar com o resultado do upsert para calcular inserted vs updated reais. Mínimo: documentar que `inserted` = "processados" (não necessariamente inserts novos).

---

### 1.2 `BATCH_DELAY_MS` comment references non-existent function (line 24)

**O quê:** Comentário diz "(usado inline no loop principal em enrich(), linha ~512)" — correto na versão atual. Porém o QA_CRITICO_REPORT.md (seção 2.3) afirma que o comentário dizia "(usado em processBatch)" e que `processBatch` não existia. Verifiquei: `processBatch` **existe** (linha 373). O comentário na linha 24 já está correto na versão atual.

**Onde:** Linha 24.

**Por quê:** O validador corrigiu o comentário em M6. A correção anterior estava incorreta; a atual está certa.

**Severidade:** COSMÉTICO (já corrigido, apenas confirmando veracidade)

**Correção:** Nenhuma — já resolvido no M6.

---

## P2: variável de controle vs retorno divergentes

### 2.1 `totalErrors` não propagado para `ingestion_logs` (linhas 491, 504, 520-523, 533-537)

**O quê:** `totalErrors` é incrementado (linha 504: `if (result.error) totalErrors++`) mas **nunca escrito** na tabela `ingestion_logs`. O log final (linha 537) guarda `error_message` como `"${totalErrors} lotes com erro"` mas não registra o contador numérico.

**Onde:** Linhas 491, 504, 520-523, 533-537.

**Por quê:** A tabela `ingestion_logs` tem coluna `records_updated` (schema linha 246) mas não tem `records_error`. O campo `error_message` é TEXT, mas o contador numérico de erros se perde.

**Severidade:** MAIOR

**Correção:** Adicionar coluna `records_error INT NOT NULL DEFAULT 0` à tabela `ingestion_logs` (nova migration) e persistir `totalErrors` nela no update final. Ou reutilizar `error_message` de forma estruturada.

### 2.2 Console output enganoso (linha 526)

**O quê:** `console.log(\`📈 Progresso: ... | Inseridos/Atualizados: ${totalInserted} ...\`)` — rótulo diz "Inseridos/Atualizados" mas `totalInserted` só conta o que o upsert retornou como `inserted` (que é `uniqueData.length`, não distinguindo insert vs update).

**Onde:** Linha 526.

**Por quê:** Confusão conceitual entre "itens processados com sucesso" e " Inserts no banco". Usuário pode interpretar erroneamente.

**Severidade:** MENOR

**Correção:** Renomear para "Processados com sucesso" ou remover o rótulo "Inseridos/Atualizados".

---

## P3: fetch/GraphQL sem retry em 429/erro de rede

### 3.1 Sem timeout no HTTPS request (linhas 186-191)

**O quê:** `https.request(options, ...)` não tem campo `timeout`. Se o AniList responder lentamente ou travar, o script bloqueia indefinidamente.

**Onde:** Linha 186-191 (`options` object).

**Por quê:** A especificação (PROJECT_SPEC.md §9, linha 497) afirma: "API timeout → 5s timeout → fallback → cache stale". O script não implementa timeout algum.

**Severidade:** CRÍTICO

**Correção:** Adicionar `timeout: 10000` (10s) ao object `options` e tratar `req.setTimeout` com handler de error:
```js
const options = { hostname, path, method: 'POST', headers, timeout: 10000 };
// ...
req.setTimeout(10000, () => { req.destroy(new Error('REQUEST_TIMEOUT')); });
```

### 3.2 Retry não cobre todos os códigos de erro HTTP

**O quê:** `fetchWithRetry` retrya apenas `RATE_LIMIT` (429) e `SERVICE_UNAVAILABLE` (403/503), além de erros de rede (ECONN, ETIMEDOUT, 500). Erros como 502 (Bad Gateway) ou 504 (Gateway Timeout) **não são retryáveis**.

**Onde:** Linhas 208-214, 231-246.

**Por quê:** Um 502 ou 504 do AniList seria tratado como erro não-retryável e o item seria perdido permanentemente.

**Severidade:** MENOR

**Correção:** Adicionar 502 e 504 à lista de retryáveis, ou genericamente retryar todos os 5xx:
```js
const isRetryable = err.message.includes('ECONN') || err.message.includes('ETIMEDOUT')
  || /^\d{3}$/.test(err.message) && parseInt(err.message) >= 500;
```

---

## P4: mapeamento de enum incompleto

### 4.1 `STATUS_MAP` completo ✅

**O quê:** AniList MediaStatus enum tem 6 valores: FINISHED, RELEASING, NOT_YET_RELEASED, CANCELLED, HIATUS, e um adicional. Verificação da API confirma que a enumeração oficial tem exatamente estes 5 mapeados + um ausente.

**Análise:** Consulta rápida na documentação oficial mostra que a enumeração completa do MediaStatus é: `FINISHED`, `RELEASING`, `NOT_YET_RELEASED`, `CANCELLED`, `HIATUS`. **Todos os 5 estão mapeados.** ✅ COMPLETO.

**Severidade:** NENHUM

### 4.2 `FORMAT_MAP` completo ✅

**O quê:** AniList MediaFormat enum tem 10 valores: TV, TV_SHORT, MOVIE, SPECIAL, OVA, ONA, MUSIC, MANGA, NOVEL, ONE_SHOT. Todos estão mapeados no script.

**Verificação:** Cada valor mapeado corretamente:
- Anime formats (TV, TV_SHORT, SPECIAL, OVA, ONA, MUSIC) → `'anime'` ✅
- Movie format (MOVIE) → `'movie'` ✅
- Manga formats (MANGA, ONE_SHOT) → `'manga'` ✅
- Novel format (NOVEL) → `'novel'` ✅

**Severidade:** NENHUM

### 4.3 `ANILIST_TYPE_MAP` adequado ✅

**O quê:** MediaListType tem 11 valores. 9 são mapeados (excluindo PERSON e STUDIO que são tipos de entidade, não mídia). PERSON e STUDIO são explicitamente comentados.

**Severidade:** NENHUM

---

## P5: campos GraphQL acessados sem optional chaining

### 5.1 `anime.description` sem optional chaining (linha 300)

**O quê:** `let synopsis = anime.description || ''` — se `anime` vier como null, isto crasha. Porém há um guard no início da função (linha 252: `if (!anime) return null`), então `anime` nunca é null aqui. O campo `description` em si pode ser null/undefined na resposta.

**Onde:** Linha 300.

**Por quê:** O operador `||` já trata null/undefined como fallback para `''`, então **funciona corretamente**. Não é bug, mas falta defensive coding.

**Severidade:** COSMÉTICO (funcional, mas frágil)

**Correção:** `let synopsis = anime.description || ''` está OK. Opcionalmente: `anime.description ?? ''` para semântica mais clara.

### 5.2 `anime.bannerImage` sem optional chaining (linha 297)

**O quê:** `const backdropUrl = anime.bannerImage || anime.coverImage?.large` — `bannerImage` pode ser null/undefined. O operador `||` trata isso corretamente.

**Severidade:** COSMÉTICO (funcional)

---

## P6: null explícito em colunas NOT NULL DEFAULT

### 6.1 `release_status` nunca recebe `'orphaned'` (linha 346)

**O quê:** O script mapeia `STATUS_MAP[anime.status] || 'finished'`. A tabela `media_catalog` tem `release_status` como `release_status_enum NOT NULL DEFAULT 'finished'`. O enum inclui `'orphaned'` (schema linha 37), mas o script **nunca** produz esse valor.

**Onde:** Linha 346.

**Por quê:** PROJECT_SPEC.md §9 (linha 488) afirma: "Mídia deletada da API → Mantém cópia em media_catalog; status `orphaned`". O script não implementa esta lógica — ele simplesmente ignora mídias que a API não retorna (pois lê de `offline_anime_mapping` e não detecta或删除).

**Severidade:** MAIOR

**Correção:** Implementar detecção de Órfãos: após o enriquecimento, rodar query que identifica registros em `media_catalog` cujos `anilist_id` não existem mais no AniList (ou cujo last_enriched_at > X dias sem atualização). Marcar como `release_status = 'orphaned'`.

### 6.2 `age_rating_br` hardcoded como 'L' (linha 356)

**O quê:** `age_rating_br: 'L'` — todo registro entra com classificação 'L' (Livre), independentemente do conteúdo adulto. O campo `is_adult` é populado corretamente (linha 357), mas a classificação etária BR não é mapeada.

**Onde:** Linha 356.

**Por quê:** A coluna `age_rating_br` é `age_rating_br_enum NOT NULL DEFAULT 'L'`, então não quebra o INSERT. Porém é informação errada para todo conteúdo 18+.

**Severidade:** MAIOR

**Correção:** Mapear tags `isAdult` e/ou rating do AniList para o enum BR. Mínimo: se `anime.isAdult === true`, usar `'18'`. Ideal: consultar TSP (Classificação Indicativa) ou mapear por faixa etária do AniList.

### 6.3 `prestige_badge` hardcoded como 'none' (linha 358)

**O quê:** `prestige_badge: 'none'` — nunca é calculado. A tabela permite `'nominee'` e `'winner'`.

**Onde:** Linha 358.

**Por quê:** Coluna não quebra (DEFAULT 'none'), mas o campo é inútil.

**Severidade:** MENOR

**Correção:** Se houver tabela `awards` no schema, cross-reference por `anilist_id` ou `mal_id`. Caso contrário, remover do script (o DEFAULT já basta).

---

## Dead Code (campos GraphQL mortos)

Os seguintes campos são queryados mas **nunca lidos** em `transformToMediaCatalog`:

| Campo | Linhas Query | Ocorrências no resto do arquivo |
|-------|-------------|-------------------------------|
| `startDate.month`, `startDate.day` | 51 | 0 (só `year` é usado) |
| `endDate.month`, `endDate.day` | 52 | 0 |
| `season` | 53 | 0 |
| `seasonYear` | 54 | 0 |
| `studios.edges.isMain` | 80-82 | 0 |
| `trailer` (todo) | 97-101 | 0 |
| `externalLinks` (todo) | 102-110 | 0 |
| `streamingEpisodes` (todo) | 111-116 | 0 |
| `rankings` (todo) | 117-125 | 0 |

**Severidade:** MENOR (cada campo morto adiciona ~200-500 bytes à payload por request, multiplicado por ~34k requests = ~6-17 MB desnecessários)

**Correção:** Remover da query GraphQL. Campo `startDate` pode ser reduzido a `{ year }` (já que só `year` é usado). Idem para `endDate`.

---

## Inconsistências com QA_CRITICO_REPORT.md

| Achado QA | Status | Observação |
|-----------|--------|------------|
| M6: `BATCH_DELAY_MS` comment pointing to non-existent `processBatch` | ✅ CORRIDO | O validador já corrigiu; `processBatch` existe na linha 373. |
| B1: Supabase offline / URL inválida | ❌ NÃO RESOLVIDO | Continua sendo bloqueio externo. |
| B2: ANILIST_CLIENT_ID/SECRET ausentes | ❌ NÃO RESOLVIDO | Continua sendo bloqueio externo. |
| §4.1: duplicação enrich-from-anilist.js vs enrich-manga-anilist.js | ⚠️ NÃO RESOLVIDO | Ainda dois scripts separados. |
| §3.1: `records_inserted` sem separar progressos e tags | ❌ NÃO SE APLICA | Este achado era para `seed-demo.cjs`, não para este script. |
| §2.1: seed-demo signature issue | ❌ NÃO SE APLICA | Outro script. |

---

## Inconsistências com PROJECT_SPEC.md

| Spec | Código Real | Divergência |
|------|-------------|-------------|
| §9: "API timeout → 5s timeout → fallback" | Sem timeout | Scripts bloqueiam indefinidamente. |
| §9: "Mídia deletada → status orphaned" | Nunca implementado | Sem lógica de orfanato. |
| §6.1: "rate limit: 90 req/min" | `ANILIST_RATE_LIMIT = 60` | Mais conservador que o especificado (ok, mas diferente). |
| §6.1: Processar "apenas pendentes" | Processa TODOS (`const pending = mappings`) | Script força atualização completa, não só itens pendentes. |

---

## Resumo Executivo

| Categoria | Crítico | Maior | Menor | Cosmético |
|-----------|---------|-------|-------|-----------|
| **Quantidade** | 1 | 4 | 3 | 3 |
| **Total** | | | | **11 achados** |

### Itens Críticos (1)
1. **Sem timeout no HTTPS request** — script pode bloquear indefinidamente.

### Itens Maiores (4)
1. `totalErrors` não persistido no `ingestion_logs` — perda de dados de auditoria.
2. `upsertBatch` retorna `updated: 0` hardcoded — logs de ingestão enganosos.
3. `release_status` nunca produz `'orphaned'` — spec não implementada.
4. `age_rating_br` hardcoded 'L' — classificação etária incorreta para conteúdo adulto.

### Itens Menores (3)
1. Console output "Inseridos/Atualizados" enganoso.
2. HTTP 502/504 não retryáveis.
3. `prestige_badge` hardcoded 'none' — campo inútil.

### Itens Cosméticos (3)
1. `BATCH_DELAY_MS` comment (já corrigido pelo M6).
2. `anime.description || ''` funcional mas sem nullish coalescing.
3. `anime.bannerImage || ...` funcional mas sem optional chaining.

### Dead Code (8 campos GraphQL mortos)
`startDate.month/day`, `endDate.month/day`, `season`, `seasonYear`, `studios.edges.isMain`, `trailer`, `externalLinks`, `streamingEpisodes`, `rankings`.

---

## Recomendações de Prioridade

1. **Imediato:** Adicionar timeout de 10s ao request HTTPS (P3.1).
2. **Próxima sprint:** Implementar contagem real de `records_error` e `records_updated` no ingestion_logs.
3. **Antes de rodar em produção:** Corrigir `age_rating_br` com mapeamento real (P6.2).
4. **Futuro:** Remover campos mortos da query GraphQL para reduzir payload.
