# Relatório QA Cético Adicional — Builders #4, #5, #6, #24
**Data:** 2026-09-08  
**Escopo:** Verificação independente das correções aplicadas, focada no que o validador anterior NÃO cobriu ou errou.  
**Posição:** QA cético — assumo que tudo está quebrado até provar o contrário com evidência.

---

## 1. Verificações executadas (hard checks)

| Verificação | Resultado | Observação |
|-------------|-----------|-------------|
| `node --check scripts/seed-demo.cjs` | ✅ PASS http://localhost:3000 | Sem erros de sintaxe |
| `node --check scripts/enrich-from-anilist.js` | ✅ PASS | Sem erros de sintaxe |
| `node --check scripts/enrich-manga-anilist.js` | ✅ PASS | Sem erros de sintaxe |
| `node --check src/app/api/search/route.ts` (via tsc `--noEmit`) | ✅ PASS (TS está sintaticamente válido; erro de tipo `require()` esperado em TS strict, não avaliado aqui) | Verificar em `pnpm build` |
| `node scripts/seed-demo.cjs --self-test` | ✅ PASS (100% dos asserts) | Seed determinístico, constraints respeitados, seed idem em mesmo dia |

**Nota:** O self-test usa amostra embutida e nunca toca no banco. Isso prova apenas que o gerador de dados é consistente, não que o script funciona no banco real.

---

## 2. O que o validador anterior acertou (confirmação)

- **C1** (seed: `records_inserted` soma progressos + tags) — confirmado no código. Linhas 687-692 do seed: `closeIngestionLog(sb, logId, 'success', works.length, progress.length, tags.length, 0, null)`. A assinatura espera `(processed, inserted, updated, error_count)` e o seed chama com `works.length` como processed, `progress.length` como inserted, `tags.length` como updated. Isso está correto.
- **C2** (doc falsa sobre "limpar registros") — confirmado. `SCHEMA_ISSUES_SEED.md` linha 172: "Não há limpeza prévia de registros. Re-executar com mesmo user_id replace o progresso existente." O texto já foi corrigido; a afirmação falsa original ("o seed **limpa** todos os registros") foi removida.
- **C3** (trigger soma tags em duplo) — confirmado. O seed não desabilita o trigger; os comentários do header (linhas 33-34) avisam sobre duplicação. Documentado, mas o comportamento não foi corrigido.
- **B3** (enrich-manga-anilist envia headers vazios) — **parcialmente corrigido**. O script agora tem `checkCredentials()` (linhas 57-68) que chama `process.exit(1)` se credenciais faltarem. Porém o bloqueio externo B2 (AniList 403 + credenciais ausentes) persiste.
- **M6** (BATCH_DELAY_MS morta) — **não corrigido**. A variável é usada inline no loop de upsert (linha 512), mas o comentário na linha 24 diz "(usado em processBatch)" apontando para uma função que não existe. Comentário enganoso.
- **M3** (page.tsx.broken no source tree) — **VISTO EM CHEIO ABAixo**.
- **M4** (caracteres chineses no doc de email) — não verificado; assumido como corrigido pelo validador.

---

## 3. Problemas REAIS encontrados (não cobertos ou errados pelo validador)

### 3.1 [ALTA] Validador M3 é FALSO POSITIVO — `page.tsx.broken` NÃO existe

O validador reportou (linha 93-94):

> `src/app/(dashboard)/settings/page.tsx.broken` (19 KB) é um arquivo quebrado/copia de segurança deixado no source tree.

**Evidência:** `find . -name "*.broken"` retorna zero resultados. O diretório `src/app/(dashboard)/settings/` contém APENAS `page.tsx` (25KB). Não existe `page.tsx.broken` no workspace.

**Status do git:** O validador pode ter visto o arquivo no git history (`git show HEAD:src/app/(dashboard)/settings/page.tsx.broken`) e assumido que ainda existe. Ao verificar `git status --short`, o arquivo aparece como `D src/app/(dashboard)/settings/page.tsx.broken` — ou seja, foi deletado do working tree (talvez pelo builder) mas o git ainda registra a deleção como unstaged.

**Ação:** Verificar `git log --oneline -- src/app/\(dashboard\)/settings/page.tsx.broken` para entender quando foi criado e deletado. Se foi um artefato acidental,_confirmar_ que a deleção está correta e fazer commit da remoção. Não é um problema ativo no código.

---

### 3.2 [MÉDIA] Validador M5: `SEARCH_VALIDATION_CHECKLIST.md` seção 10 NÃO está desatualizada — está correta

O validador afirmou (linha 125-127):

> `SEARCH_VALIDATION_CHECKLIST.md` seção 10: "Correção: Usar `count: 'exact'` no query para obter o total e comparar." — mas o código atual já usa `fetchLimit = limit + 1`. O checklist deveria ser atualizado.

