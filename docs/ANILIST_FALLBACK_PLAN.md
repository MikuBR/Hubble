# ANILIST_FALLBACK_PLAN.md — Plano de Fallback para Enriquecimento

> Status (2026-09-08): API AniList retornando **403 "instabilidade severa"**.
> Banco Supabase indisponível (projeto deletado, DNS não resolve).
> Este plano cobre o período de indisponibilidade e a retomada.

---

## 1. Cenário atual

- `offline_anime_mapping` tem ~33.865 registros com `anilist_id` mapeados.
- `media_catalog` **vazio** (nenhum item populado desde a recriação do projeto).
- Meta do backlog: **~2.100 itens** — 1.000 anime + 500 manga + 100 manhwa + 50 manhua + 200 filmes + 200 séries + 50 novels.
- `scripts/enrich-from-anilist.js` e `scripts/enrich-manga-anilist.js` existem mas **não podem rodar** enquanto AniList estiver 403 e/ou o Supabase estiver offline.

---

## 2. Monitoramento do status AniList

| Fonte | URL | Frequência sugerida |
|---|---|---|
| Status oficial | https://status.anilist.co | Manual, 2x/dia durante outage |
| Issue tracker | https://github.com/AniList/AniList/issues | A cada dia |
| Teste de saúde | `curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"query":"query{Media(id:1){id}}"}' https://graphql.anilist.co` | Antes de cada tentativa de enriquecimento |

Considera-se a API "voltada" quando:
1. `curl` retorna HTTP **200** (não 403/503/429).
2. Resposta contém `data.Media.id === 1`.
3. Dois testes consecutivos a 10 min de distância passam.

---

## 3. Estratégia de fallback por tipo de mídia

### 3.1 Filmes + Séries (200 + 200) — **usar TMDB imediatamente**

`scripts/enrich-tmdb.js` está implementado, não depende do AniList.

```bash
node scripts/enrich-tmdb.js              # 200 filmes + 200 séries
node scripts/enrich-tmdb.js --limit 50   # smoke test rápido
```

Requer: `TMDB_API_KEY` em `.env.local`. Se a chave estiver vazia, gerar em https://www.themoviedb.org/settings/api.

### 3.2 Anime (1.000) — **esperar AniList, sem substituto viável**

Substitutos avaliados:

| Fonte | Prós | Contras | Veredito |
|---|---|---|---|
| MyAnimeList API | Cobertura parecida, estável | API mal documentada, GraphQL não oficial, rate limit 1 req/s | Backup de emergência, não recomendado |
| Kitsu GraphQL | API GraphQL, estável | Cobertura menor (foco em animes ocidentais), sem manhwa/manhua | Só para fill |
| ANN (Anime News Network) | Muito completo | Sem API oficial, precisa scraping | Inviável |

**Decisão**: esperar AniList voltar. Enquanto isso, se houver urgência, gerar um subconjunto "curado" manual de ~100 animes populares e inserir direto via SQL (dados coletados via UI AniList ou MAL).

### 3.3 Manga + Manhwa + Manhua (500 + 100 + 50) — **usar MangaDex ou AniList**

AniList cobre todos os três tipos via `Page.media(type: MANGA, countryOfOrigin: JP|KR|CN)`. Sem substituto completo.

**Alternativa emergencial**: MangaDex API (https://api.mangadex.org) — cobre mangá japoneses e webtoons (manhwa/manhua) mas **não mapeia para AniList IDs**. Precisa migration para popular `mangadex_id` (coluna já existe no schema, UNIQUE).

### 3.4 Novels (50) — **AniList via `type: NOVEL`**

Só AniList cobre light novels com qualidade. Sem fallback prático.

---

## 4. Sequência de execução recomendada

### Fase 1: Enquanto AniList estiver 403 (agora)
```bash
# 1. Confirmar banco Supabase voltado (senão nada roda)
psql "$SUPABASE_URL" -c '\dt'

# 2. Enriquecer filmes/séries via TMDB (independente do AniList)
node scripts/enrich-tmdb.js

# 3. Validar que TMDB populou media_catalog corretamente
psql "$SUPABASE_URL" -c "SELECT media_type, COUNT(*) FROM media_catalog GROUP BY 1;"
# Esperado: movie=200, tv_series=200

# 4. Rodar enrich-titles-i18n.js para propagar títulos dos filmes/séries
node scripts/enrich-titles-i18n.js
```

### Fase 2: Assim que AniList voltar
```bash
# 1. Teste de saúde AniList
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"query":"query{Media(id:1){id title{romaji}}}"}' \
  https://graphql.anilist.co
# Esperado: 200 + JSON com data.Media.id=1

# 2. Animés primeiro (base da recomendação)
node scripts/enrich-from-anilist.js
# Duração estimada: 33.865 mapeamentos × ~1s = ~9,5 h (se todos)
# Na prática: filtra apenas os primeiros 1000 por popularidade → ~30 min

# 3. Mangá/Manhwa/Manhua
node scripts/enrich-manga-anilist.js
# Duração estimada: 650 mídias descobertas → ~20 min

# 4. Repopular títulos i18n com synonyms AniList
node scripts/enrich-titles-i18n.js

# 5. Validar contagens finais
psql "$SUPABASE_URL" -c "SELECT media_type, COUNT(*) FROM media_catalog GROUP BY 1 ORDER BY 1;"
```

### Fase 3: Pós-população
- Rodar `scripts/validate-search.cjs` para validar `/api/search` ponta a ponta.
- Verificar `docs/SEARCH_VALIDATION_CHECKLIST.md`.
- População alvo: `media_catalog` com >= 2100 itens.

---

## 5. Riscos e mitigações

| Risco | Impacto | Mitigação |
|---|---|---|
| AniList outage dura semanas | Bloqueio de #5 | Rodar TMDB (Fase 1) + considerar MangaDex para manga |
| `offline_anime_mapping` sem `anilist_id` válido | Falhas silenciosas | Filtro `.not('anilist_id', 'is', null)` + log de SKIP |
| 403 retorna após voltar (auth) | Retry infinito | `fetchWithRetry` trata 403/503 com backoff limitado a 30s |
| Rate limit estourado | Rate limit 60 req/min já conservador | `MAX_CONCURRENT=1`, `REQUEST_DELAY_MS=1000` |
| `media_catalog` corrompido | Rollback | Upsert com `onConflict: 'anilist_id'` — seguro re-executar |

---

## 6. Comandos úteis

```bash
# Ver ingestão recente
psql "$SUPABASE_URL" -c "SELECT * FROM ingestion_logs ORDER BY started_at DESC LIMIT 10;"

# Ver contagem por tipo
psql "$SUPABASE_URL" -c "SELECT media_type, COUNT(*) FROM media_catalog GROUP BY 1 ORDER BY 1;"

# Ver contagem por ano
psql "$SUPABASE_URL" -c "SELECT release_year, COUNT(*) FROM media_catalog GROUP BY 1 ORDER BY 1 DESC;"

# Forçar retry em batch específico (debug)
node scripts/enrich-from-anilist.js  # já é idempotente por anilist_id

# Checar credenciais
grep -E '^(ANILIST_CLIENT_ID|ANILIST_CLIENT_SECRET|TMDB_API_KEY|SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_SUPABASE_URL)=' .env.local
```
