# Checklist de Validação — Busca Real no Catálogo (Issue #6)

> **Contexto:** Este checklist só deve ser rodado quando o banco Supabase estiver populado (`media_catalog` com dados) e a API estiver acessível. Bloqueios identificados: banco deletado, `media_catalog=0`, AniList API fora do ar.

---

## 1. Preparação

- [ ] `media_catalog` contém dados (confirmação: `node scripts/validate-search.cjs` mostra count > 0)
- [ ] `.env.local` tem `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Serviço Supabase está online (não deletado)
- [ ] `ANILIST_CLIENT_ID` e `ANILIST_CLIENT_SECRET` estão preenchidos (para fallback futuro)

---

## 2. Validar Endpoint `/api/search` com curl / Node

### 2.1 Busca básica

```bash
curl -s "http://localhost:3000/api/search?q=Naruto" | jq .
```

- [ ] Retorna `200 OK`
- [ ] Corpo contém `{ results: [...], pagination: {...}, source: "local" }`
- [ ] `results` é um array não-vazio (quando banco tem dados)
- [ ] Cada item em `results` tem: `id`, `title`, `mediaTypeLabel`, `cover_url`, `backdrop_url`, `release_year`, `genres`, `user_score_global`

### 2.2 Parâmetro `q` obrigatório

```bash
curl -s "http://localhost:3000/api/search" | jq .
```

- [ ] Retorna `400 Bad Request`
- [ ] Corpo contém `{ error: "Parâmetros inválidos", details: {...} }`

### 2.3 Parâmetro `q` vazio

```bash
curl -s "http://localhost:3000/api/search?q=" | jq .
```

- [ ] Retorna `400 Bad Request`

### 2.4 `q` muito longo (>100 chars)

```bash
curl -s "http://localhost:3000/api/search?q=$(python3 -c "print('a'*101)")" | jq .
```

- [ ] Retorna `400 Bad Request`

### 2.5 Parâmetro `type` inválido

```bash
curl -s "http://localhost:3000/api/search?q=Naruto&type=invalido" | jq .
```

- [ ] Retorna `400 Bad Request`

### 2.6 Filtro por tipo (`type=movie`, `type=anime`, etc.)

```bash
curl -s "http://localhost:3000/api/search?q=Naruto&type=anime" | jq '.results[].media_type' | sort | uniq -c
```

- [ ] Todos os resultados têm `media_type` igual ao solicitado
- [ ] Funciona para: `movie`, `tv_series`, `anime`, `manga`, `manhwa`, `manhua`, `novel`, `book`, `game`

### 2.7 `type=all` (ou ausente)

- [ ] Retorna resultados de todos os tipos
- [ ] Mesmo comportamento com `type` omitido

### 2.8 Paginação — `limit`

```bash
curl -s "http://localhost:3000/api/search?q=Naruto&limit=5" | jq '.results | length'
```

- [ ] Retorna no máximo 5 resultados
- [ ] `pagination.limit` === 5

### 2.9 Paginação — `offset`

```bash
curl -s "http://localhost:3000/api/search?q=Naruto&limit=5&offset=0" | jq '.pagination'
curl -s "http://localhost:3000/api/search?q=Naruto&limit=5&offset=5" | jq '.results[0].id'
```

- [ ] `offset=0` retorna os primeiros 5
- [ ] `offset=5` retorna resultados diferentes (deslocamento funciona)
- [ ] `pagination.offset` reflete o valor solicitado

### 2.10 Paginação — `hasMore` (CRÍTICO — bug conhecido)

```bash
# Buscar exatamente o limite
curl -s "http://localhost:3000/api/search?q=Naruto&limit=20" | jq '.pagination.hasMore'
# Buscar menos que limit (última página)
curl -s "http://localhost:3000/api/search?q=Naruto&limit=20&offset=9999" | jq '.pagination.hasMore'
```

- [ ] `hasMore` é `false` quando não há mais resultados além do offset
- [ ] `hasMore` é `true` quando há pelo menos 1 resultado além da página atual
- [ ] **Verificar especial:** quando o total de resultados é múltiplo exato de `limit`, `hasMore` deve ser `false` na última página (o código atual pode falhar aqui — ver seção 3.1)

### 2.11 Ordenação por `user_score_global`

- [ ] Resultados vêm ordenados por `user_score_global` decrescente
- [ ] Valores `null` vêm por último

### 2.12 Título resolvido (i18n)

- [ ] Cada resultado tem campo `title` preenchido (não vazio)
- [ ] Título respeita preferência de idioma do usuário (PT-BR / EN / ES para ocidental; PT-BR / EN / romaji / native para oriental)
- [ ] `mediaTypeLabel` está em PT-BR (ex: "Filme", "Anime", "Mangá")

### 2.13 Fonte da busca

- [ ] `pagination.source` === `"local"` (busca no banco)
- [ ] Futuro: quando fallback externo for implementado, verificar `source` alternado

---

## 3. Validar UI (`/search`)

### 3.1 Renderização inicial

- [ ] Página `/search` carrega sem erro (sem clique, apenas a página)
- [ ] Input de busca está presente e fokável
- [ ] Filtros de tipo (botões) estão presentes e visíveis

### 3.2 Busca com termo existente

- [ ] Digitar "Naruto" e pressionar Enter ou clicar em "Buscar"
- [ ] URL atualiza para `/search?q=Naruto`
- [ ] Grid de resultados aparece com manchetes, covers, anos
- [ ] Contador "X resultados" atualiza corretamente
- [ ] Botão "Carregar mais" aparece quando há mais resultados

### 3.3 Filtro de tipo na UI

- [ ] Clicar em "Animes" filtra resultados para apenas animes
- [ ] URL atualiza com `&type=anime`
- [ ] Clicar em "Todos" remove o filtro
- [ ] Filtro e busca de texto combinam (buscar "Naruto" + filtro "Filme")

### 3.4 Debounce

- [ ] Digitar rapidamente não dispara uma requisição por tecla
- [ ] Requisição dispara ~300ms após parar de digitar

### 3.5 Estados de loading

- [ ] Durante busca, indicador "Buscando..." aparece
- [ ] Botão "Buscar" fica disabled durante loading
- [ ] Botão "Carregar mais" fica disabled durante loading

### 3.6 Estado vazio

- [ ] Buscar por termo que não existe mostra "Nenhum resultado para \"X\""
- [ ] Mensagem de dica ("Tente termos diferentes...") aparece

### 3.7 Paginação na UI

- [ ] Clicar "Carregar mais" acrescenta resultados ao grid (não substitui)
- [ ] "Carregar mais" desaparece quando não há mais resultados
- [ ] Estado de loading durante "Carregar mais" é visível

### 3.8 Filtro NSFW ( quando usuário logado )

- [ ] Conteúdo marcado `is_adult=true` não aparece na busca quando usuário tem `enable_nsfw_filter=true`
- [ ] Conteúdo `is_adult=true` aparece quando `enable_nsfw_filter=false` (ou ausente)
- [ ] Usuário não logado: conteúdo NSFW está filtrado por padrão

---

## 4. Validar Filtros

### 4.1 Filtro `type` — cobertura completa

Teste cada tipo individualmente:

```bash
for t in movie tv_series anime manga manhwa manhua novel book game; do
  count=$(curl -s "http://localhost:3000/api/search?q=test&type=$t" | jq '.results | length')
  echo "$t: $count"
