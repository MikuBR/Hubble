# Relatório QA Cético — Builders #4, #5, #6, #24 (Código Corrigido)

**Data:** 2026-09-08
**Escopo:** Verificar se as correções aplicadas pelo validador + patches manuais resolveram os issues de forma substantiva ou apenas cosmetizaram.
**Posição:** QA cético — assumo que tudo está quebrado até provar o contrário.

---

## 1. O que foi corrigido (resumo dos patches verificados)

| Issue | Arquivo | Correção aplicada | Status |
|-------|---------|-------------------|--------|
| B3 | `scripts/enrich-manga-anilist.js` | Headers condicionais: `if (clientId) headers[...]` | ✅ Aplicado |
| C1 | `scripts/seed-demo.cjs:685-686` | `records_inserted` separa progressos e tags | ✅ Aplicado |
| C2 | `docs/SCHEMA_ISSUES_SEED.md:172` | Afirmação "limpa registros" → explica upsert | ✅ Aplicado |
| C3 | `scripts/seed-demo.cjs:33-34` | Header menciona trigger soma em duplo | ✅ Aplicado |
| M6 | `scripts/enrich-from-anilist.js:24` | `BATCH_DELAY_MS` com comentário "(usado em processBatch)" | ✅ Aplicado |
| M4 | `docs/supabase-email-provider-setup.md` | Caracteres chineses removidos | ✅ Aplicado |
| M2 | `src/app/(dashboard)/settings/page.tsx.broken` | Arquivo deletado do source tree | ✅ Aplicado |
| M5 | `docs/SEARCH_VALIDATION_CHECKLIST.md:350-359` | Seção 10 mostra código aplicado | ✅ Aplicado |

---

## 2. O que o validador provavelmente deixou passar

### 2.1 `seed-demo.cjs` — assinatura de `closeIngestionLog` inconsistente

No `git diff HEAD`, o validador reportou C1 como "records_inserted separa progressos e tags". Verifiquei o arquivo: a linha 686 chama:

```
await closeIngestionLog(sb, logId, 'success', works.length, progress.length, tags.length, 0, null);
```

Mas a linha 709 no bloco `finally` chama:

```
await closeIngestionLog(sb, logId, 'success', works.length, progress.length, tags.length, 0, null);
```

E a linha 722 no catch chama:

```
await closeIngestionLog(sb, logId, 'failed', works?.length ?? 0, 0, 0, err.message);
```

A assinatura da função tem 8 parâmetros (linha 516). Mas o invocador passa `works.length` como "processed", `progress.length` como "inserted", `tags.length` como "updated", `0` como "error" — isso está confuso. O que o validador não verificou: **o que exatamente vai para `records_processed` vs `records_inserted` vs `records_updated` na chamada?** Se o banco espera que `records_inserted` seja o número de linhas efetivamente inseridas (não atualizadas), está correto separar progressos e tags. Mas se o trigger `recompute_tag_preferences` somascores em double, então `tags.length` não representa "inseridos" — representa "preferências de tag atualizadas". O nome do parâmetro na função é `inserted` mas recebe `tags.length` — **naming mismatch**.

**Risco:** Quando a infra voltar e alguém ler o `ingestion_logs` paradebugar, vai ver `records_inserted=N` e achar que foram inseridos N linhas novas, quando na verdade N é o número de preferências de tag atualizadas (que podem ser updates, não inserts).

### 2.2 `enrich-manga-anilist.js` — headers condicionais são cosme, não essência

A correção B3 (headers condicionais) evita enviar `X-Anilist-Client-ID: undefined` quando a credencial falta. Isso é correto cosmeticamente, mas **não resolve o bloqueio real**: o script ainda vai falhar no `checkCredentials()` na linha 59-68 se `ANILIST_CLIENT_ID` estiver ausente. A correção dos headers é defensiva, mas o script nunca chega a fazer a requisição GraphQL se as credenciais faltarem — ele `process.exit(1)` antes.

