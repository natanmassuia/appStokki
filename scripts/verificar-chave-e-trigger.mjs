/**
 * Verifica se a chave está correta e se o trigger existe
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

console.log('🔍 VERIFICAÇÃO DE CONFIGURAÇÃO\n');
console.log('═'.repeat(70));

// 1. Verificar chave publishable
console.log('\n1️⃣ TESTANDO CHAVE PUBLISHABLE (Frontend):');
console.log('─'.repeat(70));

const supabasePublic = createClient(
  env.VITE_SUPABASE_URL, 
  env.VITE_SUPABASE_PUBLISHABLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

try {
  // Tenta fazer uma query simples para verificar a chave
  const { data, error } = await supabasePublic
    .from('profiles')
    .select('count')
    .limit(0);
  
  if (error) {
    if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
      console.log('   ❌ Chave PUBLISHABLE inválida ou expirada!');
      console.log('   💡 Verifique no Supabase Dashboard → Settings → API');
      console.log('   💡 A chave "anon" ou "public" deve começar com "eyJ..."');
    } else {
      console.log(`   ⚠️  Erro: ${error.message}`);
      console.log('   ℹ️  Pode ser RLS bloqueando (normal)');
    }
  } else {
    console.log('   ✅ Chave PUBLISHABLE está funcionando');
  }
} catch (err) {
  console.log(`   ❌ Erro ao testar: ${err.message}`);
}

// 2. Verificar chave service role
console.log('\n2️⃣ TESTANDO CHAVE SERVICE ROLE (Backend):');
console.log('─'.repeat(70));

const supabaseAdmin = createClient(
  env.VITE_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

try {
  const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 });
  
  if (error) {
    console.log(`   ❌ Erro: ${error.message}`);
  } else {
    console.log('   ✅ Chave SERVICE ROLE está funcionando');
    console.log(`   ℹ️  Total de usuários: ${users.length}`);
  }
} catch (err) {
  console.log(`   ❌ Erro ao testar: ${err.message}`);
}

// 3. Verificar trigger
console.log('\n3️⃣ VERIFICANDO TRIGGER:');
console.log('─'.repeat(70));

try {
  // Tenta criar um usuário de teste para ver se o trigger funciona
  const testEmail = `trigger-test-${Date.now()}@test.com`;
  const { data: testUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: testEmail,
    password: 'Teste123!@#',
    email_confirm: true,
  });

  if (createError) {
    console.log(`   ❌ Erro ao criar usuário de teste: ${createError.message}`);
  } else {
    console.log(`   ✅ Usuário de teste criado: ${testUser.user.id.substring(0, 8)}...`);
    
    // Aguarda trigger executar
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verifica se profile foi criado
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', testUser.user.id)
      .single();
    
    if (profileError) {
      if (profileError.code === 'PGRST116') {
        console.log('   ❌ TRIGGER NÃO ESTÁ FUNCIONANDO!');
        console.log('   ⚠️  Profile não foi criado automaticamente');
        console.log('   💡 Execute CRIAR_TRIGGER_PROFILE.sql no SQL Editor');
      } else {
        console.log(`   ⚠️  Erro ao verificar profile: ${profileError.message}`);
      }
    } else {
      console.log('   ✅ TRIGGER ESTÁ FUNCIONANDO!');
      console.log('   ✅ Profile criado automaticamente');
    }
    
    // Limpa o teste
    await supabaseAdmin.auth.admin.deleteUser(testUser.user.id);
    if (profile) {
      await supabaseAdmin.from('profiles').delete().eq('id', testUser.user.id);
    }
    console.log('   🧹 Teste limpo');
  }
} catch (err) {
  console.log(`   ❌ Erro: ${err.message}`);
}

console.log('\n' + '═'.repeat(70));
console.log('✅ Verificação concluída!\n');
