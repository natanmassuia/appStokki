/**
 * Script simples para verificar o estado do banco
 * Execute: npx tsx scripts/verificar-banco.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Carrega .env
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL) {
  console.error('❌ VITE_SUPABASE_URL não encontrada');
  process.exit(1);
}

if (!SERVICE_ROLE_KEY) {
  console.error('❌ Service Role Key não encontrada');
  console.log('\n📝 Para obter:');
  console.log('   Supabase Dashboard → Settings → API → service_role key');
  console.log('   Adicione no .env: SUPABASE_SERVICE_ROLE_KEY=sua_key\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🔍 Verificando banco de dados...\n');

  // Verifica tabelas principais
  const tabelas = ['profiles', 'stores', 'store_members', 'products'];
  
  for (const tabela of tabelas) {
    try {
      const { data, error, count } = await supabase
        .from(tabela)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`❌ ${tabela}: ${error.message}`);
      } else {
        console.log(`✅ ${tabela}: ${count || 0} registros`);
      }
    } catch (err: any) {
      console.log(`❌ ${tabela}: ${err.message}`);
    }
  }

  // Verifica estrutura de profiles
  console.log('\n📋 Estrutura profiles:');
  try {
    const { data } = await supabase.from('profiles').select('*').limit(1);
    if (data && data.length > 0) {
      console.log('   Colunas:', Object.keys(data[0]).join(', '));
    }
  } catch (err: any) {
    console.log('   Erro:', err.message);
  }
}

main().catch(console.error);
