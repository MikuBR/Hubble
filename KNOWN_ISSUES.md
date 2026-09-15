# Known Issues — Hubble

> Issues conhecidos e suas soluções ou workarounds. Atualizado 2026-09-14.

---

## 1. Erros TypeScript `never[]` (24 erros)

**Severidade:** Média — impede `tsc --noEmit` limpo, mas não bloqueia desenvolvimento local.

**Descrição:** O `@supabase/ssr` client infere `never[]` para resultados de `.select()`, `.rpc()`, e `.upsert()` em rotas que fazem joins ou usam RPCs. Isso ocorre porque `src/lib/database.types.ts` não tem `Relationships` resolvidos para todas as tabelas, e o Supabase CLI não está disponível para regenerar os tipos.

**Arquivos afetados:**
- `src/app/api/progress/[id]/route.ts` — 17 erros
- `src/app/api/search/route.ts` — 4 erros
- `src/app/api/insights/[id]/route.ts` — 1 erro
- `src/app/api/recommendations/route.ts` — 1 erro
- `src/app/api/recommendations/horizons/route.ts` — 1 erro

**Workaround:** `next.config.ts` tem `typescript: { ignoreBuildErrors: true }` — builds do Next.js funcionam. `tsc --noEmit` falha com 24 erros.

**Solução definitiva:** Quando o projeto Supabase estiver online, rodar:
```bash
npx supabase gen types --local > src/types/database.types.ts
```
Isso regenera os tipos com `Relationships` resolvidos e elimina os 24 erros.

---

## 2. Supabase offline (NXDOMAIN)

**Severidade:** Alta — bloqueia scripts de enriquecimento e seed.

**Descrição:** O `.env.local` aponta para `afphryyiswvffdazjkcw.supabase.co` que retorna NXDOMAIN. O projeto Supabase foi deletado ou a URL está inválida.

**Impacto:**
- Scripts `scripts/ingest-aodb.js`, `scripts/enrich-from-anilist.js`, `scripts/enrich-manga-anilist.js`, `scripts/seed-demo.cjs` não podem rodar
- `src/lib/supabase/admin.ts` usa service_role key inválida
- Nenhuma das APIs de busca/recommendations retorna dados (media_catalog vazio)

**Solução:** Criar novo projeto Supabase no dashboard ou recuperar o existente, atualizar `.env.local` com as novas credenciais, reaplicar migrations em ordem.

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

| # | Issue | Severidade | Solução |
|---|-------|-----------|---------|
| 1 | 24 erros `never[]` em tsc | Média | Regenerar tipos quando Supabase online |
| 2 | Supabase NXDOMAIN | Alta | Criar/recuperar projeto, atualizar `.env.local` |
| 3 | AniList credenciais ausentes | Baixa | Cadastrar no AniList Developer Portal |
| 4 | 3 `as any` documentados | Baixa | Resolver com #1 |
| 5 | Lint warnings pré-existentes | Baixa | Remover imports unused |
| 6 | Scripts duplicados | Baixa | Extrair módulo compartilhado |
| 7 | Seed não idempotente | Baixa | Comportamento documentado |

---

*Próxima revisão: após restauração da infra Supabase.*
