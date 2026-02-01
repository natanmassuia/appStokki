import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { useToast } from '@/hooks/use-toast';

export interface Expense {
  id: string;
  store_id: string;
  description: string;
  amount: number;
  date: string;
  created_at: string;
  updated_at: string;
}

export interface CreateExpenseData {
  description: string;
  amount: number;
  date: string;
}

export function useExpenses() {
  const { store } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', store?.id],
    queryFn: async () => {
      if (!store) return [];
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('store_id', store.id)
        .order('date', { ascending: false });

      if (error) throw error;
      return (data || []) as Expense[];
    },
    enabled: !!store,
  });

  const createExpense = useMutation({
    mutationFn: async (expense: CreateExpenseData) => {
      if (!store) throw new Error('Loja não encontrada');
      
      const { data, error } = await supabase
        .from('expenses')
        .insert({ ...expense, store_id: store.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', store?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // Toast removido - o sistema de progressão mostra o status
    },
    onError: (error) => {
      toast({
        title: 'Erro ao adicionar gasto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateExpense = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Expense> & { id: string }) => {
      if (!store) throw new Error('Loja não encontrada');
      
      const { data, error } = await supabase
        .from('expenses')
        .update(updates)
        .eq('id', id)
        .eq('store_id', store.id) // Garante que só atualiza gastos da loja
        .select();

      if (error) throw error;
      
      // Se não encontrou nenhuma linha, lança erro mais amigável
      if (!data || data.length === 0) {
        throw new Error('Gasto não encontrado ou não pertence ao usuário');
      }
      
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Gasto atualizado!',
        description: 'As alterações foram salvas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar gasto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      if (!store) throw new Error('Loja não encontrada');
      
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('store_id', store.id); // Garante que só deleta gastos da loja

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', store?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // Toast removido - o sistema de progressão mostra o status
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir gasto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteExpenses = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!store) throw new Error('Loja não encontrada');
      
      const { error } = await supabase
        .from('expenses')
        .delete()
        .in('id', ids)
        .eq('store_id', store.id); // Garante que só deleta gastos da loja

      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['expenses', store?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // Toast removido - o sistema de progressão mostra o status
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir gastos',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const createExpensesBatch = useMutation({
    mutationFn: async (expenses: CreateExpenseData[]) => {
      if (!store) throw new Error('Loja não encontrada');
      
      const expensesWithStoreId = expenses.map(expense => ({
        ...expense,
        store_id: store.id,
      }));

      const { data, error } = await supabase
        .from('expenses')
        .insert(expensesWithStoreId)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses', store?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao importar gastos',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Calcula total de gastos
  const totalExpenses = expenses.reduce((sum, expense) => sum + Number(expense.amount), 0);

  return {
    expenses,
    isLoading,
    totalExpenses,
    createExpense,
    createExpensesBatch,
    updateExpense,
    deleteExpense,
    deleteExpenses,
  };
}
