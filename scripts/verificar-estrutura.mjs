/**
 * Verifica estrutura completa das tabelas
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadEnv() {
  try {
    const envPath = join(__dirname, '..', '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const env = {};
    envContent.split('\n').forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').replace(/^["']|["']$/g, '');
          env[key.trim()] = value;
        }
      }
    });
    return env;
  } catch (err) {
    return {};
  }
}

const env = loadEnv();
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function verificarEstrutura() {
  console.log('🔍 VERIFICANDO ESTRUTURA DAS TABELAS\n');
  
  // Tenta inserir um registro de teste para ver a estrutura
  const tabelas = [
    { nome: 'profiles', campos: ['id', 'email', 'full_name'] },
    { nome: 'stores', campos: ['id', 'owner_id', 'name'] },
    { nome: 'store_members', campos: ['id', 'store_id', 'user_id', 'role'] }
  ];

  for (const tabela of tabelas) {
    console.log(`\n📋 ${tabela.nome.toUpperCase()}:`);
    console.log('─'.repeat(50));
    
    // Tenta fazer um SELECT com LIMIT 0 para ver a estrutura
    try {
      const { data, error } = await supabase
        .from(tabela.nome)
        .select('*')
        .limit(0);
      
      if (error) {
        if (error.code === 'PGRST301') {
          console.log('   ❌ Tabela não existe');
        } else if (error.code === '42501') {
          console.log('   ⚠️  Sem permissão (RLS bloqueando)');
        } else {
          console.log(`   ⚠️  ${error.message}`);
        }
      } else {
        console.log('   ✅ Tabela existe e é acessível');
      }
    } catch (err) {
      console.log(`   ❌ Erro: ${err.message}`);
    }
  }

  // Verifica se consegue inserir (teste de RLS)
  console.log('\n🔒 TESTE DE RLS (tentativa de inserção):');
  console.log('─'.repeat(50));
  
  try {
    const testId = '00000000-0000-0000-0000-000000000000';
    const { error } = await supabase
      .from('profiles')
      .insert({ id: testId, email: 'test@test.com' })
      .select();
    
    if (error) {
      if (error.code === '42501') {
        console.log('   ⚠️  RLS bloqueando inserção (normal para service_role)');
      } else {
        console.log(`   ⚠️  ${error.message}`);
      }
    } else {
      console.log('   ✅ Inserção permitida');
      // Remove o teste
      await supabase.from('profiles').delete().eq('id', testId);
    }
  } catch (err) {
    console.log(`   ⚠️  ${err.message}`);
  }
}

verificarEstrutura().catch(console.error);
