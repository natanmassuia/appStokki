import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';

export interface Product {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  category_id: string | null;
  created_at: string;
  updated_at: string;
  categories?: { name: string } | null;
}

export interface CreateProductData {
  name: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  category_id?: string | null;
}

export function useProducts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Product[];
    },
    enabled: !!user,
  });

  const createProduct = useMutation({
    mutationFn: async (product: CreateProductData) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { data, error } = await supabase
        .from('products')
        .insert({ ...product, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Produto adicionado!',
        description: 'O produto foi cadastrado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao adicionar produto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Produto atualizado!',
        description: 'O produto foi editado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar produto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast({
        title: 'Produto excluído!',
        description: 'O produto foi removido com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir produto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const sellProduct = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: string; quantity: number }) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error('Produto não encontrado');
      if (product.quantity < quantity) throw new Error('Estoque insuficiente');

      const profit = (product.selling_price - product.cost_price) * quantity;
      const totalAmount = product.selling_price * quantity;

      // Create transaction
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          product_id: productId,
          type: 'sale',
          quantity,
          unit_price: product.selling_price,
          total_amount: totalAmount,
          profit,
        });

      if (transactionError) throw transactionError;

      // Update product quantity
      const { error: updateError } = await supabase
        .from('products')
        .update({ quantity: product.quantity - quantity })
        .eq('id', productId);

      if (updateError) throw updateError;

      return { profit, product };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Venda realizada! 🎉',
        description: `${data.product.name} vendido com sucesso! Lucro: ${formatCurrency(data.profit)}`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao realizar venda',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    products,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    sellProduct,
  };
}
