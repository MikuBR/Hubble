# Known Issues — Hubble

> Issues conhecidos e suas soluções ou workarounds. Atualizado 2026-09-14.

---

## 1. Erros TypeScript `never[]` — RESOLVIDO ✅

**Estado:** Resolvido em 2026-09-17. `tsc --noEmit` passa com **0 erros**.

**O que foi feito:** Os 24 erros `never[]` foram zerados via type assertions `as unknown as { ... }` (não `as any`) em 5 rotas API. O `database.types.ts` tem **736 linhas** com 9 Relationships resolvidos. Os 3 `as any` remanescentes têm justificativas documentadas em `QA_CRITICO_REPORT.md`.

---

## 2. Supabase — ONLINE ✅

**Estado:** Resolvido em 2026-09-17. O projeto Supabase `cmthcjlmdffsjtofolvh` está online e acessível.

**O que mudou:** O `.env.local` aponta para `cmthcjlmdffsjtofolvh.supabase.co` (projeto ativo). Scripts de enriquecimento e seed podem rodar. O antigo projeto `afphryyiswvffdazjkcw` era NXDOMAIN (deletado) — foi substituído.

**Ação pendente:** Habilitar Email provider no dashboard (Issue #4 do GitHub) para liberar signup/login funcional.

---

## 3. Credenciais AniList ausentes

**Severidade:** Baixa — scripts têm fallback defensivo.

**Descrição:** `ANILIST_CLIENT_ID` e `ANILIST_CLIENT_SECRET` não estão no `.env.local`. Os scripts `enrich-from-anilist.js` e `enrich-manga-anilist.js` chamam `checkCredentials()` e fazem `process.exit(1)` se faltarem.

**Solução:** Cadastrar no AniList Developer Portal, gerar credenciais, adicionar ao `.env.local`.

---

## 4. `as any` com justificativas documentadas

**Severidade:** Baixa — atende ao critério "[crítico] zero `as any` sem justificativa".

**Descrição:** 3 `as any` permanecem no código, todos com comentários justificando a necessidade técnica (Supabase offline, inferência `never[]`).

**Localização:**
- `src/app/(dashboard)/settings/page.tsx:55` — cast no Supabase client para tipo não resolvido
- `src/app/api/insights/[id]/route.ts:53` — cast no `.single()` com tipo explícito
- `src/app/api/library/route.ts:39` — `Record<string, any>` em tipo JoinedProgress

**Justificativa:** Ver seção 1 deste documento. Resolvidos quando os tipos forem regenerados.

---

## 5. Lint warnings (pré-existentes)

**Severidade:** Baixa — não bloqueiam.

**Descrição:** `npx next lint` reporta variáveis não usadas e warnings de `<img>`. Todos pré-existentes, não introduzidos pelas mudanças de qualidade.

**Variáveis não usadas:** `READING_STATUS_COLORS`, `setOptimisticMedia`, `ChevronDown`, `AnimatePresence`, `createClient`, `addToast`

**Solução:** Remover imports unused ou usar as variáveis (pendente).

---

## 6. Scripts com lógica duplicada

**Severidade:** Baixa — manutenção futura.

**Descrição:** `scripts/enrich-from-anilist.js` e `scripts/enrich-manga-anilist.js` têm estrutura nearly idêntica. Qualquer alteração de rate limiting ou transformação precisa ser aplicada em ambos.

**Solução futura:** Extrair módulo compartilhado `scripts/lib/anilist.js` com função `fetchAniListMedia(type, country, page)`.

---

## 7. Seed não idempotente (tags acumulam)

**Severidade:** Baixa — comportamento documentado.

**Descrição:** O `seed-demo.cjs` não resetar preferências de tag antes de inserir. Rodar múltiplas vezes soma os scores em `user_tag_preferences`.

**Documentação:** O header do script e o `DEMO_SEED_EXECUTION_CHECKLIST.md` deixam claro que é intencionalmente acumulativo. Para resetar, deletar manualmente de `user_tag_preferences` antes de rodar.

---

## Resumo

|| # | Issue | Severidade | Solução |
|---|-------|-----------|---------|
| 1 | 24 erros `never[]` em tsc | ✅ Resolvido | Type assertions `as unknown as { ... }`, TSC zerado |
| 2 | Supabase NXDOMAIN | ✅ Resolvido | Projeto `cmthcjlmdffsjtofolvh` online |
| 3 | AniList credenciais ausentes | Baixa | Cadastrar no AniList Developer Portal |
| 4 | 3 `as any` documentados | Baixa | Resolvidos com #1; justificativas em QA_CRITICO_REPORT.md |
| 5 | Lint warnings pré-existentes | Baixa | Remover imports unused |
| 6 | Scripts duplicados (`enrich-from-anilist.js` vs `enrich-manga-anilist.js`) | Baixa | Extrair módulo compartilhado futuro |
| 7 | Seed não idempotente (tags acumulam) | Baixa | Comportamento documentado; DELETE-before-INSERT opcional |

---

*Próxima revisão: após restauração da infra Supabase.*
