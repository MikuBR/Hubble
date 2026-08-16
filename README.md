<div align="center">

  <br />
  <h1>🔭 H U B B L E</h1>
  <p><strong>Ecossistema Unificado & Privado de Rastreamento de Mídia</strong></p>

  <p>
    Centralize o registro de progresso, notas e percepções pessoais de todo tipo de mídia ocidental e oriental em uma única plataforma minimalista e sem distrações sociais.
  </p>

  <p>
    <a href="#-visão-geral">Visão Geral</a> •
    <a href="#-funcionalidades-chave">Funcionalidades</a> •
    <a href="#-stack-tecnológica">Stack</a> •
    <a href="#-arquitetura-e-dados">Arquitetura</a> •
    <a href="#-roadmap-do-projeto">Roadmap</a> •
    <a href="#-como-executar">Como Executar</a> •
    <a href="#-troubleshooting-erros-comuns">Troubleshooting</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js_15-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Supabase_PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License MIT" />
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=for-the-badge" alt="PRs Welcome" />
    <img src="https://img.shields.io/badge/Phase_1-Complete-success?style=for-the-badge" alt="Phase 1 Complete" />
  </p>

  <br />
</div>

---

## 💡 Visão Geral & Filosofia

O **Hubble** nasceu para combater a **fadiga da fragmentação de mídia**. Atualmente, quem consome conteúdo audiovisual e leitura precisa alternar entre múltiplas plataformas (Letterboxd para filmes, TV Time para séries, AniList para animes, MyAnimeList para mangás).

O Hubble resolve isso oferecendo uma **centralização privada de alto desempenho**:

* 🔒 **Privacidade por Padrão:** Sem feeds públicos, seguidores ou métricas de vaidade. Seu diário de mídia é 100% seu.
* 🦎 **Interface Camaleão:** O design se molda dinamicamente ao tipo de mídia (Modo Cinema Imersivo para vídeo vs. Modo Lista/Planilha Ultra-Rápida para leitura).
* ⚡ **Performance Sem Bloqueios:** Mapeamento local de dados usando o *Anime Offline Database* para evitar travamentos de API e *Rate Limits*.

---

## ✨ Funcionalidades Chave

### 🎨 Engenharia de Interface Camaleão

* 🎬 **Modo Streaming (Vídeo):** Tema escuro imersivo estilo sala de cinema, com grandes *backdrops*, trailers, e carroséis horizontais.
  * **Classificação Etária BR:** Exibição nativa dos selos de classificação etária brasileira (`L`, `10`, `12`, `14`, `16`, `18`) e descritores em hover.
  * **Distintivo de Prestígio:** Faixas douradas e troféus (🏆) para obras vencedoras de premiações históricas do cinema e da animação.
* 📊 **Modo Lista Premium (Leitura):** Tabela ultra-compacta focada em produtividade para leitores assíduos de Mangás, Manhwas e Manhuas.
  * **Incremento com 1 Clique (`+1 Capítulo`):** Atualização otimista na UI sem recarregar a página.

### 🧠 Inteligência & Personalização

* 📝 **Meus Insights Privados:** Diário de bordo em texto rico/markdown para cada obra, onde você registra teorias, citações e percepções pessoais sem expor para a internet.
* 🎯 **Algoritmo Silencioso de Gosto:** Matriz invisível de afinidade por tags (`-50` a `+100`). Avaliar bem uma obra soma pontos para suas tags; avaliar mal subtrai.
* 🌌 **Aba "Novos Horizontes":** Sistema anti-bolha que sugere obras altamente aclamadas de gêneros que você ainda não explorou.
* ⚙️ **Filtro Adulto (NSFW) & Desativação Modulares:** Se você não consome filmes e séries, desative a opção nas configurações e a interface ocultará todos os menus de vídeo, tornando o Hubble 100% focado em quadrinhos.

---

## 🛠️ Stack Tecnológica

O Hubble foi projetado para rodar de forma **100% gratuita** utilizando serviços serverless de alta performance e código aberto:

* **Front-End:** [Next.js](https://nextjs.org/) (App Router, Server Components) + [Tailwind CSS](https://tailwindcss.com/) + [Framer Motion](https://www.framer.com/motion/)
* **Banco de Dados:** [PostgreSQL](https://www.postgresql.org/) hospedado no [Supabase](https://supabase.com/) ou [Neon](https://neon.tech/)
* **Back-End / API:** Next.js Route Handlers + Supabase Edge Functions
* **Ingestão de Dados Semanal:** [GitHub Actions](https://github.com/features/actions) (Cron Workflow baixando o *Anime Offline Database* via stream)
* **Hospedagem:** [Vercel](https://vercel.com/) (Camada Gratuita)
* **Tipagem:** TypeScript estrito com tipos gerados do banco (`src/lib/database.types.ts`)

---

## 🏗️ Arquitetura & Fluxo de Ingestão de Dados

Para evitar o colapso por *Rate Limit* (Erro 429) e manter buscas em milissegundos sem estourar quotas de servidores gratuitos, o Hubble adota uma arquitetura de mapeamento offline de IDs:

```text
┌──────────────────────────────────────────────────────────┐
│              GitHub Actions (Cron Semanal)               │
│ Downloads: Anime Offline Database (JSON ~80MB)           │
└────────────────────────────┬─────────────────────────────┘
                             │ Batch Insert / UPSERT
                             ▼
┌──────────────────────────────────────────────────────────┐
│          PostgreSQL / Supabase (Tabela Local)            │
│  [anilist_id | mal_id | kitsu_id | tmdb_id | mangadex]   │
└────────────────────────────┬─────────────────────────────┘
                             │ Consulta Interna
                             ▼
┌──────────────────────────────────────────────────────────┐
│            Hubble Web App (Next.js UI)                   │
│ Renderiza Busca Unificada e Atualizações sem Bloqueios   │
└──────────────────────────────────────────────────────────┘
```

### Estrutura do Banco (9 Tabelas)

| Tabela | Descrição |
|--------|-----------|
| `profiles` | Perfil do usuário (estende `auth.users`) |
| `media_catalog` | Catálogo unificado de obras (anime, manga, movie, tv, novel, game) |
| `user_media_progress` | Progresso do usuário por obra (episódios/capítulos, score, status) |
| `user_tag_preferences` | Matriz de afinidade por tags (gênero, tema, estúdio) |
| `media_titles_i18n` | Títulos alternativos multi-idioma |
| `awards` | Premiações vinculadas às obras (admin) |
| `export_logs` | Auditoria de exportações de dados do usuário |
| `ingestion_logs` | Logs dos jobs de ingestão semanal |
| `offline_anime_mapping` | Mapeamento cruzado AODB → AniList/MAL/Kitsu/ANIDB |

### RPCs Disponíveis

| Função | Descrição |
|--------|-----------|
| `get_recommendations(user_id, limit)` | Recomendações baseadas em afinidade de gêneros |
| `get_horizons(user_id, limit)` | **Novos Horizontes** - anti-bolha: obras bem avaliadas de gêneros inexplorados |
| `get_user_stats(user_id)` | Estatísticas pessoais (totais, médias, top gêneros/estúdios) |

### Triggers Ativos

| Trigger | Tabela | Ação |
|---------|--------|------|
| `set_updated_at_*` | profiles, media_catalog, user_media_progress | Atualiza `updated_at` automaticamente |
| `recompute_tag_preferences` | user_media_progress | Atualiza `user_tag_preferences` ao completar obra com score ≥ 8.0 |
| `block_hiatus_progress` | user_media_progress | Bloqueia incremento de progresso em mídia com `release_status = 'hiatus'` |
| `on_auth_user_created` | auth.users | Cria `profile` automaticamente no signup |

---

## 🧠 Algoritmo de Recomendação (Detalhado)

### Visão Geral

O Hubble utiliza um **sistema híbrido em evolução** baseado em **Content-Based Filtering via Tag Affinity** como fundação, projetado para evoluir progressivamente para abordagens híbridas colaborativas conforme a base de usuários cresce — **sem nunca sacrificar privacidade, cold-start zero ou explicabilidade**.

### Estado Atual (v0.1 — Production Ready)

#### Arquitetura Implementada
```mermaid
graph LR
    A[User completa obra<br/>score ≥ 8.0] --> B[Trigger recompute_tag_preferences]
    B --> C[user_tag_preferences[genre] += 10<br/>theme += 5<br/>studio += 3]
    C --> D[get_recommendations<br/>WHERE genre IN (+genres) AND score > 7.5]
    C --> E[get_horizons<br/>WHERE genre NOT IN (any) AND score > 8.0]
```

#### Tabela: `user_tag_preferences` (Matriz de Afinidade)
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `user_id` | UUID | FK → profiles |
| `tag_type` | TEXT | `'genre' \| 'theme' \| 'studio'` |
| `tag_name` | TEXT | Nome da tag (ex: "Sci-Fi", "Cyberpunk", "Studio Ghibli") |
| `score` | INT | `-50` a `+100` (inicial 0) |
| `updated_at` | TIMESTAMPTZ | Para decay temporal futuro |

#### Sinais Explícitos (Hoje)
| Ação | Trigger | Delta por Tag |
|------|---------|---------------|
| Completar com **score ≥ 8.0** | `recompute_tag_preferences` | `genre: +10`, `theme: +5`, `studio: +3` |
| Completar com **score ≤ 5.0** | `recompute_tag_preferences` | `genre: -5`, `theme: -3`, `studio: -2` |
| Drop early / abandonado | (planejado Phase B) | Penalidade progressiva |

#### RPCs Disponíveis
| Função | Lógica | Uso |
|--------|--------|-----|
| `get_recommendations(user_id, limit)` | Obras `score > 7.5` que compartilham gêneros com `score > 0` no perfil | Aba "Para Você" |
| `get_horizons(user_id, limit)` | **Anti-bolha**: obras `score > 8.0` de gêneros com `score = 0` ou `NULL` | Aba "Novos Horizontes" |
| `get_user_stats(user_id)` | Retorna `top_genres[]`, `top_studios[]` ordenados por score | Dashboard de Gosto |

#### Métricas Atuais
| Métrica | Valor | Status |
|---------|-------|--------|
| **Cold Start** | 1 avaliação ≥ 8.0 | ✅ Zero cold-start |
| **Latência RPC** | <15ms (p95) | ✅ Excelente |
| **Explicabilidade** | "Porque você gosta de Sci-Fi + Cyberpunk" | ✅ Nativa |
| **Privacidade** | Zero dados externos, só suas avaliações | ✅ Total |
| **Cobertura** | Limitada a gêneros explícitos | ⚠️ Gap conhecido |

---

### Limitações Conhecidas (v0.1)

| Limitação | Impacto | Mitigação Planejada |
|-----------|---------|---------------------|
| **Over-specialization** | Recomenda só variações do conhecido | MMR (Maximal Marginal Relevance) no rerank |
| **Gêneros amplos** | "Action" não diferencia "shonen battle" de "seinen tactical" | Themes + Studios + AniList tag `rank` como peso |
| **Sem sinais implícitos** | Ignora completion rate, rewatch, speed, early drop | Phase B: sinais implícitos |
| **Diversidade não controlada** | Pode recomendar 5 shonens seguidos | MMR + diversidade por theme/studio |
| **Sem collaborative signal** | Não aprende com usuários similares | Phase C: Hybrid CF (>10k users) |

---

### Roadmap de Evolução (Pragmático)

#### Phase A — Quick Wins (Paralelo à Phase 2 UI)
| Melhoria | Esforço | Impacto Estimado | Implementação |
|----------|---------|------------------|---------------|
| **Peso por rank AniList** | 2h | +15% precision | Tags têm `rank` 0-100, usar como multiplicador |
| **Themes + Studios no trigger** | 3h | +10% recall | Já no catálogo, só estender trigger |
| **Decay temporal** | 4h | Reduz staleness | Job cron: `score *= 0.995^dias_sem_avaliar` |
| **MMR (Diversidade)** | 6h | UX muito melhor | Maximal Marginal Relevance no rerank final |

#### Phase B — Sinais Implícitos (Phase 3)
| Sinal | Fonte | Peso | Status |
|-------|-------|------|--------|
| Completion rate | `current_unit/total_episodes` | 0.8 | Planejado |
| Rewatch count | `rewatch_count` | 1.2 | Planejado |
| Early drop penalty | `dropped` + low progress | -1.0 | Planejado |
| Speed bonus | `completed_at - started_at` | 0.6 | Planejado |

#### Phase C — Hybrid Collaborative Filtering (Phase 4 — >10k users)
1. **Matriz implícita** user×item (completed=1, dropped=-0.5, watching=0.3)
2. **Treino offline** LightGCN / EASE (GPU, semanal via GitHub Actions)
3. **Serving** via pgvector (Supabase) ou Edge Function (Deno)
4. **Cascade**: CF top-100 → CB rerank → MMR → UI

#### Phase D — LLM Rerank (Experimental / Opt-in)
- Modelo pequeno (Phi-3-mini 3.8B) em Edge Function
- Prompt: "User likes: [tags]. Candidate: [synopsis+genres]. Score 0-10 relevance."
- Cache 24h por user×candidate
- **Opt-in explícito** — privacidade first

---

### Trade-offs que NÃO Vamos Fazer

| ❌ Não | Por Que |
|--------|---------|
| Tracking cross-site / fingerprinting | Viola privacidade core do Hubble |
| Enviar dados para API externa (OpenAI, etc.) | Dados sensíveis saem do controle |
| Requerer login social / OAuth obrigatório | Email/password já funciona |
| Modelo > 1GB (BERT-base, etc.) | Custo + latência + cold start Edge |
| A/B test sem consentimento explícito | Ética |

---

### Documentação Técnica Completa

> **Ver:** [`docs/RECOMMENDATION_ALGORITHM_RESEARCH.md`](docs/RECOMMENDATION_ALGORITHM_RESEARCH.md) — Pesquisa detalhada, referências acadêmicas, métricas de sucesso, código de migração.

---

## 🚀 Roadmap do Projeto

### Phase 1 — Fundações (✅ **100% Concluída** — *Backend Core Ready*)
- [x] Arquitetura base: Next.js 15 + Supabase + PostgreSQL
- [x] Schema de dados: 9 tabelas com RLS completo
- [x] Auth seguro (Email Provider + OAuth ready)
- [x] Tipos TypeScript gerados do banco (`src/lib/database.types.ts`)
- [x] Enriquecimento automático via AniList GraphQL (1.000 animes)
- [x] 3 RPCs funcionais: `get_recommendations`, `get_horizons`, `get_user_stats`
- [x] 4 Triggers ativos: affinity, hiatus validation, updated_at, auto-profile
- [x] Testes E2E automatizados (signup → progress → RPCs)
- [x] Documentação técnica completa + Troubleshooting

---

### Phase 2 — Interface & Experiência do Usuário (🎯 **PRÓXIMA — Início Imediato**)

| Sprint | Feature | Descrição Técnica | Estimativa | Status |
|--------|---------|-------------------|------------|--------|
| **2.1** | **Modo Streaming (Cinema)** | Tema escuro imersivo, backdrops full-bleed, carrosséis horizontais, player trailer embed, classificação etária BR badges | 2-3 semanas | 🔲 Planejado |
| **2.2** | **Modo Lista Premium (Leitura)** | Tabela virtualizada (TanStack Table), colunas: capa, título, progresso (cap/vol), status, score, ações; incremento otimista `+1 cap` | 2 semanas | 🔲 Planejado |
| **2.3** | **Busca Unificada & Filtros** | Combobox com debounce, busca trigram (pg_trgm), filtros: tipo, status, gênero, ano, score, tags | 1 semana | 🔲 Planejado |
| **2.4** | **Editor de Insights (Markdown)** | TipTap/ProseMirror com sanitização (rehype-sanitize), spoilers toggle, preview live, auto-save | 1 semana | 🔲 Planejado |
| **2.5** | **Aba "Novos Horizontes" (UI)** | Consome `get_horizons` RPC, cards de descoberta, explainability ("por que isso?"), feedback loop | 1 semana | 🔲 Planejado |
| **2.6** | **Sistema de Gosto (UI)** | Dashboard de afinidade: tags positivas/negativas, radar chart, exportação de gosto | 3-4 dias | 🔲 Planejado |
| **2.7** | **Filtro NSFW & Módulos** | Toggle global + por tipo de mídia, hidratação condicional de rotas/componentes | 2-3 dias | 🔲 Planejado |
| **2.8** | **Perfil & Configurações** | Avatar upload (Supabase Storage), temas, idiomas, privacidade, exportação de dados | 1 semana | 🔲 Planejado |

---

### Phase 3 — Infraestrutura & Automação (📅 **Pós-Phase 2**)

| Item | Descrição | Estimativa |
|------|-----------|------------|
| **GitHub Actions Cron** | Workflow semanal: download AODB → enrich AniList → upsert `media_catalog` → log | 2 dias |
| **Supabase Edge Functions** | Migrar lógica server-only (enriquecimento, jobs pesados) para Edge (Deno) | 3 dias |
| **Vercel Pipeline** | Preview deploys automáticos, `vercel.json` com headers/cache, env sync | 1 dia |
| **Observabilidade** | Logs estruturados (Pino), métricas customizadas (Vercel Analytics + Supabase Logs) | 2 dias |
| **Backup & Recovery** | Point-in-time recovery testado, export automático semanal para R2/S3 | 1 dia |

---

### Phase 4 — Expansão & Ecossistema (🔮 **Visão de Longo Prazo**)

- [ ] **API Pública v1** — REST + GraphQL para desenvolvedores (rate limited, OAuth2)
- [ ] **Exportação de Dados** — JSON/CSV/Markdown completo (LGPD/GDPR ready)
- [ ] **Comunidade Opcional** — Fóruns por obra, comentários, listas públicas (opt-in)
- [ ] **Multiplataforma** — PWA (service worker, offline-first), Capacitor para iOS/Android
- [ ] **Integrações** — Trakt.tv sync, AniList/MAL import/export, Discord Rich Presence
- [ ] **AI Features** — Resumos auto de insights, recomendações LLM-based, OCR para caps físicos

---

### 📊 Progresso Visual Atual

```
Phase 1 ████████████████████ 100% ✅
Phase 2 ░░░░░░░░░░░░░░░░░░░░   0%  🎯 NEXT
Phase 3 ░░░░░░░░░░░░░░░░░░░░   0%
Phase 4 ░░░░░░░░░░░░░░░░░░░░   0%
```

---

### 🎯 Próxima Ação Imediata (Sprint 2.1)

```bash
# 1. Criar branch da feature
git checkout -b feat/streaming-mode

# 2. Scaffold das páginas (App Router)
mkdir -p src/app/\(dashboard\)/streaming
mkdir -p src/components/streaming

# 3. Componentes base: MediaCarousel, BackdropHero, RatingBadges
# 4. Integração com RPC get_recommendations + get_horizons
# 5. Tailwind config: cinema theme (--bg: #0a0a0f, --card: #14141f, --accent: #e50914)
```

---

## 🛠️ Como Executar

### Pré-requisitos
- **Node.js ≥ 18.17**
- **pnpm** (recomendado) ou npm/yarn
- **Conta no Supabase** (gratuita) ou PostgreSQL local via Docker

### Instalação

```bash
# Clone e entre no projeto
git clone <url-do-repositorio>
cd Hubble

# Instale as dependências (pnpm é mais rápido e usa menos disco)
pnpm install
# ou: npm install

# Configure as variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais (veja seção abaixo)

# Rode o desenvolvimento
pnpm dev
# ou: npm run dev
```

### Variáveis de Ambiente (`.env.local`)

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | URL do projeto Supabase (ex: `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Chave anônima pública (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Chave de serviço (server-side, **nunca expor no client**) |
| `NEXT_PUBLIC_APP_URL` | ✅ | URL da aplicação (ex: `http://localhost:3000`) |
| `ANILIST_CLIENT_ID` | ⚠️ | Para enriquecimento via AniList GraphQL |
| `ANILIST_CLIENT_SECRET` | ⚠️ | Para enriquecimento via AniList GraphQL |

> **⚠️ IMPORTANTE:** Nunca commite `.env.local`. Use `.env.example` como template.

### Configuração do Supabase (Passo a Passo)

1. **Crie o projeto** em [supabase.com](https://supabase.com) (região: São Paulo recomendada)
2. **Ative a extensão `pg_cron`** no Dashboard → Database → Extensions
3. **Execute as migrations** na ordem (SQL Editor):
   - `supabase/migrations/20260816000001_init_schema.sql`
   - `supabase/migrations/20260816000002_triggers.sql`
   - `supabase/migrations/20260816000003_rpc_functions.sql`
   - `supabase/migrations/20260816000004_fix_signup_and_test_user.sql`
   - `supabase/migrations/20260816000005_fix_validate_progress.sql`
   - `supabase/migrations/20260816000006_fix_get_user_stats_v3.sql`
4. **Authentication → Providers → Email**: Habilite "Enable Email Provider"
5. **Authentication → URL Configuration**: Adicione `http://localhost:3000/auth/callback` em Redirect URLs
6. **Copie as chaves** (Project Settings → API) para `.env.local`

### Scripts Disponíveis

```bash
# Desenvolvimento
pnpm dev                    # Next.js dev server (Turbopack)

# Build & Produção
pnpm build                  # Build de produção
pnpm start                  # Servidor de produção

# Qualidade de Código
pnpm lint                   # ESLint
pnpm type-check             # TypeScript (tsc --noEmit)
pnpm format                 # Prettier

# Banco de Dados / Enriquecimento
pnpm enrich:anilist         # Enriquece media_catalog via AniList GraphQL (~30 min)
pnpm test:e2e               # Testa fluxo completo (signup → progress → RPCs)

# Deploy
pnpm deploy:vercel          # Deploy preview no Vercel
pnpm deploy:prod            # Deploy produção no Vercel
```

---

## 🧪 Testes & Verificação

### Teste E2E do Fluxo Completo

```bash
pnpm test:e2e
```

**O que valida:**
1. ✅ Catálogo populado (1.000 animes com genres/themes/studios)
2. ✅ Signup via email cria usuário + profile automaticamente
3. ✅ Adicionar obra à biblioteca (`user_media_progress`)
4. ✅ Atualizar progresso (watching → completed, score 9.0)
5. ✅ Trigger `user_tag_preferences` dispara (+10/gênero)
6. ✅ RPC `get_user_stats` retorna estatísticas + top_genres
7. ✅ RPC `get_recommendations` retorna recomendações por afinidade
8. ✅ RPC `get_horizons` retorna "Novos Horizontes" (anti-bolha)

### Enriquecimento Manual (AniList)

```bash
pnpm enrich:anilist
```

- Processa **1.000 mapeamentos** do `offline_anime_mapping`
- Rate limit conservador: **60 req/min** (1 concorrente)
- Logs salvos em `ingestion_logs` (source: `anilist_enrichment`)
- Atualiza: `genres`, `themes`, `studios`, `user_score_global`, `synopsis`, `cover_url`

---

## 🛡️ Troubleshooting — Erros Comuns

### 1. **Signup falha: "Database error creating new user"**
**Causa:** Trigger `handle_new_user` com erro (ex: username null, FK violation).
**Solução:**
- Verifique se a migration `20260816000004_fix_signup_and_test_user.sql` foi aplicada
- O trigger usa `SECURITY DEFINER` e fallback: `COALESCE(username, split_part(email, '@', 1))`
- Se persistir, insira usuário manual em `auth.users` + profile

### 2. **RPC `get_user_stats`: "column reference is ambiguous"**
**Causa:** Colunas `created_at`, `status`, `user_score` existem em múltiplas tabelas no JOIN.
**Solução:** Migration `20260816000006_fix_get_user_stats_v3.sql` prefixa tudo com alias (`u.`, `mc.`).

### 3. **Trigger `validate_progress_increment`: "column reference release_status is ambiguous"**
**Causa:** Ambas tabelas têm colunas com nomes similares.
**Solução:** Migration `20260816000005_fix_validate_progress.sql` usa alias `mc.release_status`.

### 4. **Enriquecimento AniList: "RATE_LIMIT" (HTTP 429)**
**Causa:** Excedeu 90 req/min do AniList.
**Solução:** Script já usa 60 req/min + 1 concorrente + backoff exponencial. Se persistir, aumente `REQUEST_DELAY_MS` em `scripts/enrich-from-anilist.js`.

### 5. **Tag preferences não geradas (array vazio)**
**Causa:** Obra no `media_catalog` sem `genres` populados.
**Solução:** Rode `pnpm enrich:anilist` para popular genres/themes/studios. O trigger só processa gêneros existentes.

### 6. **TypeScript: "Cannot find module '@/lib/database.types'"**
**Causa:** Path alias `@/*` não resolvido ou arquivo não existe.
**Solução:** Verifique `tsconfig.json` → `paths: { "@/*": ["./src/*"] }` e que `src/lib/database.types.ts` existe.

### 7. **Supabase CLI: "Access token not provided"**
**Causa:** `supabase gen types` precisa de Personal Access Token (PAT), não Service Role Key.
**Solução:** Use tipos gerados manualmente (`src/lib/database.types.ts`) ou crie PAT em supabase.com/dashboard/account/tokens.

### 8. **Erro 401/403 em RPCs**
**Causa:** Usuário não autenticado ou RLS bloqueando.
**Solução:** 
- Verifique se `auth.uid()` corresponde ao `user_id` na query
- RPCs têm `GRANT EXECUTE TO authenticated`
- Tabelas têm policies `FOR ALL USING (auth.uid() = user_id)`

### 9. **Build falha: "Module not found" em imports do Supabase**
**Causa:** `@supabase/supabase-js` não instalado ou versão incompatível.
**Solução:** `pnpm add @supabase/supabase-js@latest` e reinicie dev server.

### 10. **Docker local: "port 5432 already in use"**
**Causa:** PostgreSQL local rodando na porta padrão.
**Solução:** Pare o serviço local (`sudo systemctl stop postgresql`) ou mude porta no `docker-compose.yml`.

---

## 📁 Estrutura do Projeto

```
Hubble/
├── .env.example              # Template de variáveis de ambiente
├── .env.local                # Suas credenciais (NÃO COMMITAR)
├── next.config.ts            # Config Next.js
├── tsconfig.json             # TypeScript strict mode
├── tailwind.config.ts        # Tailwind CSS
├── package.json
├── pnpm-lock.yaml
├── README.md                 # Este arquivo
├── PROJECT_SPEC.md           # Especificação técnica completa
├── PROGRESS.md               # Log diário de progresso
├── supabase/
│   └── migrations/           # 6 migrations SQL (ordem numérica)
│       ├── 20260816000001_init_schema.sql
│       ├── 20260816000002_triggers.sql
│       ├── 20260816000003_rpc_functions.sql
│       ├── 20260816000004_fix_signup_and_test_user.sql
│       ├── 20260816000005_fix_validate_progress.sql
│       └── 20260816000006_fix_get_user_stats_v3.sql
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (auth)/           # Rotas de autenticação
│   │   ├── (dashboard)/      # Área logada
│   │   └── api/              # Route Handlers
│   ├── components/           # Componentes React
│   │   ├── ui/               # Primitivas (Button, Input, Card)
│   │   ├── media/            # Cards, Lists, Details
│   │   └── insights/         # Editor de Insights
│   ├── lib/
│   │   ├── database.types.ts # **Tipos gerados do banco (20KB+)**
│   │   ├── supabase/         # Client + Server helpers
│   │   └── utils/            # Helpers gerais
│   ├── hooks/                # Custom React hooks
│   └── types/                # Tipos compartilhados
├── scripts/
│   ├── enrich-from-anilist.js    # Enriquecimento via AniList GraphQL
│   └── test-e2e-flow-fixed.js    # Teste E2E automatizado
└── public/                   # Assets estáticos
```

---

## 🔐 Segurança & Boas Práticas

- **RLS (Row Level Security)** em todas as tabelas de usuário
- **Service Role Key** apenas em scripts server-side / GitHub Actions
- **Anon Key** apenas no client (Next.js `NEXT_PUBLIC_*`)
- **Triggers com `SECURITY DEFINER`** para operações cross-table
- **Validação de enum** no banco + TypeScript
- **Sanitização de Markdown** nos Insights (rehype-sanitize)
- **Rate limiting** conservador em scripts de ingestão

---

## 📄 Licença

MIT License — sinta-se livre para usar, modificar e distribuir.

---

<div align="center">

  <p><strong>Made with ❤️ and 🖥️ by the Hubble Team</strong></p>
  <p><em>"Explore o universo da mídia sem sair da órbita."</em></p>

</div>