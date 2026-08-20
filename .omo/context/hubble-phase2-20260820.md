# Hubble — Phase 2 UI Core: Plano de Implementação

> **Documento de contexto pós-compressão.** Salvo em 2026-08-20 após sessão de bugfix 3. 
> Estado pré-compressão do repositório. Referência para retomar Phase 2.
> Repo: https://github.com/MikuBR/Hubble | Project ref: afphryyiswvffdazjkcw

---

## Estado do Repositório (2026-08-20)

| Camada | Estado | Detalhes |
|--------|--------|----------|
| Banco/Supabase | 100% | 9 tabelas, 5 triggers (handle_new_user, update_tag_preferences, validate_progress_increment, set_updated_at, recompute_tag_preferences), 3 RPCs |
| Auth | 90% | Signup real habilitado (migration 20260819 aplicada via MCP) |
| API Routes | 90% | 7 endpoints: search, progress, library, media, insights, recommendations, horizons |
| Frontend (base) | 60% | 7 páginas dashboard + 9 UI primitives |
| Modo Cinema | 10% | Só StreamingCard básico |
| Modo Lista Premium | 40% | Library tem grid/list toggle |
| Busca | 30% | Client-side simples |
| Editor de Insights | 50% | InsightsEditor existe (preview + markdown) |
| Perfil/Config | 30% | Settings page |
| Import/Export | 0% | Na spec |
| PWA/Mobile | 5% | Sem SW |
| Testes | 20% | 52 Vitest unit tests; sem E2E |

## Bugs Críticos Resolvidos (Sessão 3)

1. ✅ `onclick` → `onClick` em login/signup OAuth buttons (4 handlers)
2. ✅ `handle_new_user` trigger fixed (SECURITY DEFINER + username validation) — migration aplicada via MCP Supabase SSE
3. ✅ `update_tag_preferences` trigger enhances com themes (+5) + studios (+3) — migration `20260820000001` criada e aplicada
4. E2E: 52 Vitest tests pass; E2E flow completo (profile, progresso, tag prefs, RPCs) validado
5. Github sync: 3 commits pushed, 0 diffs pendentes

## Próximos Passos (Phase 2 — #5 Modo Cinema imersivo)

### Sprint 2.1 — Modo Cinema

**Branch:** `feat/streaming-mode`
**Estimativa:** 2 semanas

| Task | Arquivos-alvo | Status |
|:-----|:---------------|:-------|
| Backdrop hero com gradiente dinâmico | `src/app/(dashboard)/media/[id]/page.tsx` | pending |
| Carrosséis horizontais (framer-motion drag) | `src/shared/ui/StreamingCard.tsx` + novo `Carousel.tsx` | pending |
| Badges de classificação BR + prestige | `src/shared/ui/AgeRatingBadge.tsx`, `AwardBadge.tsx` | ready |
| Trailer embed | novo componente `TrailerModal.tsx` | pending |
| Layout imersivo (fullscreen toggle) | `media/[id]/page.tsx` | pending |

**Estrutura de dados necessária:**
media_catalog já tem: backdrop_url, cover_url, age_rating_br, prestige_badge, genres, themes, studios, synopsis, user_score_global
Progresso de usuário: user_media_progress (status, current_unit, total_units_at_completion)

**Componentes existentes prontos pra reusar:**
- `StreamingCard` (mostra capa, status, badge)
- `AgeRatingBadge` / `AgeRatingCard` (classificação etária BR)
- `AwardBadge` / `AwardBadgeLarge` (prestige badges)
- `Modal` (container para trailer)
- `InsightsEditor` (para notas de rewatch)

### Sprint 2.2 — Modo Lista Premium

**Branch:** `feat/list-mode`
**Estimativa:** 1 semana

| Task | Arquivo | Status |
|:-----|:--------|:-------|
| Tabela virtualizada | novo `src/shared/ui/VirtualTable.tsx` | pending |
| Botão +1 Cap optimistic update | `src/app/(dashboard)/media/[id]/page.tsx` | pending |
| Filtro por tipo de mídia | `src/app/(dashboard)/library/page.tsx` | pending |

## Comandos Úteis pós-compressão

```bash
# Sync with remote
cd /home/caue/Documentos/projetos/vscode-projects/Hubble
git fetch origin && git diff origin/main --stat

# Run existing tests
npx vitest run

# Run E2E validation (Supabase conectado)
node scripts/test-e2e-flow-fixed.js

# Check migrations
ls supabase/migrations/ | sort

# Verify trigger functions on Supabase (via MCP)
# Use: opencode run "use mcp tool execute_sql to SELECT routine_name FROM information_schema.routines WHERE routine_type = 'FUNCTION'" --agent build
```

## Arquivos-chave de referência

```
src/app/(auth)/{login,signup}/page.tsx     # Auth flow (onclick fixed)
src/app/(dashboard)/{home,library,search,media,recommendations,settings}/
src/app/api/{library,progress,media,search,insights,recommendations}/
src/shared/ui/                              # 9 componentes
src/lib/utils/{ratings,cn,aodb-parse}.ts    # utils
src/lib/database.types.ts                   # tipos DB
supabase/migrations/                        # 10 migrations
```

## Próximos Passos Imediatos

```bash
# 1. Habilitar Email provider no Supabase Dashboard
#    https://supabase.com/dashboard/project/afphryyiswvffdazjkcw/auth/providers

# 2. Iniciar Phase 2 — Modo Cinema
git checkout -b feat/streaming-mode

# 3. Subtask: criar novo componente Carousel.tsx (framer-motion)
# 4. Subtask: integrar backdrop hero no media detail page
```

---

> **Context handoff ID:** hubble-phase2-20260820
> **Última sessão:** Bug-fix session 3 — 3 bugs corrigidos, E2E passou, Github sync completo.