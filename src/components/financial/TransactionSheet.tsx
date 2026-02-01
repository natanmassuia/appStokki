import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CurrencyInput } from '@/components/ui/currency-input';
import { useTransactions } from '@/hooks/useTransactions';
import { Loader2, ArrowUpCircle, ArrowDownCircle, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

interface TransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: 'income' | 'expense';
}

export function TransactionSheet({ open, onOpenChange, defaultType = 'expense' }: TransactionSheetProps) {
  const [type, setType] = useState<'income' | 'expense'>(defaultType);
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [isPaid, setIsPaid] = useState(true);
  
  const { createTransaction } = useTransactions();

  // Reset form when opening
  useEffect(() => {
    if (open) {
      setType(defaultType);
      setAmount(0);
      setCategory('');
      setDescription('');
      setDate(new Date());
      setIsPaid(true);
    }
  }, [open, defaultType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (amount <= 0) return;

    try {
      await createTransaction.mutateAsync({
        type: type === 'income' ? 'sale' : 'purchase', // Mapping to DB types
        amount,
        category, 
        description,
        date: date.toISOString(),
        status: isPaid ? 'paid' : 'pending',
        payment_date: isPaid ? date.toISOString() : null,
        due_date: date.toISOString(),
      });
      onOpenChange(false);
    } catch (error) {
      // Error handled by hook toast
    }
  };

  const incomeCategories = [
    'Venda de Produto',
    'Serviço',
    'Investimento',
    'Outros'
  ];

  const expenseCategories = [
    'Fornecedores',
    'Aluguel',
    'Marketing',
    'Salários',
    'Impostos',
    'Manutenção',
    'Outros'
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="mb-6">
          <SheetTitle>Nova Transação</SheetTitle>
          <SheetDescription>
            Registre uma entrada ou saída manualmente.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-muted/50 rounded-lg">
            <button
              type="button"
              onClick={() => setType('income')}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all",
                type === 'income' 
                  ? "bg-emerald-100 text-emerald-700 shadow-sm dark:bg-emerald-900/30 dark:text-emerald-400" 
                  : "text-muted-foreground hover:bg-background/50"
              )}
            >
              <ArrowUpCircle className="h-4 w-4" />
              Receita
            </button>
            <button
              type="button"
              onClick={() => setType('expense')}
              className={cn(
                "flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-md transition-all",
                type === 'expense' 
                  ? "bg-rose-100 text-rose-700 shadow-sm dark:bg-rose-900/30 dark:text-rose-400" 
                  : "text-muted-foreground hover:bg-background/50"
              )}
            >
              <ArrowDownCircle className="h-4 w-4" />
              Despesa
            </button>
          </div>

          <div className="space-y-4">
            {/* Amount */}
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <div className="relative">
                <CurrencyInput
                  value={amount}
                  onChange={setAmount}
                  className={cn(
                    "text-2xl font-bold h-14 pl-4", 
                    type === 'income' ? "text-emerald-600" : "text-rose-600"
                  )}
                  placeholder="0,00"
                  required
                />
              </div>
            </div>

            {/* Paid Status Switch */}
            <div className="flex items-center justify-between p-3 border rounded-lg bg-secondary/20">
              <div className="space-y-0.5">
                <Label className="text-base">
                  {isPaid ? 'Já foi pago?' : 'Pagamento Pendente'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isPaid 
                    ? 'A transação será registrada como paga.' 
                    : 'A transação ficará pendente.'}
                </p>
              </div>
              <Switch
                checked={isPaid}
                onCheckedChange={setIsPaid}
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>{isPaid ? 'Data do Pagamento' : 'Data de Vencimento'}</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal h-11 input-glass",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: ptBR }) : <span>Selecione uma data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={(d) => d && setDate(d)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 input-glass">
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  {(type === 'income' ? incomeCategories : expenseCategories).map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descrição (Opcional)</Label>
              <Textarea 
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === 'income' ? "Ex: Venda de consultoria..." : "Ex: Compra de material..."}
                className="input-glass min-h-[100px]"
              />
            </div>
          </div>

          <SheetFooter className="pt-4">
            <Button 
              type="submit" 
              className={cn(
                "w-full h-12 text-base shadow-lg transition-all hover:scale-[1.02]",
                type === 'income' ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              )}
              disabled={createTransaction.isPending || amount <= 0}
            >
              {createTransaction.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Transação'
              )}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
