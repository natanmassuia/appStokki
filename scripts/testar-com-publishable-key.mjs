/**
 * Testa cadastro usando a chave PUBLISHABLE (como o frontend faz)
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

async function testar() {
  console.log('🧪 TESTANDO CADASTRO COM CHAVE PUBLISHABLE (Como Frontend)\n');
  console.log('═'.repeat(70));

  const testEmail = `test-frontend-${Date.now()}@test.com`;
  const testPassword = 'Teste123!@#';

  console.log(`📧 Email: ${testEmail}`);
  console.log(`🔑 Senha: ${testPassword}\n`);

  try {
    console.log('1️⃣ TENTANDO CRIAR CONTA...');
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: `${env.VITE_SUPABASE_URL.replace('https://', 'http://localhost:5173')}/login`,
      },
    });

    if (error) {
      console.log(`   ❌ ERRO: ${error.message}`);
      console.log(`   Status: ${error.status}`);
      console.log(`   Code: ${error.code}`);
      
      if (error.status === 500) {
        console.log('\n   🔍 Erro 500 indica problema no trigger!');
        console.log('   💡 O trigger pode estar falhando quando executado via chave publishable');
        console.log('   💡 Verifique políticas RLS na tabela profiles');
      }
      return;
    }

    if (!data.user) {
      console.log('   ❌ Usuário não foi criado');
      return;
    }

    console.log(`   ✅ Usuário criado: ${data.user.id.substring(0, 8)}...`);

    // Aguarda trigger
    console.log('\n2️⃣ AGUARDANDO TRIGGER EXECUTAR...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verifica profile
    console.log('3️⃣ VERIFICANDO PROFILE...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        console.log('   ❌ Profile NÃO foi criado!');
        console.log('   ⚠️  Trigger não executou ou falhou silenciosamente');
      } else {
        console.log(`   ⚠️  Erro: ${profileError.message}`);
      }
    } else {
      console.log('   ✅ Profile criado!');
      console.log('   Dados:', JSON.stringify(profile, null, 2));
    }

    // Limpa
    console.log('\n4️⃣ LIMPANDO...');
    const supabaseAdmin = createClient(
      env.VITE_SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    if (profile) {
      await supabaseAdmin.from('profiles').delete().eq('id', data.user.id);
    }
    console.log('   ✅ Limpo');

  } catch (err) {
    console.error('\n❌ Erro:', err.message);
    console.error(err);
  }
}

testar().catch(console.error);
