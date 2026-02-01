import { useState, useEffect } from 'react';
import { useBulkOperation } from '@/contexts/BulkOperationContext';
import { Button } from '@/components/ui/button';
import { Trash2, X, Loader2, Package, Receipt, Users, Tags, History } from 'lucide-react';
import { cn } from '@/lib/utils';

const getIcon = (entityType: string | null, operationType: string | null) => {
  if (operationType === 'delete') {
    return Trash2;
  }
  
  switch (entityType) {
    case 'products':
      return Package;
    case 'expenses':
      return Receipt;
    case 'customers':
      return Users;
    case 'categories':
      return Tags;
    case 'transactions':
      return History;
    default:
      return Trash2;
  }
};

const getTypeLabel = (entityType: string | null, operationType: string | null) => {
  if (operationType === 'delete') {
    switch (entityType) {
      case 'products':
        return 'Excluindo Produtos';
      case 'expenses':
        return 'Excluindo Gastos';
      case 'customers':
        return 'Excluindo Clientes';
      case 'categories':
        return 'Excluindo Categorias';
      case 'transactions':
        return 'Excluindo Transações';
      default:
        return 'Excluindo';
    }
  }
  return 'Processando';
};

export function BulkOperationFloatingStatus() {
  const { 
    isProcessing, 
    operationType,
    entityType,
    progress, 
    total, 
    currentItem,
    operationStatus,
    toggleModal,
    dismissStatus 
  } = useBulkOperation();

  const [isDismissed, setIsDismissed] = useState(false);

  // Reseta dismissed quando começa uma nova operação
  useEffect(() => {
    if (operationStatus === 'processing' && progress === 1) {
      setIsDismissed(false);
    }
  }, [operationStatus, progress]);

  // Auto-dismiss após 3 segundos quando concluído ou erro
  useEffect(() => {
    if ((operationStatus === 'completed' || operationStatus === 'error') && !isDismissed) {
      const timer = setTimeout(() => {
        setIsDismissed(true);
        dismissStatus();
      }, 3000); // 3 segundos

      return () => clearTimeout(timer);
    }
  }, [operationStatus, isDismissed, dismissStatus]);

  // Só mostra se está processando, ou completado/erro (até ser dispensado)
  const shouldShow = (isProcessing || progress > 0) && !isDismissed;

  if (!shouldShow) return null;

  const isActive = isProcessing && operationStatus === 'processing';
  const isCompleted = operationStatus === 'completed';
  const isError = operationStatus === 'error';
  const Icon = getIcon(entityType, operationType);

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
      <Button
        variant="ghost"
        size="sm"
        onClick={toggleModal}
        className={cn(
          "h-auto p-3 rounded-full gap-2",
          "hover:bg-secondary/50"
        )}
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
            {isActive && getTypeLabel(entityType, operationType)}
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
            aria-label="Fechar"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                setIsDismissed(true);
                dismissStatus();
              }
            }}
          >
            <X className="h-3 w-3" />
          </div>
        )}
      </Button>
    </div>
  );
}
