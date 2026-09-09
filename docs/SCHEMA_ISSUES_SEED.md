# Schema Issues — Relatório para Demo Seed

**Data:** 2026-09-08
**Escopo:** Análise de todas as 11 migrations (`supabase/migrations/*.sql`) buscando incompatibilidades com o seed script.

---

## Resumo

| # | Problema | Severidade | Bloqueia seed? |
|---|---|---|---|
|| 1 | Trigger `block_hiatus_progress` bloqueia UPDATE em mídias `hiatus` | Baixa | Não (seed filtra `hiatus` em SAFE_RELEASE_STATUSES; upsert não toca em mídias hiatus existentes) |
| 2 | Trigger `recompute_tag_preferences` só processa `completed` + `user_score` | Baixa | Não (seed faz upsert manual) |
| 3 | `handle_new_user` pode gerar username violando CHECK | Baixa | Não (user demo já existe) |
| 4 | RLS em `media_catalog` — escrita só via service_role | Nenhuma | Não (seed usa service_role) |

**Conclusão: Nenhum problema bloqueia o seed script.** Todos os problemas identificados foram contornados no design do script.

---

## Problema 1: Trigger `block_hiatus_progress`

**Migration:** `20260816000002_triggers.sql` (linhas 82-102)
**Status:** NÃO BLOQUEIA

### Descrição

```sql
CREATE TRIGGER block_hiatus_progress
    BEFORE UPDATE ON user_media_progress
    FOR EACH ROW EXECUTE FUNCTION validate_progress_increment();
```

A função `validate_progress_increment()` verifica se a mídia está em `hiatus` e bloqueia a atualização de `current_unit`:

```sql
IF v_release_status = 'hiatus' AND NEW.current_unit > OLD.current_unit THEN
    RAISE EXCEPTION 'Cannot increment progress on hiatus media';
END IF;
```

### Impacto no seed

- **Sem impacto:** o seed script usa `upsert` (INSERT ... ON CONFLICT DO UPDATE) em `user_media_progress`. O trigger `block_hiatus_progress` é `BEFORE UPDATE` e só dispara quando o registro já existe e o `current_unit` é incrementado. Como o seed filtra explicitamente `hiatus` fora de `SAFE_RELEASE_STATUSES` (ver `scripts/seed-demo.cjs:66-69`), nunca tenta atualizar progresso em mídias `hiatus`. O `upsert` em registros novos é um INSERT puro (sem UPDATE), e o trigger não dispara.

- **Risco futuro:** se o seed script fosse alterado para incluir `hiatus` em `SAFE_RELEASE_STATUSES`, o upsert em registros pré-existentes em `hiatus` dispararia o trigger e falharia. Manter o filtro é a mitigação correta.

### Contorno (se necessário no futuro)

```sql
-- Opção A: executar com SET LOCAL (bypass de trigger por sessão)
SET LOCAL session_replication_role = 'replica';
-- Executar upsert aqui
RESET SESSION_REPLICATION_ROLE;

-- Opção B: usar uma função SECURITY DEFINER que faça o INSERT diretamente
```

---

## Problema 2: Trigger `recompute_tag_preferences` — cobertura parcial

**Migration:** `20260816000002_triggers.sql` (linhas 30-78) + `20260820000001_enhance_tag_preferences.sql`
**Status:** NÃO BLOQUEIA

### Descrição

O trigger `recompute_tag_preferences` dispara `AFTER INSERT OR UPDATE ON user_media_progress`. Ele **apenas** processa registros quando:

```sql
IF NEW.status = 'completed'
   AND NEW.user_score IS NOT NULL
   AND (OLD.user_score IS NULL OR OLD.user_score <> NEW.user_score) THEN
```

Ou seja, os seguintes status **NÃO** geram preferências de tags automaticamente:
- `planning` — sem score
- `watching` — sem score
- `rewatching` — sem score
- `paused` — sem score
- `dropped` — sem score

E registros `completed` sem `user_score` também não geram tags.

### Impacto no seed

- **O seed script contorna isso** fazendo `upsert` manual em `user_tag_preferences` com `ignoreDuplicates: true`.
- Para registros `completed` com score, o trigger **já** atualiza as tags automaticamente (deltas de +10/-5/+5/+3 conforme a migration `20260820000001`).
- O upsert manual é redundante para esses registros, mas inofensivo (deve ser ignorado por `ignoreDuplicates`).

### Risco