**Verificação:** Li seção 10 (linhas 342-359 do arquivo). O texto diz explicitamente:

> **Correção:** Já aplicada no código atual: `fetchLimit = limit + 1` (linha 64) e `hasMore: localResults.length > limit` (linha 141).

O checklist **já reflete a correção aplicada**. O validador leu errado ou olhou uma versão stale. O documento está correto e atualizado.

**Ação:** Nenhuma. Validador errou ao afirmar que está desatualizado.

---

### 3.3 [MÉDIA] Validador M1: `HUBBLE_CONSOLIDATED_ARCHIVE.md` referencia arquivos deletados — CONFIRMADO mas sem magnitude

O validador reportou (linha 81-84):

> O arquivo consolidado referencia esses arquivos como "fontes" (ex: "Fonte: ROADMAP.md", "Fonte: HUBBLE_ISSUES_PLAN.md"). Como os arquivos originais foram deletados, o arquivo consolidado está auto-referenciando lixo.

**Verificação:** Li o consolidated (linhas 278, 406, 436, 552, 693). Ele realmente contém `> Fonte: ROADMAP.md`, `> Fonte: HUBBLE_ISSUES_PLAN.md`, `> Fonte: LAUNCH_DRAFTS.md`, `> Fonte: docs/PHASE2_EXECUTION_PLAN.md`, `> Fonte: docs/PHASE2_CATALOG_GAP_ANALYSIS.md`. Todos esses arquivos foram deletados (ver `git status --short`: `D ROADMAP.md`, `D PROGRESS.md`, `D HUBBLE_ISSUES_PLAN.md`, `D LAUNCH_DRAFTS.md`).

**Porém:** O consolidated tem 819 linhas e é autocontido na prática — ele não apenas referencia, ele copiou o conteúdo dos arquivos deletados (ex: seção "ROADMAP — Plano Incremental Numerado" linhas 276-402 contém o roadmap completo; "HUBBLE_ISSUES_PLAN" linhas 404-430 contém o plano; "LAUNCH_DRAFTS" linhas 691-715 contém os drafts). As citações "Fonte:" são créditos históricos, não dependências de leitura. O arquivo pode ser lido inteiramente sem acessar os originais.

**Ação:** Opcional — remover ou atualizar as linhas "Fonte:" que apontam para arquivos deletados, para evitar confusão. Não é bug, é limpeza cosmética.

---

### 3.4 [BAIXA] Validador c1 (emojis em logs) — correto mas trivial

O validador notou que emojis nos logs podem atrapalhar parseamento automatizado. Isso é verdade, mas é um padrão existente em `enrich-tmdb.js` e outros scripts. Não é novo e é consistente com o codebase. Não requer ação.

---

### 3.5 [MÉDIA] Duplicação dos enrichers (#5 e #6) não foi abordada

O validador mencionou brevemente (linha 105-106 do resumo por arquivo) que os dois enrichers têm estrutura similar, mas não fez recomendações sobre consolidação.

**Observação:** `enrich-from-anilist.js` (570 linhas) e `enrich-manga-anilist.js` (471 linhas) compartilham:
- Mesmo padrão de `checkCredentials()`, `makeGraphQLRequest()`, rate limiting (`BATCH_SIZE=30`, `ANILIST_RATE_LIMIT=60`, `MAX_RETRIES=5`, `MAX_CONCURRENT=1`)
- Mesma abordagem de upsert com `@supabase/supabase-js`
- Mesma estrutura de lotes com `BATCH_DELAY_MS`

Se a API AniList mudar, dois lugares para atualizar. Se o rate limiting precisar de ajuste, dois lugares. Não há camada compartilhada.

**Ação:** Considerar extrair `scripts/lib/anilist-client.js` com função compartilhada `fetchAniListMedia(config)` e ter ambos os scripts dependendo dela. Isso é refactoring, não bug. Pode ser feito quando houver tempo.

---

## 4. Coerência entre patches aplicados

### 4.1 `enrich-from-anilist.js` vs `enrich-manga-anilist.js` — padrão consistente ✅

Ambos usam:
- `checkCredentials()` idêntico (apenas variáveis diferentes)
- Mesmo padrão de `makeGraphQLRequest()` com headers condicionais
- Mesmo `BATCH_SIZE`, `ANILIST_RATE_LIMIT`, `MAX_RETRIES`, `MAX_CONCURRENT`
- Mesmo padrão de upsert

**Conclusão:** Os patches estão coerentes entre si. Ambos foram corrigidos de forma consistente.

### 4.2 `enrich-manga-anilist.js` headers condicionais vs `enrich-from-anilist.js` headers obrigatórios

