import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  product?: {
    name: string;
    image_url?: string;
  };
}

export interface Order {
  id: string;
  store_id: string;
  customer_id: string;
  total_amount: number;
  status: 'pending' | 'approved' | 'packing' | 'shipped' | 'delivered' | 'cancelled';
  payment_method: string;
  created_at: string;
  customer?: {
    name: string;
    phone?: string;
  };
  order_items?: OrderItem[];
}

export function useOrders() {
  const { store } = useStore();

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['orders', store?.id],
    queryFn: async () => {
      if (!store) return [];

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          customer:customers(name, phone),
          order_items(
            *,
            product:products(name, image_url)
          )
        `)
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      if (error) {
        // Handle missing table error gracefully
        if (error.code === 'PGRST205') {
          console.warn('Tabela de pedidos não encontrada. É necessário rodar a migração SQL.');
          return [];
        }
        console.error('Error fetching orders:', error);
        throw error;
      }

      return data as unknown as Order[];
    },
    enabled: !!store,
  });

  return {
    orders,
    isLoading,
    refetch,
  };
}
