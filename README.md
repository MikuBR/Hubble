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
    <a href="#-como-executar">Instalação</a>
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

---

## 🚀 Roadmap do Projeto

### Phase 1 — Fundações (Atual)
- [ ] Arquitetura base: Next.js + Supabase + PostgreSQL
- [ ] Schema de dados: tabelas de obras, capítulos, tags, perfis do usuário
- [ ] Auth seguro (OAuth + email)
- [ ] Primeiro frontend: busca unificada de mídia

### Phase 2 — Funcionalidades Core
- [ ] Modo Streaming (cinema) com tema escuro imersivo
- [ ] Modo Lista Premium (leitura) com tabela compacta
- [ ] Algoritmo de gostos silencioso (matriz de afinidade por tags)
- [ ] Aba "Novos Horizontes" (anti-bolha)
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
- Node.js ≥ 18
- Docker (para banco local)

### Instalação

```bash
# Clone e entre no projeto
git clone <url-do-repositorio>
cd Hubble

# Instale as dependências
npm install

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com suas credenciais

# Rode o desenvolvimento
npm run dev
```

### Deploy

1. **Vercel** (recomendado):
   ```bash
   npm install -g vercel
   vercel
   ```

2. **Supabase** (se usar PostgreSQL):
   - Criar projeto no Supabase
   - Copiar a URL e a chave de anômalo do Supabase dashboard
   - Adicionar na variável de ambiente

3. **GitHub Actions** (pipeline de build):
   ```bash
   npm run build
   vercel --prod
   ```

### Usando o Anime Offline Database

O projeto utiliza o [Anime Offline Database](https://github.com/AniML/anime-offline-database), um banco de dados local de animes e mangás. Para manter o projeto sincronizado:

```bash
# Executar o script de atualização do banco offline
npm run offline-db
```

---

<div align="center">

  <p><strong>Made with ❤️ and 🖥️</strong></p>

</div>
