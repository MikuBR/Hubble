# HUBBLE — Setup Local

> Guia para rodar o projeto localmente em menos de 10 minutos.

---

## 1. Pré-requisitos

| Ferramenta | Versão mínima | Como instalar |
|---|---|---|
| Node.js | 20+ | https://nodejs.org/ |
| pnpm | 8+ | `npm install -g pnpm` |
| Git | 2.30+ | https://git-scm.com/ |

*(Opcional)* Conta no Supabase: https://supabase.com/

---

## 2. Clone

```bash
git clone https://github.com/MikuBR/Hubble.git
cd Hubble
```

---

## 3. Instale dependências

```bash
pnpm install
```

---

## 4. Configure o Supabase

### Opção A — Supabase Cloud (recomendado)

1. Crie um projeto em https://supabase.com/dashboard/projects
2. Em **Project Settings → API**, anote:
   - `Project URL`
   - `anon public` key
   - `service_role secret` key
3. Habilite o provider **Email** em **Authentication → Providers**
4. Habilite a extensão `pg_cron` em **Database → Extensions**

### Opção B — Supabase Local (Docker)

```bash
npx supabase init
npx supabase start
```

---

## 5. Variáveis de ambiente

Copie o template e preencha:

```bash
cp .env.example .env.local
```

Edite `.env.local`:

```env
# ── Supabase ──────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key

# ── APIs Externas (opcional) ─────────────────────────────────────────
TMDB_API_KEY=sua-key
ANILIST_CLIENT_ID=
ANILIST_CLIENT_SECRET=

# ── Observabilidade (opcional) ────────────────────────────────────────
SENTRY_DSN=
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=hubble.local

# ── Automação ────────────────────────────────────────────────────────
CRON_SECRET=<openssl rand -hex 32>

# ── App ──────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=HUBBLE
```

> **Importante:** `.env.local` está no `.gitignore` e **nunca** deve ser commitado.

---

## 6. Aplique as migrations

Execute os arquivos SQL em `supabase/migrations/` na ordem:

```
supabase/migrations/
├── 0001_init_schema.sql         # Enums + 9 tabelas + RLS
├── 0002_triggers.sql            # 4 triggers
├── 0003_rpc_functions.sql       # 3 RPCs (get_recommendations, get_horizons, get_user_stats)
├── 0004_fix_signup_and_test_user.sql
├── 0005_fix_validate_progress.sql
├── 0006_fix_get_user_stats.sql
├── 0007_fix_get_user_stats_v2.sql
├── 0008_fix_get_user_stats_v3.sql
├── 0001_fix_handle_new_user_username.sql
├── 0001_enhance_tag_preferences.sql
└── 0001_avatars_bucket.sql
```

### Via SQL Editor do Supabase Dashboard

1. Abra **SQL Editor** no dashboard do seu projeto
2. Cole o conteúdo de cada arquivo em ordem crescente
3. Execute cada um separadamente

### Via Management API (alternativa)

```bash
curl -X POST \
  "https://api.supabase.com/v1/projects/<ref>/database/query" \
  -H "Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>" \
  -H "Content-Type: application/json" \
  -d @supabase/migrations/0001_init_schema.sql
```

---

## 7. Popule o banco (opcional, mas recomendado)

### 7. Popule o banco (opcional, mas recomendado)

#### 7.1 Ingestão do AODB

Gera ~33k mapeamentos anime em `offline_anime_mapping`:

```bash
node scripts/ingest-aodb.js
```

> O script baixa o Anime Offline Database (~80MB) e processa via JSONStream.

### 7.2 Enriquecimento via AniList

Popula `media_catalog` com metadados reais:

```bash
node scripts/enrich-from-anilist.js
```

> Respeita rate limit do AniList (~60 req/min). Pode demorar alguns minutos para 1k+ obras.

### 7.3 Scripts complementares

