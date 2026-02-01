import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransactions } from '@/hooks/useTransactions';
import { useProducts } from '@/hooks/useProducts';
import { useCustomers } from '@/hooks/useCustomers';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Loader2, Trash2, History, ShoppingCart, Package, Download, FileSpreadsheet } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { humanizeError } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/hooks/useStore';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useBulkOperation } from '@/contexts/BulkOperationContext';
import { SalesImportModal } from '@/components/SalesImportModal';
import { exportToCSV, formatCurrencyForCSV, formatDateForCSV } from '@/utils/exportUtils';

export function FinancialSales() {
  const { transactions, isLoading } = useTransactions();
  const { products } = useProducts();
  const { customers } = useCustomers();
  const { user } = useAuth();
  const { store } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { startOperation } = useBulkOperation();
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState<'all' | 'sale' | 'purchase'>('sale');
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; transaction: any | null }>({ 
    open: false, 
    transaction: null 
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [cancelQuantity, setCancelQuantity] = useState<number>(0);
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [deleteBulkConfirm, setDeleteBulkConfirm] = useState<{ open: boolean; ids: string[] }>({ 
    open: false, 
    ids: [] 
  });
  const [deleteMultipleConfirm, setDeleteMultipleConfirm] = useState(false);
  const [exportMultipleConfirm, setExportMultipleConfirm] = useState(false);
  const [isSalesImportOpen, setIsSalesImportOpen] = useState(false);

  // Filtra transações por tipo e remove as deletadas localmente
  const filteredTransactions = transactions
    .filter(t => !deletedIds.has(t.id))
    .filter(t => {
      if (typeFilter === 'all') return true;
      return t.type === typeFilter;
    });

  // Ordena por data (mais recente primeiro)
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Seleção em massa
  const allSelected = sortedTransactions.length > 0 && selectedTransactions.size === sortedTransactions.length;

  const handleToggleSelectAll = () => {
    if (allSelected) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(sortedTransactions.map(t => t.id)));
    }
  };

  const handleToggleSelect = (transactionId: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(transactionId)) {
      newSelected.delete(transactionId);
    } else {
      newSelected.add(transactionId);
    }
    setSelectedTransactions(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedTransactions.size === 0) return;
    setDeleteMultipleConfirm(true);
  };

  const confirmBulkDelete = () => {
    setDeleteMultipleConfirm(false);
    
    const selectedIds = Array.from(selectedTransactions);
    const itemsToDelete = sortedTransactions
      .filter(t => selectedIds.includes(t.id))
      .map(t => ({ 
        id: t.id, 
        name: `${t.product_name || 'Produto removido'} - ${t.type === 'sale' ? 'Venda' : 'Compra'}` 
      }));

    if (itemsToDelete.length === 0) return;

    // Inicia operação em massa com progresso
    startOperation(
      'delete',
      'transactions',
      itemsToDelete,
      async (item) => {
        if (!store) throw new Error('Loja não encontrada');
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', item.id)
          .eq('store_id', store.id);
        if (error) throw error;
      }
    ).then(() => {
      setSelectedTransactions(new Set());
    }).catch(() => {
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a exclusão em massa.',
        variant: 'destructive',
      });
    });
  };

  const handleExportCSV = (transactionId?: string) => {
    if (!transactionId && selectedTransactions.size > 0) {
      setExportMultipleConfirm(true);
      return;
    }
    executeExportCSV(transactionId);
  };

  const totalSalesAmount = filteredTransactions.reduce((acc, t) => acc + t.total_amount, 0);
  const totalSalesCount = filteredTransactions.length;

  const executeExportCSV = (transactionId?: string) => {
    try {
      let transactionsToExport;
      if (transactionId) {
        const transaction = sortedTransactions.find(t => t.id === transactionId);
        if (!transaction) {
          toast({
            title: 'Transação não encontrada',
            variant: 'destructive',
          });
          return;
        }
        const product = products.find(p => p.id === transaction.product_id);
        transactionsToExport = [{
          data: formatDateForCSV(transaction.created_at),
          tipo: transaction.type === 'sale' ? 'Venda' : 'Compra',
          produto: transaction.product_name || product?.name || 'Produto removido',
          quantidade: transaction.quantity.toString(),
          valor_unitario: formatCurrencyForCSV(transaction.unit_price),
          valor_total: formatCurrencyForCSV(transaction.unit_price * transaction.quantity),
          cliente: transaction.customer_id ? customers.find(c => c.id === transaction.customer_id)?.name || '' : '',
        }];
      } else if (selectedTransactions.size > 0) {
        const selectedIds = Array.from(selectedTransactions);
        transactionsToExport = sortedTransactions
          .filter(t => selectedIds.includes(t.id))
          .map(t => {
            const product = products.find(p => p.id === t.product_id);
            return {
              data: formatDateForCSV(t.created_at),
              tipo: t.type === 'sale' ? 'Venda' : 'Compra',
              produto: t.product_name || product?.name || 'Produto removido',
              quantidade: t.quantity.toString(),
              valor_unitario: formatCurrencyForCSV(t.unit_price),
              valor_total: formatCurrencyForCSV(t.unit_price * t.quantity),
              cliente: t.customer_id ? customers.find(c => c.id === t.customer_id)?.name || '' : '',
            };
          });
      } else {
        transactionsToExport = sortedTransactions.map(t => {
          const product = products.find(p => p.id === t.product_id);
          return {
            data: formatDateForCSV(t.created_at),
            tipo: t.type === 'sale' ? 'Venda' : 'Compra',
            produto: t.product_name || product?.name || 'Produto removido',
            quantidade: t.quantity.toString(),
            valor_unitario: formatCurrencyForCSV(t.unit_price),
            valor_total: formatCurrencyForCSV(t.unit_price * t.quantity),
            cliente: t.customer_id ? customers.find(c => c.id === t.customer_id)?.name || '' : '',
          };
        });
      }

      if (transactionsToExport.length === 0) {
        toast({
          title: 'Nenhuma transação para exportar',
          description: 'Selecione transações ou ajuste os filtros.',
          variant: 'destructive',
        });
        return;
      }

      const filename = transactionId
        ? `transacao_${transactionsToExport[0].produto.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`
        : selectedTransactions.size > 0
        ? `historico_selecionadas_${selectedTransactions.size}_${new Date().toISOString().split('T')[0]}.csv`
        : `historico_${new Date().toISOString().split('T')[0]}.csv`;

      exportToCSV(transactionsToExport, filename);
      
      toast({
        title: 'Exportação concluída!',
        description: `${transactionsToExport.length} transação(ões) exportada(s) com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao exportar',
        description: humanizeError(error),
        variant: 'destructive',
      });
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (deleteBulkConfirm.ids.length === 0 || !store) return;
    
    setIsDeleting(true);
    const idsToDelete = deleteBulkConfirm.ids;

    try {
      const { error: deleteError, data: deleteData } = await supabase
        .from('transactions')
        .delete()
        .in('id', idsToDelete)
        .eq('store_id', store.id)
        .select();

      if (deleteError) {
        throw new Error('Não foi possível excluir as transações. Tente novamente.');
      }
      
      if (!deleteData || deleteData.length === 0) {
        throw new Error('Nenhuma transação foi excluída. Verifique as permissões do banco de dados.');
      }

      idsToDelete.forEach(id => {
        setDeletedIds(prev => new Set(prev).add(id));
      });

      queryClient.setQueriesData(
        { queryKey: ['transactions', store?.id] },
        (old: any) => {
          if (!old || !Array.isArray(old)) return old;
          return old.filter((t: any) => !idsToDelete.includes(t.id));
        }
      );

      setSelectedTransactions(new Set());
      setDeleteBulkConfirm({ open: false, ids: [] });

      queryClient.invalidateQueries({ 
        queryKey: ['transactions', user?.id]
      });
      queryClient.invalidateQueries({ queryKey: ['products', store?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch (error: any) {
      idsToDelete.forEach(id => {
        setDeletedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      });
      
      queryClient.invalidateQueries({ queryKey: ['transactions', store?.id] });
      
      toast({
        title: 'Erro ao excluir transações',
        description: humanizeError(error),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteClick = (transaction: any) => {
    setCancelQuantity(transaction.quantity);
    setDeleteConfirm({ open: true, transaction });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.transaction || !user) return;
    
    if (cancelQuantity <= 0) {
      toast({
        title: 'Quantidade inválida',
        description: 'A quantidade deve ser maior que zero.',
        variant: 'destructive',
      });
      return;
    }

    if (cancelQuantity > deleteConfirm.transaction.quantity) {
      toast({
        title: 'Quantidade inválida',
        description: `A quantidade não pode ser maior que ${deleteConfirm.transaction.quantity}.`,
        variant: 'destructive',
      });
      return;
    }
    
    setIsDeleting(true);
    const transaction = deleteConfirm.transaction;
    const transactionId = transaction.id;
    const quantityToCancel = cancelQuantity;
    const originalQuantity = transaction.quantity;
    const transactionType = transaction.type;

    try {
      const productId = transaction.product_id;

      if (productId) {
        try {
          if (transactionType === 'sale') {
            const { data: product, error: productError } = await supabase
              .from('products')
              .select('quantity')
              .eq('id', productId)
              .eq('store_id', store?.id)
              .maybeSingle();

            if (!productError && product) {
              const newQuantity = (product.quantity || 0) + quantityToCancel;
              await supabase
                .from('products')
                .update({ quantity: newQuantity })
                .eq('id', productId)
                .eq('store_id', store?.id);
            }
          } else if (transactionType === 'purchase') {
            const { data: product, error: productError } = await supabase
              .from('products')
              .select('quantity')
              .eq('id', productId)
              .eq('store_id', store?.id)
              .maybeSingle();

            if (!productError && product) {
              const newQuantity = Math.max(0, (product.quantity || 0) - quantityToCancel);
              await supabase
                .from('products')
                .update({ quantity: newQuantity })
                .eq('id', productId)
                .eq('store_id', store?.id);
            }
          }
        } catch (stockError: any) {
          // Ignore stock errors
        }
      }

      const remainingQuantity = originalQuantity - quantityToCancel;
      const unitPrice = transaction.unit_price;
      const newTotalAmount = unitPrice * remainingQuantity;
      
      const profitPerUnit = transaction.profit ? transaction.profit / originalQuantity : 0;
      const newProfit = transactionType === 'sale' 
        ? profitPerUnit * remainingQuantity
        : transaction.profit;

      if (quantityToCancel === originalQuantity) {
        const { error: deleteError, data: deleteData } = await supabase
          .from('transactions')
          .delete()
          .eq('id', transactionId)
          .eq('store_id', store?.id)
          .select();

        if (deleteError) {
          throw new Error('Não foi possível excluir a transação. Tente novamente.');
        }
        
        if (!deleteData || deleteData.length === 0) {
          const { data: stillExists } = await supabase
            .from('transactions')
            .select('id')
            .eq('id', transactionId)
            .eq('store_id', store?.id)
            .maybeSingle();
          
          if (stillExists) {
            throw new Error('A transação não foi excluída. Pode ser um problema de permissão.');
          }
        }

        if (deleteData && deleteData.length > 0) {
          setDeletedIds(prev => new Set(prev).add(transactionId));
          
          queryClient.setQueriesData(
            { queryKey: ['transactions', store?.id] },
            (old: any) => {
              if (!old || !Array.isArray(old)) return old;
              return old.filter((t: any) => t.id !== transactionId);
            }
          );
          
          queryClient.invalidateQueries({ 
            queryKey: ['transactions', store?.id],
            refetchType: 'active'
          });
        }
      } else {
        const { data: updatedTransaction, error: updateError } = await supabase
          .from('transactions')
          .update({
            quantity: remainingQuantity,
            total_amount: newTotalAmount,
            profit: newProfit,
          })
          .eq('id', transactionId)
          .eq('store_id', store?.id)
          .select()
          .single();

        if (updateError) throw updateError;
        if (!updatedTransaction) throw new Error('Transação não foi atualizada no banco de dados');

        queryClient.setQueriesData(
          { queryKey: ['transactions', store?.id] },
          (old: any) => {
            if (!old || !Array.isArray(old)) return old;
            return old.map((t: any) => {
              if (t.id === transactionId) {
                return {
                  ...t,
                  quantity: remainingQuantity,
                  total_amount: newTotalAmount,
                  profit: newProfit,
                };
              }
              return t;
            });
          }
        );
      }

      setDeleteConfirm({ open: false, transaction: null });
      setCancelQuantity(0);

      queryClient.invalidateQueries({ 
        queryKey: ['transactions', user?.id]
      });
      queryClient.invalidateQueries({ queryKey: ['products', store?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

    } catch (error: any) {
      setDeletedIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(transactionId);
        return newSet;
      });
      
      queryClient.invalidateQueries({ queryKey: ['transactions', store?.id] });
      
      toast({
        title: 'Erro ao cancelar transação',
        description: humanizeError(error),
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm");
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="base44-card p-6 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/20 dark:to-card border-l-4 border-l-emerald-500">
        <div>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Receita Total</p>
          <h3 className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {formatCurrency(totalSalesAmount)}
          </h3>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Transações</p>
          <h3 className="text-2xl font-bold text-foreground mt-1">{totalSalesCount}</h3>
        </div>
      </div>

      {/* Table */}
      <div className="base44-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : sortedTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mb-3 opacity-20" />
            <p className="text-lg font-medium mb-2 text-foreground">Nenhuma transação encontrada</p>
            <p className="text-sm text-center max-w-md">
              {typeFilter === 'sale' ? (
                <>
                  Realize vendas para ver o histórico aqui.{' '}
                  <span
                    onClick={() => navigate('/estoque')}
                    className="text-primary underline-offset-4 hover:underline cursor-pointer font-medium"
                  >
                    [Ir para Estoque]
                  </span>
                </>
              ) : typeFilter === 'purchase' ? (
                'Registre entradas para ver o histórico aqui'
              ) : (
                'Nenhuma transação registrada ainda'
              )}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 bg-muted/30 hover:bg-muted/30">
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleToggleSelectAll}
                    disabled={isDeleting || sortedTransactions.length === 0}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary border-muted-foreground/30"
                  />
                </TableHead>
                <TableHead className="text-muted-foreground font-semibold">Data/Hora</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Produto</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Cliente</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Quantidade</TableHead>
                <TableHead className="text-right text-muted-foreground font-semibold">Valor</TableHead>
                <TableHead className="text-muted-foreground font-semibold">Tipo</TableHead>
                <TableHead className="text-right text-muted-foreground font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.map((transaction) => {
                const product = transaction.products as any;
                const customer = transaction.customers as any;
                const isSelected = selectedTransactions.has(transaction.id);
                
                return (
                  <TableRow 
                    key={transaction.id} 
                    className={`border-border/50 transition-colors hover:bg-muted/30 ${isSelected ? 'bg-emerald-500/10' : ''}`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleSelect(transaction.id)}
                        disabled={isDeleting}
                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary border-muted-foreground/30"
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {formatDateTime(transaction.created_at)}
                    </TableCell>
                    <TableCell className="font-medium text-foreground">
                      {transaction.product_name || product?.name || 'Produto removido'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {customer?.name || '-'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {transaction.quantity}
                    </TableCell>
                    <TableCell className="text-right font-medium text-foreground">
                      {formatCurrency(transaction.total_amount)}
                    </TableCell>
                    <TableCell>
                      {transaction.type === 'sale' ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 shadow-none">
                          <ShoppingCart className="h-3 w-3 mr-1" />
                          Venda
                        </Badge>
                      ) : (
                        <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20 shadow-none">
                          <Package className="h-3 w-3 mr-1" />
                          Entrada
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleExportCSV(transaction.id)}
                          title="Exportar esta transação"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteClick(transaction)}
                          disabled={isDeleting}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Bulk Delete Confirmation */}
      <AlertDialog open={deleteBulkConfirm.open} onOpenChange={(open) => setDeleteBulkConfirm({ open, ids: [] })}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão em Massa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {deleteBulkConfirm.ids.length} transação(ões) selecionada(s)?
              Esta ação não pode ser desfeita e não restaurará o estoque dos produtos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                'Sim, Excluir Todas'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog 
        open={deleteConfirm.open} 
        onOpenChange={(open) => {
          if (!open) {
            setDeleteConfirm({ open: false, transaction: null });
            setCancelQuantity(0);
          }
        }}
      >
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Cancelamento</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm.transaction?.type === 'sale' 
                ? 'Quantas unidades deseja cancelar desta venda?'
                : 'Quantas unidades deseja remover desta entrada?'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          {deleteConfirm.transaction && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="cancel-quantity">
                  Quantidade a cancelar (máximo: {deleteConfirm.transaction.quantity})
                </Label>
                <Input
                  id="cancel-quantity"
                  type="number"
                  min="1"
                  max={deleteConfirm.transaction.quantity}
                  value={cancelQuantity}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    const max = deleteConfirm.transaction?.quantity || 0;
                    setCancelQuantity(Math.min(Math.max(1, value), max));
                  }}
                  disabled={isDeleting}
                  className="input-glass"
                />
                <p className="text-xs text-muted-foreground">
                  {deleteConfirm.transaction.type === 'sale' 
                    ? `Isso devolverá ${cancelQuantity} unidade(s) do produto ao estoque.`
                    : `Isso removerá ${cancelQuantity} unidade(s) do estoque.`
                  }
                  {cancelQuantity < deleteConfirm.transaction.quantity && (
                    <span className="block mt-1">
                      A transação será atualizada para {deleteConfirm.transaction.quantity - cancelQuantity} unidade(s).
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
          
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting || cancelQuantity <= 0}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                `Confirmar Cancelamento`
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Exclusão em Massa */}
      <AlertDialog open={deleteMultipleConfirm} onOpenChange={setDeleteMultipleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão em massa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedTransactions.size} transação(ões) selecionada(s)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, Excluir Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Exportação em Massa */}
      <AlertDialog open={exportMultipleConfirm} onOpenChange={setExportMultipleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exportação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja exportar {selectedTransactions.size} transação(ões) selecionada(s) para CSV?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setExportMultipleConfirm(false);
                executeExportCSV();
              }}
            >
              Sim, Exportar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SalesImportModal
        open={isSalesImportOpen}
        onOpenChange={setIsSalesImportOpen}
        products={products}
        customers={customers}
      />
    </div>
  );
}
