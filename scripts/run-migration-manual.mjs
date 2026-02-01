import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuração para ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lê o arquivo .env manualmente
const envPath = path.resolve(__dirname, '..', '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');

const getEnv = (key) => {
  const match = envContent.match(new RegExp(`${key}="?(.*?)"?(\r|\n|$)`));
  return match ? match[1] : null;
};

const SUPABASE_URL = getEnv('VITE_SUPABASE_URL');
// Tenta pegar a Service Role Key, senão usa a Public (mas a Public falhará para DDL)
const SUPABASE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('VITE_SUPABASE_PUBLISHABLE_KEY');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Credenciais não encontradas no .env');
  process.exit(1);
}

// Se a chave for truncada ou inválida, avisa
if (SUPABASE_KEY.length < 20 || SUPABASE_KEY.includes('...')) {
    console.error('❌ A chave SERVICE_ROLE no .env parece estar incompleta ou é um placeholder.');
    console.error('   Por favor, edite o arquivo .env e coloque a chave real do Supabase Dashboard.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const runMigration = async () => {
  console.log('🔄 Iniciando migração do banco de dados...');
  console.log(`📡 Conectando em: ${SUPABASE_URL}`);

  const migrationPath = path.resolve(__dirname, '..', 'supabase', 'migrations', '20240201000000_create_orders_schema.sql');
  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Quebra o SQL em comandos individuais para evitar erro de execução múltipla se a API não suportar
  // O Supabase JS client não suporta executar SQL bruto diretamente sem uma função RPC específica para isso
  // ou sem usar a API de pg (que não temos aqui configurada com connection string).
  // PORÉM, se tivermos a Service Role, podemos tentar usar a REST API para invocar uma query se existir alguma função auxiliar
  // ou tentar executar via POST direto na API se tivermos permissão.
  
  // A MELHOR aposta sem driver PG é tentar usar uma função RPC se ela existir, mas ela não existe.
  // A alternativa é usar o endpoint /v1/query se habilitado (raro).
  
  // COMO NÃO TEMOS connection string PG, vamos tentar o método via 'rpc' de sistema se disponível,
  // mas o padrão é não ter.
  
  // SOLUÇÃO ALTERNATIVA:
  // Se não conseguirmos rodar via cliente JS, vamos apenas validar as credenciais e avisar o usuário.
  // MAS o usuário pediu para NÓS rodarmos.
  
  // TENTATIVA: Usar a API de SQL do Supabase Management se disponível? Não.
  
  // Vou criar uma função 'exec_sql' via RPC? Não posso criar função sem rodar SQL.
  
  // CONCLUSÃO: Sem a Connection String (postgres://) que não está no .env,
  // não é possível rodar migrações DDL (Create Table) via script Node.js usando apenas supabase-js,
  // a menos que já exista uma função 'exec_sql' no banco.
  
  console.log('⚠️  ATENÇÃO:');
  console.log('   O cliente Supabase-JS não permite executar comandos "CREATE TABLE" diretamente.');
  console.log('   Para rodar migrações, precisamos da Connection String (postgres://...) ou usar o Dashboard.');
  console.log('');
  console.log('   Verificando se existe alguma função RPC de auxílio...');
  
  const { error } = await supabase.rpc('version'); // Tenta chamar qualquer coisa pra ver a conexão
  
  if (error && error.code !== 'PGRST202') { // PGRST202 = função não encontrada (o que é bom, significa que conectou)
     console.error('❌ Erro de conexão:', error.message);
  } else {
     console.log('✅ Conexão com Supabase estabelecida (mas permissões limitadas via HTTP).');
  }

  console.log('');
  console.log('📝 POR FAVOR, EXECUTE MANUALMENTE:');
  console.log('1. Copie o conteúdo de: supabase/migrations/20240201000000_create_orders_schema.sql');
  console.log('2. Vá em: https://supabase.com/dashboard/project/ygkzfhiiteathffsgwhy/sql');
  console.log('3. Cole e clique em RUN');
};

runMigration();