- `scripts/enrich-manga-anilist.js` — enriquecimento de mangás via AniList
- `scripts/enrich-tmdb.js` — enriquecimento de filmes/séries via TMDB (principal)
- `scripts/enrich-titles-i18n.js` — popula `media_titles_i18n`
- `scripts/seed-demo.cjs` — seed de demonstração (issue #24)
- `scripts/validate-search.cjs` — smoke test de conectividade (NÃO valida `/api/search`)
- `scripts/validate-signup.ts` — validação do fluxo de signup
- `scripts/test-e2e-flow-fixed.js` — validação E2E manual (corrigido)

---

## 8. Rode o projeto

```bash
pnpm dev
```

Acesse http://localhost:3000

---

## 9. Comandos úteis

| Comando | Descrição |
|---|---|
| `pnpm dev` | Inicia o servidor de desenvolvimento (Next.js + Turbopack) |
| `pnpm build` | Build de produção |
| `pnpm start` | Roda o build compilado |
| `pnpm lint` | Lint com ESLint |
| `pnpm typecheck` | Verificação de tipos TypeScript |
| `pnpm test` | Testes unitários com Vitest |
| `pnpm test:watch` | Testes em modo watch |

---

## 10. Estrutura do projeto

```
src/
├── app/                    # App Router (Next.js 15)
│   ├── (auth)/            # Login / Signup
│   ├── (dashboard)/       # Páginas autenticadas
│   │   ├── library/       # Biblioteca
│   │   ├── search/        # Busca unificada
│   │   ├── media/[id]/    # Detalhes da obra
│   │   ├── recommendations/ # Para Você / Novos Horizontes
│   │   ├── settings/      # Perfil e preferências
│   │   └── admin/         # Admin awards
│   │   ├── api/               # Route Handlers
│   └── globals.css        # Tailwind v4
├── shared/
│   ├── ui/                # Componentes reutilizáveis
│   ├── hooks/             # Hooks personalizados
│   └── lib/               # API client + validators Zod
├── lib/                   # Supabase clients + utils
│   ├── supabase/          # client.ts, server.ts, admin.ts
│   ├── i18n/              # Resolvedor de títulos multi-idioma
│   └── utils/             # titles, ratings, cn, aodb-parse
├── types/                 # Tipos TypeScript globais
└── widgets/               # Header, sidebar
supabase/
├── migrations/            # Migrations SQL versionadas
│   ├── 20260816000001_init_schema.sql
│   ├── 20260816000002_triggers.sql
│   ├── 20260816000003_rpc_functions.sql
│   ├── 20260816000004_fix_signup_and_test_user.sql
│   ├── 20260816000005_fix_validate_progress.sql
|| `0006_fix_get_user_stats.sql`
├── `0007_fix_get_user_stats_v2.sql`
├── `0008_fix_get_user_stats_v3.sql`
│   ├── 20260819000001_fix_handle_new_user_username.sql
│   ├── 20260820000001_enhance_tag_preferences.sql
│   └── 20260821000001_avatars_bucket.sql
└── functions/             # Edge Functions (Deno)
scripts/
├── ingest-aodb.js         # AODB → offline_anime_mapping
├── enrich-from-anilist.js # AniList → media_catalog
├── enrich-manga-anilist.js # AniList → media_catalog (mangá)
├── enrich-tmdb.js         # TMDB → media_catalog (principal)
├── enrich-titles-i18n.js  # media_titles_i18n
├── seed-demo.cjs          # Seed de demonstração (#24)
├── validate-search.cjs    # Smoke test (Supabase + AniList)
├── validate-signup.ts     # Validação do signup
└── test-e2e-flow-fixed.js # Validação E2E manual (corrigido)
docs/
├── README.md              # Índice + convenções de contribuição
├── archive/               # Snapshots históricos
│   └── HUBBLE_CONSOLIDATED_ARCHIVE.md
├── reviews/               # Relatórios de revisão/QA
│   ├── QA_CRITICO_REPORT.md
│   └── QA_CRITICO_REPORT_ADICIONAL.md
└── RECOMMENDATION_ALGORITHM_RESEARCH.md, RUN_B0.md, *.md
```

---

## 11. Troubleshooting

### Middleware bloqueando API

Se `/api/*` retornar redirect para `/login`, verifique o matcher em `middleware.ts`:

```ts
matcher: ["/((?!_next/static|_next/image|favicon.ico|api|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"]
```

### AODB ingest falha com redirect

O script já trata redirects manualmente. Se o URL do dataset mudar, atualize em `scripts/ingest-aodb.js`.

### Signup não funciona

Verifique se o provider **Email** está habilitado no Supabase Dashboard → Authentication → Providers.

### Porta 3000 em uso

```bash
PORT=3001 pnpm dev
```

---

## 12. Próximos passos

- Crie sua conta em `/signup`
- Faça login em `/login`
- Busque obras em `/search`
- Adicione à biblioteca e marque progresso

Para contribuir: veja as issues abertas em https://github.com/MikuBR/Hubble/issues.
