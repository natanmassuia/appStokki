import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { formatCurrency } from '@/lib/format';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface QuickEditCellProps {
  value: number;
  type: 'number' | 'currency';
  id: string; // Product ID for unique key if needed
  onSave: (newValue: number) => Promise<void>;
  className?: string;
  min?: number;
}

export function QuickEditCell({ value, type, onSave, className, min = 0 }: QuickEditCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentValue, setCurrentValue] = useState(value);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    setCurrentValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (currentValue === value) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      await onSave(currentValue);
      setIsEditing(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 2000);
    } catch (error) {
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível salvar o novo valor.',
        variant: 'destructive',
      });
      setCurrentValue(value); // Revert on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setCurrentValue(value);
    }
  };

  if (isEditing) {
    return (
      <div className={cn("relative flex items-center justify-end", className)}>
        <Input
          ref={inputRef}
          type="number"
          min={min}
          step={type === 'currency' ? "0.01" : "1"}
          value={currentValue}
          onChange={(e) => setCurrentValue(parseFloat(e.target.value) || 0)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          className="h-8 w-24 px-2 py-1 text-right"
        />
        {isLoading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      onClick={() => setIsEditing(true)}
      className={cn(
        "cursor-pointer hover:bg-muted/50 rounded px-2 py-1 transition-colors group flex items-center justify-end gap-2",
        className
      )}
      title="Clique para editar"
    >
      {showSuccess && <Check className="h-3 w-3 text-green-500 animate-in fade-in zoom-in" />}
      <span className={cn(type === 'currency' && "font-medium text-primary")}>
        {type === 'currency' ? formatCurrency(currentValue) : currentValue}
      </span>
    </div>
  );
}
