import { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';
import { sendText } from '@/services/whatsappService';
import { formatPhoneForWhatsapp } from '@/utils/phoneFormatter';
import { useStoreSettings } from '@/hooks/useStoreSettings';

// Helper: Sleep function
const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Helper: Random delay between min and max (in milliseconds)
const getRandomDelay = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

type SendingStatus = 'idle' | 'sending' | 'paused' | 'completed' | 'stopped';
type ClientSendingStatus = 'pending' | 'sending' | 'sent' | 'error';

interface ClientWithStatus {
  id: string;
  name: string;
  phone: string;
  status: ClientSendingStatus;
  error?: string;
}

interface CampaignLog {
  timestamp: string;
  clientName: string;
  status: 'success' | 'error';
  message: string;
}

interface CampaignContextType {
  // State
  isSending: boolean;
  progress: number;
  total: number;
  currentClientName: string;
  queue: ClientWithStatus[];
  logs: CampaignLog[];
  isModalOpen: boolean;
  sendingStatus: SendingStatus;
  
  // Actions
  startCampaign: (clients: Array<{ id: string; name: string; phone: string }>, messageTemplate: string) => Promise<void>;
  pauseCampaign: () => void;
  resumeCampaign: () => void;
  stopCampaign: () => void;
  toggleModal: () => void;
  dismissStatus: () => void;
}

const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const { settings: storeSettings } = useStoreSettings();
  
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentClientName, setCurrentClientName] = useState('');
  const [queue, setQueue] = useState<ClientWithStatus[]>([]);
  const [logs, setLogs] = useState<CampaignLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sendingStatus, setSendingStatus] = useState<SendingStatus>('idle');

  // Refs para controlar o loop mesmo durante navegação
  const sendingRef = useRef(false);
  const pausedRef = useRef(false);
  const stopRef = useRef(false);
  const messageTemplateRef = useRef('');
  const queueRef = useRef<ClientWithStatus[]>([]);

  const addLog = useCallback((clientName: string, status: 'success' | 'error', message: string) => {
    const log: CampaignLog = {
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      clientName,
      status,
      message,
    };
    setLogs(prev => [...prev, log]);
  }, []);

  const updateClientStatus = useCallback((clientId: string, status: ClientSendingStatus, error?: string) => {
    setQueue(prev => {
      const updated = prev.map(c => 
        c.id === clientId ? { ...c, status, error } : c
      );
      queueRef.current = updated; // Atualiza ref também
      return updated;
    });
  }, []);

  const processSendingQueue = useCallback(async () => {
    if (!storeSettings?.whatsapp_instance_name) {
      addLog('Sistema', 'error', 'WhatsApp não conectado');
      setSendingStatus('stopped');
      setIsSending(false);
      sendingRef.current = false;
      return;
    }

    // Usa a queue do ref (sempre atualizada)
    const clientsToSend = [...queueRef.current];
    let sentCount = 0;
    let errorCount = 0;

    for (let i = 0; i < clientsToSend.length; i++) {
      // Verifica se foi parado
      if (stopRef.current) {
        setSendingStatus('stopped');
        setIsSending(false);
        sendingRef.current = false;
        addLog('Sistema', 'error', 'Envio interrompido pelo usuário');
        return;
      }

      // Verifica se foi pausado
      if (pausedRef.current) {
        setSendingStatus('paused');
        // Aguarda até ser retomado
        while (pausedRef.current && !stopRef.current) {
          await sleep(500);
        }
        if (stopRef.current) {
          setSendingStatus('stopped');
          setIsSending(false);
          sendingRef.current = false;
          return;
        }
        setSendingStatus('sending');
      }

      const client = clientsToSend[i];
      setCurrentClientName(client.name);
      setProgress(i + 1);

      // Atualiza status para "sending"
      updateClientStatus(client.id, 'sending');

      try {
        // Formata telefone
        const formattedPhone = formatPhoneForWhatsapp(client.phone);
        if (!formattedPhone) {
          throw new Error('Telefone inválido');
        }

        // Substitui {nome} na mensagem
        const personalizedMessage = messageTemplateRef.current.replace(/{nome}/g, client.name);

        // Envia mensagem
        await sendText(
          storeSettings.whatsapp_instance_name,
          formattedPhone,
          personalizedMessage
        );

        // Marca como enviado
        updateClientStatus(client.id, 'sent');
        sentCount++;
        addLog(client.name, 'success', 'Mensagem enviada com sucesso');

      } catch (error: any) {
        // Erro ao enviar para cliente - já registrado nos logs
        const errorMessage = error.message || 'Erro ao enviar';
        updateClientStatus(client.id, 'error', errorMessage);
        errorCount++;
        addLog(client.name, 'error', errorMessage);
      }

      // Delay aleatório entre 15s e 40s (exceto no último item)
      if (i < clientsToSend.length - 1 && !stopRef.current) {
        const delay = getRandomDelay(15000, 40000);
        
        // Aguarda com verificação periódica de pausa/stop
        const startTime = Date.now();
        while (Date.now() - startTime < delay) {
          if (stopRef.current) {
            setSendingStatus('stopped');
            setIsSending(false);
            sendingRef.current = false;
            return;
          }
          if (pausedRef.current) {
            setSendingStatus('paused');
            while (pausedRef.current && !stopRef.current) {
              await sleep(500);
            }
            if (stopRef.current) {
              setSendingStatus('stopped');
              setIsSending(false);
              sendingRef.current = false;
              return;
            }
            setSendingStatus('sending');
          }
          await sleep(1000);
        }
      }
    }

    // Finaliza
    setSendingStatus('completed');
    setIsSending(false);
    sendingRef.current = false;
    setCurrentClientName('');
    
    addLog('Sistema', 'success', `Campanha concluída: ${sentCount} enviadas, ${errorCount} erros`);
  }, [storeSettings, addLog, updateClientStatus]);

  const startCampaign = useCallback(async (
    clients: Array<{ id: string; name: string; phone: string }>,
    messageTemplate: string
  ) => {
    if (!storeSettings?.whatsapp_instance_name) {
      throw new Error('WhatsApp não conectado');
    }

    // Valida clientes com telefone
    const validClients = clients.filter(c => c.phone && c.phone.trim() !== '');
    if (validClients.length === 0) {
      throw new Error('Nenhum cliente com telefone válido selecionado');
    }

    // Inicializa estado
    const clientsWithStatus: ClientWithStatus[] = validClients.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      status: 'pending',
    }));

    setQueue(clientsWithStatus);
    queueRef.current = clientsWithStatus; // Atualiza ref também
    setProgress(0);
    setTotal(validClients.length);
    setCurrentClientName('');
    setLogs([]);
    messageTemplateRef.current = messageTemplate;

    // Reseta flags
    sendingRef.current = true;
    pausedRef.current = false;
    stopRef.current = false;

    setSendingStatus('sending');
    setIsSending(true);

    // Inicia o processo (não await - roda em background)
    processSendingQueue().catch(error => {
      // Erro no processo de envio - já tratado no toast
      setSendingStatus('stopped');
      setIsSending(false);
      sendingRef.current = false;
      addLog('Sistema', 'error', `Erro fatal: ${error.message}`);
    });
  }, [storeSettings, processSendingQueue, addLog]);

  const pauseCampaign = useCallback(() => {
    if (sendingStatus === 'sending') {
      pausedRef.current = true;
      setSendingStatus('paused');
    }
  }, [sendingStatus]);

  const resumeCampaign = useCallback(() => {
    if (sendingStatus === 'paused') {
      pausedRef.current = false;
      setSendingStatus('sending');
    }
  }, [sendingStatus]);

  const stopCampaign = useCallback(() => {
    stopRef.current = true;
    pausedRef.current = false;
    setSendingStatus('stopped');
    setIsSending(false);
    sendingRef.current = false;
    addLog('Sistema', 'error', 'Envio interrompido pelo usuário');
  }, [addLog]);

  const toggleModal = useCallback(() => {
    setIsModalOpen(prev => !prev);
  }, []);

  const dismissStatus = useCallback(() => {
    // Apenas uma função vazia - o controle de dismissed fica no componente
    // Isso permite que o componente controle quando esconder o widget
  }, []);

  const value: CampaignContextType = {
    isSending,
    progress,
    total,
    currentClientName,
    queue,
    logs,
    isModalOpen,
    sendingStatus,
    startCampaign,
    pauseCampaign,
    resumeCampaign,
    stopCampaign,
    toggleModal,
    dismissStatus,
  };

  return (
    <CampaignContext.Provider value={value}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaign() {
  const context = useContext(CampaignContext);
  if (context === undefined) {
    throw new Error('useCampaign must be used within a CampaignProvider');
  }
  return context;
}