**Pergunta:** Por que corrigir headers condicionais se o script nunca vai usar? A menos que o intent seja permitir rodar sem credenciais (apenas discovery?). Se for isso, o `checkCredentials()` está errado — ele é um bloqueio preemptivo.

### 2.3 `enrich-from-anilist.js` — `BATCH_DELAY_MS` com comentário, mas função `processBatch` não existe

O validador M6 relatou que `BATCH_DELAY_MS` não era usado. A correção adicionou o comentário "(usado em processBatch)" na linha 24. Mas ao ler o arquivo, **não existe nenhuma função chamada `processBatch`** no arquivo. O delay é usado dentro do loop de upsert em `enrich()` (linha 428: `await new Promise((r) => setTimeout(r, BATCH_DELAY_MS))`). O comentário é enganoso — aponta para uma função que não existe, quando na verdade o delay é usado inline no loop principal.

**Risco:** Se alguém buscar `processBatch` pra manter/debugar, vai achar que o delay é gerenciado por uma função separada que não existe.

### 2.4 `supabase-email-provider-setup.md` — chineses removidos, mas conteúdo ainda é partially hallucinado

Os caracteres chineses foram removidos, mas o documento ainda lista migrations que podem ou não existir. A linha 55-56 lista três versões da mesma migration:
```
├── 20260816000006_fix_get_user_stats.sql
├── 20260816000006_fix_get_user_stats_v2.sql
├── 20260816000006_fix_get_user_stats_v3.sql
```
 Isso parece incorreto — três arquivos com o mesmo timestamp? Verifiquei no git: não há evidência de que esses arquivos existam. O documento é um guia de setup, não deve listar migrations inventadas.

### 2.5 `page.tsx.broken` deletado — mas o git ainda mostra a deletção como unstaged

O arquivo foi deletado do working tree, mas `git status` mostra:
```
deleted:    src/app/(dashboard)/settings/page.tsx.broken
```
Isso significa que o arquivo existe no git index (commit anterior) e foi deletado localmente. Se o commit anterior includia esse arquivo como parte do build, a deleção ainda não foi commitada. **A correção M2 está incompleta até o delete ser commitado.**

### 2.6 `HUBBLE_CONSOLIDATED_ARCHIVE.md` referenciando arquivos deletados

O consolidated menciona `HUBBLE_ISSUES_PLAN.md` em múltiplos lugares (linhas 18, 74, 404-406). O arquivo foi deletado. O consolidated é um arquivo "archive" — faz sentido preservar referências históricas. Mas se alguém ler o consolidated e tentar abrir `HUBBLE_ISSUES_PLAN.md`, vai falhar. O consolidated deveria ter um aviso de que os arquivos originais foram deletados e onde encontrar o equivalente (se houver).

---

## 3. Riscos quando a infra voltar

### 3.1 Supabase deletado (B1) — `.env.local` com URL inválida

O `.env.local` atual contém uma URL que retorna NXDOMAIN. Nenhum dos scripts corrigidos vai funcionar até que:
1. Um novo projeto Supabase seja criado
2. As credenciais sejam atualizadas no `.env.local`
3. As migrations sejam re-aplicadas

**O que falta para B1 estar "done":** Nenhum dos arquivos corrigidos resolve isso. É um bloqueio externo que requer ação manual no dashboard Supabase.

### 3.2 `ANILIST_CLIENT_ID` + `SECRET` ausentes (B2)

O `.env.local` não tem essas credenciais. Os scripts `enrich-from-anilist.js` e `enrich-manga-anilist.js` ambos chamam `checkCredentials()` e vão `process.exit(1)` se faltarem.

**O que falta para B2 estar "done":** Cadastro no AniList Developer Portal, geração de client ID/secret, e atualização do `.env.local`. Nenhum dos patches corrigidos resolve isso.

### 3.3 `enrich-manga-anilist.js` — dependência não declarada

