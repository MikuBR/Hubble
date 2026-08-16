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
    <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License MIT" />
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

## 🚀 Roadmap do Projeto

### Phase 1 — Fundações (✅ Concluída)
- [x] Arquitetura base: Next.js + Supabase + PostgreSQL
- [x] Schema de dados: 9 tabelas com RLS
- [x] Auth seguro (Email + OAuth ready)
- [x] Tipos TypeScript gerados do banco
- [x] Enriquecimento automático via AniList GraphQL (1.000 animes)

### Phase 2 — Funcionalidades Core (🚧 Em Progresso)
- [ ] Modo Streaming (cinema) com tema escuro imersivo
- [ ] Modo Lista Premium (leitura) com tabela compacta
- [ ] UI para Insights Privados (Markdown editor)
- [ ] Algoritmo de gostos silencioso (matriz de afinidade por tags)
- [ ] Aba "Novos Horizontes" (anti-bolha) - **RPC pronto, falta UI**
- [ ] Filtro NSFW & desativação modular
- [ ] Upload de capítulos otimista (Δ)

### Phase 3 — Infraestrutura
- [ ] GitHub Actions para ingestão semanal do Anime Offline Database
- [ ] Supabase Edge Functions para back-end leves
- [ ] Vercel com camada gratuita + pipeline de deploy
- [ ] Analytics de uso (privacy-preserving)

### Phase 4 — Expansão
- [ ] API pública para desenvolvedores
- [ ] Exportação de dados (JSON/CSV)
- [ ] Comunidade (fóruns, comentários, favoritos)
- [ ] Multiplataforma (PWA, mobile)

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