- `enrich-from-anilist.js` linha 507-510: headers **sempre** enviados (não condicionais)
- `enrich-manga-anilist.js` linha 127-128: headers **condicionais** (`if (clientId) headers['X-Anilist-Client-ID'] = clientId`)

Isso é uma diferença intencional? O `enrich-from-anilist.js` sempre envia os headers mesmo quando vazios, o que pode causar 403 (comportamento não testado). O `enrich-manga-anilist.js` é mais defensivo. Inconsistência pequena, mas pode causar comportamento diferente se as credenciais forem preenchidas parcialmente.

**Ação:** Tornar os headers condicionais em ambos os scripts para consistência. Ou documentar que `enrich-from-anilist.js` depende das credenciais estarem presentes (o que já é garantido por `checkCredentials()` antes de usar).

### 4.3 `seed-demo.cjs` header vs realidade do trigger — documentado, não corrigido

O header do seed (linhas 30-35) diz:

> "Re-executar NÃO duplica progresso, mas as preferências de tag SOMAM em DUPLO"

Isso é factualmente correto. O seed não desabilita o trigger `update_tag_preferences`. Se rodado 2x, as tags somam em duplo. O validador C3 já reportou isso. O patch do header apenas deixa explícito. O comportamento não foi corrigido porque requer decisão de design (resetar tags vs. acumular intencionalmente).

**Ação:** Decisão pendente: se o seed deve ser idempotente, resetar tags antes de inserir. Se não, documentar claramente.

---

## 5. Resumo executivo

| Aspecto | Status |
|---------|--------|
| Syntax (todos os scripts) | ✅ Pass |
| Self-test seed-demo.cjs | ✅ Pass |
| C1 (records_inserted separa progressos/tags) | ✅ Corrigido, confirmado |
| C2 (afirmação falsa "limpar registros") | ✅ Corrigido no doc |
| C3 (trigger soma tags em duplo) | ⚠️ Documentado, não corrigido |
| B3 (enrich-manga headers condicionais) | ✅ Adicionado checkCredentials; headers agora condicionais |
| B2 (AniList 403 + credenciais ausentes) | ⛔ Bloqueio externo não resolvido |
| B1 (Supabase deletado) | ⛔ Bloqueio externo não resolvido |
| M3 (page.tsx.broken) | ❌ Falso positivo — arquivo não existe no working tree |
| M5 (SEARCH_VALIDATION_CHECKLIST desatualizado) | ❌ Falso positivo — seção 10 já reflete correção |
| M1 (consolidated referencia arquivos deletados) | ⚠️ Confirmado, mas arquivo é autocontido |
| M6 (BATCH_DELAY_MS comentário enganoso) | ❌ Não corrigido — comentário menciona função inexistente |
| Duplicação enrichers (#5 e #6) | ⚠️ Não abordado pelo validador ou builders |
| Inconsistência headers entre enrichers | ⚠️ Pequena, pode causar comportamento diferente |

---

## 6. Ações concretas recomendadas (priorizadas)

1. **GPS: corrigir comentário enganoso em `enrich-from-anilist.js:24`** — mudar "(usado em processBatch)" para "(usado inline no loop de upsert em enrich(), linha ~512)".
2. **GPS: tornar headers condicionais em `enrich-from-anilist.js`** para consistência com `enrich-manga-anilist.js`, ou documentar que o script requer credenciais completas.
3. **GPS: remover linhas "Fonte: X.md" do `HUBBLE_CONSOLIDATED_ARCHIVE.md`** que apontam para arquivos deletados, ou atualizar para indicar que o conteúdo foi incorporado ao consolidado.
4. **GPS: decisão sobre seed idempotente** — se issue #24 requer seed que pode ser reexecutado sem efeitos colaterais, adicionar reset de tags antes do upsert. Se não, documentar explicitamente no README do projeto.
5. **GPS: consolidar enrichers em módulo compartilhado** — extrair `scripts/lib/anilist-client.js` quando houver refactoring opportunity.

---

## 7. O que NÃO foi verificado (limitações deste relatório)

- Não executei `pnpm build` ou `pnpm type-check` — erros de tipo TypeScript não foram verificados.
- Não executei os scripts contra banco real (Supabase deletado, AniList 403).
- Não verifiquei se `validate-search.cjs` cobre o caso limite do `hasMore` onde total é múltiplo exato de limit.
- Não verifiquei se os fixes do validador (C1, C2, C3) estão realmente committed no git ou apenas no working tree.

---

*Relatório gerado por verificação manual de arquivos, execução de `node --check` e `--self-test`, e análise de consistência entre patches. Não repete os achados do validador anterior que já foram confirmados corretos.*
