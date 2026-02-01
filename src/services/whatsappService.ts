/**
 * Serviço para comunicação com Evolution API
 */

const EVOLUTION_API_URL = import.meta.env.VITE_EVOLUTION_API_URL || 'http://localhost:8081';
const EVOLUTION_API_KEY = import.meta.env.VITE_EVOLUTION_API_KEY || '';

// Configuração da Evolution API

export interface CreateInstanceResponse {
  instance: {
    instanceName: string;
    status: string;
  };
  qrcode?: {
    code: string; // Base64 QR Code
    base64: string;
  };
}

export type CreateInstanceResult = CreateInstanceResponse | null;

export interface ConnectionState {
  instance: {
    instanceName: string;
    state: 'open' | 'close' | 'connecting';
    status: 'connected' | 'disconnected' | 'connecting';
  };
}

export interface InstanceInfo {
  instanceName: string;
  phone?: {
    phoneNumber: string;
    jid: string;
  };
}

/**
 * Cria uma nova instância do WhatsApp
 * Retorna null se a instância já existe
 */
export async function createInstance(instanceName: string): Promise<CreateInstanceResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // Adiciona autenticação (Evolution API pode usar apikey ou Authorization)
  if (EVOLUTION_API_KEY) {
    // Tenta diferentes formatos de autenticação
    headers['apikey'] = EVOLUTION_API_KEY;
    headers['Authorization'] = `Bearer ${EVOLUTION_API_KEY}`;
    // Algumas versões usam apenas o valor direto
    headers['x-api-key'] = EVOLUTION_API_KEY;
  }

  // Body conforme documentação da Evolution API v2
  const requestBody = {
    instanceName,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS', // Obrigatório na v2
  };

  const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    
    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      error = { message: errorText || 'Erro desconhecido' };
    }
    
    // Se a instância já existe (403 ou mensagem específica), não é um erro crítico
    if (response.status === 403 && (
      errorText.includes('already in use') || 
      errorText.includes('already exists') ||
      error.message?.includes('already in use') ||
      error.message?.includes('already exists')
    )) {
      // Retorna null para indicar que a instância já existe
      return null;
    }
    
    // Humaniza mensagens de erro
    let errorMessage = 'Não foi possível criar a conexão. Tente novamente.';
    if (response.status === 404) {
      errorMessage = 'Serviço de WhatsApp não encontrado. Verifique a configuração.';
    } else if (response.status === 401 || response.status === 403) {
      errorMessage = 'Não autorizado. Verifique as credenciais de acesso.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }

  const data = await response.json();
  return data;
}

/**
 * Conecta uma instância e retorna o QR Code
 */
export async function connectInstance(instanceName: string): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (EVOLUTION_API_KEY) {
    headers['apikey'] = EVOLUTION_API_KEY;
    headers['Authorization'] = `Bearer ${EVOLUTION_API_KEY}`;
  }

  const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error(error.message || `Erro ao conectar instância: ${response.statusText}`);
  }

  const data = await response.json();
  // A Evolution API pode retornar o QR Code em diferentes formatos
  // Tenta vários caminhos possíveis na resposta
  let qrCode = '';
  
  if (typeof data === 'string') {
    qrCode = data;
  } else {
    qrCode = data.base64 || data.qrcode?.base64 || data.qrcode?.code || data.code || '';
  }
  
  // Remove prefixo duplicado se existir
  if (qrCode.startsWith('data:image/png;base64,data:image/png;base64,')) {
    qrCode = qrCode.replace('data:image/png;base64,data:image/png;base64,', 'data:image/png;base64,');
  } else if (qrCode.startsWith('data:image/png;base64,')) {
    // Já tem o prefixo, retorna como está
    return qrCode;
  } else if (qrCode) {
    // Não tem prefixo, adiciona
    qrCode = `data:image/png;base64,${qrCode}`;
  }
  
  return qrCode;
}

/**
 * Busca o status de conexão de uma instância
 * Retorna null se a instância não existe (404) - caso esperado
 */
