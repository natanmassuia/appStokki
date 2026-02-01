import { useState, useEffect } from 'react';
import { useImport } from '@/contexts/ImportContext';
import { Button } from '@/components/ui/button';
import { Upload, X, Loader2, Package, Receipt, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

const getIcon = (type: string | null) => {
  switch (type) {
    case 'products':
      return Package;
    case 'expenses':
      return Receipt;
    case 'customers':
      return Users;
    default:
      return Upload;
  }
};

const getTypeLabel = (type: string | null) => {
  switch (type) {
    case 'products':
      return 'Produtos';
    case 'expenses':
      return 'Gastos';
    case 'customers':
      return 'Clientes';
    default:
      return 'Importação';
  }
};

export function ImportFloatingStatus() {
  const { 
    isImporting, 
    importType,
    progress, 
    total, 
    currentItem,
    importStatus,
    toggleModal,
    dismissStatus 
  } = useImport();

  const [isDismissed, setIsDismissed] = useState(false);

  // Reseta dismissed quando começa uma nova importação
  useEffect(() => {
    if (importStatus === 'importing' && progress === 1) {
      setIsDismissed(false);
    }
  }, [importStatus, progress]);

  // Auto-dismiss after 3 seconds when completed
  useEffect(() => {
    if (importStatus === 'completed' || importStatus === 'error') {
      const timer = setTimeout(() => {
        setIsDismissed(true);
        dismissStatus();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [importStatus, dismissStatus]);

  // Só mostra se está importando, ou completado/erro (até ser dispensado)
  const shouldShow = (isImporting || progress > 0) && !isDismissed;

  if (!shouldShow) return null;

  const isActive = isImporting && importStatus === 'importing';
  const isCompleted = importStatus === 'completed';
  const isError = importStatus === 'error';
  const Icon = getIcon(importType);

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 transition-all duration-300",
        "bg-background border-2 rounded-full shadow-lg",
        isActive && "border-primary animate-pulse",
        isCompleted && "border-green-500",
        isError && "border-destructive"
      )}
    >
      <div
        className={cn(
          "h-auto p-3 rounded-full gap-2 flex items-center",
          "hover:bg-secondary/50 cursor-pointer",
          "bg-background"
        )}
        onClick={toggleModal}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            toggleModal();
          }
        }}
      >
        <div className="relative">
          {isActive ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          ) : (
            <Icon className={cn(
              "h-5 w-5",
              isCompleted && "text-green-500",
              isError && "text-destructive"
            )} />
          )}
        </div>
        <div className="flex flex-col items-start min-w-[100px]">
          <span className="text-xs font-medium">
            {isActive && `Importando ${getTypeLabel(importType)}...`}
            {isCompleted && 'Concluído!'}
            {isError && 'Erro'}
          </span>
          <span className="text-xs text-muted-foreground">
            {progress}/{total}
          </span>
          {currentItem && isActive && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
              {currentItem}
            </span>
          )}
        </div>
        {(isCompleted || isError) && (
          <div
            className="h-6 w-6 rounded-full hover:bg-destructive/10 flex items-center justify-center transition-colors cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setIsDismissed(true);
              dismissStatus();
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation();
                setIsDismissed(true);
                dismissStatus();
              }
            }}
            aria-label="Fechar"
          >
            <X className="h-3 w-3" />
          </div>
        )}
      </div>
    </div>
  );
}
