# Hubble — Issues plan

## In scope for today (validated)

### ✅ Closed
- **#8 BackdropHero integrado na home**
  - Arquivo: `src/shared/ui/BackdropHero.tsx`
  - Integração: `src/app/(dashboard)/page.tsx`
  - Evidência: componente com Framer Motion, gradientes, badges, fallback visual

- **#10 TrailerModal integrado no media detail**
  - Arquivo: `src/shared/ui/TrailerModal.tsx`
  - Integração: `src/app/(dashboard)/media/[id]/page.tsx`
  - Evidência: parsing YouTube/Vimeo, cleanup de iframe, suporte ESC/click-outside

- **#11 Modo Lista Premium com toggle na library**
  - Arquivo: `src/app/(dashboard)/library/page.tsx` + `src/shared/ui/ListRow.tsx`
  - Evidência: toggle grid/lista, `ReadingTable` com `useOptimistic` para +1 capítulo

### ⚠️ In progress / bloqueio externo
- **#5 enrich-from-anilist**
  - Script pronto: `scripts/enrich-from-anilist.js` com loteamento e retry exponencial
  - Bloqueio: `.env.local` com `ANILIST_CLIENT_ID` e `ANILIST_CLIENT_SECRET` vazios
  - Necessário: cadastro no AniList Developer e preenchimento das credenciais

- **#6 search validation**
  - Endpoint `/api/search` implementado com pg_trgm, Zod, i18n, filtro NSFW
  - Bloqueio: validação ponta a ponta depende de `media_catalog` populado via #5
  - `scripts/validate-search.cjs` confirmou conectividade GraphQL pública do AniList

## Deferred / not today

- #12 Optimistic +1 Capítulo — já implementado
- #18 Import CSV Letterboxd — não iniciado
- #19 Export JSON do diário — não iniciado
- #21 Testes E2E com Playwright — não iniciado
- #24 Demo seed — não iniciado

## Decisões tomadas
- Tailwind v3.4.19 + tailwindcss-animate@1.0.7, sem v4/postcss v4
- `postcss.config.js` com plugins `tailwindcss` + `autoprefixer`
- Removido `@tailwindcss/postcss` do projeto para evitar conflito de versões
- `globals.css` usa `@apply` padrão do Tailwind v3; custom classes mantidas como CSS puro
- `NEXT_DISABLE_TURBOPACK=1` workaround para route groups `app/(dashboard)` e `app/(auth)`
- Dev server em `http://localhost:3000`