export async function fetchStatus(instanceName: string): Promise<ConnectionState | null> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (EVOLUTION_API_KEY) {
    headers['apikey'] = EVOLUTION_API_KEY;
    headers['Authorization'] = `Bearer ${EVOLUTION_API_KEY}`;
  }

  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      // Se 404, a instância não existe - retorna null (caso esperado, não é erro)
      // Isso é normal quando você está criando uma nova instância
      // O navegador ainda loga o 404 no console, mas isso é esperado e não afeta o funcionamento
      if (response.status === 404) {
        return null;
      }
      // Para outros erros (não 404), lança exceção
      const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
      throw new Error('Não foi possível verificar o status da conexão. Tente novamente.');
    }

    const data = await response.json();
    // Normaliza a resposta para o formato esperado
    if (data.instance) {
      return data;
    }
    // Se a resposta vem em formato diferente, tenta adaptar
    return {
      instance: {
        instanceName,
        state: data.state || data.status || 'close',
        status: data.status || (data.state === 'open' ? 'connected' : 'disconnected'),
      },
    };
  } catch (error: any) {
    // Se for erro de rede (servidor não disponível), retorna null silenciosamente
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      return null;
    }
    // Outros erros são propagados
    throw error;
  }
}

/**
 * Desconecta (logout) uma instância (mantém a instância, apenas desconecta)
 */
export async function logoutInstance(instanceName: string): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (EVOLUTION_API_KEY) {
    headers['apikey'] = EVOLUTION_API_KEY;
    headers['Authorization'] = `Bearer ${EVOLUTION_API_KEY}`;
  }

  const response = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error('Não foi possível desconectar. Tente novamente.');
  }
}

/**
 * Deleta completamente uma instância (remove da Evolution API)
 * Use isso quando quiser resetar completamente e garantir que uma nova instância seja criada
 */
