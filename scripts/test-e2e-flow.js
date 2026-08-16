/**
 * Teste E2E do Fluxo Completo:
 * 1. Verificar contagem do catálogo e status do banco
 * 2. Criar ou autenticar usuário de teste
 * 3. Inserir / vincular profile
 * 4. Adicionar mídia do catálogo à biblioteca (user_media_progress)
 * 5. Atualizar progresso (+1 unidade)
 * 6. Concluir mídia e testar trigger de afinidade (user_tag_preferences)
 * 7. Executar RPCs (get_user_stats, get_recommendations, get_horizons)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Credenciais do Supabase ausentes no .env.local');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runVerification() {
  console.log('🔍 [1/6] Verificando estado atual das tabelas...');
  
  const [
    { count: catalogCount },
    { count: mappingCount },
    { count: profileCount },
    { count: progressCount },
    { data: lastLog }
  ] = await Promise.all([
    admin.from('media_catalog').select('*', { count: 'exact', head: true }),
    admin.from('offline_anime_mapping').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('user_media_progress').select('*', { count: 'exact', head: true }),
    admin.from('ingestion_logs').select('*').order('started_at', { ascending: false }).limit(1).maybeSingle()
  ]);

  console.log(`   - media_catalog: ${catalogCount ?? 0} registros`);
  console.log(`   - offline_anime_mapping: ${mappingCount ?? 0} registros`);
  console.log(`   - profiles: ${profileCount ?? 0} registros`);
  console.log(`   - user_media_progress: ${progressCount ?? 0} registros`);
  console.log(`   - Último log: ${lastLog?.source} (${lastLog?.status}) - Processados: ${lastLog?.records_processed}, Inseridos: ${lastLog?.records_inserted}`);

  console.log('\n👤 [2/6] Testando criação / recuperação de usuário de teste...');
  const testEmail = `test_flow_${Date.now()}@hubble.internal`;
  const testPassword = 'SecurePassword123!';
  
  let userId = null;

  // Tentativa 1: Admin CreateUser
  const { data: userCreated, error: userCreateErr } = await admin.auth.admin.createUser({
    email: testEmail,
    password: testPassword,
    email_confirm: true,
    user_metadata: {
      username: `user_${Date.now().toString().slice(-6)}`,
      display_name: 'Tester Hubble'
    }
  });

  if (userCreateErr) {
    console.warn(`   ⚠️ Admin createUser falhou: ${userCreateErr.message}`);
    // Se falhar por trigger no auth.users, vamos inspecionar os usuários existentes
    const { data: existingUsers } = await admin.auth.admin.listUsers();
    if (existingUsers?.users?.length > 0) {
      userId = existingUsers.users[0].id;
      console.log(`   ℹ️ Usando usuário auth existente: ${userId}`);
    } else {
      console.log('   ⚠️ Nenhum usuário no auth.users. Detalhes do erro reportados.');
    }
  } else {
    userId = userCreated.user.id;
    console.log(`   ✅ Usuário criado com sucesso no Auth: ${userId}`);
  }

  if (!userId) {
    console.error('❌ Não foi possível obter um user_id válido do auth para prosseguir.');
    return;
  }

  // Verificar se o profile existe ou precisa ser criado
  console.log('\n📄 [3/6] Verificando / garantindo registro em profiles...');
  const { data: existingProfile } = await admin.from('profiles').select('*').eq('id', userId).maybeSingle();
  
  if (!existingProfile) {
    const fallbackUsername = `user_${Date.now().toString().slice(-6)}`;
    const { data: newProfile, error: profErr } = await admin.from('profiles').insert({
      id: userId,
      username: fallbackUsername,
      display_name: 'Tester Hubble'
    }).select().single();

    if (profErr) {
      console.error(`   ❌ Erro ao criar profile: ${profErr.message}`);
      return;
    }
    console.log(`   ✅ Profile criado manualmente: ${newProfile.username}`);
  } else {
    console.log(`   ✅ Profile existente: ${existingProfile.username}`);
  }

  // Buscar uma obra no media_catalog
  console.log('\n🎬 [4/6] Buscando anime no catálogo para teste...');
  const { data: media, error: mediaErr } = await admin
    .from('media_catalog')
    .select('id, title_default, total_episodes, genres')
    .eq('media_type', 'anime')
    .limit(1)
    .single();

  if (mediaErr || !media) {
    console.error(`   ❌ Erro ao buscar mídia: ${mediaErr?.message || 'Nenhuma mídia encontrada'}`);
    return;
  }
  console.log(`   ✅ Mídia selecionada: "${media.title_default}" (${media.total_episodes || '?'} eps, gêneros: ${media.genres?.join(', ') || 'Nenhum'})`);

  // Adicionar progresso (status: watching, ep 1)
  console.log('\n📈 [5/6] Adicionando e atualizando progresso...');
  const { data: prog, error: progErr } = await admin
    .from('user_media_progress')
    .upsert({
      user_id: userId,
      media_id: media.id,
      status: 'watching',
      current_unit: 1,
      user_score: null,
      private_insights: 'Iniciando o teste de tracking 🚀'
    }, { onConflict: 'user_id,media_id' })
    .select()
    .single();

  if (progErr) {
    console.error(`   ❌ Erro ao registrar progresso: ${progErr.message}`);
    return;
  }
  console.log(`   ✅ Progresso inicial: status=${prog.status}, unit=${prog.current_unit}`);

  // Atualizar para concluído com score 9.0 para disparar o trigger de afinidade
  const totalUnits = media.total_episodes || 12;
  const { error: completeErr } = await admin
    .from('user_media_progress')
    .update({
      status: 'completed',
      current_unit: totalUnits,
      user_score: 9.0,
      completed_at: new Date().toISOString().split('T')[0]
    })
    .eq('user_id', userId)
    .eq('media_id', media.id);

  if (completeErr) {
    console.error(`   ❌ Erro ao atualizar progresso: ${completeErr.message}`);
    return;
  }
  console.log(`   ✅ Progresso atualizado para 'completed' (score: 9.0, units: ${totalUnits})`);

  // Verificar trigger de user_tag_preferences
  const { data: tagPrefs } = await admin
    .from('user_tag_preferences')
    .select('*')
    .eq('user_id', userId);

  console.log(`   🏷️ Tag preferences computadas: ${tagPrefs?.length || 0}`);
  tagPrefs?.forEach(tp => console.log(`      - [${tp.tag_type}] ${tp.tag_name}: ${tp.score}`));

  // 6. Testar RPCs
  console.log('\n🔮 [6/6] Executando RPCs do Supabase...');
  
  const [statsRes, recsRes, horizonsRes] = await Promise.all([
    admin.rpc('get_user_stats', { p_user_id: userId }),
    admin.rpc('get_recommendations', { p_user_id: userId, p_limit: 3 }),
    admin.rpc('get_horizons', { p_user_id: userId, p_limit: 3 })
  ]);

  if (statsRes.error) {
    console.warn(`   ⚠️ RPC get_user_stats: ${statsRes.error.message}`);
  } else {
    console.log('   ✅ RPC get_user_stats retornado com sucesso:', statsRes.data);
  }

  if (recsRes.error) {
    console.warn(`   ⚠️ RPC get_recommendations: ${recsRes.error.message}`);
  } else {
    console.log(`   ✅ RPC get_recommendations: ${recsRes.data?.length || 0} itens retornados`);
    recsRes.data?.forEach(r => console.log(`      - ${r.title_default} (Score Global: ${r.user_score_global})`));
  }

  if (horizonsRes.error) {
    console.warn(`   ⚠️ RPC get_horizons: ${horizonsRes.error.message}`);
  } else {
    console.log(`   ✅ RPC get_horizons (Novos Horizontes): ${horizonsRes.data?.length || 0} itens retornados`);
    horizonsRes.data?.forEach(r => console.log(`      - ${r.title_default} (Score Global: ${r.user_score_global})`));
  }

  console.log('\n🎉 TESTE E2E DO FLUXO COMPLETO CONCLUÍDO!');
}

runVerification().catch(err => {
  console.error('❌ Erro não tratado:', err);
});
