/**
 * Script de Validação: Signup E2E + Email Provider
 *
 * Testa o fluxo completo de signup:
 * 1. Verifica configuração do Email Provider via Supabase Auth Admin API
 * 2. Cria usuário de teste via admin.createUser()
 * 3. Verifica se trigger handle_new_user criou profile em profiles
 * 4. Reporta sucesso/falha com IDs
 *
 * Uso: node --import tsx scripts/validate-signup.ts
 *   ou: npx tsx scripts/validate-signup.ts
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const TEST_EMAIL = "test_opencode@example.com";
const TEST_PASSWORD = "password123";
const TEST_USERNAME = "testuser_opencode";

async function checkEmailProvider(): Promise<boolean> {
  console.log("\n📋 [1/4] Verificando configuração do Email Provider...");

  // List providers config via admin API
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });

  if (error) {
    console.error("❌ Erro ao acessar admin API:", error.message);
    return false;
  }

  console.log("✅ Admin API acessível (Service Role funcionando)");
  console.log(`   Total de usuários existentes: ${data?.users?.length ?? 0}`);
  return true;
}

async function checkExistingTestUser(): Promise<string | null> {
  console.log("\n🔍 [2/4] Procurando usuário de teste existente...");

  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    console.error("❌ Erro:", error.message);
    return null;
  }

  const existing = data.users.find((u) => u.email === TEST_EMAIL);
  if (existing) {
    console.log(`⚠️  Usuário de teste já existe: ${existing.id}`);
    return existing.id;
  }

  console.log("✅ Nenhum usuário de teste encontrado (limpo para criar)");
  return null;
}

async function createTestUser(): Promise<string | null> {
  console.log("\n📝 [3/4] Criando usuário de teste via admin.createUser()...");

  const { data, error } = await supabase.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true, // Auto-confirm para teste
    user_metadata: {
      username: TEST_USERNAME,
      display_name: "Test User OpenCode",
    },
  });

  if (error) {
    console.error("❌ Erro ao criar usuário:", error.message);
    return null;
  }

  if (!data.user) {
    console.error("❌ Resposta vazia");
    return null;
  }

  console.log(`✅ Usuário criado: ${data.user.id}`);
  console.log(`   Email: ${data.user.email}`);
  console.log(`   Confirmed: ${data.user.email_confirmed_at ? "sim" : "não"}`);

  // Aguardar trigger handle_new_user rodar (async)
  console.log("   ⏳ Aguardando trigger handle_new_user (500ms)...");
  await new Promise((r) => setTimeout(r, 500));

  return data.user.id;
}

async function verifyProfile(userId: string): Promise<boolean> {
  console.log("\n✔️  [4/4] Verificando profile criado pelo trigger handle_new_user...");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, created_at")
    .eq("id", userId)
    .single();

  if (error) {
    console.error("❌ Profile NÃO encontrado:", error.message);
    console.log("   ⚠️  O trigger handle_new_user pode não ter rodado");
    console.log("   ⚠️  Verifique se a migration 20260819000001 foi aplicada");
    return false;
  }

  console.log("✅ Profile encontrado!");
  console.log(`   ID:          ${data.id}`);
  console.log(`   Username:    ${data.username}`);
  console.log(`   Display:     ${data.display_name}`);
  console.log(`   Avatar:      ${data.avatar_url || "(nenhum)"}`);
  console.log(`   Created at:  ${data.created_at}`);

  const usernameMatch = data.username === TEST_USERNAME;
  const displayMatch = data.display_name === "Test User OpenCode";

  if (usernameMatch && displayMatch) {
    console.log("\n🎉 SUCESSO TOTAL!");
    console.log("   ✅ Trigger handle_new_user funcionou perfeitamente");
    console.log("   ✅ Username gerado a partir do metadata");
    console.log("   ✅ Display name também foi salvo");
    return true;
  } else {
    console.log("\n⚠️  Profile criado mas com dados divergentes:");
    if (!usernameMatch) console.log(`   Username esperado: ${TEST_USERNAME}, obtido: ${data.username}`);
    if (!displayMatch) console.log(`   Display esperado: Test User OpenCode, obtido: ${data.display_name}`);
    return false;
  }
}

async function listAllProviders(): Promise<void> {
  console.log("\n📊 Status dos Auth Providers:");
  try {
    // Get raw config from GoTrue
    const url = `${SUPABASE_URL}/auth/v1/admin/settings`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`, apikey: SUPABASE_SERVICE_KEY },
    });
    if (res.ok) {
      const cfg = await res.json();
      const mailer = cfg?.mailer_autoconfirm ?? "n/a";
      const smtp = cfg?.SMTP_ADMIN_EMAIL || cfg?.smtp?.host || "(nenhum)";
      console.log(`   mailer_autoconfirm: ${mailer} (true = emails confirmados automaticamente)`);
      console.log(`   SMTP host:          ${smtp}`);
    } else {
      console.log(`   ⚠️  HTTP ${res.status}`);
    }
  } catch (e: any) {
    console.log(`   ⚠️  ${e.message}`);
  }
}

async function main() {
  console.log("🔭 HUBBLE — Validação de Signup E2E");
  console.log("═══════════════════════════════════════");
  console.log(`Supabase: ${SUPABASE_URL.replace(/^https?:\/\//, "").split(".")[0]}`);
  console.log(`Test user: ${TEST_EMAIL} (${TEST_USERNAME})`);

  await listAllProviders();

  const apiOk = await checkEmailProvider();
  if (!apiOk) {
    console.error("\n❌ Falha no acesso à API. Abortando.");
    process.exit(1);
  }

  const existingId = await checkExistingTestUser();
  const userId = existingId || (await createTestUser());

  if (!userId) {
    console.error("\n❌ Não foi possível criar usuário. Abortando.");
    process.exit(1);
  }

  const ok = await verifyProfile(userId);

  console.log("\n═══════════════════════════════════════");
  console.log(ok ? "✅ VALIDAÇÃO COMPLETA" : "❌ VALIDAÇÃO COM FALHAS");
  console.log(`User ID: ${userId}`);
  console.log("═══════════════════════════════════════\n");

  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error("❌ Erro fatal:", err);
  process.exit(1);
});
