import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { useToast } from '@/hooks/use-toast';

export interface Transaction {
  id: string;
  store_id: string;
  product_id: string | null;
  product_name: string | null; // Nome do produto salvo na transação
  customer_id: string | null;
  type: 'sale' | 'purchase';
  quantity: number;
  unit_price: number;
  total_amount: number;
  profit: number | null;
  category?: string; // Categoria manual (ex: Aluguel, Marketing)
  description?: string; // Descrição manual
  created_at: string;
  products?: { name: string } | null;
  customers?: { name: string } | null;
}

export interface CreateTransactionData {
  type: 'sale' | 'purchase';
  amount: number;
  category: string;
  description?: string;
  date: string;
}

export function useTransactions(limit?: number) {
  const { store } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', store?.id, limit],
    queryFn: async () => {
      if (!store) return [];
      
      let query = supabase
        .from('transactions')
        .select('*, products(name), customers(name)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Transaction[];
    },
    enabled: !!store,
  });

  const createTransaction = useMutation({
    mutationFn: async (data: CreateTransactionData) => {
      if (!store) throw new Error('Loja não encontrada');

      // Adaptação para o schema atual:
      // Como não temos colunas de categoria/descrição no schema original de transactions (que é focado em produto),
      // vamos usar o campo product_name para a categoria/descrição por enquanto,
      // ou assumir que o usuário vai criar colunas novas.
      // Para evitar erros, vamos inserir o básico.
      
      // Nota: Idealmente deveríamos ter uma tabela 'financial_records' ou adicionar colunas em 'transactions'.
      // Vou usar 'product_name' para guardar a descrição/categoria como fallback visual.
      
      const { error } = await supabase
        .from('transactions')
        .insert({
          store_id: store.id,
          type: data.type,
          total_amount: data.amount,
          unit_price: data.amount,
          quantity: 1,
          product_name: `${data.category} - ${data.description || ''}`, // Hack para exibir algo útil
          created_at: data.date,
          due_date: data.dueDate,
          payment_date: data.paymentDate,
          status: data.status || 'paid',
          // profit: data.type === 'income' ? data.amount : -data.amount, // Omit profit for now to avoid schema errors
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Transação salva',
        description: 'O registro financeiro foi criado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
    }
  });

  return {
    transactions,
    isLoading,
    createTransaction
  };
}