- **Baixa:** a abordagem atual funciona, mas pode gerar duplicados se o trigger e o upsert manual usarem deltas diferentes. **Recomendação:** no futuro, ajustar o seed para fazer upsert apenas para registros NÃO-completed, ou desabilitar o trigger durante a execução do seed.

---

## Problema 3: `handle_new_user` — username CHECK constraint

**Migration:** `20260819000001_fix_handle_new_user_username.sql`
**Status:** NÃO BLOQUEIA (user demo já existe)

### Descrição

O trigger `handle_new_user` cria um perfil automaticamente quando um novo user é criado em `auth.users`. A tabela `profiles` tem:

```sql
username TEXT UNIQUE NOT NULL CHECK (length(username) BETWEEN 3 AND 30)
```

### Impacto no seed

- **Sem impacto:** o seed script NÃO cria novos usuários em `auth.users`. Ele usa o user demo existente (`11111111-1111-1111-1111-111111111111`), que já foi criado na migration `20260816000004_fix_signup_and_test_user.sql`.
- **Risco:** se o user demo não existir no banco, o FK `user_media_progress.user_id → profiles(id)` falhará.

### Verificação prévia

```sql
SELECT id, username FROM profiles WHERE id = '11111111-1111-1111-1111-111111111111';
```

Se não existir:
```sql
INSERT INTO profiles (id, username, display_name)
VALUES ('11111111-1111-1111-1111-111111111111', 'demo_user', 'Usuário Demo');
```

---

## Problema 4: RLS em `media_catalog`

**Migration:** `20260816000001_init_schema.sql` (linhas 290-294)
**Status:** NÃO BLOQUEIA

### Descrição

```sql
ALTER TABLE media_catalog ENABLE ROW LEVEL SECURITY;
CREATE POLICY "media_read_all" ON media_catalog FOR SELECT USING (TRUE);
```

- **SELECT:** público (qualquer pessoa pode ler)
- **INSERT/UPDATE/DELETE:** bloqueado por RLS (sem policy escrita)

### Impacto no seed

- **Sem impacto:** o seed usa `SUPABASE_SERVICE_ROLE_KEY`, que **ignora RLS**. O script pode fazer SELECT e INSERT/DELETE normalmente.

### Risco

- **Nenhum:** o `service_role` key é o caminho correto para operações administrativas.

---

## Problemas adicionais identificados (não bloqueiam o seed)

### 5. Trigger `set_updated_at` — não dispara em INSERT

**Migration:** `20260816000002_triggers.sql` (linhas 9-29)

```sql
CREATE TRIGGER set_updated_at_progress
    BEFORE UPDATE ON user_media_progress
    FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
```

- **Status:** Não é um problema — `updated_at` já tem `DEFAULT NOW()` no CREATE TABLE.
- **Impacto:** o `updated_at` dos INSERTs do seed será `NOW()` (correto).

### 6. Constraint `user_media_progress UNIQUE(user_id, media_id)`

**Migration:** `20260816000001_init_schema.sql` (linha 171)

- **Impacto:** o seed faz upsert (ON CONFLICT DO UPDATE) — registros existentes são atualizados, não há conflito de chave. Não há limpeza prévia de registros. Re-executar com mesmo user_id replace o progresso existente.
- **Risco futuro:** se o seed for executado 2x sem limpar, o progresso existente é sobrescrito pelo upsert.

### 7. Constraint `user_score_global NUMERIC(3,1)`

**Migration:** `20260816000001_init_schema.sql` (linha 126)

- **Impacto:** o campo aceita valores de 0.0 a 999.9. Os scores mockados ficam em [5.5, 10.0] — dentro do limite.
- **Risco:** nenhum.

### 8. Constraint `user_tag_preferences.score CHECK (score >= -50 AND score <= 100)`

**Migration:** `20260816000001_init_schema.sql` (linha 189)

- **Impacto:** os deltas gerados pelo seed são: +10, -5, +5, +3, 0 — todos dentro do limite.
- **Risco:** nenhum.

---

## Conclusão

**Nenhum problema no schema bloqueia o seed script.** Os três problemas reais identificados (trigger de hiatus, trigger de tag preferences parcial, e RLS) foram contornados no design do script:

1. **Filtro `hiatus` em SAFE_RELEASE_STATUSES + upsert** → evita `block_hiatus_progress`
2. **Upsert manual de tags** → cobre registros não-completed que o trigger não processa
3. **Service role key** → bypass de RLS para escrita em `media_catalog`

O script está pronto para execução assim que a infra Supabase for restaurada.
