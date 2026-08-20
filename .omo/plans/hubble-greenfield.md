# hubble-greenfield - Work Plan

## TL;DR (For humans)

**What you'll get:** 4 bugs críticos corrigidos no projeto Hubble: signup real funcional (migration de username aplicada no Supabase), trigger de afinidade de tags estendida para themes+studios, trigger `handle_new_user` corrigido com validação de username de 3-30 chars, e formulários login/signup com onClick corrigido (não mais onclick quebrado).

**Why this approach:** Todos os fixes são incrementalmente testados via E2E script existente e migrations SQL applying diretamente no Supabase Dashboard. Nenhuma mudança arquitetural — apenas correções de bugs documentados em PROGRESS.md.

**What it will NOT do:** Não implementa Phase 2 UI (Modo Cinema, Busca pg_trgm, etc). Não muda o algoritmo de recomendação. Não adiciona novas features.

**Effort:** Short
**Risk:** Low - all fixes are surgical, validated by existing test-e2e-flow-fixed.js script
**Decisions to sanity-check:** A migration 20260819000001 precisa ser aplicada manualmente no Supabase SQL Editor (não via CLI local, pois não instalada). O fix do `onclick` no login/signup é um cliente-side only — precisa build passar.

Your next move: Aprovar e delegar ao OpenCode. Full execution detail follows below.

---

## Scope
### Must have
1. Fix signup real — aplicar migration 20260819000001 no Supabase remoto + garantir `handle_new_user` SECURITY DEFINER com permissões
2. Fix trigger `update_tag_preferences` — incluir themes (+5) e studios (+3) no cálculo de afinidade, não só genres
3. Fix formulários login/signup — trocar `onclick` por `onClick` (React JSX quebrado)
4. Validar tudo via test-e2e-flow-fixed.js — profile criado, progresso, tag prefs, RPCs

### Must NOT have (guardrails, anti-slop, scope boundaries)
- Nenhuma mudança na spec ou arquitetura
- Nenhum novo endpoint API
- Nenhuma alteração no frontend além dos 2 formulários de auth
- Nenhuma migration nova — usa as já existentes no repo

## Verification strategy
- Zero human intervention - all verification agent-executed.
- Test decision: tests-after + E2E script
- Evidence: .omo/evidence/bugfix-<N>.log

## Execution strategy
### Parallel execution waves
- Wave 1: Bug analysis (read all relevant files, confirm root cause)
- Wave 2: Fix auth forms (onClick) + Fix trigger update_tag_preferences (themes/studios)
- Wave 3: Apply migration no Supabase + Run E2E validation

### Dependency matrix
| Todo | Depends on | Blocks | Can parallelize with |
|------|-----------|--------|---------------------|
| 1. Fix login/signup onclick→onClick | - | Auth flow no dev | 2. Fix trigger |
| 2. Fix update_tag_preferences trigger | - | Tag prefs funcionam | 1. Fix auth forms |
| 3. Apply migration 20260819 no Supabase | 2 | Signup real | - |
| 4. Run E2E validation | 1, 2, 3 | - | - |

## Todos

- [ ] 1. Fix login/signup onclick → onClick bug
  What to do: Em src/app/(auth)/login/page.tsx e signup/page.tsx, trocar `onclick={...}` por `onClick={...}` em todos os botões OAuth. React JSX é case-sensitive — `onclick` é ignorado silenciosamente, deixando os botões sem handler.
  Must NOT do: Adicionar lógica nova, mudar estilo.
  Parallelization: Wave 2 | Blocked by: - | Blocks: 4
  References: src/app/(auth)/login/page.tsx:68-82, src/app/(auth)/signup/page.tsx:85-106
  Acceptance criteria: `grep -n "onclick" src/app/(auth)/*.tsx` retorna 0 matches; `pnpm typecheck` passa
  Commit: fix(auth): onclick → onClick in login and signup OAuth buttons

- [ ] 2. Fix update_tag_preferences trigger to include themes + studios
  What to do: Criar migration nova 20260820000001_enhance_tag_preferences.sql que recria a função `update_tag_preferences()` para também atualizar `user_tag_preferences` com `theme` (+5) e `studio` (+3), não apenas `genre` (+10). Usar rank da tag como multiplicador (Phase A do docs/RECOMMENDATION_ALGORITHM_RESEARCH.md).
  Must NOT do: Não mudar a lógica de scores (+10/-5 para genres, +5/-3 para themes, +3/-2 para studios).
  Parallelization: Wave 2 | Blocked by: - | Blocks: 3, 4
  References: supabase/migrations/20260816000002_triggers.sql:33-78 (função update_tag_preferences), docs/RECOMMENDATION_ALGORITHM_RESEARCH.md:82-87 (Phase A)
  Acceptance criteria: Migration SQL válida; trigger inclui FOREACH para themes e studios
  Commit: fix(db): enhance update_tag_preferences trigger with themes + studios + rank weight

- [ ] 3. Apply migration 20260819 + new migration no Supabase remoto
  What to do: Executar as migrations 20260819000001 e a nova 20260820000001 via Supabase SQL Editor ou Management API. Confirmar que `handle_new_user` tem SECURITY DEFINER e username validation (3-30 chars).
  Must NOT do: Não usar supabase CLI local (não instalada).
  Parallelization: Wave 3 | Blocked by: 2 | Blocks: 4
  References: supabase/migrations/20260819000001_fix_handle_new_user_username.sql, supabase/migrations/20260816000004_fix_signup_and_test_user.sql
  Acceptance criteria: Usuário consegue signup real via /signup → recebe email de confirmação → profile criado automaticamente com username válido
  Commit: N/A (migration applied to Supabase, not git)

- [ ] 4. Run E2E validation via test-e2e-flow-fixed.js
  What to do: Rodar `node scripts/test-e2e-flow-fixed.js` e confirmar todos os 6 passos passam: contagem de tabelas, profile criado, progresso atualizado, tag preferences geradas (agora com themes/studios), RPCs funcionando.
  Must NOT do: Não mockar dados.
  Parallelization: Wave 3 | Blocked by: 1, 2, 3 | Blocks: -
  References: scripts/test-e2e-flow-fixed.js
  Acceptance criteria: Output mostra "TESTE E2E DO FLUXO COMPLETO CONCLUÍDO COM SUCESSO!" e tag prefs incluem genre, theme, studio
  Commit: N/A (validação executada)

## Final verification wave
- [ ] F1. Plan compliance audit — todos os 4 todos concluídos
- [ ] F2. Code quality review — `pnpm lint` e `pnpm typecheck` passam
- [ ] F3. Real manual QA — signup real testado via browser
- [ ] F4. Scope fidelity — nenhuma feature nova adicionada

## Commit strategy
Atomic commits por bug fix. Migrations aplicadas ao Supabase são parte do deploy, não versionadas como commit (já estão no repo).

## Success criteria
| Critério | Baseline | Target |
|----------|----------|--------|
| Signup real via web | Falha (trigger username) | ✅ Funciona |
| Tag preferences gera genres | ✅ Sim | ✅ + themes + studios |
| Auth forms OAuth | `onclick` broken | ✅ `onClick` funcional |
| E2E flow | Warnings em get_user_stats | ✅ Zero warnings |