done
```

- [ ] Cada tipo retorna apenas resultados daquele tipo
- [ ] Tipos sem resultados retornam array vazio (não erro)

### 4.2 Filtro de texto (`q`)

- [ ] Busca por título parcial funciona (ex: "Nar" encontra "Naruto")
- [ ] Busca case-insensitive funciona
- [ ] Caracteres especiais são tratados (ex: "Naruto Shippuden" com aspas, acentos)
- [ ] Busca com termos compostos funciona (espaço como separador de palavras no websearch)

### 4.3 Combinação de filtros

- [ ] `q` + `type` + `limit` + `offset` juntos funcionam
- [ ] Resultados respeitam todas as restrições simultaneamente

---

## 5. Validar NSFW

### 5.1 Comportamento padrão (não logado)

- [ ] Usuário não autenticado: `is_adult=true` NÃO aparece nos resultados
- [ ] Verificar com: busca por conteúdo conhecido como adulto e confirmar ausência

### 5.2 Usuário logado com filtro ativado

- [ ] Perfil com `enable_nsfw_filter=true`: NSFW filtrado
- [ ] Perfil com `enable_nsfw_filter=false`: NSFW visível
- [ ] Perfil sem campo `enable_nsfw_filter` (legado): NSFW filtrado (comportamento seguro por padrão)

### 5.3 Dados de teste para NSFW

- [ ] Pelo menos 1 entrada em `media_catalog` tem `is_adult=true`
- [ ] Pelo menos 1 entrada tem `is_adult=false`
- [ ] Verificar que o filtro realmente separa os dois casos

---

## 6. Validar Resposta da API

### 6.1 Forma da resposta

```bash
curl -s "http://localhost:3000/api/search?q=Naruto" | jq 'keys'
```

- [ ] Top-level tem exatamente: `results`, `pagination`, `source`
- [ ] Sem campos extras inesperados

### 6.2 Forma de cada resultado

```bash
curl -s "http://localhost:3000/api/search?q=Naruto" | jq '.results[0] | keys'
```

- [ ] Campo `title` existe e é string não-vazia
- [ ] Campo `mediaTypeLabel` existe e é string
- [ ] Campo `id` existe
- [ ] Campos de manchete/capa (`cover_url`, `backdrop_url`) existem (podem ser null)
- [ ] Campos numéricos (`release_year`, `user_score_global`, `total_episodes`, etc.) existem

### 6.3 Tratamento de erro

| Situação | Status esperado |
|---|---|
| `q` ausente | 400 |
| `q` vazio | 400 |
| `q` > 100 chars | 400 |
| `type` inválido | 400 |
| `limit` < 1 ou > 50 | 400 |
| `offset` negativo | 400 |
| Erro interno do banco | 500 |

- [ ] Cada caso de erro retorna JSON com `{ error: "...", details?: {...} }`
- [ ] Erros de validação incluem `details` com campos problemáticos (Zod)

### 6.4 Performance

- [ ] Tempo de resposta para busca com 1 termo < 500ms (com banco populado)
- [ ] Pg_trgm está usando índice (verificar `EXPLAIN` no banco se possível)

---

## 7. Validar Paginação

### 7.1 Comportamento do `hasMore`

> ⚠️ **Bug conhecido no código atual (route.ts linha 146):**
> `hasMore: enrichedResults.length === limit` — quando o total exato é múltiplo de `limit`, na última página cheia o `hasMore` fica `true` incorretamente.

**Teste:**

```bash
# Suponha 40 resultados totais para "X"
curl -s "http://localhost:3000/api/search?q=X&limit=20&offset=0" | jq '.pagination.hasMore'  # true (correto)
curl -s "http://localhost:3000/api/search?q=X&limit=20&offset=20" | jq '.pagination.hasMore'  # true (ERRADO — deveria ser false)
```

- [ ] **Correção necessária:** `hasMore` deve usar contagem total ou verificar se `offset + limit` ultrapassa o total
- [ ] Alternativa: usar `count: 'exact'` no select e comparar

### 7.2 Fronteira de paginação

- [ ] `offset=0` funciona (primeira página)
- [ ] `offset` além do total retorna array vazio e `hasMore=false`
- [ ] Não há duplicação de resultados entre páginas
- [ ] `limit` máximo de 50 é respeitado (solicitar 100 deve ser rejeitado ou limitado)

### 7.3 Paginação com filtro de tipo

- [ ] Paginação funciona quando `type` é especificado
- [ ] `hasMore` reflete corretamente o número de resultados do tipo filtrado

---

## 8. Critérios de Aceitação do Issue #6

| # | Critério | Status | Observação |
|---|---|---|---|
| AC1 | Busca retorna resultados reais do `media_catalog` via pg_trgm | **needs_data** | Lógica implementada, mas banco vazio (`media_catalog=0`) |
| AC2 | Endpoint `/api/search` responde com 200 e estrutura esperada | **needs_data** | Código pronto, requer dados para testar |
| AC3 | Validação de parâmetros com Zod (q obrigatório, limit/offset, type enum) | **covered** | `SearchQuerySchema` no route.ts |
| AC4 | Filtro por tipo de mídia (`type` param) | **covered** | Linha 95-97 do route.ts; UI em page.tsx linhas 105-122 |
| AC5 | Paginação (`limit` + `offset` + `hasMore`) | **covered** (com ressalva) | Implementada, mas `hasMore` tem bug de múltiplos exatos — ver seção 7.1 |
| AC6 | Filtro NSFW para usuários não logados (padrão on) | **covered** | Linha 109-112 do route.ts |
| AC7 | Filtro NSFW para usuários logados (respeita `enable_nsfw_filter`) | **covered** | Linha 100-108 do route.ts |
| AC8 | Título resolvido com preferência de idioma (i18n) | **covered** | Linha 125-139; usa `resolveTitle` + `pickLanguagePref` |
| AC9 | Ordenação por `user_score_global` (decrescente, nulls last) | **covered** | Linha 93 do route.ts |
| AC10 | Rótulos de tipo em PT-BR (`mediaTypeLabel`) | **covered** | `getMediaTypeLabel` linha 155-168 |
| AC11 | UI de busca com input, submit, filtros de tipo | **covered** | page.tsx completo |
| AC12 | UI mostra grid de resultados com StreamingGrid | **covered** | page.tsx linha 139-142 |
| AC13 | UI mostra "Nenhum resultado" quando não há resultados | **covered** | page.tsx linha 151-156 |
| AC14 | UI tem botão "Carregar mais" para paginação | **covered** | page.tsx linha 143-149 |
| AC15 | Debounce de 300ms na busca por digitação | **covered** | `useDebounce(query, 300)` linha 37 |
| AC16 | Script validador roda e confirma conectividade | **needs_data** | validate-search.cjs roda, mas só testa banco + AniList público, não o endpoint `/api/search` |
| AC17 | Validar `get_recommendations` e `get_horizons` (mencionados no issue) | **missing** | Não implementados no escopo deste issue; issue menciona mas não detalha |
| AC18 | Documentação de validação para quando banco+API disponíveis | **covered** | Este arquivo (`SEARCH_VALIDATION_CHECKLIST.md`) |

---

## 9. Resumo de Status

- **Covered (14):** AC3, AC4, AC5 (com ressalva), AC6, AC7, AC8, AC9, AC10, AC11, AC12, AC13, AC14, AC15, AC18
- **Needs data (3):** AC1, AC2, AC16 — código pronto, precisa de banco populado
- **Missing (1):** AC17 — `get_recommendations` e `get_horizons` não estão implementados
- **Bug conhecido (1):** AC5 — `hasMore` incorreto quando total é múltiplo de `limit`

---

## 10. Bugs Identificados e Correções Aplicadas

### Bug 1: `hasMore` incorreto com total múltiplo de limit

**Arquivo:** `src/app/api/search/route.ts` linha 146

**Problema:** `hasMore: enrichedResults.length === limit` assume que se o último lote veio cheio, ainda há mais resultados. Mas se o total exato é múltiplo de `limit`, a última página é cheia e não há mais.

**Correção:** Já aplicada no código atual: `fetchLimit = limit + 1` (linha 64) e `hasMore: localResults.length > limit` (linha 141). Ao buscar `limit+1` itens e retornar apenas `limit`, se o resultado retornado tem exatamente `limit` itens então há mais páginas; se tem menos, é a última página. Trecho relevante:

```typescript
// src/app/api/search/route.ts (linhas 62-65, 97, 141)
const fetchLimit = limit + 1;
// ...
.range(offset, offset + fetchLimit - 1)
// ...
hasMore: localResults && localResults.length > limit,
```

---

## Critérios Adicionais Identificados (não no issue original, mas importantes)

- [ ] Rate limiting na API de busca (proteção contra abuso)
- [ ] Logs de busca para analytics (termo, tipo, timestamp)
- [ ] Cache HTTP (Cache-Control) para buscas frequentes
- [ ] Tratamento de busca com apenas espaços/somente stopwords
