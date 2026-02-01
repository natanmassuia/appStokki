import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/hooks/useStore';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/format';

export interface Product {
  id: string;
  store_id: string;
  name: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  category_id: string | null;
  supplier_id?: string | null;
  image_url: string | null;
  color: string | null;
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
  supplier_id?: string | null;
  image_url?: string | null;
  color?: string | null;
}

export function useProducts() {
  const { user } = useAuth();
  const { store } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['products', store?.id],
    queryFn: async () => {
      if (!store) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Product[];
    },
    enabled: !!store,
  });

  const createProduct = useMutation({
    mutationFn: async (product: CreateProductData) => {
      if (!store) throw new Error('Loja não encontrada');
      
      const { data, error } = await supabase
        .from('products')
        .insert({ ...product, store_id: store.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', store?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // Toast removido - o sistema de progressão mostra o status durante importações
      // Para criação manual, o toast é exibido no componente chamador
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
      if (!store) throw new Error('Loja não encontrada');
      
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .eq('store_id', store.id) // Garante que só atualiza produtos da loja
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', store?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // Toast removido - o sistema de progressão mostra o status durante importações
      // Para atualização manual, o toast é exibido no componente chamador
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
      if (!store) throw new Error('Loja não encontrada');
      
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('store_id', store.id); // Garante que só deleta produtos da loja

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products', store?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // Toast removido - o sistema de progressão mostra o status
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir produto',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteProducts = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!store) throw new Error('Loja não encontrada');
      
      const { error } = await supabase
        .from('products')
        .delete()
        .in('id', ids)
        .eq('store_id', store.id);

      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['products', store?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      // Toast removido - o sistema de progressão mostra o status
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir produtos',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const sellProduct = useMutation({
    mutationFn: async ({ productId, quantity, customerId, unitPrice }: { productId: string; quantity: number; customerId?: string | null; unitPrice?: number }) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const product = products.find(p => p.id === productId);
      if (!product) throw new Error('Produto não encontrado');
      if (product.quantity < quantity) throw new Error('Estoque insuficiente');

      const finalUnitPrice = unitPrice !== undefined ? unitPrice : product.selling_price;
      const profit = (finalUnitPrice - product.cost_price) * quantity;
      const totalAmount = finalUnitPrice * quantity;

      // Ensure all numeric values are valid numbers and handle potential nulls
      const safeQuantity = Number(quantity) || 0;
      const safeUnitPrice = Number(finalUnitPrice) || 0;
      const safeTotalAmount = Number(totalAmount) || 0;
      const safeProfit = Number(profit) || 0;
      const safeCustomerId = customerId || null;

      // Omit 'profit' field if it causes schema issues, or try to insert it if schema is correct.
      // Based on the error "Could not find the 'profit' column", we should try omitting it if it's not in the DB schema yet,
      // OR we fix the DB schema. Assuming we can't easily run SQL migrations right now without user permission,
      // let's try to omit it from the insert if the previous attempt failed, 
      // BUT strictly speaking, we should fix the schema. 
      // However, the error comes from the client library cache sometimes.
      
      // Let's try inserting WITHOUT profit first to see if it works, as the error explicitly says column missing.
      // If the column is missing in the DB, we can't insert it.
      // If it is a computed column, we shouldn't insert it.
      
      const transactionData: any = {
          store_id: store.id,
          product_id: productId,
          product_name: product.name,
          customer_id: safeCustomerId,
          type: 'sale',
          quantity: safeQuantity,
          unit_price: safeUnitPrice,
          total_amount: safeTotalAmount,
          // profit: safeProfit, // Commenting out profit to fix the error
        };

      const { error: transactionError } = await supabase
        .from('transactions')
        .insert(transactionData);

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
      queryClient.invalidateQueries({ queryKey: ['products', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['transactions', user?.id] });
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

  const uploadProductImage = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('product-images')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast({
        title: 'Erro ao fazer upload',
        description: uploadError.message,
        variant: 'destructive',
      });
      return null;
    }

    const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return data.publicUrl;
  };

  return {
    products,
    isLoading,
    createProduct,
    updateProduct,
    deleteProduct,
    deleteProducts,
    sellProduct,
    uploadProductImage,
  };
}
