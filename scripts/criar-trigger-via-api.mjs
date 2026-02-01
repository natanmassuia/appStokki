/**
 * Cria o trigger via API usando Service Role
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

async function criarTrigger() {
  console.log('🔧 CRIANDO TRIGGER VIA API\n');
  
  // Lê o SQL do arquivo
  const sqlPath = join(__dirname, '..', 'CRIAR_TRIGGER_PROFILE.sql');
  const sql = readFileSync(sqlPath, 'utf-8');
  
  // Divide em comandos individuais
  const comandos = sql
    .split(';')
    .map(cmd => cmd.trim())
    .filter(cmd => cmd && !cmd.startsWith('--') && cmd.length > 10);
  
  console.log(`📝 Executando ${comandos.length} comandos SQL...\n`);
  
  for (let i = 0; i < comandos.length; i++) {
    const cmd = comandos[i];
    if (cmd.includes('SELECT') && cmd.includes('information_schema')) {
      // Queries de verificação - pula
      continue;
    }
    
    try {
      console.log(`[${i + 1}/${comandos.length}] Executando...`);
      const { data, error } = await supabase.rpc('exec_sql', { query: cmd });
      
      if (error) {
        // Tenta método alternativo
        const response = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ query: cmd })
        });
        
        if (!response.ok) {
          console.log(`   ⚠️  Não foi possível executar via API`);
          console.log(`   💡 Execute CRIAR_TRIGGER_PROFILE.sql manualmente no SQL Editor`);
          break;
        }
      } else {
        console.log(`   ✅ Comando executado`);
      }
    } catch (err) {
      console.log(`   ⚠️  ${err.message}`);
    }
  }
  
  console.log('\n💡 IMPORTANTE: A API do Supabase não permite executar SQL direto.');
  console.log('   Execute CRIAR_TRIGGER_PROFILE.sql manualmente no SQL Editor do Supabase.\n');
}

criarTrigger().catch(console.error);
