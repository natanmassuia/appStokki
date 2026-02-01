import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { humanizeError } from '@/lib/utils';

export interface Customer {
  id: string;
  store_id: string;
  name: string;
  phone: string;
  created_at: string;
  updated_at: string;
  total_spent?: number; // Calculado via join com transactions
}

export interface CreateCustomerData {
  name: string;
  phone: string;
}

export function useCustomers(params?: { page?: number; limit?: number }) {
  const { store } = useStore();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const page = params?.page || 1;
  const limit = params?.limit || 100;

  const { data: queryResult = { data: [], count: 0 }, isLoading } = useQuery({
    queryKey: ['customers', store?.id, page, limit],
    queryFn: async () => {
      if (!store) return { data: [], count: 0 };
      
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      // Busca clientes com paginação e contagem total
      const { data: customersData, error: customersError, count } = await supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('store_id', store.id)
        .order('name')
        .range(from, to);

      if (customersError) throw customersError;

      if (!customersData || customersData.length === 0) return { data: [], count: count || 0 };

      // Busca todas as transações de uma vez para melhor performance
      // Tenta buscar com customer_id, mas trata erro se a coluna não existir ou RLS bloquear
      let transactionsWithCustomer: any[] = [];
      
      try {
        // Tenta buscar todas as colunas (mais compatível com RLS)
        // Aumentamos o limite para garantir que pegamos todas as transações para cálculo correto
        const { data, error: transError } = await supabase
          .from('transactions')
          .select('*')
          .eq('store_id', store.id)
          .eq('type', 'sale')
          .range(0, 9999);
        
        if (transError) {
          // Se for erro 400, pode ser problema de RLS ou tabela não existe
          if (transError.status === 400) {
            console.warn('[useCustomers] Erro 400 ao buscar transações (possível problema de RLS ou coluna customer_id):', transError);
            return { data: customersData as Customer[], count: count || 0 };
          }
          // Outros erros também são ignorados silenciosamente
          console.warn('[useCustomers] Erro ao buscar transações:', transError);
          return { data: customersData as Customer[], count: count || 0 };
        } else {
          // Filtra transações com customer_id não nulo e extrai apenas os campos necessários
          transactionsWithCustomer = (data || [])
            .filter((t: any) => t.customer_id !== null)
            .map((t: any) => ({
              customer_id: t.customer_id,
              unit_price: t.unit_price,
              quantity: t.quantity,
              created_at: t.created_at
            }));
        }
      } catch (err: any) {
        // Qualquer erro ao buscar transações - retorna clientes sem total gasto
        console.warn('[useCustomers] Erro ao buscar transações:', err);
        return { data: customersData as Customer[], count: count || 0 };
      }

      // Calcula total gasto e última compra para cada cliente
      const customersWithTotal = (customersData || []).map((customer: any) => {
        const customerTransactions = transactionsWithCustomer.filter(
          (t: any) => t.customer_id === customer.id
        );

        const totalSpent = customerTransactions.reduce((sum: number, t: any) => {
          return sum + (t.unit_price * t.quantity);
        }, 0);

        // Encontra a data da última compra
        let lastPurchaseDate = undefined;
        if (customerTransactions.length > 0) {
          // Ordena por data decrescente e pega a primeira
          customerTransactions.sort((a: any, b: any) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          lastPurchaseDate = customerTransactions[0].created_at;
        }

        return {
          ...customer,
          total_spent: totalSpent,
          last_purchase_date: lastPurchaseDate,
        };
      });

      return { data: customersWithTotal as Customer[], count: count || 0 };
    },
    enabled: !!store,
  });

  const customers = queryResult.data;
  const totalCount = queryResult.count;

  const createCustomer = useMutation({
    mutationFn: async (customer: CreateCustomerData) => {
      if (!store) throw new Error('Loja não encontrada');
      if (!user) throw new Error('Usuário não autenticado');
      
      // Removido user_id pois o erro indica que a coluna não existe na tabela customers
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...customer, store_id: store.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', store?.id] });
      // Toast removido - o sistema de progressão mostra o status
    },
    onError: (error) => {
      toast({
        title: 'Erro ao adicionar cliente',
        description: humanizeError(error),
        variant: 'destructive',
      });
    },
  });

  const updateCustomer = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Customer> & { id: string }) => {
      if (!store) throw new Error('Loja não encontrada');
      
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .eq('store_id', store.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', store?.id] });
      toast({
        title: 'Cliente atualizado!',
        description: 'As alterações foram salvas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar cliente',
        description: humanizeError(error),
        variant: 'destructive',
      });
    },
  });

  const deleteCustomer = useMutation({
    mutationFn: async (id: string) => {
      if (!store) throw new Error('Loja não encontrada');
      
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
        .eq('store_id', store.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', store?.id] });
      // Toast removido - o sistema de progressão mostra o status
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir cliente',
        description: humanizeError(error),
        variant: 'destructive',
      });
    },
  });

  const deleteCustomers = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!store) throw new Error('Loja não encontrada');
      
      // Batch deletion to avoid URL length limits (400 Bad Request)
      // Supabase/PostgREST limits URL length, so we can't delete 1000 IDs at once via query params.
      const BATCH_SIZE = 50;
      const batches = [];

      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batchIds = ids.slice(i, i + BATCH_SIZE);
        batches.push(batchIds);
      }

      // Execute batches in parallel for speed
      await Promise.all(batches.map(async (batch) => {
        const { error } = await supabase
          .from('customers')
          .delete()
          .in('id', batch)
          .eq('store_id', store.id);

        if (error) throw error;
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', store?.id] });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir clientes',
        description: humanizeError(error),
        variant: 'destructive',
      });
    },
  });

  const createCustomersBulk = useMutation({
    mutationFn: async (customersData: CreateCustomerData[]) => {
      if (!store) throw new Error('Loja não encontrada');
      
      const dataToInsert = customersData.map(c => ({
        ...c,
        store_id: store.id,
      }));

      // Batch insert to avoid payload limits and network congestion
      const BATCH_SIZE = 50;
      const batches = [];
      
      for (let i = 0; i < dataToInsert.length; i += BATCH_SIZE) {
        batches.push(dataToInsert.slice(i, i + BATCH_SIZE));
      }
      
      // Process batches sequentially to ensure stability
      for (const batch of batches) {
        const { error } = await supabase
          .from('customers')
          .insert(batch);
          
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', store?.id] });
      toast({
        title: 'Importação concluída',
        description: 'Todos os clientes foram importados com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro na importação',
        description: humanizeError(error),
        variant: 'destructive',
      });
    },
  });

  return {
    customers,
    totalCount,
    isLoading,
    createCustomer,
    createCustomersBulk,
    updateCustomer,
    deleteCustomer,
    deleteCustomers,
  };
}
