import { useImport } from '@/contexts/ImportContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Package, Receipt, Users, AlertTriangle, Square, CheckCircle2, XCircle, Loader2, Upload } from 'lucide-react';
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
      return Package;
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

export function ImportModal() {
  const {
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
    pauseImport,
    resumeImport,
    stopImport,
    toggleModal,
  } = useImport();

  const progressPercent = total > 0 ? (progress / total) * 100 : 0;
  const successCount = items.filter(i => i.status === 'success').length;
  const errorCount = items.filter(i => i.status === 'error').length;
  const Icon = getIcon(importType);

  return (
    <Dialog open={isModalOpen} onOpenChange={toggleModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            Importação em Segundo Plano - {getTypeLabel(importType)}
          </DialogTitle>
          <DialogDescription>
            A importação está sendo processada em segundo plano. Você pode navegar pela aplicação.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Error Message */}
          {errorMessage && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Progress */}
          {(importStatus === 'importing' || importStatus === 'completed' || importStatus === 'error') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {importStatus === 'importing' && 'Importando...'}
                  {importStatus === 'completed' && 'Concluído!'}
                  {importStatus === 'error' && 'Erro'}
                </span>
                <span className="font-medium">
                  {progress} de {total}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>✅ Importados: {successCount}</span>
                {errorCount > 0 && <span className="text-destructive">❌ Erros: {errorCount}</span>}
                {currentItem && importStatus === 'importing' && (
                  <span className="text-primary">📤 Atual: {currentItem}</span>
                )}
              </div>
            </div>
          )}

          {/* Items List with Status */}
          <ScrollArea className="flex-1 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                      Nenhum item na fila
                    </TableCell>
                  </TableRow>
                ) : (
                  items.map((item) => (
                    <TableRow 
                      key={item.id}
                      className={item.name === currentItem && importStatus === 'importing' ? 'bg-primary/10' : ''}
                    >
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="text-right">
                        {item.status === 'pending' && (
                          <span className="text-muted-foreground text-sm">Aguardando...</span>
                        )}
                        {item.status === 'processing' && (
                          <div className="flex items-center justify-end gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm">Processando...</span>
                          </div>
                        )}
                        {item.status === 'success' && (
                          <div className="flex items-center justify-end gap-2 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Importado</span>
                          </div>
                        )}
                        {item.status === 'error' && (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2 text-destructive">
                              <XCircle className="h-4 w-4" />
                              <span className="text-sm">Erro</span>
                            </div>
                            {item.error && (
                              <span className="text-xs text-muted-foreground">{item.error}</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>

          {/* Logs */}
          {logs.length > 0 && (
            <div className="border rounded-lg p-4 max-h-[150px] overflow-y-auto">
              <h4 className="text-sm font-semibold mb-2">Logs de Importação</h4>
              <div className="space-y-1">
                {logs.slice(-10).reverse().map((log, index) => (
                  <div 
                    key={index}
                    className={cn(
                      "text-xs flex items-center gap-2",
                      log.status === 'success' && "text-green-600 dark:text-green-400",
                      log.status === 'error' && "text-destructive"
                    )}
                  >
                    <span className="text-muted-foreground">{log.timestamp}</span>
                    <span className="font-medium">{log.itemName}:</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {importStatus === 'importing' && (
            <>
              <Button variant="outline" onClick={toggleModal} className="flex-1">
                Fechar
              </Button>
              <Button variant="destructive" onClick={stopImport} className="flex-1">
                <Square className="h-4 w-4 mr-2" />
                Parar
              </Button>
            </>
          )}
          {(importStatus === 'completed' || importStatus === 'error') && (
            <Button onClick={toggleModal} className="gradient-primary w-full">
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