export async function deleteInstance(instanceName: string): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (EVOLUTION_API_KEY) {
    headers['apikey'] = EVOLUTION_API_KEY;
    headers['Authorization'] = `Bearer ${EVOLUTION_API_KEY}`;
    headers['x-api-key'] = EVOLUTION_API_KEY;
  }

  const response = await fetch(`${EVOLUTION_API_URL}/instance/delete/${instanceName}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    // Se 404, a instância já não existe (não é erro crítico)
    if (response.status === 404) {
      return;
    }
    
    const errorText = await response.text();
    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      error = { message: errorText || 'Erro desconhecido' };
    }
    
    const errorMessage = error.message || 'Não foi possível desconectar. Tente novamente.';
    throw new Error(errorMessage);
  }
}

/**
 * Reinicia uma instância do WhatsApp
 */
export async function restartInstance(instanceName: string): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (EVOLUTION_API_KEY) {
    headers['apikey'] = EVOLUTION_API_KEY;
    headers['Authorization'] = `Bearer ${EVOLUTION_API_KEY}`;
    headers['x-api-key'] = EVOLUTION_API_KEY;
  }

  const response = await fetch(`${EVOLUTION_API_URL}/instance/restart/${instanceName}`, {
    method: 'PUT',
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      error = { message: errorText || 'Erro desconhecido' };
    }
    
    throw new Error(error.message || 'Não foi possível reiniciar a instância.');
  }
}

/**
 * Busca informações da instância (incluindo número de telefone)
 */
export async function fetchInstanceInfo(instanceName: string): Promise<InstanceInfo> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (EVOLUTION_API_KEY) {
    headers['apikey'] = EVOLUTION_API_KEY;
    headers['Authorization'] = `Bearer ${EVOLUTION_API_KEY}`;
  }

  const response = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
    throw new Error('Não foi possível buscar informações da conexão. Tente novamente.');
  }

  const data = await response.json();
  
  // A Evolution API pode retornar um array ou um objeto único
  let instance = null;
  
  if (Array.isArray(data)) {
    // Procura a instância no array
    const found = data.find((inst: any) => {
      // Pode vir em diferentes formatos
      if (inst?.instance?.instanceName === instanceName) return true;
      if (inst?.instanceName === instanceName) return true;
      if (inst?.instanceName === instanceName) return true;
      return false;
    });
    instance = found;
  } else if (data?.instance) {
    // Se é um objeto único com a propriedade instance
    instance = data;
  } else if (data?.instanceName === instanceName) {
    // Se é um objeto direto com instanceName
    instance = data;
  }

  // Retorna as informações da instância ou um objeto básico
  if (instance?.instance) {
    return instance.instance;
  } else if (instance) {
    return {
      instanceName: instance.instanceName || instanceName,
      phone: instance.phone,
    };
  }
  
  // Se não encontrou, retorna apenas o nome da instância
  return { instanceName };
}

/**
 * Envia uma mensagem de texto via WhatsApp
 * @param instanceName Nome da instância do WhatsApp
 * @param remoteJid Número de telefone do destinatário (formato: 5511999999999)
 * @param text Texto da mensagem
 */
export async function sendText(instanceName: string, remoteJid: string, text: string): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (EVOLUTION_API_KEY) {
    headers['apikey'] = EVOLUTION_API_KEY;
    headers['Authorization'] = `Bearer ${EVOLUTION_API_KEY}`;
    headers['x-api-key'] = EVOLUTION_API_KEY;
  }

  const requestBody = {
    number: remoteJid, // Número formatado (ex: 5511999999999)
    text: text,
  };

  const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    
    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      error = { message: errorText || 'Erro desconhecido' };
    }
    
    // Humaniza mensagens de erro
    let errorMessage = 'Não foi possível enviar a mensagem. Tente novamente.';
    if (response.status === 404) {
      errorMessage = 'Conexão perdida. Por favor, conecte novamente.';
    } else if (response.status === 401 || response.status === 403) {
      errorMessage = 'Não autorizado. Verifique a conexão do WhatsApp.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
}

/**
 * Envia uma mídia (imagem) via WhatsApp
 * @param instanceName Nome da instância do WhatsApp
 * @param remoteJid Número de telefone do destinatário (formato: 5511999999999)
 * @param base64Image Base64 da imagem (sem o prefixo data:image/png;base64,)
 * @param caption Legenda opcional da imagem
 */
export async function sendMedia(instanceName: string, remoteJid: string, base64Image: string, caption?: string): Promise<void> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (EVOLUTION_API_KEY) {
    headers['apikey'] = EVOLUTION_API_KEY;
    headers['Authorization'] = `Bearer ${EVOLUTION_API_KEY}`;
    headers['x-api-key'] = EVOLUTION_API_KEY;
  }

  // Remove o prefixo data:image/png;base64, se existir
  let cleanBase64 = base64Image;
  if (cleanBase64.includes(',')) {
    cleanBase64 = cleanBase64.split(',')[1];
  }

  const requestBody = {
    number: remoteJid,
    mediatype: 'image',
    mimetype: 'image/png',
    caption: caption || '',
    media: cleanBase64, // Base64 puro, sem prefixo
  };

  const response = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    
    let error;
    try {
      error = JSON.parse(errorText);
    } catch {
      error = { message: errorText || 'Erro desconhecido' };
    }
    
    // Humaniza mensagens de erro
    let errorMessage = 'Não foi possível enviar a imagem. Tente novamente.';
    if (response.status === 404) {
      errorMessage = 'Conexão perdida. Por favor, conecte novamente.';
    } else if (response.status === 401 || response.status === 403) {
      errorMessage = 'Não autorizado. Verifique a conexão do WhatsApp.';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    throw new Error(errorMessage);
  }
}

export interface WhatsAppContact {
  id?: string;
  remoteJid?: string;
  pushName?: string;
  name?: string;
  formattedName?: string;
  profilePictureUrl?: string;
  isGroup?: boolean;
}

/**
 * Busca contatos do WhatsApp via Evolution API
 * @param instanceName Nome da instância do WhatsApp
 * @returns Array de contatos do WhatsApp
 */
/**
 * Faz uma única requisição para buscar contatos (uso interno)
 */
async function fetchContactsOnce(instanceName: string): Promise<WhatsAppContact[]> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (EVOLUTION_API_KEY) {
    headers['apikey'] = EVOLUTION_API_KEY;
    headers['Authorization'] = `Bearer ${EVOLUTION_API_KEY}`;
    headers['x-api-key'] = EVOLUTION_API_KEY;
  }

  // Tenta diferentes endpoints da Evolution API
  // Prioriza /contact/findContacts pois busca na agenda de contatos (melhor para obter o nome salvo)
  const endpoints = [
    { url: `${EVOLUTION_API_URL}/contact/findContacts/${instanceName}`, method: 'POST' },
    { url: `${EVOLUTION_API_URL}/chat/findContacts/${instanceName}`, method: 'POST' },
    { url: `${EVOLUTION_API_URL}/contact/fetchContacts/${instanceName}`, method: 'GET' },
  ];

  let response: Response | null = null;

  // Adiciona timestamp para evitar cache do navegador
  const cacheBuster = `?_t=${Date.now()}`;

  for (const endpoint of endpoints) {
    try {
      const requestBody = endpoint.method === 'POST' ? {
        where: {
          isGroup: false,
        },
      } : undefined;

      const url = endpoint.method === 'GET' 
        ? `${endpoint.url}${cacheBuster}`
        : endpoint.url;

      response = await fetch(url, {
        method: endpoint.method,
        headers: {
          ...headers,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
        body: requestBody ? JSON.stringify(requestBody) : undefined,
      });

      if (response.ok) {
        break;
      }

      if (response.status === 404) {
        continue;
      }

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Status ${response.status}: ${errorText}`);
      }
    } catch (error: any) {
      continue;
    }
  }

  if (!response || !response.ok) {
    throw new Error('Não foi possível buscar contatos. Verifique se a Evolution API está configurada corretamente.');
  }

  const data = await response.json();

  // A Evolution API pode retornar um array diretamente ou dentro de uma propriedade
  let contacts: WhatsAppContact[] = [];
  
  if (Array.isArray(data)) {
    contacts = data;
  } else if (data?.contacts && Array.isArray(data.contacts)) {
    contacts = data.contacts;
  } else if (data?.data && Array.isArray(data.data)) {
    contacts = data.data;
  } else {
    contacts = [];
  }

  // Filtra grupos caso a API não tenha filtrado (segurança extra)
  contacts = contacts.filter(contact => !contact.isGroup);

  return contacts;
}

