import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Transaction {
  id: string;
  user_id: string;
  product_id: string | null;
  type: 'sale' | 'purchase';
  quantity: number;
  unit_price: number;
  total_amount: number;
  profit: number | null;
  created_at: string;
  products?: { name: string } | null;
}

export function useTransactions(limit?: number) {
  const { user } = useAuth();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['transactions', user?.id, limit],
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('transactions')
        .select('*, products(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Transaction[];
    },
    enabled: !!user,
  });

  return {
    transactions,
    isLoading,
  };
}
