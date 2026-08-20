# HUBBLE — Roadmap

> Estado real do repositório em `2026-08-20`. Baseado em código efetivo, não em aspirações.

---

## 📊 Status Atual

| Camada | Estado | Nota |
|--------|--------|------|
| **Banco/Supabase** | 100% | 9 tabelas, 4 triggers, 3 RPCs, 33.8k mapeamentos AODB |
| **Auth** | 85% | SSR middleware + login/signup prontos; signup real depende de habilitar Email provider |
| **API Routes** | 90% | 7 endpoints tipados com Zod |
| **Frontend (base)** | 60% | Home + Library + Search + Media Detail + Recommendations + Settings renderizam |
| **Modo Cinema** | 10% | Só `StreamingCard` básico; falta backdrop hero, carrosséis, trailer embed |
| **Modo Lista Premium** | 40% | Library tem grid/list toggle; falta `+1 cap` otimista, colunas compactas |
| **Busca Unificada** | 30% | Busca client-side simples; falta pg_trgm, filtros avançados |
| **Editor de Insights** | 50% | `InsightsEditor` existe; falta preview live + auto-save |
| **Perfil/Config** | 30% | Settings page existe; falta avatar upload, temas, idiomas |
| **Import/Export** | 0% | Apenas mencionado na spec |
| **PWA/Mobile** | 5% | Sem service worker; layout não é mobile-first |
| **AODB Cron** | 50% | GitHub Actions workflow existe; falta pg_cron no Supabase |
| **Testes** | 20% | 3 arquivos de unit test; falta E2E real (Playwright) |

---

### 🗺️ Plano Incremental Numerado

Prioridade: backend/UX first. Protagonista = feature core. Desfechos = polish.

Status: ✅ Items #2 e #4 aplicados. Issues 1-5 do PROGRESS.md fechadas. Veja `PROGRESS.md` sessão 3.

### Parte 1 — Foundation Gaps (fechar o que está 85% aberto)

**#1 Habilitar Email Provider + validar signup real**
- Habilita Email provider no Supabase Dashboard
- Garante que `handle_new_user` funciona para signup via web (não só admin API)
- Valida fluxo: signup → email confirmation → login → profile criado
- Estimativa: 30min

**#2 Aplicar migration `20260819000001` no Supabase remoto** ✅
- Migration aplicada via MCP Supabase SSE (session: 3)
- Resultado: `{"status":"handle_new_user atualizado com sucesso!"}`
- Estimativa: 5min → 2min (via MCP)

**#3 Popular `media_catalog` com dados reais do AODB + AniList**
- Rodar `pnpm enrich:anilist` para inserir ~1k animes enriquecidos
- Validar que `genres/themes/studios` estão populados
- Estimativa: 30min (script já existe)

**#4 Corrigir estrutura de pastas para Feature-Sliced Design real** (em andamento na branch feat/streaming-mode)
- Código atual usa `src/app/`, `src/shared/ui/`, `src/lib/` mas falta `src/features/`
- Migrar páginas do dashboard para `src/features/`
- Estimativa: 1h

### Parte 2 — Phase 2 UI Core (o que realmente diferencia o Hubble)

**#5 Modo Cinema imersivo (Sprint 2.1 real)**
- Backdrop hero com gradiente dinâmico
- Carrosséis horizontais com `framer-motion` drag
- Badges de classificação BR + prestige
- Estimativa: 2 semanas

**#6 Modo Lista Premium com +1 capítulo (Sprint 2.2)**
- Tabela virtualizada para leitura
- Botão `+1 Cap` com optimistic update
- Filtro por tipo de mídia na biblioteca
- Estimativa: 1 semana

**#7 Busca Unificada com pg_trgm (Sprint 2.3)**
- Habilitar extensão `pg_trgm` no Supabase
- Adicionar índice GIN em `media_titles_i18n`
- Combobox com debounce + filtros laterais
- Estimativa: 3 dias

**#8 Editor de Insights funcional (Sprint 2.4)**
- Preview live lado a lado
- Auto-save com debounce 1.5s
- Toggle de spoilers
- Estimativa: 3 dias

### Parte 3 — Phase 3 Infraestrutura

**#9 pg_cron + Edge Function para ingest semanal**
- Configurar pg_cron no Supabase (extensão já ativada)
- Criar Edge Function `ingest-aodb`
- Mover lógica de enriquecimento para servidor
- Estimativa: 2 dias

**#10 Testes E2E com Playwright**
- Fluxo: signup → search → add → progress → recommendations
- Estimativa: 3 dias

**#11 Observabilidade + Backup**
- Logs estruturados nas API routes
- Export automático semanal do banco
- Estimativa: 1 dia

### Parte 4 — Phase 4 Expansão

**#12 Import Letterboxd/AniList + Export JSON**
**#13 PWA installable + service worker**
**#14 Multi-idioma (i18n)**
**#15 Integrações externas (Trakt, Discord Rich Presence)**
**#16 AI Features (resumos de insights, recomendações LLM)**

---

## 🎯 Próxima Ação Imediata

```bash
# 1. Aplicar migration pendente
# Roda no SQL Editor do Supabase Dashboard:
# supabase/migrations/20260819000001_fix_handle_new_user_username.sql

# 2. Habilitar Email provider no Supabase Dashboard → Authentication → Providers

# 3. Rodar enriquecimento AniList
pnpm enrich:anilist

# 4. Iniciar #5 (Modo Cinema)
git checkout -b feat/streaming-mode
```

---

## 📈 Métricas de Sucesso

| Métrica | Alvo |
|---------|------|
| Cold start recomendação | 1 avaliação ≥ 8.0 |
| Latência RPC | <15ms p95 |
| Cobertura catálogo | 1k+ obras enriquecidas |
| Testes E2E | Fluxo completo verde |

---

> Última atualização: 2026-08-20. Repositório sincronizado com `main`. Bugs críticos resolvidos na sessão 3.
