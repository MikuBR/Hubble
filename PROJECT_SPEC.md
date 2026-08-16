# Project HUBBLE — Spec v4.0

> **Source of truth para o projeto.** Tudo que diverge daqui é bug.
> Última atualização: 2026-08-16. Baseado no Relatório Técnico v2.0 + decisões da análise competitiva.

---

## 0. Visão em 30 segundos

**HUBBLE** é um rastreador de mídia **unificado, privado, offline-first**. Uma única aplicação que substitui Letterboxd + AniList + MAL + Trakt + MangaUpdates.

**Diferencial:** Privacy by design (zero social) + UI Camaleão (adapta ao tipo de mídia) + Algoritmo "Novos Horizontes" (anti-bolha).

**Stack:** Next.js 15 (App Router) + Supabase (Postgres + Auth + Edge Functions) + Tailwind v4 (CSS-first) + Vitest.

**Princípios:**
1. Privacy by Design — dados nunca saem do controle do usuário
2. Offline-First — UI nunca trava esperando rede
3. Optimistic UI — latência percebida = zero
4. Camaleão Semântico — UX adapta ao conteúdo
5. Fail Gracefully — degradação elegante

---

## 1. Escopo

### 1.1 In-Scope (MVP)
- Auth: email + OAuth Google/GitHub via Supabase
- Catálogo unificado de 9 tipos de mídia: movie, tv_series, anime, manga, manhwa, manhua, novel, book, game
- Busca local-first (pg_trgm) + fallback APIs externas (TMDB, AniList)
- Tracker: progresso por unidade (episódio/capítulo), status, score, rewatch_count, insights Markdown privados
- Camaleão UI: Modo Streaming (cinema imersivo) + Modo Lista Premium (tabela compacta)
- Algoritmo "Novos Horizontes" — recomenda gêneros não explorados
- Filtro NSFW com reveal manual
- Import de Letterboxd (CSV) e AniList (JSON)
- Export JSON
- Temas claro/escuro manuais
- Mobile responsive (PWA-ready)

### 1.2 Out-of-Scope (anti-features)
- ❌ Rede social: sem feeds, follows, likes, comments
- ❌ Reprodução de mídia: não hospeda filmes/animes/mangás
- ❌ Recomendações baseadas em comunidade
- ❌ Trending público
- ❌ App mobile nativo no MVP
- ❌ Versão paga / paywall
- ❌ API pública
- ❌ Analytics invasivos

---

## 2. Stack Tecnológica

### 2.1 Frontend
| Camada | Escolha | Justificativa |
|---|---|---|
| Framework | **Next.js 15** (App Router, React 19) | SSR + RSC + streaming = UX rápida |
| Linguagem | **TypeScript strict** | Segurança de tipos |
| Styling | **Tailwind v4 CSS-first** (`@import "tailwindcss"` + `@theme`) | Sem runtime, modern default |
| Estado servidor | Nativo (`useOptimistic` + `useTransition`) | Sem TanStack Query no MVP |
| Estado cliente | **Zustand** (apenas UI efêmera) | Leve, ergonômico |
| Animações | **Framer Motion** (micro-only) | Suaviza transições Camaleão |
| Markdown | **react-markdown** + **rehype-sanitize** | CRÍTICO: previne XSS em insights |
| Validação | **Zod** (compartilhado FE/BE) | Single source of truth |

### 2.2 Backend
| Camada | Escolha | Justificativa |
|---|---|---|
| API | **Next.js Route Handlers** | Co-localizado, sem servidor extra |
| Auth | **Supabase Auth** | OAuth + email magic link |
| DB | **PostgreSQL 15** (Supabase) | pg_trgm (busca), pg_cron (jobs) |
| Edge Functions | **Supabase Edge Functions** (Deno) | Cron de ingestão de AODB |
| Cache | **Upstash Redis** (futuro) | Rate limiter + sync queue |

### 2.3 Infraestrutura
| Camada | Escolha |
|---|---|
| Hosting | Vercel (free tier) |
| DB | Supabase Cloud (free tier) |
| Cron jobs | `pg_cron` nativo (NÃO GitHub Actions) |
| CDN | Cloudflare |
| Monitoring | Sentry + Plausible |
| Repo | Este GitHub |

---

## 3. Modelo de Dados

