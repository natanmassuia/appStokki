import { useBulkOperation } from '@/contexts/BulkOperationContext';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Loader2, X, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

const getTypeLabel = (entityType: string | null, operationType: string | null) => {
  if (operationType === 'delete') {
    switch (entityType) {
      case 'products':
        return 'Exclusão de Produtos';
      case 'expenses':
        return 'Exclusão de Gastos';
      case 'customers':
        return 'Exclusão de Clientes';
      case 'categories':
        return 'Exclusão de Categorias';
      case 'transactions':
        return 'Exclusão de Transações';
      default:
        return 'Exclusão em Massa';
    }
  }
  return 'Operação em Massa';
};

export function BulkOperationModal() {
  const {
    isModalOpen,
    isProcessing,
    operationType,
    entityType,
    progress,
    total,
    currentItem,
    items,
    logs,
    operationStatus,
    toggleModal,
    stopOperation,
  } = useBulkOperation();

  const progressPercentage = total > 0 ? (progress / total) * 100 : 0;
  const successCount = items.filter(i => i.status === 'success').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const pendingCount = items.filter(i => i.status === 'pending').length;
  const processingCount = items.filter(i => i.status === 'processing').length;

  return (
    <Dialog open={isModalOpen} onOpenChange={toggleModal}>
      <DialogContent className="glass-card max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{getTypeLabel(entityType, operationType)}</DialogTitle>
          <DialogDescription>
            {(() => {
              // Se está processando, mostra progresso
              if (isProcessing) {
                return `Processando ${progress} de ${total} itens...`;
              }
              
              // Se todos os itens foram processados (success + error = total)
              const processedCount = successCount + errorCount;
              const allProcessed = processedCount === total && total > 0;
              
              // Se foi concluída ou todos foram processados
              if (operationStatus === 'completed' || allProcessed) {
                return `Operação concluída: ${successCount} sucesso, ${errorCount} erros`;
              }
              
              // Se foi interrompida (status error mas não processou tudo)
              if (operationStatus === 'error' && !allProcessed && progress < total) {
                return 'Operação interrompida';
              }
              
              // Caso padrão: se processou tudo, considera concluída
              if (allProcessed) {
                return `Operação concluída: ${successCount} sucesso, ${errorCount} erros`;
              }
              
              // Se não processou nada ainda
              if (progress === 0 && total === 0) {
                return 'Aguardando início da operação...';
              }
              
              // Caso de erro ou interrupção
              return 'Operação interrompida';
            })()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 min-h-0 flex flex-col">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Progresso: {progress}/{total}
              </span>
              <span className="text-muted-foreground">
                {currentItem && `Processando: ${currentItem}`}
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>✅ {successCount} sucesso</span>
              <span>❌ {errorCount} erros</span>
              <span>⏳ {pendingCount + processingCount} pendente</span>
            </div>
          </div>

          {/* Items List */}
          <ScrollArea className="flex-1 min-h-0 border rounded-lg p-4">
            <div className="space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg text-sm",
                    item.status === 'processing' && "bg-primary/10 border border-primary/20",
                    item.status === 'success' && "bg-green-500/10 border border-green-500/20",
                    item.status === 'error' && "bg-destructive/10 border border-destructive/20",
                    item.status === 'pending' && "bg-secondary/50"
                  )}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {item.status === 'processing' && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                    )}
                    {item.status === 'success' && (
                      <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    )}
                    {item.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    )}
                    {item.status === 'pending' && (
                      <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                    )}
                    <span className="truncate">{item.name}</span>
                  </div>
                  <Badge
                    variant={
                      item.status === 'success'
                        ? 'default'
                        : item.status === 'error'
                        ? 'destructive'
                        : item.status === 'processing'
                        ? 'secondary'
                        : 'outline'
                    }
                    className="shrink-0"
                  >
                    {item.status === 'processing' && 'Processando'}
                    {item.status === 'success' && 'Sucesso'}
                    {item.status === 'error' && 'Erro'}
                    {item.status === 'pending' && 'Pendente'}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Logs */}
          {logs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Logs</h4>
              <ScrollArea className="h-32 border rounded-lg p-2">
                <div className="space-y-1">
                  {logs.map((log, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "text-xs flex items-center gap-2",
                        log.status === 'error' && "text-destructive"
                      )}
                    >
                      <span className="text-muted-foreground">{log.timestamp}</span>
                      <span>{log.itemName}:</span>
                      <span>{log.message}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            {isProcessing && (
              <Button
                variant="destructive"
                size="sm"
                onClick={stopOperation}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Parar
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={toggleModal}>
              <X className="h-4 w-4 mr-2" />
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
