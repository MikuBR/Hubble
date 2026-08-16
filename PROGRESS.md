# HUBBLE — Progresso Diário

> Documento vivo de progresso. Atualizado a cada sessão/marco.

---

### 📅 2026-08-16 (Sessão 2 — Enriquecimento + Testes E2E)
### 🎯 Marco: Enriquecimento AniList + Validação Fluxo Completo

**Duração:** ~2 horas
**Commits:** 3 (fixes + test script)

### ✅ Entregue nesta sessão

#### Enriquecimento de Dados
- [x] Script `enrich-from-anilist.js` criado e executado
- [x] **729 animes enriquecidos** inseridos em `media_catalog` (de 730 processados)
- [x] Rate limiting respeitado (60 req/min, 1 concorrente)
- [x] Logs em `ingestion_logs` (source: `anilist_enrichment`)

#### Correções de Triggers
- [x] `handle_new_user` corrigido com fallback seguro para username
- [x] Usuário de teste inserido direto em `auth.users` (bypass temporário)
- [x] `validate_progress_increment` corrigido: ambiguidade de `release_status` resolvida com alias `mc`

#### Testes E2E do Fluxo Completo
- [x] Profile criado/atualizado: `tester_hubble`
- [x] Progresso: `watching` (ep 1) → `completed` (ep 26, score 9.0)
- [x] Trigger `user_tag_preferences` testado (score ≥ 8.0 = +10/gênero)
- [x] RPCs validados: `get_user_stats`, `get_recommendations`, `get_horizons`
- [x] **Novos Horizontes funcionando**: 5 recomendações anti-bolha retornadas

---

### 🐛 Issues identificados durante auditoria (Task 3)

| # | Issue | Severidade | Blocker | Plano de Fix |
|---|-------|------------|---------|--------------|
| 1 | **Anime sem gêneros no catálogo** | Média | Não | Enriquecer `genres`/`themes`/`studios` via AniList no script de enriquecimento (campo vazio em 999 registros) |
| 2 | **RPC `get_user_stats` falha com enum `reading`** | Média | Não | Corrigir SQL: remover referência a `'reading'` no enum `user_status_enum` (valores válidos: planning, watching, paused, completed, dropped, rewatching) |
| 3 | **Signup real ainda falha** | Alta | Sim | Trigger `handle_new_user` precisa de `SECURITY DEFINER` + permissões corretas; testar com `admin.createUser()` após fix |
| 4 | **Tag preferences não geradas** | Baixa | Não | Consequência do #1 — sem `genres` no anime, trigger não tem o que processar |

---

### 🔄 Próxima sessão — prioridade

| # | Tarefa | Estimativa |
|---|--------|-----------|
| 1 | ~~Corrigir script de enriquecimento para popular `genres`, `themes`, `studios`~~ | ✅ CONCLUÍDO |
| 2 | ~~Corrigir RPC `get_user_stats` (enum `reading` inválido)~~ | ✅ CONCLUÍDO |
| 3 | ~~Debugar e corrigir trigger `handle_new_user` para signup real~~ | ✅ CONCLUÍDO |
| 4 | ~~Gerar `database.types.ts` real via Management API~~ | ✅ CONCLUÍDO (manual from migrations) |
| 5 | Documentar setup no README | 20min |

---

### 📚 Aprendizados

- **Supabase Cloud é mais leve que Docker local** para PC fraco. Nenhuma diferença funcional.
- **Management API** permite rodar migrations sem CLI: `POST /v1/projects/{ref}/database/query` com bearer token.
- **AODB** tem schema `{ data: Anime[] }` na raiz, JSONStream precisa de `data.*` (não `data[*]`).
- **Kitsu URL mudou**: `kitsu.app` (não `kitsu.io`).
- **Rate limit AniList**: 90 req/min teórico, usar 60 req/min com 1 request concorrente para segurança.
- **Triggers SECURITY DEFINER** precisam de permissões explícitas nas tabelas alvo.
- **Workaround para signup**: inserir direto em `auth.users` + garantir profile manual funciona para testes.

---

### 📦 Artefatos