### 3.1 Enums

```sql
CREATE TYPE media_type_enum AS ENUM (
    'movie', 'tv_series', 'anime',
    'manga', 'manhwa', 'manhua',
    'novel', 'book', 'game'
);

CREATE TYPE user_status_enum AS ENUM (
    'planning', 'watching', 'paused',
    'completed', 'dropped', 'rewatching'
);

CREATE TYPE age_rating_br_enum AS ENUM ('L', '10', '12', '14', '16', '18');

CREATE TYPE prestige_badge_enum AS ENUM ('none', 'nominee', 'winner');
```

### 3.2 Tabelas

**`profiles`** — preferências do usuário (1:1 com auth.users)
- `default_view_mode TEXT` ('auto' | 'streaming' | 'reading')
- `theme TEXT` ('light' | 'dark' | 'system')
- `enable_nsfw_filter BOOLEAN DEFAULT TRUE`
- `enable_streaming BOOLEAN DEFAULT TRUE` (desativar se não consome vídeo)
- `enable_reading BOOLEAN DEFAULT TRUE` (desativar se não consome leitura)
- `preferred_language_western TEXT` ('pt-BR' | 'en' | 'es')
- `preferred_language_oriental TEXT` ('romaji' | 'en' | 'pt-BR' | 'native')

**`media_catalog`** — banco unificado de obras (público para leitura)
- IDs cruzados: `tmdb_id`, `anilist_id`, `mal_id`, `kitsu_id`, `mangadex_id`, `openlibrary_id`
- Títulos multi-idioma: `title_default`, `title_romaji`, `title_english`, `title_native`, `title_ptbr`
- Metadados: `synopsis`, `cover_url`, `backdrop_url`, `release_year`, `release_status`
- Contagem: `total_episodes`, `total_chapters`, `total_volumes`, `duration_minutes`
- Classificação: `age_rating_br`, `is_adult`, `prestige_badge`, `genres TEXT[]`, `themes TEXT[]`, `studios TEXT[]`
- **Índices:** pg_trgm em `title_default`, BTREE parciais em `anilist_id`/`tmdb_id` WHERE NOT NULL

**`user_media_progress`** — tracking do usuário (RLS: user só vê seus dados)
- `status user_status_enum`
- `current_unit INT` (episódio ou capítulo)
- `total_units_at_completion INT` (snapshot)
- `user_score NUMERIC(3,1)` (0.0 a 10.0)
- `rewatch_count SMALLINT DEFAULT 0`
- `started_at DATE`, `completed_at DATE`, `last_interaction_at TIMESTAMPTZ`
- `private_insights TEXT` (Markdown seguro)
- `private_spoilers TEXT` (Markdown com sintaxe `||spoiler||`)
- **UNIQUE(user_id, media_id)**

**`user_tag_preferences`** — algoritmo de afinidade (PK composta)
- `tag_type TEXT` ('genre' | 'theme' | 'studio')
- `tag_name TEXT`
- `score INT` CHECK (-50 a 100)

**`media_titles_i18n`** — títulos extras por idioma (PK composta)

**`awards`** — prêmios editoriais para o badge (admin-only via `is_admin`)

**`export_logs`** — auditoria de exports

**`ingestion_logs`** — logs das execuções do cron de AODB

### 3.3 Triggers

1. **`set_updated_at`** — auto-update de `updated_at` em profiles/progress
2. **`recompute_tag_preferences`** — quando `user_score` muda em obras `completed`:
   - score ≥ 8.0 → +10 para cada gênero
   - score ≤ 5.0 → -5 para cada gênero
   - score entre 5.1 e 7.9 → sem mudança
   - clamp em [-50, +100]
3. **`validate_progress_increment`** — bloqueia incremento se `release_status = 'hiatus'`
4. **`handle_new_user`** — após signup, cria `profiles` automaticamente

### 3.4 Row Level Security

```sql
-- profiles: user só vê/edita o próprio
CREATE POLICY "profile_self" ON profiles FOR ALL USING (auth.uid() = id);

-- progress: idem
CREATE POLICY "progress_self" ON user_media_progress FOR ALL USING (auth.uid() = user_id);

-- tag_prefs: idem
CREATE POLICY "tag_prefs_self" ON user_tag_preferences FOR ALL USING (auth.uid() = user_id);

-- media_catalog: leitura pública, escrita só pelo ingestor (service role)
CREATE POLICY "media_read_all" ON media_catalog FOR SELECT USING (TRUE);
```

