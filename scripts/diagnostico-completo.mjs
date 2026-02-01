/**
 * Diagnóstico Completo do Banco Supabase
 * Execute: node scripts/diagnostico-completo.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Lê .env manualmente
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
    console.error('Erro ao ler .env:', err.message);
    return {};
  }
}

const env = loadEnv();
const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Variáveis de ambiente não encontradas');
  console.error('   VITE_SUPABASE_URL:', SUPABASE_URL ? '✅' : '❌');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SERVICE_ROLE_KEY ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function diagnosticar() {
  console.log('🔍 DIAGNÓSTICO COMPLETO DO BANCO\n');
  console.log('═'.repeat(60));

  // 1. Verificar conexão
  console.log('\n📡 TESTE DE CONEXÃO:');
  try {
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) throw error;
    console.log('   ✅ Conexão estabelecida com sucesso');
  } catch (err) {
    console.log('   ❌ Erro na conexão:', err.message);
    return;
  }

  // 2. Verificar tabelas principais
  console.log('\n📊 TABELAS PRINCIPAIS:');
  console.log('─'.repeat(60));
  
  const tabelas = ['profiles', 'stores', 'store_members', 'products', 'categories'];
  
  for (const tabela of tabelas) {
    try {
      const { data, error, count } = await supabase
        .from(tabela)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        if (error.code === 'PGRST301' || error.message.includes('does not exist')) {
          console.log(`   ❌ ${tabela}: Tabela não existe`);
        } else {
          console.log(`   ⚠️  ${tabela}: ${error.message}`);
        }
      } else {
        console.log(`   ✅ ${tabela}: ${count || 0} registros`);
      }
    } catch (err) {
      console.log(`   ❌ ${tabela}: ${err.message}`);
    }
  }

  // 3. Estrutura da tabela profiles
  console.log('\n👤 ESTRUTURA: profiles');
  console.log('─'.repeat(60));
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    } else if (data && data.length > 0) {
      const colunas = Object.keys(data[0]);
      colunas.forEach(col => {
        const tipo = typeof data[0][col];
        const valor = data[0][col];
        const isNull = valor === null ? ' (nullable)' : '';
        console.log(`   • ${col} (${tipo})${isNull}`);
      });
    } else {
      console.log('   ⚠️  Tabela vazia');
    }
  } catch (err) {
    console.log(`   ❌ Erro: ${err.message}`);
  }

  // 4. Estrutura da tabela stores
  console.log('\n🏪 ESTRUTURA: stores');
  console.log('─'.repeat(60));
  try {
    const { data, error } = await supabase
      .from('stores')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`   ❌ Erro: ${error.message}`);
    } else if (data && data.length > 0) {
      const colunas = Object.keys(data[0]);
      colunas.forEach(col => {
        const tipo = typeof data[0][col];
        const valor = data[0][col];
        const isNull = valor === null ? ' (nullable)' : '';
        console.log(`   • ${col} (${tipo})${isNull}`);
      });
    } else {
      console.log('   ⚠️  Tabela vazia');
    }
  } catch (err) {
    console.log(`   ❌ Erro: ${err.message}`);
  }

  // 5. Verificar usuários
  console.log('\n👥 USUÁRIOS NO AUTH:');
  console.log('─'.repeat(60));
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    console.log(`   Total: ${users.length} usuários`);
    if (users.length > 0) {
      console.log('   Primeiros 3:');
      users.slice(0, 3).forEach((user, i) => {
        console.log(`   ${i + 1}. ${user.email} (${user.id.substring(0, 8)}...)`);
      });
    }
  } catch (err) {
    console.log(`   ❌ Erro: ${err.message}`);
  }

  // 6. Verificar profiles vs users
  console.log('\n🔗 SINCRONIZAÇÃO profiles ↔ users:');
  console.log('─'.repeat(60));
  try {
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const { data: profiles, count: profilesCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   Auth users: ${users?.length || 0}`);
    console.log(`   Profiles: ${profilesCount || 0}`);
    
    if (users && users.length > 0) {
      const userIds = new Set(users.map(u => u.id));
      const { data: allProfiles } = await supabase.from('profiles').select('id');
      const profileIds = new Set((allProfiles || []).map(p => p.id));
      
      const semProfile = users.filter(u => !profileIds.has(u.id));
      const profilesOrfaos = (allProfiles || []).filter(p => !userIds.has(p.id));
      
      if (semProfile.length > 0) {
        console.log(`   ⚠️  ${semProfile.length} usuários sem profile`);
        semProfile.slice(0, 3).forEach(u => {
          console.log(`      - ${u.email} (${u.id.substring(0, 8)}...)`);
        });
      }
      if (profilesOrfaos.length > 0) {
        console.log(`   ⚠️  ${profilesOrfaos.length} profiles órfãos (sem user)`);
      }
      if (semProfile.length === 0 && profilesOrfaos.length === 0) {
        console.log('   ✅ Sincronização OK');
      }
    }
  } catch (err) {
    console.log(`   ❌ Erro: ${err.message}`);
  }

  // 7. Verificar stores vs store_members
  console.log('\n🔗 SINCRONIZAÇÃO stores ↔ store_members:');
  console.log('─'.repeat(60));
  try {
    const { count: storesCount } = await supabase
      .from('stores')
      .select('*', { count: 'exact', head: true });
    
    const { count: membersCount } = await supabase
      .from('store_members')
      .select('*', { count: 'exact', head: true });
    
    console.log(`   Stores: ${storesCount || 0}`);
    console.log(`   Store Members: ${membersCount || 0}`);
    
    if (storesCount > 0 && membersCount > 0) {
      const { data: stores } = await supabase.from('stores').select('id, owner_id');
      const { data: members } = await supabase.from('store_members').select('store_id, user_id, role');
      
      if (stores && members) {
        const storesSemOwner = stores.filter(s => 
          !members.some(m => m.store_id === s.id && m.user_id === s.owner_id && m.role === 'owner')
        );
        
        if (storesSemOwner.length > 0) {
          console.log(`   ⚠️  ${storesSemOwner.length} stores sem owner em store_members`);
        } else {
          console.log('   ✅ Todas as stores têm owner em store_members');
        }
      }
    }
  } catch (err) {
    console.log(`   ❌ Erro: ${err.message}`);
  }

  console.log('\n' + '═'.repeat(60));
  console.log('✅ Diagnóstico concluído!\n');
}

diagnosticar().catch(console.error);
