# Fase 1.5 — SETUP.md rewrite (orquestrador-qualidade)

Reescrito para refletir o estado REAL do repo, não o estado idealizado.

## O que mudou em relação ao SETUP.md anterior

### Arquivos que existiam e foram removidos (agora corretamente listados como removidos)
- `package-lock.json` — removido (commit 3c191c3)
- `pd_load_fuzz_gen.py` — removido (commit 69ebb17)
- `tmp-test-supabase.cjs` — removido (commit f75b59f)
- `enrich-from-tmdb.js` duplicata — removida (commit 260f071)
- `HUBBLE_CONSOLIDATED_ARCHIVE.md` — movido para docs/archive/ (commit c2d9ff6)

### O que era listado como removido mas existe (corrigido)
- `scripts/enrich-from-anilist.js` — existe, listado em 7.2
- `scripts/enrich-from-tmdb.mjs` — existe, listado em 7.3
- `scripts/enrich-manga-anilist.js` — existe, listado em 7.3
- `scripts/enrich-titles-i18n.js` — existe, listado em 7.3
- `scripts/enrich-tmdb.js` — existe, listado em 7.3
- `scripts/ingest-aodb.js` — existe, listado em 7.1
- `scripts/seed-demo.cjs` — existe, listado em 7.3
- `scripts/validate-search.cjs` — existe, listado em 7.3
- `scripts/validate-signup.ts` — existe, listado em 7.3
- `scripts/test-e2e-flow.js` — existe, listado em 7.3
- `scripts/test-e2e-flow-fixed.js` — existe, listado em 7.3

### Novos arquivos que não constavam
- `middleware.ts` (root) — existe, é o Next.js middleware de auth
- `postcss.config.js` — existe
- `tailwind.config.js` — existe

## Estado atual dos issues relevantes

- #4: Supabase deletado (NXDOMAIN) — bloqueia Email provider e login; mantido aberto com bloqueio documentado
- #5: CLOSED — script de enriquecimento implementado e validado (execução real: 1000/1000 processados, 990 upserts, 0 erros)
- #6: OPEN — endpoint de busca implementado, tipagem corrigida (TSC 0 erros), validação real bloqueada por Supabase offline
- #15: OPEN — backend (RPC + endpoint) implementado, UI de Novos Horizontes não criada
- #24: OPEN — script de seed criado e auditado como realista, critério (c) reset não implementado; execução bloqueada por Supabase offline

## Limitações atuais
- Supabase deletado (NXDOMAIN): impede regeneração de tipos, seed-demo, E2E, validação real de busca
- `ignoreBuildErrors: true` ainda está no `next.config.ts` — pode ser removido quando Supabase estiver online