/**
 * Busca contatos do WhatsApp via Evolution API com retry automático
 * Se poucos contatos forem encontrados, tenta novamente (sync delay)
 * @param instanceName Nome da instância do WhatsApp
 * @param onProgress Callback opcional para informar progresso do retry
 * @returns Array de contatos do WhatsApp
 */
export async function fetchContacts(
  instanceName: string, 
  onProgress?: (attempt: number, maxAttempts: number) => void
): Promise<WhatsAppContact[]> {
  console.log('[WhatsApp API] fetchContacts called for instance:', instanceName);
  
  const MIN_CONTACTS_THRESHOLD = 10; // Se tiver menos que isso, provavelmente está sincronizando
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 2500; // 2.5 segundos entre tentativas
  
  let contacts: WhatsAppContact[] = [];
  let attempt = 0;
  
  while (attempt < MAX_RETRIES) {
    attempt++;
    console.log(`[WhatsApp API] Attempt ${attempt}/${MAX_RETRIES}`);
    
    // Notifica progresso se callback fornecido
    if (onProgress) {
      onProgress(attempt, MAX_RETRIES);
    }
    
    try {
      contacts = await fetchContactsOnce(instanceName);
      console.log(`[WhatsApp API] Got ${contacts.length} contacts on attempt ${attempt}`);
      
      // Se temos um número razoável de contatos, retorna imediatamente
      if (contacts.length >= MIN_CONTACTS_THRESHOLD) {
        console.log('[WhatsApp API] Sufficient contacts found, returning');
        return contacts;
      }
      
      // Se é a última tentativa, retorna o que temos
      if (attempt >= MAX_RETRIES) {
        console.log('[WhatsApp API] Max retries reached, returning what we have');
        return contacts;
      }
      
      // Poucos contatos - provavelmente ainda sincronizando, aguarda e tenta novamente
      console.log(`[WhatsApp API] Only ${contacts.length} contacts, waiting ${RETRY_DELAY_MS}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      
    } catch (error: any) {
      console.error(`[WhatsApp API] Error on attempt ${attempt}:`, error.message);
      
      // Se é a última tentativa, propaga o erro
      if (attempt >= MAX_RETRIES) {
        throw error;
      }
      
      // Aguarda antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
  
  return contacts;
}