---

## 4. Camaleão UI

### 4.1 Streaming Mode (movie, tv_series, anime, dorama)
- Tema escuro fixo (zinc-950) simulando sala de cinema
- Backdrop full-width no topo (60vh)
- Pôsteres em grade responsiva (2/3/4/5/6 colunas)
- Hover sutil: escala 1.02 + sombra
- Tipografia: Inter (UI) + JetBrains Mono (numéricos)
- Badge de classificação etária BR nativo (selo visual)
- Distintivo de Prestígio (🏆 winner / 🎖 nominee)

### 4.2 Reading Mode (manga, manhwa, manhua, novel, book)
- Alta densidade: tabela compacta otimizada para scan
- Sem backdrops pesados (perf em listas de 500+)
- Tipografia: Inter + Noto Sans JP/KR/CJK (títulos nativos)
- Tema claro/escuro controlado pelo usuário
- Controles inline: `+1 Cap`, dropdown de status, score stars
- Auto-save de insights com debounce 1.5s

### 4.3 Routing
- `media_type` decide qual modo renderizar
- `default_view_mode` no profile permite override manual
- Toggle por mídia via querystring `?view=reading`

---

## 5. Algoritmos

### 5.1 Busca Híbrida (Local-First)
```
Query do usuário
    ↓
[1] pg_trgm em media_catalog (instantâneo, offline)
    ↓
[2] Cache HIT? → retorna
    ↓ MISS
[3] Consulta TMDB / AniList (com rate limiting token-bucket)
    ↓
[4] Upsert em media_catalog + retorna
```

### 5.2 Rate Limiter (Token Bucket)
- Capacidade: 50 req (TMDB free tier)
- Refill: 1 req/segundo
- Backoff exponencial em 429

### 5.3 "Novos Horizontes" (Anti-Bolha)
```sql
SELECT m.*
FROM media_catalog m
WHERE m.id NOT IN (
    SELECT media_id FROM user_media_progress WHERE user_id = $1
)
AND m.user_score_global > 8.0
AND NOT EXISTS (
    SELECT 1 FROM unnest(m.genres) AS genre
    JOIN user_tag_preferences utp
        ON utp.tag_name = genre
        AND utp.user_id = $1
        AND utp.score != 0
)
LIMIT 20;
```

### 5.4 Title Resolver (Multi-Idioma)
```typescript
function resolveTitle(media, userPref: 'pt-BR' | 'en' | 'romaji' | 'native'): string {
    const lookup = {
        'pt-BR': media.title_ptbr,
        'en': media.title_english,
        'romaji': media.title_romaji,
        'native': media.title_native,
    };
    return lookup[userPref]
        || lookup['romaji']
        || lookup['en']
        || media.title_default
        || 'Sem título';
}
```

---

## 6. Ingestão Offline-First

### 6.1 AODB (Anime Offline Database)
- **Fonte:** `https://github.com/manami-project/anime-offline-database/releases/latest/download/anime-offline-database-minified.json`
- **Tamanho:** ~80MB, ~41k entradas
- **Frequência:** semanal (domingo 3h UTC via `pg_cron` + Edge Function)
- **⚠️ Cobertura:** APENAS anime. Manga/manhwa/manhua vêm via AniList API no search-fallback.
- **⚠️ URL do Kitsu:** `https://kitsu.app/anime/{id}` (NÃO `kitsu.io/`)
- **Schema AODB:** `{ $schema, license, repository, scoreRange, lastUpdate, data: Anime[] }`
- **Campos Anime:** `sources[]`, `title`, `type`, `episodes`, `status`, `animeSeason`, `picture`, `thumbnail`, `duration`, `score`, `synonyms[]`, `studios`, `producers`, `relatedAnime`, `tags[]`

### 6.2 Edge Function `ingest-aodb`
1. Download streaming do JSON (~80MB)
2. Parse via `JSONStream` (não carrega tudo na RAM)
3. Para cada entry: extrai anilist_id, mal_id, kitsu_id via regex nas `sources[]`
4. Batch upsert de 1000 em `offline_anime_mapping` usando service_role key
5. Log em `ingestion_logs`

