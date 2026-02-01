/**
 * Inspeção completa do banco usando Service Role
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
const supabase = createClient(env.VITE_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function inspecionar() {
  console.log('🔍 INSPEÇÃO COMPLETA DO BANCO\n');
  console.log('═'.repeat(70));

  // Testa inserção em cada tabela para descobrir estrutura
  const tabelas = [
    { nome: 'profiles', camposTeste: { id: '00000000-0000-0000-0000-000000000001', email: 'test@test.com' } },
    { nome: 'stores', camposTeste: { owner_id: '00000000-0000-0000-0000-000000000001', name: 'Test Store' } },
    { nome: 'store_members', camposTeste: { store_id: '00000000-0000-0000-0000-000000000001', user_id: '00000000-0000-0000-0000-000000000001', role: 'owner' } }
  ];

  for (const tabela of tabelas) {
    console.log(`\n📋 ${tabela.nome.toUpperCase()}:`);
    console.log('─'.repeat(70));
    
    // Tenta fazer um select vazio para ver se a tabela existe
    try {
      const { data, error } = await supabase
        .from(tabela.nome)
        .select('*')
        .limit(0);
      
      if (error) {
        if (error.code === 'PGRST301') {
          console.log('   ❌ Tabela não existe');
          continue;
        } else {
          console.log(`   ⚠️  Erro ao acessar: ${error.message}`);
          continue;
        }
      }
      
      console.log('   ✅ Tabela existe');
      
      // Tenta inserir para ver quais campos são obrigatórios
      try {
        const { error: insertError } = await supabase
          .from(tabela.nome)
          .insert(tabela.camposTeste);
        
        if (insertError) {
          // Analisa o erro para entender a estrutura
          if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
            console.log(`   ⚠️  Campo não existe: ${insertError.message.match(/column "([^"]+)"/)?.[1]}`);
          } else if (insertError.message.includes('null value') && insertError.message.includes('violates not-null')) {
            console.log(`   ℹ️  Campo obrigatório faltando: ${insertError.message.match(/column "([^"]+)"/)?.[1]}`);
          } else if (insertError.message.includes('foreign key')) {
            console.log('   ℹ️  Foreign key constraint (esperado - IDs de teste não existem)');
          } else {
            console.log(`   ℹ️  ${insertError.message.substring(0, 100)}`);
          }
        } else {
          console.log('   ✅ Estrutura básica OK (teste inserido e removido)');
          // Remove o teste
          if (tabela.nome === 'profiles') {
            await supabase.from(tabela.nome).delete().eq('id', tabela.camposTeste.id);
          }
        }
      } catch (insertErr) {
        console.log(`   ⚠️  Erro no teste: ${insertErr.message.substring(0, 100)}`);
      }
      
    } catch (err) {
      console.log(`   ❌ Erro: ${err.message}`);
    }
  }

  // Verifica usuários
  console.log('\n👥 USUÁRIOS:');
  console.log('─'.repeat(70));
  try {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) throw error;
    console.log(`   Total: ${users.length}`);
    if (users.length > 0) {
      users.forEach((u, i) => {
        console.log(`   ${i + 1}. ${u.email} (criado: ${new Date(u.created_at).toLocaleDateString('pt-BR')})`);
      });
    }
  } catch (err) {
    console.log(`   ❌ ${err.message}`);
  }

  console.log('\n' + '═'.repeat(70));
  console.log('\n💡 PRÓXIMOS PASSOS:');
  console.log('   1. Execute QUERIES_DIAGNOSTICO.sql no SQL Editor para ver estrutura completa');
  console.log('   2. Verifique se há triggers configurados');
  console.log('   3. Verifique políticas RLS\n');
}

inspecionar().catch(console.error);
