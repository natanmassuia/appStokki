/**
 * Script de Diagnóstico do Banco Supabase
 * Execute: node scripts/diagnostico-banco.js
 * 
 * IMPORTANTE: Adicione a SERVICE_ROLE_KEY no .env como:
 * SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Carrega variáveis de ambiente
dotenv.config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ VITE_SUPABASE_URL não encontrada no .env');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY não encontrada no .env');
  console.log('\n📝 Para obter a Service Role Key:');
  console.log('   1. Acesse Supabase Dashboard → Settings → API');
  console.log('   2. Copie a "service_role" key (NÃO a anon key)');
  console.log('   3. Adicione no .env: SUPABASE_SERVICE_ROLE_KEY=sua_key_aqui\n');
  process.exit(1);
}

// Cria cliente com Service Role (bypassa RLS)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function diagnosticar() {
  console.log('🔍 Iniciando diagnóstico do banco de dados...\n');
  console.log(`📡 Conectado em: ${SUPABASE_URL}\n`);

  try {
    // 1. Verificar tabelas existentes
    console.log('📊 TABELAS EXISTENTES:');
    console.log('─'.repeat(50));
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      // Tenta método alternativo
      const { data: altTables } = await supabase.rpc('get_tables');
      if (altTables) {
        console.log(altTables.map(t => `  ✅ ${t}`).join('\n'));
      } else {
        console.log('  ⚠️ Não foi possível listar tabelas automaticamente');
      }
    } else {
      console.log(tables?.map(t => `  ✅ ${t.table_name}`).join('\n') || '  ⚠️ Nenhuma tabela encontrada');
    }

    // 2. Verificar estrutura da tabela profiles
    console.log('\n👤 ESTRUTURA DA TABELA profiles:');
    console.log('─'.repeat(50));
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (profilesError) {
      console.log(`  ❌ Erro: ${profilesError.message}`);
    } else if (profiles && profiles.length > 0) {
      console.log('  Colunas encontradas:');
      Object.keys(profiles[0]).forEach(col => {
        console.log(`    • ${col}`);
      });
    } else {
      console.log('  ⚠️ Tabela vazia ou não existe');
    }

    // 3. Verificar estrutura da tabela stores
    console.log('\n🏪 ESTRUTURA DA TABELA stores:');
    console.log('─'.repeat(50));
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('*')
      .limit(1);
    
    if (storesError) {
      console.log(`  ❌ Erro: ${storesError.message}`);
    } else if (stores && stores.length > 0) {
      console.log('  Colunas encontradas:');
      Object.keys(stores[0]).forEach(col => {
        console.log(`    • ${col}`);
      });
    } else {
      console.log('  ⚠️ Tabela vazia ou não existe');
    }

    // 4. Verificar triggers
    console.log('\n⚙️ TRIGGERS ATIVOS:');
    console.log('─'.repeat(50));
    // Nota: Verificação de triggers requer query SQL direta
    console.log('  ℹ️ Execute no SQL Editor:');
    console.log('     SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE event_object_schema = \'auth\';');

    // 5. Verificar políticas RLS
    console.log('\n🔒 POLÍTICAS RLS (profiles):');
    console.log('─'.repeat(50));
    // Nota: Verificação de RLS requer query SQL direta
    console.log('  ℹ️ Execute no SQL Editor:');
    console.log('     SELECT * FROM pg_policies WHERE tablename = \'profiles\';');

    // 6. Contar registros
    console.log('\n📈 CONTAGEM DE REGISTROS:');
    console.log('─'.repeat(50));
    
    const [profilesCount, storesCount, membersCount] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('stores').select('*', { count: 'exact', head: true }),
      supabase.from('store_members').select('*', { count: 'exact', head: true })
    ]);

    console.log(`  profiles: ${profilesCount.count || 0}`);
    console.log(`  stores: ${storesCount.count || 0}`);
    console.log(`  store_members: ${membersCount.count || 0}`);

    console.log('\n✅ Diagnóstico concluído!\n');

  } catch (error) {
    console.error('\n❌ Erro durante diagnóstico:', error.message);
    console.error(error);
  }
}

diagnosticar();
