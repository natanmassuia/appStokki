import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useExpenses, Expense } from '@/hooks/useExpenses';
import { formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Loader2, Pencil, Trash2, Receipt, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { exportToCSV, formatCurrencyForCSV, formatDateForCSV } from '@/utils/exportUtils';
import { ExpensesImportModal } from '@/components/ExpensesImportModal';
import { useBulkOperation } from '@/contexts/BulkOperationContext';
import { useImport } from '@/contexts/ImportContext';
import { useToast } from '@/hooks/use-toast';
import { humanizeError } from '@/lib/utils';

// Função helper para obter data local no formato YYYY-MM-DD
const getTodayLocalDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function FinancialExpenses() {
  const { expenses, isLoading, createExpense, updateExpense, deleteExpense, deleteExpenses } = useExpenses();
  const { startOperation } = useBulkOperation();
  const { importStatus, importType, items } = useImport();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [lastImportStatus, setLastImportStatus] = useState<{ status: string; count: number } | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  const [confirmSaveExpense, setConfirmSaveExpense] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());
  const [deleteMultipleConfirm, setDeleteMultipleConfirm] = useState(false);
  const [exportMultipleConfirm, setExportMultipleConfirm] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    description: '',
    amount: 0,
    date: getTodayLocalDate(),
  });

  // Monitora conclusão da importação de gastos para exibir toast e atualizar lista
  useEffect(() => {
    if (importType === 'expenses' && importStatus === 'completed' && items.length > 0) {
      const successCount = items.filter(item => item.status === 'success').length;
      
      // Só exibe toast se for uma nova conclusão (não foi exibido antes)
      if (!lastImportStatus || lastImportStatus.status !== importStatus || lastImportStatus.count !== successCount) {
        if (successCount > 0) {
          toast({
            title: 'Importação concluída!',
            description: `${successCount} gasto${successCount > 1 ? 's' : ''} importado${successCount > 1 ? 's' : ''} com sucesso.`,
          });
          
          // Força atualização da lista após a importação
          queryClient.invalidateQueries({ queryKey: ['expenses'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }
        setLastImportStatus({ status: importStatus, count: successCount });
      }
    } else if (importStatus === 'idle' || importStatus === 'error') {
      // Reseta quando a importação é resetada ou falha
      setLastImportStatus(null);
    }
  }, [importStatus, importType, items, toast, lastImportStatus, queryClient]);

  // Captura erros não tratados
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('message channel closed') || 
          event.message?.includes('asynchronous response') ||
          event.message?.includes('Extension context invalidated') ||
          event.message?.includes('listener indicated')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message = reason?.message || reason?.toString() || '';
      
      if (message.includes('message channel closed') ||
          message.includes('asynchronous response') ||
          message.includes('Extension context invalidated') ||
          message.includes('listener indicated')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);

    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
    };
  }, []);

  const handleOpenDialog = (expense?: Expense) => {
    if (expense) {
      setFormData({
        id: expense.id,
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
      });
      setIsEditMode(true);
    } else {
      setFormData({
        id: '',
        description: '',
        amount: 0,
        date: getTodayLocalDate(),
      });
      setIsEditMode(false);
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFormData({
      id: '',
      description: '',
      amount: 0,
      date: getTodayLocalDate(),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim() || formData.amount <= 0) {
      return;
    }

    // Mostra confirmação antes de salvar
    setConfirmSaveExpense(true);
  };

  const handleConfirmSaveExpense = async () => {
    setConfirmSaveExpense(false);
    
    try {
      if (isEditMode) {
        await updateExpense.mutateAsync({
          id: formData.id,
          description: formData.description,
          amount: formData.amount,
          date: formData.date,
        });
      } else {
        await createExpense.mutateAsync({
          description: formData.description,
          amount: formData.amount,
          date: formData.date,
        });
      }
      handleCloseDialog();
    } catch (error) {
      // Erro ao salvar gasto - já tratado no toast
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedExpenses(new Set(expenses.map(e => e.id)));
    } else {
      setSelectedExpenses(new Set());
    }
  };

  const handleSelectExpense = (expenseId: string, checked: boolean) => {
    const newSelected = new Set(selectedExpenses);
    if (checked) {
      newSelected.add(expenseId);
    } else {
      newSelected.delete(expenseId);
    }
    setSelectedExpenses(newSelected);
  };

  const handleDelete = async () => {
    if (deleteConfirm.ids.length === 0) return;
    try {
      if (deleteConfirm.ids.length === 1) {
        await deleteExpense.mutateAsync(deleteConfirm.ids[0]);
      } else {
        await deleteExpenses.mutateAsync(deleteConfirm.ids);
      }
      setSelectedExpenses(new Set());
      setDeleteConfirm({ open: false, ids: [] });
    } catch (error) {
      // Erro já é tratado na UI
    }
  };

  const handleDeleteSingle = (expenseId: string) => {
    setDeleteConfirm({ open: true, ids: [expenseId] });
  };

  const handleDeleteMultiple = () => {
    if (selectedExpenses.size === 0) return;
    setDeleteMultipleConfirm(true);
  };

  const confirmDeleteMultiple = () => {
    setDeleteMultipleConfirm(false);
    
    const selectedIds = Array.from(selectedExpenses);
    const itemsToDelete = expenses
      .filter(e => selectedIds.includes(e.id))
      .map(e => ({ id: e.id, name: e.description }));

    if (itemsToDelete.length === 0) return;

    // Inicia operação em massa com progresso
    startOperation(
      'delete',
      'expenses',
      itemsToDelete,
      async (item) => {
        await deleteExpense.mutateAsync(item.id);
      }
    ).then(() => {
      setSelectedExpenses(new Set());
    }).catch(() => {
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a exclusão em massa.',
        variant: 'destructive',
      });
    });
  };

  const handleExportCSV = (expenseId?: string) => {
    if (!expenseId && selectedExpenses.size > 0) {
      setExportMultipleConfirm(true);
      return;
    }
    executeExportCSV(expenseId);
  };

  const executeExportCSV = (expenseId?: string) => {
    try {
      let expensesToExport;
      if (expenseId) {
        const expense = expenses.find(e => e.id === expenseId);
        if (!expense) {
          toast({
            title: 'Gasto não encontrado',
            variant: 'destructive',
          });
          return;
        }
        expensesToExport = [{
          descricao: expense.description,
          valor: formatCurrencyForCSV(expense.amount),
          data: formatDateForCSV(expense.date),
        }];
      } else if (selectedExpenses.size > 0) {
        const selectedIds = Array.from(selectedExpenses);
        expensesToExport = expenses
          .filter(e => selectedIds.includes(e.id))
          .map(e => ({
            descricao: e.description,
            valor: formatCurrencyForCSV(e.amount),
            data: formatDateForCSV(e.date),
          }));
      } else {
        expensesToExport = expenses.map(e => ({
          descricao: e.description,
          valor: formatCurrencyForCSV(e.amount),
          data: formatDateForCSV(e.date),
        }));
      }

      if (expensesToExport.length === 0) {
        toast({
          title: 'Nenhum gasto para exportar',
          description: 'Selecione gastos ou ajuste os filtros.',
          variant: 'destructive',
        });
        return;
      }

      const filename = expenseId
        ? `gasto_${expensesToExport[0].descricao.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`
        : selectedExpenses.size > 0
        ? `gastos_selecionados_${selectedExpenses.size}_${new Date().toISOString().split('T')[0]}.csv`
        : `gastos_${new Date().toISOString().split('T')[0]}.csv`;

      exportToCSV(expensesToExport, filename);
      
      toast({
        title: 'Exportação concluída!',
        description: `${expensesToExport.length} gasto(s) exportado(s) com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao exportar',
        description: humanizeError(error),
        variant: 'destructive',
      });
    }
  };

  const allSelected = expenses.length > 0 && selectedExpenses.size === expenses.length;
  const totalExpensesAmount = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const totalExpensesCount = expenses.length;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="base44-card p-6 flex items-center justify-between bg-gradient-to-r from-rose-50 to-white dark:from-rose-950/20 dark:to-card border-l-4 border-l-rose-500">
        <div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Despesas Totais</p>
          <h3 className="text-3xl font-bold text-rose-600 dark:text-rose-400 mt-1">
            {formatCurrency(totalExpensesAmount)}
          </h3>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Transações</p>
          <h3 className="text-2xl font-bold text-foreground mt-1">{totalExpensesCount}</h3>
        </div>
      </div>

      {/* Tabela de gastos */}
      <div className="base44-card overflow-hidden">
        <div className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : expenses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Receipt className="h-12 w-12 mb-3 opacity-20" />
              <p className="text-lg font-medium mb-2 text-foreground">Nenhum gasto registrado.</p>
              <p className="text-sm text-center max-w-md">
                Mantenha o financeiro em dia.{' '}
                <span
                  onClick={() => setIsImportModalOpen(true)}
                  className="text-primary underline-offset-4 hover:underline cursor-pointer font-medium"
                >
                  [Importe sua Planilha]
                </span>
                {' '}ou{' '}
                <span
                  onClick={() => handleOpenDialog()}
                  className="text-primary underline-offset-4 hover:underline cursor-pointer font-medium"
                >
                  [Lance um Gasto]
                </span>
                {' '}agora mesmo.
              </p>
            </div>
          ) : (
            <>
              {expenses.length > 0 && (
                <div className="p-4 border-b border-border/50 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={allSelected}
                        onCheckedChange={handleSelectAll}
                        className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <span className="text-sm text-muted-foreground">
                        {selectedExpenses.size > 0 
                          ? `${selectedExpenses.size} gasto${selectedExpenses.size > 1 ? 's' : ''} selecionado${selectedExpenses.size > 1 ? 's' : ''}`
                          : 'Selecionar todas'
                        }
                      </span>
                    </div>
                    {selectedExpenses.size > 0 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDeleteMultiple}
                        disabled={deleteExpenses.isPending}
                      >
                        {deleteExpenses.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Excluir ({selectedExpenses.size})
                      </Button>
                    )}
                  </div>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50 bg-muted/20 hover:bg-muted/30">
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Data</TableHead>
                    <TableHead className="text-muted-foreground font-semibold">Descrição</TableHead>
                    <TableHead className="text-right text-muted-foreground font-semibold">Valor</TableHead>
                    <TableHead className="text-right text-muted-foreground font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id} className="border-border/50 transition-colors hover:bg-muted/30">
                      <TableCell>
                        <Checkbox
                          checked={selectedExpenses.has(expense.id)}
                          onCheckedChange={(checked) => handleSelectExpense(expense.id, checked as boolean)}
                          className="border-muted-foreground/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatDate(expense.date)}</TableCell>
                      <TableCell className="font-medium text-foreground">{expense.description}</TableCell>
                      <TableCell className="text-right font-semibold text-rose-600 dark:text-rose-400">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleExportCSV(expense.id)}
                            title="Exportar este gasto"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleOpenDialog(expense)}
                            disabled={updateExpense.isPending}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-emerald-500/10"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10"
                            onClick={() => handleDeleteSingle(expense.id)}
                            disabled={deleteExpense.isPending || deleteExpenses.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </div>
      </div>

      {/* Dialog de Adicionar/Editar Gasto */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Editar Gasto' : 'Adicionar Gasto'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Atualize as informações do gasto.' : 'Registre um novo gasto operacional.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ex: Aluguel, Internet, Marketing..."
                className="input-glass"
                required
              />
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <CurrencyInput
                value={formData.amount}
                onChange={(value) => setFormData({ ...formData, amount: value })}
                className="input-glass"
                required
              />
            </div>
            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input-glass"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createExpense.isPending || updateExpense.isPending}
                className="gradient-primary"
              >
                {(createExpense.isPending || updateExpense.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  isEditMode ? 'Salvar Alterações' : 'Adicionar Gasto'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open, ids: [] })}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm.ids.length === 1 
                ? 'Tem certeza que deseja excluir este gasto? Esta ação não pode ser desfeita.'
                : `Tem certeza que deseja excluir ${deleteConfirm.ids.length} gastos? Esta ação não pode ser desfeita.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteExpense.isPending || deleteExpenses.isPending}
            >
              {(deleteExpense.isPending || deleteExpenses.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                'Sim, Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Salvar Gasto */}
      <AlertDialog open={confirmSaveExpense} onOpenChange={setConfirmSaveExpense}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>{isEditMode ? 'Confirmar Alterações' : 'Confirmar Adição de Gasto'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isEditMode 
                ? `Tem certeza que deseja salvar as alterações no gasto "${formData.description}"?`
                : `Tem certeza que deseja adicionar o gasto "${formData.description}" no valor de ${formatCurrency(formData.amount)}?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSaveExpense}
              className="gradient-primary"
              disabled={createExpense.isPending || updateExpense.isPending}
            >
              {(createExpense.isPending || updateExpense.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                isEditMode ? 'Sim, Salvar Alterações' : 'Sim, Adicionar Gasto'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Exclusão em Massa */}
      <AlertDialog open={deleteMultipleConfirm} onOpenChange={setDeleteMultipleConfirm}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir gastos selecionados?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedExpenses.size} gasto
              {selectedExpenses.size > 1 ? 's' : ''}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMultiple}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteExpense.isPending || deleteExpenses.isPending}
            >
              {(deleteExpense.isPending || deleteExpenses.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                `Sim, excluir (${selectedExpenses.size})`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de Importação CSV */}
      <ExpensesImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onImportComplete={() => {
          // A lista será atualizada automaticamente pelo React Query
        }}
        existingExpenses={expenses.map(e => {
          // Normaliza a data para formato YYYY-MM-DD para comparação
          let normalizedDate = e.date;
          if (e.date && e.date.includes('T')) {
            normalizedDate = e.date.split('T')[0];
          }
          return { 
            id: e.id, 
            description: e.description, 
            amount: e.amount, 
            date: normalizedDate
          };
        })}
        createExpense={async (expense) => {
          await createExpense.mutateAsync(expense);
        }}
        updateExpense={async (id, expense) => {
          await updateExpense.mutateAsync({ id, ...expense });
        }}
      />
    </div>
  );
}
