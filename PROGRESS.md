# HUBBLE — Progresso Diário

> Documento vivo de progresso. Atualizado a cada sessão/marco.

---

## 📅 2026-08-16 (Sessão 1 — Greenfield → Primeiro Deploy)

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

| # | Tarefa | Estimativa |
|---|--------|-----------|
| 1 | Script de enriquecimento AODB → media_catalog via AniList GraphQL | 2-3h |
| 2 | Habilitar Email provider no Supabase para testar signup | 5min |
| 3 | Testar fluxo completo: signup → adicionar anime → marcar progresso | 30min |
| 4 | Gerar `database.types.ts` real via Management API | 30min |
| 5 | Documentar setup no README | 20min |

### 📚 Aprendizados

- **Supabase Cloud é mais leve que Docker local** para PC fraco. Nenhuma diferença funcional.
- **Management API** permite rodar migrations sem CLI: `POST /v1/projects/{ref}/database/query` com bearer token.
- **AODB** tem schema `{ data: Anime[] }` na raiz, JSONStream precisa de `data.*` (não `data[*]`).
- **Kitsu URL mudou**: `kitsu.app` (não `kitsu.io`).

### 📦 Artefatos

- `/home/caue/Documentos/projetos/vscode-projects/Hubble/PROJECT_SPEC.md` (spec + checkpoint)
- `/home/caue/Documentos/projetos/vscode-projects/Hubble/README.md`
- 12 commits no Git local (ainda não pushed)
