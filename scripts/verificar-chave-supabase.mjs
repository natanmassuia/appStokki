/**
 * Verifica se a chave do Supabase está correta
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

console.log('🔍 VERIFICAÇÃO DE CREDENCIAIS SUPABASE\n');
console.log('═'.repeat(70));

// Verifica se as variáveis existem
console.log('\n1️⃣ VERIFICANDO VARIÁVEIS DE AMBIENTE:');
console.log('─'.repeat(70));

const url = env.VITE_SUPABASE_URL;
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url) {
  console.log('   ❌ VITE_SUPABASE_URL não encontrada');
} else {
  console.log(`   ✅ VITE_SUPABASE_URL: ${url}`);
}

if (!key) {
  console.log('   ❌ VITE_SUPABASE_PUBLISHABLE_KEY não encontrada');
} else {
  const keyLength = key.length;
  const keyPreview = key.substring(0, 20) + '...' + key.substring(keyLength - 20);
  console.log(`   ✅ VITE_SUPABASE_PUBLISHABLE_KEY: ${keyPreview} (${keyLength} caracteres)`);
  
  // JWT válido deve ter 3 partes separadas por ponto
  const parts = key.split('.');
  if (parts.length !== 3) {
    console.log('   ⚠️  A chave não parece ser um JWT válido (deve ter 3 partes separadas por ponto)');
  } else {
    console.log('   ✅ Formato JWT válido (3 partes)');
  }
  
  // Chave muito curta indica que está truncada
  if (keyLength < 100) {
    console.log('   ⚠️  A chave parece estar truncada (muito curta)');
    console.log('   💡 Certifique-se de copiar a chave COMPLETA do Supabase Dashboard');
  }
}

// Testa a conexão
console.log('\n2️⃣ TESTANDO CONEXÃO:');
console.log('─'.repeat(70));

if (!url || !key) {
  console.log('   ⚠️  Não é possível testar sem URL e chave');
} else {
  try {
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    
    // Tenta fazer uma query simples para verificar a chave
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(0);
    
    if (error) {
      if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
        console.log('   ❌ CHAVE INVÁLIDA!');
        console.log('   💡 A chave não está correta ou está expirada');
        console.log('   💡 Verifique no Supabase Dashboard → Settings → API');
      } else if (error.code === 'PGRST301') {
        console.log('   ⚠️  Tabela não existe (normal se o projeto está vazio)');
        console.log('   ✅ Mas a chave está funcionando!');
      } else {
        console.log(`   ⚠️  Erro: ${error.message}`);
        console.log('   ℹ️  Pode ser RLS bloqueando (normal)');
      }
    } else {
      console.log('   ✅ CHAVE VÁLIDA E FUNCIONANDO!');
    }
  } catch (err) {
    console.log(`   ❌ Erro ao testar: ${err.message}`);
  }
}

console.log('\n' + '═'.repeat(70));
console.log('✅ Verificação concluída!\n');
