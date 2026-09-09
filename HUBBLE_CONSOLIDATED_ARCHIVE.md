# Hubble — Arquivo Consolidado de Planejamento

> **Geração:** 2026-09-08
> **Escopo:** Tudo que existe de planejamento documentado — repositório local, issues GitHub, arquivos de docs. Sem implementação.
> **Fonte primária:** `git@github.com:MikuBR/Hubble.git` (origin/main, commit 375b6ff)
> **Repositório local:** `/home/caue/Documentos/projetos/vscode-projects/Hubble/`

---

## 📋 Índice

1. [Visão Geral do Projeto](#visão-geral-do-projeto)
2. [Estado Atual por Camada](#estado-atual-por-camada)
3. [Arquivos de Planejamento Local (verificados)](#arquivos-de-planejamento-local-verificados)
4. [GitHub Issues — 21 issues, todos OPEN (#4–#24)](#github-issues-21-issues-todos-open-424)
5. [ROADMAP — Plano Incremental Numerado](#roadmap-plano-incremental-numerado)
6. [PROGRESS — Diário de Progresso por Sessão](#progress-diário-de-progresso-por-sessão)
7. [HUBBLE_ISSUES_PLAN — Plano de Issues do Dia](#hubble_issues_plan-plano-de-issues-do-dia)
8. [PHASE2_EXECUTION_PLAN — Sequência de Execução por Blocos](#phase2_execution_plan-seqüência-de-execução-por-blocos)
9. [PHASE2_CATALOG_GAP_ANALYSIS — Gap de Catálogo](#phase2_catalog_gap_analysis-gap-de-catálogo)
10. [LAUNCH_DRAFTS — Drafts de Lançamento](#launch_drafts-drafts-de-lançamento)
11. [Decisões e Workarounds](#decisões-e-workarounds)
12. [Dependências Externas](#dependências-externas)
13. [Dependências Internas (Blocos × Blocos)](#dependências-internas-blocos--blocos)
14. [Decisões Pendentes](#decisões-pendentes)

---

## Visão Geral do Projeto

**Nome:** Hubble  
**Remoto:** `git@github.com:MikuBR/Hubble.git`  
**Stack:** Next.js 15, React 19, TypeScript strict, Tailwind v3.4.19, Supabase (Cloud), Framer Motion, Zod, Vitest, pnpm  
**Objetivo:** Tracker pessoal de mídia privado (filmes, séries, animes, mangás, manhwas, novels) sem feed público, seguidores ou métricas sociais.  
**Proposta central:** Interface camaleão — Modo Cinema para vídeo, Modo Lista para leitura — com algoritmo "Novos Horizontes" anti-bolha.

---

## Estado Atual por Camada

| Camada | Estado | Detalhes |
|--------|--------|----------|
| **Banco/Supabase** | 100% | 9 tabelas, 4 triggers, 3 RPCs, 33.8k mapeamentos AODB |
| **Auth** | 85% | Middleware SSR + login/signup prontos; signup real depende de Email provider |
| **API Routes** | 90% | 7 endpoints tipados com Zod |
| **Frontend (base)** | 60% | Home, Library, Search, Media Detail, Recommendations, Settings renderizam |
| **Modo Cinema** | 10% | StreamingCard básico; falta carrosséis com dados, backdrop hero na home |
| **Modo Lista Premium** | 40% | Grid/list toggle existe; falta +1 cap otimista e colunas compactas |
| **Busca Unificada** | 30% | Busca client-side simples; falta pg_trgm GIN, filtros avançados, combobox |
| **Editor de Insights** | 50% | InsightsEditor existe; falta preview live + auto-save |
| **Perfil/Config** | 30% | Settings page existe; falta avatar upload, temas, idiomas |
| **Import/Export** | 0% | Apenas mencionado na spec; handlers não existem |
| **PWA/Mobile** | 5% | Sem service worker; layout não é mobile-first |
| **AODB Cron** | 50% | GitHub Actions workflow existe; falta pg_cron no Supabase |
| **Testes** | 20% | 3 arquivos de unit test (52 passing); falta E2E com Playwright |

**Commits relevantes (git log):**
- `375b6ff` fix: propagate inserted/updated counts to ingestion_logs in enrich-tmdb.js
- `19c8fed` B0+BI: expandir enrich-from-anilist (TYPE_MAP/fallback) + bucket avatars RLS + AvatarFileInput + novos scripts de enrich
- `38bffd4` fix: avoid RSC serialization errors by replacing serialized onclick handlers with link navigation
- `21bc3ad` fix: search API/client stability and UI fixes
- `86e8334` fix(auth): onclick → onClick in login/signup OAuth buttons; docs: update PROGRESS.md

---

## Arquivos de Planejamento Local (verificados)

Todos os arquivos listados abaixo existem no repositório local e foram verificados por leitura direta.

| Arquivo | Tamanho | Última modificação | Função |
|---------|---------|-------------------|--------|
| `ROADMAP.md` | 5,015 bytes | 2026-08-20 | Plano incremental #1–#16 por fases |
| `PROGRESS.md` | 9,670 bytes | 2026-08-20 | Diário de progresso por sessão (3 sessões) |
| `HUBBLE_ISSUES_PLAN.md` | 2,057 bytes | 2026-08-26 | Issues do dia vs. deferred |
| `docs/PHASE2_EXECUTION_PLAN.md` | 15,282 bytes | 2026-08-27 | Execução sequencial por blocos B0–B4 |
| `docs/PHASE2_CATALOG_GAP_ANALYSIS.md` | 13,762 bytes | 2026-08-27 | Gap de catálogo por tipo de mídia |
| `LAUNCH_DRAFTS.md` | 2,326 bytes | 2026-08-26 | Drafts de lançamento (Product Hunt, HN) |
| `SETUP.md` | 6,907 bytes | 2026-08-26 | Guia de setup local completo |
| `PROJECT_SPEC.md` | 23,052 bytes | 2026-08-16 | Especificação técnica completa |
| `README.md` | 15,851 bytes | 2026-08-20 | Documentação do projeto |

---

## GitHub Issues — 21 issues, todos OPEN (#4–#24)

> Fonte: `gh issue list --repo MikuBR/Hubble --limit 30`
> Data de criação dos issues: 2026-08-21 a 2026-08-26
> Todos os issues estão em estado **OPEN**.

### Issues de Infraestrutura e Setup

**#4 — Setup: habilitar Email provider no Supabase**
- Labels: `good first issue`, `backend`
- Criado: 2026-08-21
- Contexto: Signup por email não funciona porque o provider não está habilitado no dashboard Supabase.
- Tarefa: Habilitar Email provider em `supabase.com/dashboard/project/afphryyiswvffdazjkcw/auth/providers`; validar signup + login E2E; confirmar que `handle_new_user` cria o profile.
- Critérios: Signup por email funciona; Login por email funciona; Profile criado automaticamente.
- Status atual: Não iniciado (depende de acesso ao Supabase Dashboard).

**#20 — Deploy: fazer deploy público beta fechado**
- Labels: `enhancement`, `infrastructure`
- Criado: 2026-08-21
- Contexto: Precisa de deploy público para testes e anúncios.
- Tarefa: Deploy no Vercel com variáveis de ambiente; conectar Supabase de produção; configurar domínio customizado; testar fluxo completo.
- Critérios: App acessível publicamente; Auth funciona em produção; Banco de produção populado.
- Status atual: Não iniciado.

### Issues de Dados e Enriquecimento

**#5 — Dados: criar script de enriquecimento do AODB via AniList**
- Labels: `enhancement`, `good first issue`, `backend`
- Criado: 2026-08-26
- Contexto: 33.865 mapeamentos em `offline_anime_mapping`, mas `media_catalog` estava vazio. Precisa enriquecer com metadados do AniList.
- Tarefa: Criar script que lê `offline_anime_mapping`, chama AniList GraphQL por `anilist_id`, extrai título/sinopse/gêneros/temas/estúdios/cover/backdrop/classificação BR/ano, faz upsert em `media_catalog`, respeita rate limit (90 req/min).
- Critérios: Script roda sem erros; `media_catalog` populado com dados.
- Status atual: Implementado (script `enrich-from-anilist.js` criado e executado; 729 animes inseridos). Bloqueio atual: `.env.local` com `ANILIST_CLIENT_ID` e `ANILIST_CLIENT_SECRET` vazios.

**#6 — Dados: popular media_catalog e validar busca real**
- Labels: `good first issue`, `backend`, `testing`
- Criado: 2026-08-26
- Contexto: Após enriquecimento, precisa validar que a busca funciona com dados reais.
- Tarefa: Rodar enriquecimento em staging; validar `/api/search` retorna resultados; validar busca na UI; validar `get_recommendations` e `get_horizons`.
- Critérios: Busca retorna resultados reais; Páginas de library e search funcionam com dados.
- Status atual: Em progresso — busca retorna resultados, mas validação UI pendente. Bloqueio: depende de #5 (catálogo populado).

**#7 — Fluxo: validar E2E completo de signup até recomendação**
- Labels: `good first issue`, `backend`, `frontend`, `testing`
- Criado: 2026-08-21
- Contexto: Garantir que o fluxo principal funciona de ponta a ponta.
- Tarefa: Signup → login → home → buscar/adicionar obra → marcar progresso (+1 episódio/capítulo) → adicionar score e insights → verificar recomendações e Novos Horizontes.
- Critérios: Fluxo completo sem erros; Dados persistidos corretamente; RPCs retornam dados esperados.
- Status atual: Parcialmente validado via scripts E2E legados (`test-e2e-flow*.js`), mas Playwright não configurado.

### Issues de UI — Modo Cinema

**#8 — UI: implementar backdrop hero no media detail**
- Labels: `enhancement`, `frontend`
- Criado: 2026-08-26
- Contexto: Modo Cinema precisa de backdrop hero impactante na página de detalhes.
- Tarefa: Adicionar seção hero full-width em `src/app/(dashboard)/media/[id]/page.tsx`; gradiente dinâmico overlay; título, rating, badges de classificação e prestígio; ajustar tipografia.
- Critérios: Backdrop exibido; Gradiente overlay aplicado; Responsivo.
- Status atual: **Concluída.** Evidência: `src/shared/ui/BackdropHero.tsx` integrado na home e media detail.

**#9 — UI: criar componente Carousel horizontal com framer-motion**
- Labels: `enhancement`, `frontend`
- Criado: 2026-08-26
- Contexto: Carrosséis horizontais para Modo Cinema.
- Tarefa: Criar `src/shared/ui/Carousel.tsx` com scroll horizontal framer-motion; gradientes overlay nas bordas; variante compacta para sidebars; exportar em `src/shared/ui/index.ts`.
- Critérios: Carrossel com arrastar e scroll; Overlay gradients visíveis; Acessível via teclado.
- Status atual: **Implementado.** Evidência local: `src/shared/ui/Carousel.tsx` existe.

**#10 — UI: integrar TrailerModal no media detail**
- Labels: `enhancement`, `frontend`
- Criado: 2026-08-26
- Contexto: Componente `TrailerModal.tsx` existe mas não está integrado.
- Tarefa: Adicionar botão "Ver Trailer" no media detail; abrir modal com embed do trailer; fechar via ESC, botão X e clique fora.
- Critérios: Modal abre e fecha; Trailer carrega quando disponível; Comportamento correto com teclado.
- Status atual: **Concluída.** Evidência: `src/shared/ui/TrailerModal.tsx` com parsing YouTube/Vimeo integrado.

### Issues de UI — Modo Lista Premium

**#11 — UI: implementar Modo Lista Premium com tabela virtualizada**
- Labels: `enhancement`, `frontend`
- Criado: 2026-08-26
- Contexto: View de tabela compacta para leitores de mangá/manhwa/manhua.
- Tarefa: Em `src/app/(dashboard)/library/page.tsx`, adicionar view de tabela; colunas: capa, título, tipo, status, progresso, score, ações; virtualização para performance; toggle grid/tabela.
- Critérios: Tabela renderiza com performance; Toggle grid/tabela funciona; Responsivo.
- Status atual: **Concluída.** Evidência: `src/shared/ui/ListRow.tsx` (518 linhas) com `ReadingTable` + toggle.

**#12 — UI: adicionar botão +1 Capítulo com optimistic update na tabela**
- Labels: `enhancement`, `frontend`
- Criado: 2026-08-26
- Contexto: Hook `useOptimisticProgress` existe, mas precisa ser integrado na view de tabela.
- Tarefa: Adicionar botão `+1 Cap` em cada linha; atualização otimista sem reload; debounce e toast de confirmação; validação de progresso máximo.
- Critérios: Clique atualiza UI imediatamente; Estado persiste após reload; Toast de sucesso.
- Status atual: **Implementado.** Evidência: commit `12ab155` com `+1 Cap` com atualização otimista.

### Issues de UI — Temas e Descoberta

**#13 — UI: ajustar temas por modo de mídia**
- Labels: `enhancement`, `frontend`
- Criado: 2026-08-21
- Contexto: Modo cinema deve ter tema escuro fixo; modo lista deve permitir toggle claro/escuro.
- Tarefa: Modo Cinema forçar zinc-950/black; Modo Lista respeitar preferência do usuário; persistir no profile; transição suave.
- Critérios: Modo cinema sempre escuro; Modo lista alterna tema; Preferência salva no profile.
- Status atual: Não iniciado.

**#14 — Descoberta: integrar UI de recomendações "Para Você"**
- Labels: `good first issue`, `backend`, `frontend`
- Criado: 2026-08-21
- Contexto: RPC `get_recommendations` existe, mas página não está integrada.
- Tarefa: Em `recommendations/page.tsx`, consumir `get_recommendations`; exibir explicação; estados de loading e empty; integrar com modo cinema/list.
- Critérios: Recomendações carregam; Explicabilidade exibida; Loading e error states implementados.
- Status atual: Não iniciado.

**#15 — Descoberta: integrar UI de "Novos Horizontes"**
- Labels: `good first issue`, `backend`, `frontend`
- Criado: 2026-08-21
- Contexto: RPC `get_horizons` existe, mas não está integrada.
- Tarefa: Em `recommendations/horizons/page.tsx`, consumir `get_horizons`; destacar gêneros não explorados; botão "Adicionar" rápido; empty state.
- Critérios: Novos Horizontes carrega; Gêneros inexplorados destacados; Botão de adicionar funciona.
- Status atual: Não iniciado.

### Issues de UI — Editor de Insights e Estatísticas

**#16 — Insights: melhorar editor de insights com preview e auto-save**
- Labels: `enhancement`, `frontend`
- Criado: 2026-08-21
- Contexto: Componente `InsightsEditor` existe, mas precisa de melhorias de UX.
- Tarefa: Preview Markdown em tempo real; auto-save com debounce de 1.5s; toast de confirmação ao salvar; indicador de "salvando..."; suporte a spoilers com `||spoiler||`.
- Critérios: Preview em tempo real; Auto-save não perde dados; Toast exibido corretamente.
- Status atual: Não iniciado.

**#17 — Perfil: implementar página de estatísticas pessoais**
- Labels: `enhancement`, `good first issue`, `backend`, `frontend`
- Criado: 2026-08-21
- Contexto: RPC `get_user_stats` existe, mas não há página para exibi-la.
- Tarefa: Criar página de estatísticas; exibir total de obras, média de score, top gêneros, top estúdios; gráficos com barras horizontais; design alinhado ao modo lista.
- Critérios: Estatísticas carregam do banco; Gráficos exibidos corretamente; Atualizam após novas avaliações.
- Status atual: Não iniciado.

### Issues de Import/Export

**#18 — Importação: implementar import CSV do Letterboxd**
- Labels: `enhancement`, `good first issue`, `backend`, `frontend`
- Criado: 2026-08-26
- Contexto: Permitir que usuários migrem seus dados do Letterboxd.
- Tarefa: Criar página de importação; parsing do CSV do Letterboxd; mapeamento título/score/data/status; upsert em `user_media_progress`; relatório de sucesso/erro por linha.
- Critérios: CSV parseado corretamente; Dados importados sem duplicatas; Relatório de erros exibido.
- Status atual: **Não iniciado.** Sem evidência de parser/CSV ou página de importação no repositório.

**#19 — Exportação: implementar export JSON do diário**
- Labels: `enhancement`, `good first issue`, `backend`
- Criado: 2026-08-26
- Contexto: Usuários devem poder exportar seus dados.
- Tarefa: Em `/api/export`, gerar JSON com profile, progresso e insights; download via browser; log de exportação em `export_logs`.
- Critérios: JSON gerado corretamente; Download funciona; Log registrado.
- Status atual: **Não iniciado.** A tabela `export_logs` existe no schema, mas não há rota/interface de exportação implementada.

### Issues de Testes e Mobile

**#21 — Testes: adicionar testes E2E com Playwright**
- Labels: `enhancement`, `testing`
- Criado: 2026-08-26
- Contexto: 52 testes unitários, mas precisa de E2E para o fluxo principal.
- Tarefa: Configurar Playwright; testes para signup, login, busca, adicionar obra, marcar progresso; rodar em CI via GitHub Actions; relatório de cobertura.
- Critérios: Pelo menos 5 cenários E2E passando; Rodando em CI; Cobertura mínima de 60%.
- Status atual: **Não iniciado.** Há scripts E2E legados em `scripts/` (`test-e2e-flow*.js`) e 3 unit tests, mas Playwright não configurado.

**#22 — Mobile: ajustar responsividade mobile**
- Labels: `enhancement`, `frontend`
- Criado: 2026-08-21
- Contexto: App precisa funcionar bem em mobile.
- Tarefa: Testar e ajustar breakpoints; garantir modos cinema e lista funcionam em mobile; ajustar navegação e botões para touch; testar em viewports comuns (iOS, Android).
- Critérios: Layout funciona em mobile; Botões e inputs touch-friendly; Sem overflow horizontal.
- Status atual: Não iniciado.

**#23 — PWA: adicionar manifest e service worker básico**
- Labels: `enhancement`, `frontend`
- Criado: 2026-08-21
- Contexto: Tornar o Hubble installable como PWA.
- Tarefa: Criar `manifest.webmanifest`; adicionar ícones e splash screens; service worker básico para cache de assets; testar instalação em Chrome/Edge.
- Critérios: Manifest válido; Install prompt funciona; App funciona offline básico.
- Status actual: Não iniciado.

**#24 — Demo: preparar dados de exemplo para primeiro acesso**
- Labels: `enhancement`, `good first issue`, `backend`
- Criado: 2026-08-26
- Contexto: Novos usuários verão um catálogo vazio. Precisam de dados de exemplo.
- Tarefa: Criar script de seed com obras populares de anime, mangá, filmes e séries; popular banco de staging com ~100 obras; cada obra com progresso simulado, score e insights de exemplo; permitir reset via botão na settings.
- Critérios: Novo usuário vê conteúdo na home; Dados de exemplo realistas; Reset de demo funciona.
- Status atual: **Não iniciado.** Não há script de seed nem fluxo de reset de demo identificado no repositório.

---

## ROADMAP — Plano Incremental Numerado

> Fonte: `ROADMAP.md` (2026-08-20)
> Nota: Baseado em código efetivo, não em aspirações.

### Parte 1 — Foundation Gaps

**#1 Habilitar Email Provider + validar signup real** (30min)
- Habilita Email provider no Supabase Dashboard
- Garante `handle_new_user` funciona para signup via web
- Valida: signup → email confirmation → login → profile criado
- Status: Não iniciado (bloqueio externo — precisa acesso ao Supabase Dashboard)

**#2 Aplicar migration `20260819000001` no Supabase remoto** ✅ (2min via MCP)
- Migration aplicada via MCP Supabase SSE
- Resultado: `{"status":"handle_new_user atualizado com sucesso!"}`

**#3 Popular `media_catalog` com dados reais do AODB + AniList** (30min)
- Rodar `pnpm enrich:anilist` para inserir ~1k animes enriquecidos
- Validar `genres/themes/studios` populados
- Status: Parcialmente feito (729 animes inseridos); bloqueado por credenciais vazias no `.env.local`

**#4 Corrigir estrutura de pastas para Feature-Sliced Design real** (1h)
- Migrar páginas do dashboard para `src/features/`
- Status: Em andamento na branch `feat/streaming-mode`

### Parte 2 — Phase 2 UI Core

**#5 Modo Cinema imersivo** (2 semanas)
- Backdrop hero com gradiente dinâmico
- Carrosséis horizontais com `framer-motion` drag
- Badges de classificação BR + prestígio
- Status: 10% — só `StreamingCard` básico; falta carrosséis com dados reais e backdrop na home

**#6 Modo Lista Premium com +1 capítulo** (1 semana)
- Tabela virtualizada para leitura
- Botão `+1 Cap` com optimistic update
- Filtro por tipo de mídia na biblioteca
- Status: 40% — toggle grid/lista existe; falta virtualização e colunas compactas

**#7 Busca Unificada com pg_trgm** (3 dias)
- Habilitar extensão `pg_trgm` no Supabase (já ativada)
- Adicionar índice GIN em `media_titles_i18n`
- Combobox com debounce + filtros laterais
- Status: 30% — busca client-side simples; falta índice GIN e filtros avançados

**#8 Editor de Insights funcional** (3 dias)
- Preview live lado a lado
- Auto-save com debounce 1.5s
- Toggle de spoilers
- Status: 50% — `InsightsEditor` existe; falta preview live + auto-save

### Parte 3 — Phase 3 Infraestrutura

**#9 pg_cron + Edge Function para ingest semanal** (2 dias)
- Configurar pg_cron no Supabase (extensão já ativada)
- Criar Edge Function `ingest-aodb`
- Mover lógica de enriquecimento para servidor
- Status: Não iniciado

**#10 Testes E2E com Playwright** (3 dias)
- Fluxo: signup → search → add → progress → recommendations
- Status: Não iniciado

**#11 Observabilidade + Backup** (1 dia)
- Logs estruturados nas API routes
- Export automático semanal do banco
- Status: Não iniciado

### Parte 4 — Phase 4 Expansão

**#12 Import Letterboxd/AniList + Export JSON** — Não iniciado
**#13 PWA installable + service worker** — Não iniciado
**#14 Multi-idioma (i18n)** — Não iniciado
**#15 Integrações externas (Trakt, Discord Rich Presence)** — Não iniciado
**#16 AI Features (resumos de insights, recomendações LLM)** — Não iniciado

---

## PROGRESS — Diário de Progresso por Sessão

### Sessão 1 — Greenfield → Primeiro Deploy (2026-08-16, ~4h, 12 commits)

**Marco:** Banco conectado + dados populados

- **Infraestrutura:** Projeto Supabase `afphryyiswvffdazjkcw` criado (região São Paulo); `.env.local` populado com 9 variáveis; `pg_cron` ativado; 3 migrations SQL aplicadas via Management API.
- **Banco de Dados:** 9 tabelas criadas (`profiles`, `media_catalog`, `user_media_progress`, `user_tag_preferences`, `media_titles_i18n`, `awards`, `export_logs`, `ingestion_logs`, `offline_anime_mapping`); RLS em todas as tabelas de usuário; 4 triggers; 3 RPCs; **33.865 mapeamentos AODB** inseridos em `offline_anime_mapping` (de 41.537 processados, com deduplicação).
- **Frontend:** Next.js 15 + React 19 + TypeScript strict + Tailwind v4 (CSS-first); 7 páginas dashboard; 9 UI primitives; Auth flow completo com `@supabase/ssr`; 7 API routes tipadas com Zod.
- **Qualidade:** 52 testes Vitest passando; Feature-Sliced Design respeitada; Conventional Commits atômicos (12 commits).

**Bugs resolvidos na sessão:**
1. Middleware bloqueando APIs — fix: adicionado `/api/:path*` no matcher negativo
2. AODB ingest redirecionamento 302 — fix: função `makeRequest` recursiva para redirects
3. JSONStream path errado — fix: schema AODB usa `data.*` (objeto `data` é array)
4. Upsert com títulos duplicados — fix: deduplicação via `Map` antes do upsert
5. Dotenv não carregava `.env.local` — fix: `require('dotenv').config({ path: '.env.local' })`

### Sessão 2 — Enriquecimento + Testes E2E (2026-08-16, ~2h, 3 commits)

**Marco:** Enriquecimento AniList + Validação Fluxo Completo

- **Enriquecimento:** Script `enrich-from-anilist.js` criado e executado; **729 animes enriquecidos** inseridos em `media_catalog` (de 730 processados); rate limiting respeitado (60 req/min, 1 concorrente); logs em `ingestion_logs`.
- **Correções de triggers:** `handle_new_user` corrigido com fallback seguro para username; `validate_progress_increment` corrigido (ambiguidade de `release_status` resolvida com alias `mc`).
- **Testes E2E do fluxo completo:** Profile criado (`tester_hubble`); progresso: `watching` (ep 1) → `completed` (ep 26, score 9.0); trigger `user_tag_preferences` testado (score ≥ 8.0 = +10/gênero); RPCs validados: `get_user_stats`, `get_recommendations`, `get_horizons`; **Novos Horizontes funcionando:** 5 recomendações anti-bolha retornadas.

**Issues identificados e resolvidos durante auditoria:**

| # | Issue | Severidade | Blocker | Status |
|---|-------|------------|---------|--------|
| 1 | Anime sem gêneros no catálogo | Média | Não | ✅ Resolvido — script `enrich-from-anilist.js` popula genres/themes/studios; migration `20260820000001` estende trigger |
| 2 | RPC `get_user_stats` falha com enum `reading` | Média | Não | ✅ Resolvido — migration `20260816000006_fix_get_user_stats_v3.sql` remove `'reading'` e usa `IN ('watching', 'rewatching')` |
| 3 | Signup real ainda falha | Alta | Sim | ✅ Resolvido no código — migration `20260819000001` corrige `handle_new_user` com SECURITY DEFINER + fallback de username 3-30 chars. **Pendente:** habilitar Email Provider no Supabase Dashboard |
| 4 | Tag preferences não geradas | Baixa | Não | ✅ Resolvido — consequência de #1; trigger agora processa genres (+10), themes (+5), studios (+3) |
| 5 | `onclick` → `onClick` nos botões OAuth | Alta | Sim | ✅ Resolvido — Sessão 3 corrigiu 4 botões em login.tsx e signup.tsx |

### Sessão 3 — Fix Bugs em Aberto (2026-08-20, ~1.5h, 1 commit)

**Marco:** Bugs críticos resolvidos via MCP + code fixes

- **Bugs corrigidos:**
  1. `onclick` → `onClick` nos formulários de auth (login.tsx, signup.tsx) — React JSX é case-sensitive, `onclick` lowercase é ignorado. 4 botões corrigidos (Google + GitHub em cada página).
  2. Migration `20260819000001` aplicada via MCP Supabase — corrige trigger `handle_new_user` com SECURITY DEFINER + username 3-30 chars + UUID fallback.
  3. Migration `20260820000001_enhance_tag_preferences.sql` criada e aplicada — extensão do trigger `update_tag_preferences` para incluir `themes` (+5) e `studios` (+3). Antes: só `genres` (+10). Valido via E2E: tag preferences passaram de 6 para 7 (inclui `[studio] bones: 10`).

- **Validação:** 52 testes Vitest passing; E2E: ✅ Todos 6 passos; Tag preferences agora incluem `studio` type.

---

## HUBBLE_ISSUES_PLAN — Plano de Issues do Dia

> Fonte: `HUBBLE_ISSUES_PLAN.md` (2026-08-26)

### ✅ Fechados
- **#8 BackdropHero integrado na home** — `src/shared/ui/BackdropHero.tsx` + integração em `src/app/(dashboard)/page.tsx`. Componente com Framer Motion, gradientes, badges, fallback visual.
- **#10 TrailerModal integrado no media detail** — `src/shared/ui/TrailerModal.tsx` + integração em `src/app/(dashboard)/media/[id]/page.tsx`. Parsing YouTube/Vimeo, cleanup de iframe, suporte ESC/click-outside.
- **#11 Modo Lista Premium com toggle na library** — `src/app/(dashboard)/library/page.tsx` + `src/shared/ui/ListRow.tsx`. Toggle grid/lista, `ReadingTable` com `useOptimistic` para +1 capítulo.

### ⚠️ Em progresso / bloqueio externo
- **#5 enrich-from-anilist** — Script pronto (`scripts/enrich-from-anilist.js`) com loteamento e retry exponencial. Bloqueio: `.env.local` com `ANILIST_CLIENT_ID` e `ANILIST_CLIENT_SECRET` vazios. Necessário: cadastro no AniList Developer e preenchimento das credenciais.
- **#6 search validation** — Endpoint `/api/search` implementado com pg_trgm, Zod, i18n, filtro NSFW. Bloqueio: validação ponta a ponta depende de `media_catalog` populado via #5. `scripts/validate-search.cjs` confirmou conectividade GraphQL pública do AniList.

### Deferred / não hoje
- #12 Optimistic +1 Capítulo — já implementado
- #18 Import CSV Letterboxd — não iniciado
- #19 Export JSON do diário — não iniciado
- #21 Testes E2E com Playwright — não iniciado
- #24 Demo seed — não iniciado

### Decisões tomadas
- Tailwind v3.4.19 + tailwindcss-animate@1.0.7, sem v4/postcss v4
- `postcss.config.js` com plugins `tailwindcss` + `autoprefixer`
- Removido `@tailwindcss/postcss` do projeto para evitar conflito de versões
- `globals.css` usa `@apply` padrão do Tailwind v3; custom classes mantidas como CSS puro
- `NEXT_DISABLE_TURBOPACK=1` workaround para route groups `app/(dashboard)` e `app/(auth)`
- Dev server em `http://localhost:3000`

---

## PHASE2_EXECUTION_PLAN — Sequência de Execução por Blocos

> Fonte: `docs/PHASE2_EXECUTION_PLAN.md` (2026-08-27)
> Gerada a partir das investigações de 6 subagentes (deleg_7801532b).
> Base: ROADMAP.md + subagent summaries + leitura direta dos arquivos-fonte.

### Regras de ordem (blockers reais)

| Bloqueia | É bloqueado por | Razão |
|----------|----------------|-------|
| Import/Export | Catalog populado (B0) | Import faz lookup em media_catalog — catálogo vazio = 0 matches |
| Import/Export | Storage bucket `avatars` (B1) | Upload de avatar precisa do bucket existindo |
| Cinema Mode home | Catalog populado (B0) | Carrosséis vazios na home não demonstram nada |
| Combobox busca | Catalog populado (B0) + Índice GIN (B3) | Autocomplete sem dados = sem sugestões; sem índice = lento |
| Busca i18n | media_titles_i18n populado (B4) | Índice criado mas tabela vazia — preventivo agora |

### BLOCO 0 — Catalog populado (FAZER PRIMEIRO, tudo depende disso)

**Objetivo:** 2100+ itens no media_catalog (anime 1k, manga 500, manhwa 100, manhua 50, filmes 200, séries 200, novels 50).

**Tarefas:**
1. `scripts/enrich-from-anilist.js` — expandir query: remove hardcode `type: ANIME` na linha 34, permitir todos os 9 tipos. Fazer loop por tipo em vez de query única. (1.5h)
   - Verificar `FORMAT_MAP` — entries para MANGA existem mas são código morto.
   - Risco: `bannerImage` do AniList esparsa para backdrops — usar `coverImage.large` como fallback.
2. `scripts/enrich-from-tmdb.mjs` (JÁ EXISTE) — só precisa rodar com `TMDB_API_KEY` válido. (Limitações: 80 filmes + 50 séries hardcoded, upsert por `tmdb_id` evita duplicação.)
3. `scripts/enrich-manga-anilist.js` (NOVO) — adaptação do `enrich-from-anilist.js` para manga. (1.5h)
4. `scripts/enrich-titles-i18n.js` (NOVO) — popula `media_titles_i18n`. (1h)
5. Verificar campo `total_episodes` em `media_catalog`.

**Estimativa B0: ~5-6h**

### BLOCO 1A — Cinema Mode (carrossel drag + home placeholders mortos)

**Arquivos:** `Carousel.tsx`, `StreamingCard.tsx`, `page.tsx` (home), `page.tsx` (media detail)

**Tarefas:**
1. Patch `Carousel.tsx`: `drag="x"` + snap no `onDragEnd`, wrapper `flex-shrink-0`, `cardWidth` prop. (1.5h)
2. Novo `CinemaCarousel.tsx` (use client). (0.5h)
3. Patch `page.tsx` (home): substituir placeholders por `<CinemaCarousel media={...} />`. (1.5h)
4. Opcional: nova seção "Animes no ar".

**Estimativa B1A: ~3.5-6.5h**

### BLOCO 1B — Import/Export + Avatar

**Arquivos novos:** `src/app/api/export/route.ts`, `src/app/api/import/route.ts`, `src/lib/parsers/letterboxd.ts`, `anilist.ts`, `mal.ts`, `trakt.ts`

**Tarefas:**
1. `/api/export/route.ts` — JSON/CSV. (3-4h)
2. `/api/import/route.ts` — POST multipart FormData. (3h + 4h parsers)
3. Parsers (4 arquivos). (1-3h cada)
4. Storage bucket `avatars` + upload de avatar. (1.5h)

**Estimativa B1B: ~13-15h**

### BLOCO 2 — Busca Unificada (index GIN + combobox + filtros)

**Tarefas:**
1. Criar índice GIN em `media_titles_i18n`. (0.5h)
2. Criar `/api/search/suggest`. (1h)
3. Criar `SearchAutocomplete.tsx`. (2-3h)
4. Expandir filtros laterais (backend). (2-3h)
5. Sidebar de filtros (frontend). (4-6h)
6. Corrigir `.textSearch()` → operador trigram `%`. (1-2h)

**Estimativa B2: ~10-15h**

### BLOCO 3 — InsightsEditor

**Arquivo:** `src/shared/ui/InsightsEditor.tsx`

**Tarefas:**
1. Split view (editor/preview lado a lado). (0.75h)
2. Toolbar markdown-inject. (1.5h)
3. Feedback "salvo" persistente. (0.5h)
4. Datas criação/edição. (0.25h)

**Estimativa B3: ~2.5-3.5h**

### BLOCO 4 — ReadingTable virtualização

**Arquivo:** `src/shared/ui/ListRow.tsx`

**Tarefa:** Adicionar virtualização com `@tanstack/react-virtual`.

**Estimativa B4: ~1.5-3h**

### Resumo de Estimativas

| Bloco | Esforço | Dependências |
|-------|---------|-------------|
| B0 — Catalog | 5-6h | `ANILIST_*` + `TMDB_API_KEY` no `.env.local` |
| B1A — Cinema | 3.5-6.5h | B0 |
| B1B — Import/Export | 13-15h | B0, bucket avatars |
| B2 — Busca | 10-15h | B0, B4 |
| B3 — InsightsEditor | 2.5-3.5h | Nenhuma |
| B4 — ReadingTable | 1.5-3h | Nenhuma |
| **Total Phase 2** | **~36-49h** | ~1 semana de trabalho full-time |

### Ordens de Execução Recomendadas

**Prioridade máxima (blockers para tudo):**
1. B0 (catalog) — sem isso, import/export e cinema mode são inúteis
2. Criar bucket `avatars` (5min no Supabase Dashboard)

**Pode fazer em paralelo com B0:**
- B3 (InsightsEditor) — zero dependências externas
- B4 (ReadingTable) — zero dependências externas

**Depois de B0:**
- B1A (Cinema) — carrosséis com dados reais
- B1B (Import/Export) — import com lookup funcional
- B2 (Busca) — catálogo populado = combobox com sugestões

---

## PHASE2_CATALOG_GAP_ANALYSIS — Gap de Catálogo

> Fonte: `docs/PHASE2_CATALOG_GAP_ANALYSIS.md` (2026-08-27)
> Status: `media_catalog` tem 729 animes. Zero filmes, séries, mangás, manhwa, manhua, novels, livros, jogos.

### Estado Atual

| Item | Status | Detalhe |
|------|--------|---------|
| `media_catalog` | 729 animes | Todos do AniList, `type: ANIME` only |
| `offline_anime_mapping` | 33.865 linhas | AODB cross-IDs (anilist/mal/kitsu) |
| `media_titles_i18n` | 0 | Vazio — nenhum título extra populado |
| `awards` | 0 | Vazio — nenhum badge de prestígio |
| `movie` entries | 0 | ❌ Nenhuma integração TMDB existe |
| `tv_series` entries | 0 | ❌ Nenhuma integração TMDB existe |
| `manga` entries | 0 | ❌ Script filtra `type: ANIME`, nunca retorna manga |
| `manhwa` / `manhua` | 0 | ❌ Mesma questão — AniList tem, query bloqueia |

### Por que o gap existe

`scripts/enrich-from-anilist.js` linha 34:
```graphql
Media(id: $id, type: ANIME) {  # ← HARDCODED para ANIME
```
A `FORMAT_MAP` (linhas 127-138) mapeia `MANGA → 'manga'` e `NOVEL → 'novel'`, mas essas são **código morto** — a query GraphQL nunca retorna MANGA/NOVEL porque `type: ANIME` filtra.

**Nenhum script TMDB existe.** `TMDB_API_KEY` está em `.env.example` mas nada usa.

### Plano de Enriquecimento por Tipo de Mídia

**Phase 2A — Expandir AniList para Manga/Manhwa/Manhua** (maior ROI)
- Fonte: AniList GraphQL API (já integrada)
- O que muda: duplicar `enrich-from-anilist.js` → modificar query `type: MANGA`, adicionar novo source table mapping
- Novo script: `scripts/enrich-manga-anilist.js`
- GraphQL query: `Media(id: $id, type: MANGA)` — mesmos campos + `chapters`, `volumes`, `staff`
- Fonte de IDs: AniList Popular/Top manga list (paginada GraphQL)
- Novos campos: `total_chapters`, `total_volumes`, `staff` → `studios[]` (autores mapeados para studios)
- Rate limit: Mesmo 60 req/min, sequencial
- AniList tem 100k+ entradas de manga

**Phase 2B — TMDB para Filmes + Séries de TV** (essencial para promessa "unificada")
- Fonte: TMDB REST API v3
- O que muda: novo script, nova env var, mapeamento de schema diferente
- Novo script: `scripts/enrich-tmdb.js`
- Endpoints: `/discover/movie`, `/discover/tv`, `/movie/{id}`, `/tv/{id}`
- Rate limit: 40 req/10s (tier gratuito) — muito mais rápido que AniList
- API key: `TMDB_API_KEY` (deve estar no `.env.local`)
- TMDB tem 1M+ filmes, 200k+ séries de TV

**Phase 2C — Títulos i18n** (bônus, baixo esforço)
- Fonte: Ambos AniList e TMDB já retornam títulos multilíngue
- O que muda: popular `media_titles_i18n` durante o enriquecimento

### Contagem de Itens para Demo

| Tipo | Contagem | Por que | Fonte | Chamadas API | Tempo est. |
|------|----------|---------|-------|-------------|-----------|
| **anime** | 1.000 | Expandir de 729→1000 via AniList Popular/Top | AniList | ~300 incrementais | 5 min |
| **manga** | 500 | AniList Top 500 manga cobre os hits | AniList | 500 | 9 min |
| **manhwa** | 100 | Top manhwa coreano | AniList | 100 | 2 min |
| **manhua** | 50 | Top manhua chinês | AniList | 50 | 1 min |
| **movie** | 200 | Top 200 filmes mais bem avaliados | TMDB | 400 | 2 min |
| **tv_series** | 200 | Top 200 séries de TV mais bem avaliadas | TMDB | 400 | 2 min |
| **novel** | 50 | Light novels AniList | AniList | 50 | 1 min |
| **TOTAL** | **~2.100** | Suficiente para grid cinematográfico + demo de busca | — | ~1.800 | ~22 min |

> **Mínimo viável de demo:** 200 filmes + 200 séries + 500 mangás = 900 itens novos. O "catálogo unificado" se torna visível imediatamente.

### Campos Críticos por Tipo

#### Filmes (Modo Streaming) — Fonte TMDB

| Campo | Crítico | Campo TMDB | Por quê |
|-------|---------|-----------|---------|
| `tmdb_id` | ✅ Primary key | `id` | Link para TMDB para detail/sync |
| `title_default` | ✅ | `title` | Exibição |
| `title_english` | ✅ | `title` (en) | Para títulos não-PT |
| `title_ptbr` | ✅ | `title` (pt-BR via `/translations`) | Público brasileiro |
| `synopsis` | ✅ | `overview` | Descrição na view cinema |
| `cover_url` | ✅ | `poster_path` → `https://image.tmdb.org/t/p/w500{path}` | Poster grid |
| `backdrop_url` | ✅ | `backdrop_path` → `https://image.tmdb.org/t/p/w780{path}` | **Crítico para cinema hero** |
| `release_year` | ✅ | `release_date` (extrair ano) | Filtro/ordenação |
| `release_status` | ✅ | `status` → mapear para enum | Filtro |
| `duration_minutes` | ✅ | `runtime` | Metadados cinema |
| `genres` | ✅ | `genres[].name` | Base para Novos Horizontes |
| `user_score_global` | ✅ | `vote_average / 10` | Exibição de rating |
| `age_rating_br` | ⚠️ | Não direto no TMDB — mapeamento de `/release_dates` ou hardcoded | Badge na view cinema |
| `prestige_badge` | ⚠️ | Não no TMDB — hardcoded `none` inicialmente | Badge |
| `studios` | ⚠️ | `production_companies[].name` | Secundário, útil para tag preference |

#### Séries de TV (Modo Streaming) — Fonte TMDB

Mesmo que filmes, mais:
- `total_episodes`: `number_of_episodes` — tracking de progresso
- `episode_duration_minutes`: `episode_run_time[0]` — metadados

#### Animes (Modo Streaming) — Fonte AniList (já funcionando)

- `backdrop_url`: ⚠️ Muitas vezes null — AniList `bannerImage` é esparsa. Considerar fallback TMDB.
- `age_rating_br`: ❌ Sempre 'L' — precisa mapeamento de tags + `isAdult` ou fonte externa.

#### Mangás/Manhwa/Manhua (Modo Leitura) — Fonte AniList

| Campo | Crítico | Campo AniList | Por quê |
|-------|---------|-------------|---------|
| `anilist_id` | ✅ Primary key | `id` | Link |
| `title_default` | ✅ | `title.romaji` | Exibição |
| `title_native` | ✅ | `title.native` | Japonês/chinês/coreano na leitura |
| `title_english` | ✅ | `title.english` | Fallback |
| `synopsis` | ✅ | `description` (strip HTML) | Descrição |
| `cover_url` | ✅ | `coverImage.extraLarge` | Capa em list/grid |
| `backdrop_url` | ❌ Não existe em mangás | — | Modo leitura não precisa de backdrops |
| `total_chapters` | ✅ | `chapters` | **Crítico para progresso de leitura** |
| `total_volumes` | ✅ | `volumes` | Metadados |
| `genres` | ✅ | `genres` | Algoritmo Novos Horizontes |
| `themes` | ✅ | `tags[category=Theme]` | Recomendação |
| `user_score_global` | ✅ | `averageScore / 10` | Rating |
| `release_year` | ✅ | `startDate.year` | Filtro |
| `release_status` | ✅ | `status` → mapear | Filtro |
| `age_rating_br` | ⚠️ | `isAdult` → '18' se true | Filtro NSFW |
| `studios` | ⚠️ | `staff.nodes` (autores) → mapear para studios[] | Tag preference — reaproveitar campo `studios` para "autores" em mangás |

#### Media_titles_i18n — Todos os tipos

| Campo | Fonte | Notas |
|-------|-------|-------|
| Language key | AniList `synonyms`, TMDB `translations` | Armazenar títulos alternativos |
| Priority | AniList: romaji, english, native, synonyms. TMDB: original_title, title, translations | Conforme spec §5.4 Title Resolver |

### Riscos e Notas

1. **TMDB_API_KEY não está no `.env.local`** — usuário precisa registrar em themoviedb.org e criar API key gratuita.
2. **Busca manga AniList** — usar `sort: POPULARITY_DESC` com `isAdult: false`.
3. **Deduplicação** — ambos scripts devem tratar duplicatas possíveis. Estratégia: preferir `anilist_id` para anime/mangá, `tmdb_id` para filmes/TV.
4. **Cobertura de backdrop para animes** — AniList `bannerImage` muitas vezes null. Considerar cross-reference com TMDB TV anime entries.
5. **Mapeamento `age_rating_br`** — nenhuma API retorna ratings brasileiros. Opções: TMDB `release_dates[].certification` → mapeamento BR aproximado (R→16, PG-13→12); AniList `isAdult: true` → '18', senão 'L' (conservador); manual para top 50.
6. **`prestige_badge`** — inicialmente todos `'none'`. Pode ser populado depois de dados de prêmios (Oscar, Emmy, Anime Awards), mas não crítico para demo.
7. **Schema já suporta todos os tipos** — nenhuma migration necessária. O `media_type_enum` já inclui todos os 9 tipos.

---

## LAUNCH_DRAFTS — Drafts de Lançamento

> Fonte: `LAUNCH_DRAFTS.md` (2026-08-26)
> Base: issue #3 + identidade do Hubble

### Product Hunt

**Título:** Hubble — seu tracker de mídia privado, sem vaidade social

**Tagline:** Centralize filmes, séries, animes e quadrinhos em um só lugar, sem redes sociais.

**Corpo:**
O Hubble junta em um único diário privado filmes, séries, animes, mangás, manhwas e novels. Sem feed público. Sem seguidores. Sem algoritmo de engajamento. Apenas você, seu progresso e recomendações silenciosas.

**Destaques:**
- Modo Cinema imersivo para vídeo
- Modo Lista ultra-rápida para leitura
- Algoritmo "Novos Horizontes" anti-bolha
- Export/import para migração de outros trackers
- 100% gratuito, sem paywall em estatísticas

**CTA:** Experimente o beta fechado e pare de saltar entre 5 apps diferentes.

### Hacker News — Show HN

**Título:** Show HN: Hubble — tracker unificado de mídia privado, sem vaidade social

**Pilares:**
- Privacidade por padrão
- Interface camaleão: streaming vs leitura
- Recomendações baseadas em tags, sem criar bolhas
- Offline-first via mapeamento local para evitar rate limits
- Stack gratuita: Next.js, Supabase, Vercel free tier

**Motivação:** Cansado de manter 5 contas em 5 plataformas, algumas com paywall em estatísticas e outras com exposição pública involuntária.

**Status:** Beta fechado funcionando; roadmap aberto no GitHub.

### Mídias de Divulgação (sugeridas)

Screenshots/GIFs sugeridos:
- Hero backdrop modo cinema
- Tabela compacta do modo leitura
- Fluxo de login e primeira busca
- Página de estatísticas pessoais
- Editor de insights com markdown
- Página "Novos Horizontes"

Demo video curto:
- Duração: 60s a 90s
- Abertura: problema dos 5 apps
- Meio: tour rápido por modo cinema e modo lista
- Fechamento: CTA para beta + link do repo

---

## Decisões e Workarounds

| Decisão | Detalhe | Data |
|---------|---------|------|
| Tailwind v3.4.19 + tailwindcss-animate@1.0.7 | Sem v4/postcss v4 | 2026-08-26 |
| `postcss.config.js` com plugins `tailwindcss` + `autoprefixer` | — | 2026-08-26 |
| Removido `@tailwindcss/postcss` | Conflito de versões | 2026-08-26 |
| `globals.css` usa `@apply` padrão do Tailwind v3 | Custom classes como CSS puro | 2026-08-26 |
| `NEXT_DISABLE_TURBOPACK=1` | Workaround para route groups `app/(dashboard)` e `app/(auth)` | 2026-08-26 |
| Dev server em `http://localhost:3000` | — | 2026-08-26 |
| MCP Supabase SSE para aplicar migrations | Alternativa à Management API quando precisa rodar SQL | 2026-08-20 |
| `handle_new_user` com SECURITY DEFINER | Corrige trigger que falhava com perfil criado via API | 2026-08-20 |
| `user_tag_preferences` com themes (+5) e studios (+3) | Extensão além de só genres (+10) | 2026-08-20 |
| Supabase Cloud > Docker local para PC fraco | Nenhuma diferença funcional | 2026-08-16 |
| Management API para migrations sem CLI | `POST /v1/projects/{ref}/database/query` com bearer token | 2026-08-16 |
| AODB schema `{ data: Anime[] }` na raiz | JSONStream precisa de `data.*` (não `data[*]`) | 2026-08-16 |
| Kitsu URL mudou: `kitsu.app` (não `kitsu.io`) | — | 2026-08-16 |
| Rate limit AniList: 90 req/min teórico, usar 60 req/min com 1 concorrente | Segurança | 2026-08-16 |
| Triggers SECURITY DEFINER precisam de permissões explícitas nas tabelas alvo | — | 2026-08-16 |
| Workaround para signup: inserir direto em `auth.users` + garantir profile manual | Para testes | 2026-08-16 |

---

## Dependências Externas

| Dependência | Status | Impacto |
|-------------|--------|---------|
| `ANILIST_CLIENT_ID` + `ANILIST_CLIENT_SECRET` no `.env.local` | ❌ Vazios | Bloqueia #5 (enrich-from-anilist), #6 (busca real) |
| `TMDB_API_KEY` no `.env.local` | ❌ Ausente | Bloqueia B0 (TMDB filmes/séries) |
| Storage bucket `avatars` no Supabase | ❌ Não criado | Bloqueia upload de avatar |
| Email provider no Supabase Dashboard | ❌ Desabilitado | Bloqueia signup real (#4) |
| Extensão `pg_trgm` no Supabase | ✅ Ativada | Índice `idx_media_trgm` existe |
| Cadastro no AniList Developer | ❌ Não feito | Necessário para obter `ANILIST_CLIENT_*` |
| Cadastro no TMDB | ❌ Não feito | Necessário para obter `TMDB_API_KEY` |
| Vercel para deploy | ❌ Não configurado | Bloqueia #20 (deploy público) |

---

## Dependências Internas (Blocos × Blocos)

| Bloco | Dependência | Por quê |
|-------|-------------|---------|
| B0 (Catalog) | Credenciais AniList + TMDB | Scripts de enriquecimento precisam de API keys |
| B1A (Cinema) | B0 | Carrosséis na home precisam de dados reais no `media_catalog` |
| B1B (Import/Export) | B0 | Import faz lookup em `media_catalog` — catálogo vazio = 0 matches |
| B1B (Import/Export) | Bucket `avatars` | Upload de avatar precisa do bucket existindo |
| B2 (Busca) | B0 + B4 | Combobox sem dados = sem sugestões; sem índice GIN = lento |
| B2 (Busca) | `media_titles_i18n` populado | Índice criado mas tabela vazia — preventivo agora |
| B3 (InsightsEditor) | — | Zero dependências externas |
| B4 (ReadingTable) | — | Zero dependências externas |

---

## Decisões Pendentes

| # | Decisão | Recomendação |
|---|---------|-------------|
| 1 | Busca `.textSearch()` vs trigram `%` | RPC ou mudar para `.ilike()`? Recomendação: raw SQL RPC com operador `%` |
| 2 | Import sync vs async | Sync OK para <1000 rows (MVP). Edge Function para bulk futuro |
| 3 | Export CSV: flat vs zip multi-sheet | Recomendação: single CSV flat + JSON como fallback full-fidelity |
| 4 | ExportApi client: `downloadUrl` vs blob direto | Recomendação: blob direto, remover `downloadUrl` do helper |
| 5 | Cursor pagination | Adiar até ~5k registros |
| 6 | CinemaCarousel wrapper client vs inline | Wrapper separado é mais limpo. Recomendação: criar `CinemaCarousel.tsx` separado |

---

## Notas Finais

1. **Repositório sincronizado com `origin/main`** (commit `375b6ff`). Última atualização de progresso: 2026-08-20 (Sessão 3). Última atualização de planejamento: 2026-08-27 (Phase 2 Execution Plan).
2. **Branch `feat/streaming-mode`** existe (commits `845cabc`, `86e8334`, `884a902`, `a0fa0e7`, `12ab155`) mas está parada em `12ab155`. `main` já tem alguns desses commits aplicados via merge ou fix-up.
3. **Arquivos untracked (não commitados):** `docs/PHASE2_CATALOG_GAP_ANALYSIS.md`, `docs/PHASE2_EXECUTION_PLAN.md`, `scripts/pd_load_fuzz_gen.py`, `tmp-test-supabase.cjs`
4. **AODA:** nenhum dos 21 issues do GitHub está fechado. Mesmo os issues com implementação local concluída (#8, #10, #11, #12) permanecem como OPEN — precisariam de atualização manual no GitHub para refletir o estado real.
5. **Este arquivo é um snapshot estático** — não é um documento vivo. Para manter atualizado, revisar periodicamente os issues e o ROADMAP.