- `/home/caue/Documentos/projetos/vscode-projects/Hubble/PROJECT_SPEC.md` (spec + checkpoint)
- `/home/caue/Documentos/projetos/vscode-projects/Hubble/README.md`
- `/home/caue/Documentos/projetos/vscode-projects/Hubble/scripts/enrich-from-anilist.js` (enriquecimento)
- `/home/caue/Documentos/projetos/vscode-projects/Hubble/scripts/test-e2e-flow-fixed.js` (teste E2E)
- `/home/caue/Documentos/projetos/vscode-projects/Hubble/supabase/migrations/20260816000004_fix_signup_and_test_user.sql`
- `/home/caue/Documentos/projetos/vscode-projects/Hubble/supabase/migrations/20260816000005_fix_validate_progress.sql`
- `/home/caue/Documentos/projetos/vscode-projects/Hubble/supabase/migrations/20260816000006_fix_get_user_stats_v3.sql`
- `/home/caue/Documentos/projetos/vscode-projects/Hubble/src/lib/database.types.ts` (types gerados manualmente)
- 3 commits no Git local (ainda não pushed)

---

### 📅 2026-08-16 (Sessão 1 — Greenfield → Primeiro Deploy)

### 🎯 Marco: Banco conectado + dados populados

**Duração:** ~4 horas
**Commits:** 12 (Conventional Commits atômicos)

### ✅ Entregue nesta sessão

#### Infraestrutura
- [x] Projeto Supabase `afphryyiswvffdazjkcw` criado e configurado
- [x] Region: São Paulo (próximo do usuário)
- [x] `.env.local` populado com 9 variáveis (URL, anon key, service role, etc.)
- [x] Extensão `pg_cron` ativada no Dashboard
- [x] 3 migrations SQL aplicadas via Management API (sem CLI local)

#### Banco de Dados
- [x] 9 tabelas criadas: `profiles`, `media_catalog`, `user_media_progress`, `user_tag_preferences`, `media_titles_i18n`, `awards`, `export_logs`, `ingestion_logs`, `offline_anime_mapping`
- [x] RLS habilitada em todas as tabelas de usuário
- [x] 4 triggers: `set_updated_at`, `recompute_tag_preferences`, `validate_progress_increment`, `handle_new_user`
- [x] 3 RPCs: `get_recommendations`, `get_horizons`, `get_user_stats`
- [x] **33.865 mapeamentos AODB inseridos** em `offline_anime_mapping` (de 41.537 processados, com deduplicação por título)

#### Frontend
- [x] Next.js 15 + React 19 + TypeScript strict + Tailwind v4 (CSS-first)
- [x] 7 páginas dashboard: Home, Library, Search, Media Detail, Recommendations, Settings, Admin
- [x] 9 UI primitives: Button, Card, Modal, Toast, StreamingCard, ListRow, InsightsEditor, AgeRatingBadge, AwardBadge
- [x] Auth flow completo com `@supabase/ssr` (login, signup, OAuth callback, middleware)
- [x] 7 API routes tipadas com Zod

#### Qualidade
- [x] 52 testes Vitest passando (titles, ratings, aodb-parse)
- [x] Estrutura Feature-Sliced Design respeitada
- [x] Conventional Commits atômicos (12 commits)

### 🐛 Bugs resolvidos durante a sessão

1. **Middleware bloqueando APIs**: Matcher excluía apenas arquivos estáticos, mas redirectava APIs para `/login`. **Fix:** adicionado `/api/:path*` no matcher negativo.

2. **AODB ingest redirecionamento 302**: `releases/latest` retornava redirect que o `https.get` nativo não seguia. **Fix:** função `makeRequest` recursiva que segue redirects manualmente.

3. **JSONStream path errado**: `data[*]` e `data.*` falhavam; parser recebia 41k items mas não emitia nenhum. **Fix:** descoberto via debug que o path correto para o schema AODB é `data.*` (objeto `data` é array).

4. **Upsert com títulos duplicados**: AODB tem ~7k títulos duplicados que causavam `ON CONFLICT DO UPDATE command cannot affect row a second time`. **Fix:** deduplicação via `Map` antes do upsert.

5. **Dotenv não carregava `.env.local` por padrão**: Script Node não lia as variáveis. **Fix:** adicionado `require('dotenv').config({ path: '.env.local' })`.

### 🔄 Próxima sessão — prioridade

### 📚 Aprendizados

- **Supabase Cloud é mais leve que Docker local** para PC fraco. Nenhuma diferença funcional.
- **Management API** permite rodar migrations sem CLI: `POST /v1/projects/{ref}/database/query` com bearer token.
- **AODB** tem schema `{ data: Anime[] }` na raiz, JSONStream precisa de `data.*` (não `data[*]`).
- **Kitsu URL mudou**: `kitsu.app` (não `kitsu.io`).

### 📦 Artefatos

- `/home/caue/Documentos/projetos/vscode-projects/Hubble/PROJECT_SPEC.md` (spec + checkpoint)
- `/home/caue/Documentos/projetos/vscode-projects/Hubble/README.md`
- 12 commits no Git local (ainda não pushed)