### 6.3 Cron Job
```sql
SELECT cron.schedule(
    'weekly-aodb-ingest',
    '0 3 * * 0',
    $$SELECT net.http_post(
        url := '<project>.supabase.co/functions/v1/ingest-aodb',
        headers := jsonb_build_object('Authorization', 'Bearer ' || current_setting('app.cron_secret'))
    )$$
);
```

---

## 7. Segurança (Defesa em 7 Camadas)

| # | Camada | Implementação |
|---|---|---|
| 1 | Auth | Supabase Auth (email + OAuth) |
| 2 | RLS | Row Level Security em TODAS as tabelas de usuário |
| 3 | Validação | Zod em TODA entrada (Route Handlers) |
| 4 | Sanitização | rehype-sanitize em TODO markdown |
| 5 | Rate Limit | Token bucket adaptativo (Upstash futuro) |
| 6 | CSP | next.config.js com CSP strict |
| 7 | Secrets | Variáveis de ambiente + Supabase Vault |

### Variáveis de Ambiente (`.env.example`)
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=          # Pública, RLS enforced
SUPABASE_SERVICE_ROLE_KEY=              # SERVER-ONLY, nunca client
TMDB_API_KEY=
ANILIST_CLIENT_ID=                      # público
ANILIST_CLIENT_SECRET=                  # privado
SENTRY_DSN=
PLAUSIBLE_DOMAIN=
CRON_SECRET=                            # autentica pg_cron → Edge Function
```

---

## 8. Estrutura de Pastas (Feature-Sliced Design)

```
hubble/
├── .github/workflows/ci.yml             # Lint + Type + Test
├── supabase/
│   ├── migrations/
│   │   ├── 0001_init_schema.sql         # Enums + tabelas + RLS
│   │   ├── 0002_triggers.sql            # 4 triggers
│   │   └── 0003_cron_jobs.sql           # pg_cron schedule
│   ├── functions/
│   │   └── ingest-aodb/index.ts
│   └── seed.sql
├── scripts/
│   └── ingest-aodb.js                   # versão Node (alternativa local)
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx                 # Home (continue assistindo/lendo)
│   │   │   ├── library/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── watching/page.tsx
│   │   │   │   ├── reading/page.tsx
│   │   │   │   └── completed/page.tsx
│   │   │   ├── media/[id]/page.tsx
│   │   │   ├── search/page.tsx
│   │   │   ├── recommendations/page.tsx # Novos Horizontes
│   │   │   ├── settings/page.tsx
│   │   │   ├── import/page.tsx
│   │   │   └── admin/awards/page.tsx
│   │   ├── api/
│   │   │   ├── search/route.ts
│   │   │   ├── progress/[id]/route.ts
│   │   │   ├── insights/[id]/route.ts
│   │   │   ├── import/route.ts
│   │   │   └── export/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── features/
│   │   ├── auth/
│   │   ├── media-tracking/
│   │   ├── insights/
│   │   ├── recommendation/
│   │   ├── import-export/
│   │   └── i18n/
│   ├── shared/
│   │   ├── ui/                          # Button, Card, Modal, Toast
│   │   ├── hooks/                       # useDebounce, useLocalStorage
│   │   └── lib/                         # api-client, validators
│   ├── widgets/                         # header, sidebar, media-grid
│   └── lib/
│       └── supabase/
│           ├── client.ts                # browser (createBrowserClient)
│           ├── server.ts                # server (createServerClient + cookies)
│           └── middleware.ts            # session refresh
├── tests/
│   └── unit/
│       ├── titles.test.ts
│       ├── ratings.test.ts
│       └── aodb-parse.test.ts
├── middleware.ts                        # ROOT: Supabase session refresh
├── .env.example
├── .env.local
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

---

## 9. Edge Cases