O script requer `@supabase/supabase-js` e `dotenv`. Verifiquei que estão no `package.json`. Mas o script também depende implicitamente da estrutura da tabela `media_catalog`. Se o schema mudar (ex: coluna `age_rating_br_enum` mudar de nome), o script quebra silenciosamente em runtime.

**Mitigação ausente:** Não há schema validation no script. Se a tabela não tiver a coluna esperada, o upsert falha com erro genérico.

### 3.4 `seed-demo.cjs` — idempotência duvidosa

O header (linhas 30-35) diz:
> "Re-executar NÃO duplica progresso, mas as preferências de tag SOMAM em DUPLO"

Isso é documentado, mas é um comportamento pernicioso — se alguém rodar o seed 3 vezes, as preferências de tag triplicam. O validador C3 corrigiu o header para mencionar isso, mas **não corrigiu o comportamento**. Se o issue #24 espera um seed idempotente, isso não está resolvido.

**O que falta:** Ou o seed deve resetar as tags antes de inserir (DELETE + INSERT), ou a documentação deve deixar claro que é intencionalmente accumulativo.

### 3.5 Search API — `hasMore` corrigido, mas `validate-search.cjs` não testa o caso limite

O fix do `hasMore` (fetchLimit = limit + 1) está no código (linhas 64, 141 do search route). O `SEARCH_VALIDATION_CHECKLIST.md` seção 10 mostra o código corrigido. Mas o script `validate-search.cjs` não testa explicitamente o caso onde total é múltiplo exato de limit. Se a validação não cobre esse caso, a correção não foi verificada.

---

## 4. Coerência entre os builders

### 4.1 Builder #5 (enrich-from-anilist) vs Builder #6 (enrich-manga-anilist)

Ambos os scripts têm estrutura nearly idêntica:
- Mesmo `BATCH_SIZE`, `ANILIST_RATE_LIMIT`, `MAX_RETRIES`, `MAX_CONCURRENT`
- Mesma abordagem de GraphQL paginado
- Mesma lógica de upsert

**Problema:** Se forem mantidos separadamente, qualquer correção de rate limiting ou transformação precisa ser aplicada em ambos. Se a IniList mudar a API, dois arquivos para manter. **Não há abstraction layer compartilhada.**

**Pergunta:** Por que não um único script com parâmetros de tipo? Ou um módulo compartilhado `scripts/lib/anilist.js`?

### 4.2 Builder #4 (validate-search) vs Builder #6 (search API)

O `validate-search.cjs` testa a API de busca. Mas o search route depende de `media_catalog` populado. Se o catalog estiver vazio (porque enrich-from-anilist nunca rodou), o validate-search vai passar com resultados vazios — **falso positivo**.

**Verificação:** O validate-search cJS testa se a API retorna resultado, ou se retorna resultado *significativo*? Preciso verificar o script para ter certeza.

### 4.3 `seed-demo.cjs` depende de `media_catalog` populado

O seed seleciona obras populares de `media_catalog` para gerar progresso do usuário. Se o catalog estiver vazio (B1+B2 não resolvidos), o seed não tem dados para trabalhar. **O seed é dependente dos builders #5 e #6 serem executados primeiro.**

---

## 5. Decisões que precisam ser tomadas antes de fechar os issues

### 5.1 Deletar `HUBBLE_ISSUES_PLAN.md`, `LAUNCH_DRAFTS.md`, `PROGRESS.md`, `ROADMAP.md` em favor do consolidado

**A decisão foi boa ou perdeu informação?**

O `HUBBLE_CONSOLIDATED_ARCHIVE.md` é um arquivo enormouse (46KB, 819 linhas). Ele consolida conteúdo de múltiplos arquivos deletados. Mas:

- O consolidated é um arquivo *unchecked* — não há garantia de que está completo ou atualizado
- Arquivos deletados como `HUBBLE_ISSUES_PLAN.md` tinham status de "arquivo de revisão" — poder ter sido útil manter como histórico
- O consolidated foi gerado em 2026-09-08, mas os arquivos deletados tinham datas mais antigas — houve perda de histórico entre a última edição dos arquivos originais e a geração do consolidado

**Recomendação:** Manter os arquivos deletados no git com um commit de "archival" antes de deletar, ou pelo menos garantir que o consolidated tem uma seção "FATOS perdidos nesta consolidação" listando o que foi omitido.

### 5.2 `page.tsx.broken` — deletado vs. renomeado

O arquivo `.broken` foi deletado do source tree. Mas ele tinha código relevante (SettingsPage completo com tabs, import/export, privacy). Se "broken" significava "temporariamente quebrado", a deleção remove informação útil. Se "broken" significava "artefato de debug que não deve ir pro repo", a deleção está correta mas deveria ter sido adicionada ao `.gitignore` antes.

**Ação necessária:** Decidir se o conteúdo de `page.tsx.broken` deve ser recuperado (se era uma versão work-in-progress do settings page) ou se a deleção é definitiva.

### 5.3 `enrich-manga-anilist.js` e `enrich-from-anilist.js` — duplicação de lógica

Dois scripts com estrutura nearly idêntica para diferentes tipos de mídia. Se a IniList mudar, dois lugares para atualizar. Se o rate limiting precisar de ajuste, dois lugares.

**Recomendação:** Extrair uma função compartilhada `fetchAniListMedia(type, country, page)` em um módulo `scripts/lib/anilist.js` e ter ambos os scripts dependerem dele.

### 5.4 `seed-demo.cjs` — comportamento de tags accumulativo não é idempotente

Se o objetivo do issue #24 é um seed de demonstração que pode ser rodado repetidamente sem efeitos colaterais, o comportamento atual de "tags somam em duplo" é um bug, não uma feature documentada.

**Ação necessária:** Decidir se:
- (a) O seed deve ser totalmente idempotente (resetar tags antes de inserir), ou
- (b) A documentação deve deixar claro que rodar múltiplas vezes acumula tags (e reiniciar requer reset manual)

### 5.5 Search API — `hasMore` corrigido mas não testado nos casos limite

A correção está no código, mas sem teste automatizado que cubra o caso "total é múltiplo exato de limit", não há garantia de que a correção funciona.

**Ação necessária:** Adicionar um teste no `validate-search.cjs` ou nos vitest que simule este caso, ou documentar como testar manualmente.

---

## 6. Resumo executivo

| Aspecto | Avaliação |
|---------|-----------|
| Correções cosmetológicas vs. substantivas | Mista: algumas correções resolvem o problema real (C1, C2, M5), outras são defensivas que não mudam o comportamento (B3, M6) |
| Código pronto para infra retornar | **Não.** Bloqueios B1 e B2 ainda ativos. Scripts não podem rodar. |
| Qualidade do código corrigido | Boa estrutura, mas duplicação entre builders #5 e #6, e seed não é idempotente |
| Decisão de consolidar docs | Questionável — perda de histórico e arquivos deletados ainda referenciados |
| Pronto para fechar issues | **Não.** Faltam: (1) B1 e B2 resolvidos, (2) seed idempotente ou documentação clara, (3) teste do caso limite do hasMore, (4) commit da deleção do page.tsx.broken |

---

**Veredito:** O trabalho dos builders entregou arquivos funcionais *condicionalmente* (quando a infra estiver viva). As correções aplicadas pelo validador + patches resolvem a maioria dos problemas identificados, mas deixam gaps: comportamento não-idempotente do seed, duplicação de lógica entre enrichers, e decisões de documentação que podem dificultar manutenção futura. Quando a infra voltar, serão necessárias ao menos 3 ações adicionais antes de fechar os issues: resolver B1/B2, tornar seed idempotente, e consolidar os enrichers em um módulo compartilhado.
