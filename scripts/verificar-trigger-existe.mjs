/**
 * Verifica se o trigger existe e está funcionando
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
  const envPath = join(__dirname, '..', '.env');
  const envContent = readFileSync(envPath, 'utf-8');
  const env = {};
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').replace(/^["']|["']$/g, '');
      }
    }
  });
  return env;
}

const env = loadEnv();

const supabaseAdmin = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function verificar() {
  console.log('🔍 VERIFICANDO TRIGGER E FUNÇÃO\n');
  console.log('═'.repeat(70));

  try {
    // 1. Verificar se a função existe
    console.log('\n1️⃣ VERIFICANDO FUNÇÃO handle_new_user...');
    const { data: functions, error: funcError } = await supabaseAdmin.rpc('exec_sql', {
      query: `
        SELECT 
          p.proname as function_name,
          p.prosecdef as security_definer,
          CASE 
            WHEN p.prosecdef THEN '✅ SIM'
            ELSE '❌ NÃO'
          END as status
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE p.proname = 'handle_new_user'
          AND n.nspname = 'public';
      `
    });

    // Alternativa: usar query direta na tabela profiles (se RLS permitir)
    console.log('   ⚠️  Não é possível verificar função via RPC diretamente');
    console.log('   💡 Execute no SQL Editor:');
    console.log('      SELECT proname, prosecdef FROM pg_proc WHERE proname = \'handle_new_user\';');

    // 2. Verificar se o trigger existe
    console.log('\n2️⃣ VERIFICANDO TRIGGER on_auth_user_created...');
    console.log('   💡 Execute no SQL Editor:');
    console.log('      SELECT tgname, tgenabled FROM pg_trigger WHERE tgname = \'on_auth_user_created\';');

    // 3. Testar criação de usuário
    console.log('\n3️⃣ TESTANDO CRIAÇÃO DE USUÁRIO...');
    const testEmail = `test-trigger-${Date.now()}@test.com`;
    const { data: testUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: testEmail,
      password: 'Teste123!@#',
      email_confirm: true,
    });

    if (createError) {
      console.log(`   ❌ Erro ao criar usuário: ${createError.message}`);
      return;
    }

    console.log(`   ✅ Usuário criado: ${testUser.user.id.substring(0, 8)}...`);

    // Aguarda trigger
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verifica profile
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', testUser.user.id)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        console.log('   ❌ TRIGGER NÃO ESTÁ FUNCIONANDO!');
        console.log('   ⚠️  Profile não foi criado automaticamente');
        console.log('\n   💡 SOLUÇÃO:');
        console.log('      1. Execute CRIAR_TRIGGER_PROFILE.sql no SQL Editor');
        console.log('      2. Verifique se há erros no SQL');
        console.log('      3. Execute VERIFICAR_RLS_PROFILES.sql');
      } else {
        console.log(`   ⚠️  Erro: ${profileError.message}`);
      }
    } else {
      console.log('   ✅ TRIGGER ESTÁ FUNCIONANDO!');
      console.log('   ✅ Profile criado automaticamente');
    }

    // Limpa
    await supabaseAdmin.auth.admin.deleteUser(testUser.user.id);
    if (profile) {
      await supabaseAdmin.from('profiles').delete().eq('id', testUser.user.id);
    }
    console.log('   🧹 Teste limpo');

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('✅ Verificação concluída!\n');
}

verificar().catch(console.error);
