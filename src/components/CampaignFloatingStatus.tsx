import { useState, useEffect } from 'react';
import { useCampaign } from '@/contexts/CampaignContext';
import { Button } from '@/components/ui/button';
import { MessageCircle, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function CampaignFloatingStatus() {
  const { 
    isSending, 
    progress, 
    total, 
    currentClientName,
    sendingStatus,
    toggleModal,
    dismissStatus 
  } = useCampaign();

  // Só mostra se está enviando, pausado, ou completado (até ser dispensado)
  // Precisamos verificar se foi dispensado através de um estado separado
  const [isDismissed, setIsDismissed] = useState(false);
  
  useEffect(() => {
    // Reseta dismissed quando começa uma nova campanha
    if (sendingStatus === 'sending' && progress === 1) {
      setIsDismissed(false);
    }
  }, [sendingStatus, progress]);

  const shouldShow = (isSending || progress > 0) && !(sendingStatus === 'completed' && isDismissed) && !(sendingStatus === 'stopped' && isDismissed);

  if (!shouldShow) return null;

  const isActive = isSending && sendingStatus === 'sending';
  const isPaused = sendingStatus === 'paused';
  const isCompleted = sendingStatus === 'completed';
  const isStopped = sendingStatus === 'stopped';

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50 transition-all duration-300",
        "bg-background border-2 rounded-full shadow-lg",
        isActive && "border-primary animate-pulse",
        isPaused && "border-yellow-500",
        isCompleted && "border-green-500",
        isStopped && "border-destructive"
      )}
    >
      <div className="flex items-center gap-2 p-3 rounded-full">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleModal}
          className={cn(
            "h-auto p-0 rounded-full gap-2 flex-1",
            "hover:bg-secondary/50"
          )}
        >
          <div className="relative">
            {isActive ? (
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            ) : (
              <MessageCircle className={cn(
                "h-5 w-5",
                isCompleted && "text-green-500",
                isStopped && "text-destructive",
                isPaused && "text-yellow-500"
              )} />
            )}
          </div>
          <div className="flex flex-col items-start min-w-[100px]">
            <span className="text-xs font-medium">
              {isActive && 'Enviando...'}
              {isPaused && 'Pausado'}
              {isCompleted && 'Concluído!'}
              {isStopped && 'Interrompido'}
            </span>
            <span className="text-xs text-muted-foreground">
              {progress}/{total}
            </span>
            {currentClientName && isActive && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                {currentClientName}
              </span>
            )}
          </div>
        </Button>
        {(isCompleted || isStopped) && (
          <button
            type="button"
            className="h-6 w-6 rounded-full hover:bg-destructive/10 flex items-center justify-center transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setIsDismissed(true);
              dismissStatus();
            }}
            aria-label="Fechar"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}
