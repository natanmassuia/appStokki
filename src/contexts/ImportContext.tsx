import { createContext, useContext, useState, useRef, useCallback, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';

type ImportType = 'products' | 'expenses' | 'customers';
type ImportStatus = 'idle' | 'importing' | 'completed' | 'error';

interface ImportItem {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

interface ImportLog {
  timestamp: string;
  itemName: string;
  status: 'success' | 'error';
  message: string;
}

interface ImportContextType {
  // State
  isImporting: boolean;
  importType: ImportType | null;
  progress: number;
  total: number;
  currentItem: string;
  items: ImportItem[];
  logs: ImportLog[];
  isModalOpen: boolean;
  importStatus: ImportStatus;
  errorMessage: string | null;
  
  // Actions
  startImport: (
    type: ImportType,
    items: Array<{ id: string; name: string }>,
    importFn: (item: any) => Promise<any>
  ) => Promise<void>;
  pauseImport: () => void;
  resumeImport: () => void;
  stopImport: () => void;
  toggleModal: () => void;
  dismissStatus: () => void;
}

const ImportContext = createContext<ImportContextType | undefined>(undefined);

export function ImportProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [isImporting, setIsImporting] = useState(false);
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [currentItem, setCurrentItem] = useState('');
  const [items, setItems] = useState<ImportItem[]>([]);
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Refs para controlar o loop mesmo durante navegação
  const importingRef = useRef(false);
  const pausedRef = useRef(false);
  const stopRef = useRef(false);
  const importFnRef = useRef<((item: any) => Promise<any>) | null>(null);
  const itemsRef = useRef<ImportItem[]>([]);

  const addLog = useCallback((itemName: string, status: 'success' | 'error', message: string) => {
    const log: ImportLog = {
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      itemName,
      status,
      message,
    };
    setLogs(prev => [...prev, log]);
  }, []);

  const updateItemStatus = useCallback((itemId: string, status: ImportItem['status'], error?: string) => {
    setItems(prev => {
      const updated = prev.map(item => 
        item.id === itemId ? { ...item, status, error } : item
      );
      itemsRef.current = updated;
      return updated;
    });
  }, []);

  const processImportQueue = useCallback(async () => {
    const itemsToImport = [...itemsRef.current];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < itemsToImport.length; i++) {
      // Verifica se foi parado
      if (stopRef.current) {
        setImportStatus('error');
        setIsImporting(false);
        importingRef.current = false;
        addLog('Sistema', 'error', 'Importação interrompida pelo usuário');
        return;
      }

      // Verifica se foi pausado
      if (pausedRef.current) {
        setImportStatus('importing'); // Mantém como importing mas pausado
        // Aguarda até ser retomado
        while (pausedRef.current && !stopRef.current) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        if (stopRef.current) {
          setImportStatus('error');
          setIsImporting(false);
          importingRef.current = false;
          return;
        }
      }

      const item = itemsToImport[i];
      setCurrentItem(item.name);
      setProgress(i + 1);

      // Atualiza status para "processing"
      updateItemStatus(item.id, 'processing');

      try {
        if (!importFnRef.current) {
          throw new Error('Função de importação não definida');
        }

        // Chama a função de importação
        await importFnRef.current(item);
        
        // Marca como sucesso
        updateItemStatus(item.id, 'success');
        successCount++;
        addLog(item.name, 'success', 'Importado com sucesso');

      } catch (error: any) {
        // Erro ao importar item - já registrado nos logs
        const errorMessage = error.message || 'Erro ao importar';
        updateItemStatus(item.id, 'error', errorMessage);
        errorCount++;
        addLog(item.name, 'error', errorMessage);
      }

      // Pequeno delay entre itens para não sobrecarregar (100ms)
      if (i < itemsToImport.length - 1 && !stopRef.current) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Finaliza
    setImportStatus(errorCount === itemsToImport.length ? 'error' : 'completed');
    setIsImporting(false);
    importingRef.current = false;
    setCurrentItem('');
    
    // Invalida queries baseado no tipo de importação
    // Usa prefixo para invalidar todas as queries que começam com o tipo
    if (importType === 'products') {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } else if (importType === 'expenses') {
      // Invalida todas as queries de expenses (com ou sem store_id)
      // O React Query invalida automaticamente todas as queries que começam com ['expenses']
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      // Força refetch imediato para garantir atualização visual
      queryClient.refetchQueries({ queryKey: ['expenses'] });
    } else if (importType === 'customers') {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    }
    
    addLog('Sistema', 'success', `Importação concluída: ${successCount} importados, ${errorCount} erros`);
  }, [addLog, updateItemStatus, importType, queryClient]);

  const startImport = useCallback(async (
    type: ImportType,
    itemsToImport: Array<{ id: string; name: string }>,
    importFn: (item: any) => Promise<any>
  ) => {
    if (itemsToImport.length === 0) {
      throw new Error('Nenhum item para importar');
    }

    // Inicializa estado
    const itemsWithStatus: ImportItem[] = itemsToImport.map(item => ({
      id: item.id,
      name: item.name,
      status: 'pending',
    }));

    setItems(itemsWithStatus);
    itemsRef.current = itemsWithStatus;
    setProgress(0);
    setTotal(itemsToImport.length);
    setCurrentItem('');
    setLogs([]);
    setErrorMessage(null);
    setImportType(type);
    importFnRef.current = importFn;

    // Reseta flags
    importingRef.current = true;
    pausedRef.current = false;
    stopRef.current = false;

    setImportStatus('importing');
    setIsImporting(true);

    // Inicia o processo (não await - roda em background)
    processImportQueue().catch(error => {
      // Erro no processo de importação - já tratado no toast
      setImportStatus('error');
      setIsImporting(false);
      importingRef.current = false;
      setErrorMessage(error.message);
      addLog('Sistema', 'error', `Erro fatal: ${error.message}`);
    });
  }, [processImportQueue, addLog]);

  const pauseImport = useCallback(() => {
    if (importStatus === 'importing') {
      pausedRef.current = true;
    }
  }, [importStatus]);

  const resumeImport = useCallback(() => {
    if (importStatus === 'importing') {
      pausedRef.current = false;
    }
  }, [importStatus]);

  const stopImport = useCallback(() => {
    stopRef.current = true;
    pausedRef.current = false;
    setImportStatus('error');
    setIsImporting(false);
    importingRef.current = false;
    addLog('Sistema', 'error', 'Importação interrompida pelo usuário');
  }, [addLog]);

  const toggleModal = useCallback(() => {
    setIsModalOpen(prev => !prev);
  }, []);

  const dismissStatus = useCallback(() => {
    if (importStatus === 'completed' || importStatus === 'error') {
      // Reseta tudo
      setItems([]);
      itemsRef.current = [];
      setProgress(0);
      setTotal(0);
      setCurrentItem('');
      setLogs([]);
      setImportType(null);
      setImportStatus('idle');
      setErrorMessage(null);
    }
  }, [importStatus]);

  const value: ImportContextType = {
    isImporting,
    importType,
    progress,
    total,
    currentItem,
    items,
    logs,
    isModalOpen,
    importStatus,
    errorMessage,
    startImport,
    pauseImport,
    resumeImport,
    stopImport,
    toggleModal,
    dismissStatus,
  };

  return (
    <ImportContext.Provider value={value}>
      {children}
    </ImportContext.Provider>
  );
}

export function useImport() {
  const context = useContext(ImportContext);
  if (context === undefined) {
    throw new Error('useImport must be used within an ImportProvider');
  }
  return context;
}
