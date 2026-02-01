import { useCampaign } from '@/contexts/CampaignContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Megaphone, AlertTriangle, Play, Pause, Square, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CampaignModal() {
  const {
    isSending,
    progress,
    total,
    currentClientName,
    queue,
    logs,
    isModalOpen,
    sendingStatus,
    pauseCampaign,
    resumeCampaign,
    stopCampaign,
    toggleModal,
  } = useCampaign();

  const progressPercent = total > 0 ? (progress / total) * 100 : 0;
  const sentCount = queue.filter(c => c.status === 'sent').length;
  const errorCount = queue.filter(c => c.status === 'error').length;

  return (
    <Dialog open={isModalOpen} onOpenChange={toggleModal}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Disparo Seguro - Fila de Envio
          </DialogTitle>
          <DialogDescription>
            Sistema de envio com delays aleatórios para evitar bloqueios do WhatsApp
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Warning Box */}
          <Alert className="bg-yellow-500/10 border-yellow-500/30">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              <strong>Importante:</strong> Para evitar bloqueios, o sistema enviará uma mensagem a cada 15-40 segundos (aleatório). 
              Você pode navegar pela aplicação enquanto o envio acontece em segundo plano.
            </AlertDescription>
          </Alert>

          {/* Progress */}
          {(sendingStatus === 'sending' || sendingStatus === 'paused' || sendingStatus === 'completed' || sendingStatus === 'stopped') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>
                  {sendingStatus === 'sending' && 'Enviando...'}
                  {sendingStatus === 'paused' && 'Pausado'}
                  {sendingStatus === 'completed' && 'Concluído!'}
                  {sendingStatus === 'stopped' && 'Interrompido'}
                </span>
                <span className="font-medium">
                  {progress} de {total}
                </span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>✅ Enviados: {sentCount}</span>
                {errorCount > 0 && <span className="text-destructive">❌ Erros: {errorCount}</span>}
                {currentClientName && sendingStatus === 'sending' && (
                  <span className="text-primary">📤 Atual: {currentClientName}</span>
                )}
              </div>
            </div>
          )}

          {/* Clients List with Status */}
          <ScrollArea className="flex-1 border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      Nenhum cliente na fila
                    </TableCell>
                  </TableRow>
                ) : (
                  queue.map((client) => (
                    <TableRow 
                      key={client.id}
                      className={client.name === currentClientName && sendingStatus === 'sending' ? 'bg-primary/10' : ''}
                    >
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.phone}</TableCell>
                      <TableCell className="text-right">
                        {client.status === 'pending' && (
                          <span className="text-muted-foreground text-sm">Aguardando...</span>
                        )}
                        {client.status === 'sending' && (
                          <div className="flex items-center justify-end gap-2">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                            <span className="text-sm">Enviando...</span>
                          </div>
                        )}
                        {client.status === 'sent' && (
                          <div className="flex items-center justify-end gap-2 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Enviado</span>
                          </div>
                        )}
                        {client.status === 'error' && (
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2 text-destructive">
                              <XCircle className="h-4 w-4" />
                              <span className="text-sm">Erro</span>
                            </div>
                            {client.error && (
                              <span className="text-xs text-muted-foreground">{client.error}</span>
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
              <h4 className="text-sm font-semibold mb-2">Logs de Envio</h4>
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
                    <span className="font-medium">{log.clientName}:</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {sendingStatus === 'sending' && (
            <>
              <Button variant="outline" onClick={pauseCampaign} className="flex-1">
                <Pause className="h-4 w-4 mr-2" />
                Pausar
              </Button>
              <Button variant="destructive" onClick={stopCampaign} className="flex-1">
                <Square className="h-4 w-4 mr-2" />
                Parar
              </Button>
            </>
          )}
          {sendingStatus === 'paused' && (
            <>
              <Button variant="outline" onClick={toggleModal} className="flex-1">
                Fechar
              </Button>
              <Button onClick={resumeCampaign} className="gradient-primary flex-1">
                <Play className="h-4 w-4 mr-2" />
                Retomar
              </Button>
              <Button variant="destructive" onClick={stopCampaign} className="flex-1">
                <Square className="h-4 w-4 mr-2" />
                Parar
              </Button>
            </>
          )}
          {(sendingStatus === 'completed' || sendingStatus === 'stopped') && (
            <Button onClick={toggleModal} className="gradient-primary w-full">
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