| Caso | Solução |
|---|---|
| Obra em hiato | `release_status='hiatus'` + trigger bloqueia `+1` |
| Obra sem total definido | Exibe `progress_atual / ?` |
| NSFW | `is_adult=TRUE` + `backdrop-filter: blur(20px)` + botão "revelar" |
| Simulcast | Lock de +1h após JST raw; UI exibe "Aguardando legenda" |
| Mídia deletada da API | Mantém cópia em `media_catalog`; status `orphaned` |
| Duplicate entries | Trigger vincula por IDs cruzados (tmdb↔anilist) |
| Progress > total | CHECK constraint + UI warning |
| Score inválido | CHECK + Zod |
| Empty insights | Auto-save com debounce 1.5s + localStorage fallback |
| Timezone | Armazenar UTC, exibir via `Intl.DateTimeFormat` |
| Rewatch | `status='rewatching'` + `rewatch_count++` (não reseta) |
| Idioma ausente | Fallback chain: pref → romaji → en → default |
| Imagem quebrada | SVG fallback inline (cinza + ícone) |
| API timeout | 5s timeout → fallback → cache stale |

---

## 10. Performance Targets

| Métrica | Target |
|---|---|
| LCP | < 1.5s |
| FID | < 50ms |
| CLS | < 0.05 |
| TTFB | < 200ms |
| Lighthouse | > 95 |

**Estratégias:**
- SSR + ISR para `/media/[id]` (revalidate 24h)
- Edge runtime para `/api/search` e `/api/progress`
- `next/image` (WebP/AVIF automático)
- Code splitting via Feature-Sliced
- Virtual scrolling >100 itens

---

## 11. Roadmap

### Fase 1 — MVP (8-12 semanas)
- [ ] Auth + Profile auto-creation
- [ ] Adicionar mídia manualmente (busca híbrida)
- [ ] Marcar progresso (optimistic UI)
- [ ] Diary privado (Markdown editor)
- [ ] Import Letterboxd + AniList
- [ ] Export JSON
- [ ] Tema claro/escuro
- [ ] Mobile responsive

### Fase 2 — Discovery (4-6 semanas)
- [ ] Algoritmo Novos Horizontes
- [ ] Estatísticas pessoais
- [ ] "On This Day" widget
- [ ] Smart Lists (filtros salvos)
- [ ] NSFW blur com reveal

### Fase 3 — Integração (4-6 semanas)
- [ ] Import MAL + Trakt
- [ ] Scrobbler (Netflix, Crunchyroll)
- [ ] Share links públicos (opt-in)
- [ ] Webhook pra Mihon/Tachiyomi

### Fase 4 — Polish (contínuo)
- [ ] PWA installable
- [ ] Notificações de simulcast
- [ ] Rewatch tracking completo
- [ ] i18n completo (es, en)

---

## 12. Riscos & Mitigações

| Risco | P | I | Mitigação |
|---|---|---|---|
| Supabase muda pricing | M | H | Abstrair DB |
| APIs externas mudam termos | H | M | Cache offline-first |
| Usuário perde email | L | H | Magic link + recovery codes |
| XSS via markdown | M | C | rehype-sanitize + CSP |
| LGPD/GDPR violation | L | C | Privacy by design |
| Rate limit no pico | M | M | Token bucket + queue |
| Banco cresce demais | L | M | Particionamento |

---

## 13. Convenções

- **Commits:** Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- **Branches:** `main` (protegida), `feat/<slug>`, `fix/<slug>`
- **PRs:** 1 feature por PR, descrição + screenshots se UI
- **TS:** strict mode, sem `any`
- **Imports:** absoluto via `@/*` (configurado no tsconfig)
- **Testes:** Vitest, sem e2e no MVP

---

## Apêndice A — Comandos Rápidos

```bash
# Setup
npm install
cp .env.example .env.local  # editar com chaves Supabase

# Dev
npm run dev                 # Next.js dev server
npm run build               # build de produção
npm run lint                # ESLint
npm run typecheck           # tsc --noEmit
npm run test                # Vitest

# Supabase (se CLI instalado)
supabase init
supabase start
supabase db push
supabase gen types --local > src/types/database.types.ts
```

## Apêndice B — Glossário

- **AODB** — Anime Offline Database (dataset estático, ~41k animes)
- **Camaleão** — UI adaptativa por tipo de mídia
- **Furo de Bolha** — Recomenda gêneros nunca explorados
- **Hiato** — Obra pausada pelo autor
- **Optimistic UI** — Atualiza local antes do servidor confirmar
- **RLS** — Row Level Security (Postgres)
- **Simulcast** — Estreia simultânea multi-região
- **Vinculum** — Sincronia entre obra externa e tracking local (termo do projeto)
