/**
 * Testa cadastro com email válido (simulando o frontend)
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

// Simula o frontend usando publishable key
const supabase = createClient(
  env.VITE_SUPABASE_URL,
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
      persistSession: false,
      autoRefreshToken: false,
    }
  }
);

// Admin para limpar
const supabaseAdmin = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function testar() {
  console.log('🧪 TESTE DE CADASTRO (Simulando Frontend)\n');
  console.log('═'.repeat(70));

  // Usa email válido
  const testEmail = `test${Date.now()}@gmail.com`;
  const testPassword = 'Teste123!@#';

  console.log(`📧 Email: ${testEmail}`);
  console.log(`🔑 Senha: ${testPassword}\n`);

  try {
    console.log('1️⃣ CRIANDO CONTA (signUp)...');
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: `http://localhost:5173/login`,
      },
    });

    if (error) {
      console.log(`\n   ❌ ERRO: ${error.message}`);
      console.log(`   Status: ${error.status}`);
      console.log(`   Code: ${error.code}`);
      
      if (error.status === 500) {
        console.log('\n   🔍 ERRO 500 - Problema no servidor/trigger!');
        console.log('   💡 Possíveis causas:');
        console.log('      1. Trigger não existe ou está falhando');
        console.log('      2. RLS bloqueando inserção na tabela profiles');
        console.log('      3. Função não tem SECURITY DEFINER');
        console.log('\n   💡 SOLUÇÃO:');
        console.log('      Execute CRIAR_TRIGGER_PROFILE.sql no SQL Editor');
        console.log('      Execute VERIFICAR_RLS_PROFILES.sql para verificar RLS');
      }
      return;
    }

    if (!data || !data.user) {
      console.log('   ❌ Usuário não foi criado (sem erro mas sem user)');
      return;
    }

    console.log(`   ✅ Usuário criado: ${data.user.id.substring(0, 8)}...`);
    console.log(`   Email confirmado: ${data.user.email_confirmed_at ? 'Sim' : 'Não'}`);

    // Aguarda trigger
    console.log('\n2️⃣ AGUARDANDO TRIGGER (3 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verifica profile usando admin (bypassa RLS)
    console.log('3️⃣ VERIFICANDO PROFILE (via Service Role)...');
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        console.log('   ❌ Profile NÃO foi criado pelo trigger!');
        console.log('   ⚠️  O trigger falhou ou não existe');
      } else {
        console.log(`   ⚠️  Erro: ${profileError.message}`);
      }
    } else {
      console.log('   ✅ Profile criado pelo trigger!');
      console.log(`   Email: ${profile.email}`);
      console.log(`   Nome: ${profile.full_name || '(vazio)'}`);
    }

    // Limpa
    console.log('\n4️⃣ LIMPANDO TESTE...');
    try {
      if (profile) {
        await supabaseAdmin.from('profiles').delete().eq('id', data.user.id);
      }
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      console.log('   ✅ Teste limpo');
    } catch (cleanupErr) {
      console.log(`   ⚠️  Erro ao limpar: ${cleanupErr.message}`);
    }

  } catch (err) {
    console.error('\n❌ Erro inesperado:', err.message);
    console.error(err);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('✅ Teste concluído!\n');
}

testar().catch(console.error);
