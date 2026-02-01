/**
 * Verifica estrutura via queries SQL diretas
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

async function verificarSQL() {
  console.log('🔍 VERIFICANDO ESTRUTURA VIA SQL\n');

  // 1. Estrutura de profiles
  console.log('📋 ESTRUTURA: profiles');
  console.log('─'.repeat(60));
  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles'
        ORDER BY ordinal_position;
      `
    });
    
    if (error) {
      // Tenta método alternativo - busca um registro vazio
      const { data: testData } = await supabase
        .from('profiles')
        .select('*')
        .limit(0);
      
      if (testData !== null) {
        console.log('   ✅ Tabela existe');
        console.log('   💡 Execute no SQL Editor:');
        console.log('      SELECT column_name, data_type FROM information_schema.columns WHERE table_name = \'profiles\';');
      } else {
        console.log(`   ⚠️  ${error.message}`);
      }
    } else {
      data?.forEach(col => {
        console.log(`   • ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? '[nullable]' : '[NOT NULL]'}`);
      });
    }
  } catch (err) {
    console.log(`   ⚠️  ${err.message}`);
  }

  // 2. Verificar triggers via função RPC
  console.log('\n⚙️ TRIGGERS:');
  console.log('─'.repeat(60));
  try {
    // Tenta verificar se há função handle_new_user
    const { data: funcData, error: funcError } = await supabase.rpc('pg_get_function_identity_arguments', {
      function_name: 'handle_new_user'
    });
    
    if (funcError) {
      console.log('   ⚠️  Não foi possível verificar funções automaticamente');
      console.log('   💡 Execute no SQL Editor:');
      console.log('      SELECT proname, prosecdef FROM pg_proc WHERE proname LIKE \'%user%\';');
    } else {
      console.log('   Funções encontradas:', funcData);
    }
  } catch (err) {
    console.log(`   ⚠️  ${err.message}`);
  }

  // 3. Verificar políticas RLS
  console.log('\n🔒 POLÍTICAS RLS:');
  console.log('─'.repeat(60));
  try {
    const { data: policies, error } = await supabase
      .from('pg_policies')
      .select('tablename, policyname, cmd')
      .eq('schemaname', 'public')
      .in('tablename', ['profiles', 'stores', 'store_members']);
    
    if (error) {
      console.log('   ⚠️  Não foi possível verificar políticas automaticamente');
      console.log('   💡 Execute no SQL Editor:');
      console.log('      SELECT * FROM pg_policies WHERE tablename = \'profiles\';');
    } else if (policies && policies.length > 0) {
      policies.forEach(p => {
        console.log(`   • ${p.tablename}.${p.policyname} (${p.cmd})`);
      });
    } else {
      console.log('   ⚠️  Nenhuma política RLS encontrada (pode estar bloqueando!)');
    }
  } catch (err) {
    console.log(`   ⚠️  ${err.message}`);
  }

  console.log('\n✅ Verificação concluída!');
  console.log('\n💡 Para ver detalhes completos, execute QUERIES_DIAGNOSTICO.sql no SQL Editor\n');
}

verificarSQL().catch(console.error);
