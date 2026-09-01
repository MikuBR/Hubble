# B0/B1B — Como Rodar com Credenciais

Após configurar `.env.local` com `ANILIST_CLIENT_ID`, `ANILIST_CLIENT_SECRET`,
`TMDB_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`:

## 1. Migrar bucket avatars (1×)

```bash
# Criar o bucket físico no Supabase
supabase storage create avatars --public

# Aplicar migration (RLS policies + registro do bucket)
supabase db push
# ou, se migrando apenas essa:
supabase db migrate up 20260821000001
```

## 2. Enriquecer via AniList (anime, visual novel etc.)

```bash
node scripts/enrich-from-anilist.js
```

Le mapeamentos de `offline_anime_mapping` com `anilist_id` e consulta
`Media(id)` via GraphQL. Suporta todos os tipos AniList: ANIME, MANGA,
MANHWA, MANHUA, NOVEL, ONE_SHOT, VISUAL_NOVEL (mappa `VISUAL_NOVEL→game`,
`VIZ_NOVEL→novel`). Formato: `MEDIA_FORMAT (TV→anime, MOVIE→movie, MANGA→manga...)`.
Fallback para `coverImage.large` quando `bannerImage` ausente.

## 3. Enriquecer via AniList (Manga/Manhwa/Manhua direto, sem mapeamento)

```bash
node scripts/enrich-manga-anilist.js
```

Consulta `Page.media(type: MANGA, countryOfOrigin: JP|KR|CN)` paginada.
Alvos: 500 manga + 100 manhwa + 50 manhua.

## 4. Enriquecer via TMDB (filmes + séries)

```bash
# Versão completa com detail calls (recomendada)
node scripts/enrich-tmdb.js          # 200 filmes + 200 séries

# Opções
node scripts/enrich-tmdb.js --limit 50        # 50 filmes + 50 séries (rápido teste)
node scripts/enrich-tmdb.js --skip-detail     # só discover, sem /movie/{id}
node scripts/enrich-tmdb.js --dry-run         # loga, não upserta

# Versão legacy (80 filmes + 50 séries, gênero como placeholder GM{id})
node scripts/enrich-from-tmdb.mjs
```

## 5. Popular media_titles_i18n

```bash
node scripts/enrich-titles-i18n.js
```

Le todos registros de `media_catalog` e insere títulos em 5 idiomas
(default, en, pt-BR, native, romaji). Se `ANILIST_*` disponíveis,
consulta synonyms do AniList e concatena na linha `language='synonym'`.
Funciona em modo offline (sem `ANILIST_*`), usando apenas os campos
title_* do catálogo.

## Ordem recomendada

1. `enrich-from-anilist.js` (anime/novels existentes em offline_anime_mapping)
2. `enrich-manga-anilist.js` (manga/manhwa/manhua)
3. `enrich-tmdb.js` (filmes + séries)
4. `enrich-titles-i18n.js` (depende do catálogo populado)

## Rate limits
- AniList: 60 req/min (configurado no script, safe margin)
- TMDB: 40 req/s (scripts usam ~1 concorrente, bem dentro do limite)

## Notas
- Todos os scripts usam `onConflict` (upsert por `anilist_id` ou `tmdb_id`),
  portanto podem ser re-executados sem criar duplicatas.
- `enrich-from-anilist.js` roda contra `offline_anime_mapping`; se a tabela
  estiver vazia, execute primeiro `scripts/ingest-aodb.js`.
- Para debug sem efeitos colaterais: `node scripts/enrich-tmdb.js --dry-run`.