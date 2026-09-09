# Setup do Email Provider no Supabase — Guia Completo

## Status Atual da Infraestrutura

**Problema crítico:** O projeto Supabase foi deletado e o DNS retorna NXDOMAIN.  
Isso significa que NÃO é possível testar end-to-end no momento.

- `NEXT_PUBLIC_SUPABASE_URL`: Aponta para projeto inexistente
- `SUPABASE_SERVICE_ROLE_KEY`: Pode ser válida, mas não há onde autenticar
- Recomendação: Criar novo projeto em https://supabase.com/dashboard

---

## Checklist de Habilitação do Email Provider (Dashboard)

### Passo 1 — Criar/Restaurar Projeto Supabase
1. Acesse https://supabase.com/dashboard/project
2. Se necessário, crie um novo projeto (clique "New Project")
3. Anote as credenciais geradas:
   - `Project URL` (ex: `https://xyz.supabase.co`)
   - `Project API keys` → `anon/public` + `service_role`
4. Atualize `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<NOVO_ID>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
   SUPABASE_SERVICE_ROLE_KEY=<service_role_key>
   ```

### Passo 2 — Habilitar Auth com Email
1. No Dashboard → **Authentication** → **Providers** → **Email**
2. Ative:
   - ✅ **Enable sign up with email**
   - ✅ **Confirm email before login** (recomendado) ou desmarque para auto-confirm
   - ⚠️ **Allow users to sign up without confirming email** (só para desenvolvimento local)

### Passo 3 — Configurar Templates de Email
1. Vá para **Authentication** → **Email Templates**
2. Personalize (opcional mas recomendado):
   - **Confirm signup** → Template para novos usuários
   - **Magic link** → Se quiser habilitar login sem senha
   - **Recovery** → Recuperação de senha
   - **Change email** → Migração de email
3. No campo **Email Redirect To**, defina: `http://localhost:3000` (dev) ou domínio de produção

### Passo 4 — Aplicar Migrations
No **SQL Editor** do Supabase, execute cada migration na ordem:
```
supabase/migrations/
├── 20260816000001_init_schema.sql          -- Schema + RLS
├── 20260816000002_triggers.sql             -- Triggers + handle_new_user original
├── 20260816000003_rpc_functions.sql        -- Funções RPC
├── 20260816000004_fix_signup_and_test_user.sql  -- Correções de signup
├── 20260816000005_fix_validate_progress.sql    -- Validações de progresso
├── 20260816000006_fix_get_user_stats.sql     -- Versões das stats
├── 20260816000006_fix_get_user_stats_v2.sql
├── 20260816000006_fix_get_user_stats_v3.sql
├── 20260819000001_fix_handle_new_user_username.sql  -- Trigger atualizado (CRÍTICO)
├── 20260820000001_enhance_tag_preferences.sql
└── 20260821000001_avatars_bucket.sql       -- Storage
```

> **Importante:** A migration `20260819000001` contém a versão final do `handle_new_user()` com fallback robusto de username. É ela que permite o signup funcionar corretamente.

### Passo 5 — Verificar Configurações de Segurança
No **Authentication** → **Settings**:
- ✅ **Enable email confirmations** = true (ou false se quiser testar rápido)
- ✅ **Site URL**: `http://localhost:3000` (dev)
- ✅ **Redirect URLs**: `http://localhost:3000/auth/callback`

### Passo 6 — Testar o Fluxo
1. Inicie o dev server: `npm run dev`
2. Acesse http://localhost:3000/signup
3. Preencha:
   - Username: `testuser` (3+ chars)
   - Email: `test@example.com`
   - Senha: `password123`
4. Clique "Criar conta"
5. Verifique se redireciona para `/library`
6. Se confirmar email: verifique a caixa de entrada e clique no link

---

## Análise do Código Existente

### Signup (`src/app/(auth)/signup/page.tsx`)
```typescript
// FLUXO ATUAL:
1. Recebe username, email, password do formulário
2. Chama supabase.auth.signUp({ email, password, options: { data: { username } } })
3. O Supabase cria o usuário em auth.users
4. O TRIGGER handle_new_user() INSERE automaticamante na tabela profiles
5. O código FAZ UMA UPSERT MANUAL adicional na tabela profiles (redundante!)
6. Redireciona para /library
```

**Problema identificado:** A linha 43-51 faz um `supabase.from("profiles").upsert(...)` redundante. Como o trigger `handle_new_user` já executa um `INSERT ... ON CONFLICT (id) DO NOTHING`, essa operação manual pode:
- Gerar erro de constraint if o trigger ainda não rodou (race condition)
- Ser desnecessária

**Recomendação:** Remover o upsert manual ou mantê-lo apenas como fallback se o trigger falhar.

### Login (`src/app/(auth)/login/page.tsx`)
```typescript
// FLUXO ATUAL:
1. Recebe email e password
2. Chama supabase.auth.signInWithPassword({ email, password })
3. Redireciona para /library
```
✅ **Funciona corretamente** — não requer alterações.

### OAuth Buttons (`src/shared/components/OAuthButtons.tsx`)
Suporta Google e GitHub via `signInWithOAuth`. Para funcionar:
1. Habilitar esses providers no Dashboard (Authentication → Providers)
2. Configurar os OAuth apps no Google Cloud Console e GitHub Developer Settings
3. Adicionar client IDs/secrets no dashboard

---

## O que a Migration 20260819000001 Garante

O trigger `handle_new_user` usa esta cadeia de fallbacks:
1. `raw_user_meta_data->>'username'` (passado via signUp options)
2. Prefixo do email sanitizado (ex: `joao.silva` → `joao_silva`)
3. Prefixo + sufixo UUID (ex: `joao_a1b2c3d4`)
4. `'user_' + 8chars_UUID` (garantia final: sempre válido)
5. `left(..., 30)` (limite superior)

Isso previne violações do CHECK `length(username) BETWEEN 3 AND 30`.

---

## Fluxo de Execução Após Configuração

```
1. Usuário preenche formulário → POST /signup
2. Client envia: { email, password, username }
3. Supabase Auth cria usuário em auth.users
4. TRIGGER on_auth_user_created dispara
5. handle_new_user() insere em profiles com username derivado
6. Client faz upsert manual (redundante) → profiles
7. Redireciona para /library
```

**Tempo esperado:** 200-500ms para o trigger processar.

---

## Scripts Auxiliares Disponíveis

| Arquivo | Propósito |
|---------|-----------|
| `scripts/validate-signup.ts` | Teste E2E completo via admin API |
| `scripts/test-e2e-flow-fixed.js` | Testa fluxo pós-login (progresso, tags, RPCs) |
| `scripts/test-e2e-flow.js` | Versão anterior do teste |

### Como executar o teste de validação:
```bash
cd /home/caue/Documentos/projetos/vscode-projects/Hubble
npm install -g tsx  # se necessário
npx tsx scripts/validate-signup.ts
```

---

## Arquivos que Precisarão de Revisão Pós-Restauração

1. **`.env.local`** — Atualizar URLs e chaves após recriar projeto
2. **`src/app/(auth)/signup/page.tsx`** — Remover upsert manual redundante (linha 43-51)
3. **Configuração de OAuth** — Se quiser Google/GitHub, configurar no dashboard
