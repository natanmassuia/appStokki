import { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

type BulkOperationType = 'delete' | 'import' | 'export';
type BulkOperationStatus = 'idle' | 'processing' | 'completed' | 'error';

interface BulkOperationItem {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

interface BulkOperationLog {
  timestamp: string;
  itemName: string;
  status: 'success' | 'error';
  message: string;
}

interface BulkOperationContextType {
  // State
  isProcessing: boolean;
  operationType: BulkOperationType | null;
  entityType: string | null; // 'products', 'expenses', 'customers', 'categories', 'transactions'
  progress: number;
  total: number;
  currentItem: string;
  items: BulkOperationItem[];
  logs: BulkOperationLog[];
  isModalOpen: boolean;
  operationStatus: BulkOperationStatus;
  errorMessage: string | null;
  
  // Actions
  startOperation: (
    operationType: BulkOperationType,
    entityType: string,
    items: Array<{ id: string; name: string }>,
    operationFn: (item: any) => Promise<any>
  ) => Promise<void>;
  pauseOperation: () => void;
  resumeOperation: () => void;
  stopOperation: () => void;
  toggleModal: () => void;
  dismissStatus: () => void;
}

const BulkOperationContext = createContext<BulkOperationContextType | undefined>(undefined);

export function BulkOperationProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = useState(false);
  const [operationType, setOperationType] = useState<BulkOperationType | null>(null);
  const [entityType, setEntityType] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentItem, setCurrentItem] = useState('');
  const [items, setItems] = useState<BulkOperationItem[]>([]);
  const [logs, setLogs] = useState<BulkOperationLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [operationStatus, setOperationStatus] = useState<BulkOperationStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs para controlar o loop mesmo durante navegação
  const processingRef = useRef(false);
  const pausedRef = useRef(false);
  const stopRef = useRef(false);
  const operationFnRef = useRef<((item: any) => Promise<any>) | null>(null);
  const itemsRef = useRef<BulkOperationItem[]>([]);
  const operationTypeRef = useRef<BulkOperationType | null>(null);
  const entityTypeRef = useRef<string | null>(null);

  const addLog = useCallback((itemName: string, status: 'success' | 'error', message: string) => {
    const log: BulkOperationLog = {
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      itemName,
      status,
      message,
    };
    setLogs(prev => [...prev, log]);
  }, []);

  const updateItemStatus = useCallback((itemId: string, status: BulkOperationItem['status'], error?: string) => {
    setItems(prev => {
      const updated = prev.map(item => 
        item.id === itemId ? { ...item, status, error } : item
      );
      itemsRef.current = updated;
      return updated;
    });
  }, []);

  const processOperationQueue = useCallback(async () => {
    const itemsToProcess = [...itemsRef.current];
    let successCount = 0;
    let errorCount = 0;
    const currentOperationType = operationTypeRef.current;
    const currentEntityType = entityTypeRef.current;
    const matchEntity = (queryKey: unknown) =>
      Array.isArray(queryKey) && queryKey[0] === currentEntityType;

    for (let i = 0; i < itemsToProcess.length; i++) {
      // Verifica se foi parado
      if (stopRef.current) {
        setOperationStatus('error');
        setIsProcessing(false);
        processingRef.current = false;
        addLog('Sistema', 'error', 'Operação interrompida pelo usuário');
        return;
      }

      // Verifica se foi pausado
      if (pausedRef.current) {
        setOperationStatus('processing'); // Mantém como processing mas pausado
        // Aguarda até ser retomado
        while (pausedRef.current && !stopRef.current) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        if (stopRef.current) {
          setOperationStatus('error');
          setIsProcessing(false);
          processingRef.current = false;
          return;
        }
      }

      const item = itemsToProcess[i];
      setCurrentItem(item.name);
      setProgress(i + 1);

      // Atualiza status para "processing"
      updateItemStatus(item.id, 'processing');

      try {
        if (!operationFnRef.current) {
          throw new Error('Função de operação não definida');
        }

        // Chama a função de operação
        await operationFnRef.current(item);
        
        // Marca como sucesso
        updateItemStatus(item.id, 'success');
        successCount++;
        addLog(item.name, 'success', 'Processado com sucesso');

        // Atualiza cache em tempo real para exclusões
        if (currentOperationType === 'delete' && currentEntityType) {
          queryClient.setQueriesData(
            {
              predicate: (query) => matchEntity(query.queryKey),
            },
            (oldData: unknown) => {
              if (!Array.isArray(oldData)) return oldData;
              return oldData.filter((entry: { id?: string }) => entry?.id !== item.id);
            }
          );
        }

      } catch (error: any) {
        // Erro ao processar item - já registrado nos logs
        const errorMessage = error.message || 'Erro ao processar';
        updateItemStatus(item.id, 'error', errorMessage);
        errorCount++;
        addLog(item.name, 'error', errorMessage);
      }

      // Pequeno delay entre itens para não sobrecarregar (100ms)
      if (i < itemsToProcess.length - 1 && !stopRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Finaliza - marca como completed se processou todos os itens (mesmo com alguns erros)
    // Só marca como 'error' se TODOS os itens falharam OU foi interrompido
    const allFailed = errorCount === itemsToProcess.length && successCount === 0;
    const wasInterrupted = stopRef.current;
    
    if (wasInterrupted || allFailed) {
      setOperationStatus('error');
    } else {
      // Processou todos (mesmo com alguns erros) = concluída
      setOperationStatus('completed');
    }
    
    setIsProcessing(false);
    processingRef.current = false;
    setCurrentItem('');
    
    // Garante que o progresso está no máximo
    setProgress(itemsToProcess.length);
    
    // Invalida queries baseado no tipo de entidade
    if (currentEntityType) {
      const matchEntity = (queryKey: unknown) =>
        Array.isArray(queryKey) && queryKey[0] === currentEntityType;

      // Atualização otimista do cache para exclusões em massa
      if (currentOperationType === 'delete') {
        const deletedIds = new Set(itemsToProcess.map(item => item.id));
        queryClient.setQueriesData(
          {
            predicate: (query) => matchEntity(query.queryKey),
          },
          (oldData: unknown) => {
            if (!Array.isArray(oldData)) return oldData;
            return oldData.filter((item: { id?: string }) => !item?.id || !deletedIds.has(item.id));
          }
        );
      }

      queryClient.invalidateQueries({
        predicate: (query) => matchEntity(query.queryKey),
      });

      // Força refetch imediato para evitar necessidade de F5
      queryClient.refetchQueries({
        predicate: (query) => matchEntity(query.queryKey),
        type: 'active',
      });

      if (currentEntityType === 'expenses' || currentEntityType === 'transactions') {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        queryClient.refetchQueries({ queryKey: ['dashboard'], type: 'active' });
      }
      // Se deletar categorias, também invalida produtos (pois produtos têm category_id)
      if (currentEntityType === 'categories') {
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.refetchQueries({ queryKey: ['products'], type: 'active' });
      }
    }
    
    addLog('Sistema', 'success', `Operação concluída: ${successCount} processados, ${errorCount} erros`);
    
    // Fecha o modal automaticamente após 2 segundos quando concluído
    if (!wasInterrupted && !allFailed) {
      setTimeout(() => {
        setIsModalOpen(false);
      }, 2000);
    }
  }, [addLog, updateItemStatus, entityType, queryClient]);

  const startOperation = useCallback(async (
    opType: BulkOperationType,
    entType: string,
    itemsToProcess: Array<{ id: string; name: string }>,
    opFn: (item: any) => Promise<any>
  ) => {
    if (itemsToProcess.length === 0) {
      throw new Error('Nenhum item para processar');
    }

    // Inicializa estado
    const itemsWithStatus: BulkOperationItem[] = itemsToProcess.map(item => ({
      id: item.id,
      name: item.name,
      status: 'pending',
    }));

    // Inicializa estado ANTES de abrir o modal
    setItems(itemsWithStatus);
    itemsRef.current = itemsWithStatus;
    setProgress(0);
    setTotal(itemsToProcess.length);
    setCurrentItem('');
    setLogs([]);
    setErrorMessage(null);
    setOperationType(opType);
    setEntityType(entType);
    operationTypeRef.current = opType;
    entityTypeRef.current = entType;
    operationFnRef.current = opFn;

    // Reseta flags
    processingRef.current = true;
    pausedRef.current = false;
    stopRef.current = false;

    setOperationStatus('processing');
    setIsProcessing(true);
    
    // Abre o modal automaticamente quando a operação começa
    // Usa setTimeout para garantir que o estado foi atualizado primeiro
    setTimeout(() => {
      setIsModalOpen(true);
    }, 0);

    // Inicia o processo (não await - roda em background)
    processOperationQueue().catch(error => {
      // Erro no processo de operação
      setOperationStatus('error');
      setIsProcessing(false);
      processingRef.current = false;
      setErrorMessage(error.message);
      addLog('Sistema', 'error', `Erro fatal: ${error.message}`);
      
      // Garante que o progresso reflete o estado atual
      const processed = itemsRef.current.filter(i => i.status === 'success' || i.status === 'error').length;
      setProgress(processed);
    });
  }, [processOperationQueue, addLog]);

  const pauseOperation = useCallback(() => {
    if (operationStatus === 'processing') {
      pausedRef.current = true;
    }
  }, [operationStatus]);

  const resumeOperation = useCallback(() => {
    if (operationStatus === 'processing') {
      pausedRef.current = false;
    }
  }, [operationStatus]);

  const stopOperation = useCallback(() => {
    stopRef.current = true;
    pausedRef.current = false;
    setOperationStatus('error');
    setIsProcessing(false);
    processingRef.current = false;
    addLog('Sistema', 'error', 'Operação interrompida pelo usuário');
  }, [addLog]);

  const toggleModal = useCallback(() => {
    setIsModalOpen(prev => {
      // Se está fechando o modal e a operação já terminou, reseta o estado
      if (prev && (operationStatus === 'completed' || operationStatus === 'error')) {
        // Pequeno delay para permitir a animação de fechamento
        setTimeout(() => {
          setItems([]);
          itemsRef.current = [];
          setProgress(0);
          setTotal(0);
          setCurrentItem('');
          setLogs([]);
          setOperationType(null);
          setEntityType(null);
          setOperationStatus('idle');
          setErrorMessage(null);
        }, 300);
      }
      return !prev;
    });
  }, [operationStatus]);

  const dismissStatus = useCallback(() => {
    if (operationStatus === 'completed' || operationStatus === 'error') {
      // Fecha o modal primeiro
      setIsModalOpen(false);
      
      // Reseta tudo
      setItems([]);
      itemsRef.current = [];
      setProgress(0);
      setTotal(0);
      setCurrentItem('');
      setLogs([]);
      setOperationType(null);
      setEntityType(null);
      setOperationStatus('idle');
      setErrorMessage(null);
    }
  }, [operationStatus]);

  const value: BulkOperationContextType = {
    isProcessing,
    operationType,
    entityType,
    progress,
    total,
    currentItem,
    items,
    logs,
    isModalOpen,
    operationStatus,
    errorMessage,
    startOperation,
    pauseOperation,
    resumeOperation,
    stopOperation,
    toggleModal,
    dismissStatus,
  };

  return (
    <BulkOperationContext.Provider value={value}>
      {children}
    </BulkOperationContext.Provider>
  );
}

export function useBulkOperation() {
  const context = useContext(BulkOperationContext);
  if (context === undefined) {
    throw new Error('useBulkOperation must be used within a BulkOperationProvider');
  }
  return context;
}
