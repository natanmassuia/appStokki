import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { useToast } from '@/hooks/use-toast';
import { humanizeError } from '@/lib/utils';

export interface Category {
  id: string;
  store_id: string;
  name: string;
  created_at: string;
  product_count?: number;
}

export function useCategories() {
  const { store } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading, refetch } = useQuery({
    queryKey: ['categories', store?.id],
    queryFn: async () => {
      if (!store) return [];
      
      const { data, error } = await supabase
        .from('categories')
        .select('*, products(count)')
        .eq('store_id', store.id)
        .order('name');

      if (error) {
        // Erro ao buscar categorias - silenciosamente ignora
        throw error;
      }
      
      return (data || []).map(cat => ({
        ...cat,
        product_count: cat.products?.[0]?.count || 0,
      })) as Category[];
    },
    enabled: !!store,
    refetchOnWindowFocus: false, // Desabilitado para evitar refresh ao trocar de aba
    staleTime: 0, // Sempre busca dados frescos
  });

  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      if (!store) throw new Error('Loja não encontrada');
      
      const { data, error } = await supabase
        .from('categories')
        .insert({ name, store_id: store.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      // Invalida e refaz a query imediatamente
      await queryClient.invalidateQueries({ queryKey: ['categories', store?.id] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.refetchQueries({ queryKey: ['categories', store?.id] });
      // Toast removido - o componente chamador decide se quer exibir toast
      // Isso evita spam de toasts durante importações
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar categoria',
        description: humanizeError(error),
        variant: 'destructive',
      });
    },
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (!store) throw new Error('Loja não encontrada');
      
      const { data, error } = await supabase
        .from('categories')
        .update({ name })
        .eq('id', id)
        .eq('store_id', store.id) // Garante que só atualiza categorias da loja
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      // Invalida e refaz a query imediatamente
      await queryClient.invalidateQueries({ queryKey: ['categories', store?.id] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.refetchQueries({ queryKey: ['categories', store?.id] });
      toast({
        title: 'Categoria atualizada!',
        description: 'A categoria foi editada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar categoria',
        description: humanizeError(error),
        variant: 'destructive',
      });
    },
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      if (!store) throw new Error('Loja não encontrada');
      
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('store_id', store.id); // Garante que só deleta categorias da loja

      if (error) throw error;
    },
    onSuccess: async () => {
      // Invalida e refaz as queries imediatamente
      await queryClient.invalidateQueries({ queryKey: ['categories', store?.id] });
      await queryClient.invalidateQueries({ queryKey: ['categories'] });
      await queryClient.invalidateQueries({ queryKey: ['products', store?.id] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.refetchQueries({ queryKey: ['categories', store?.id] });
      // Toast removido - o sistema de progressão mostra o status
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir categoria',
        description: humanizeError(error),
        variant: 'destructive',
      });
    },
  });

  const deleteCategories = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!store) throw new Error('Loja não encontrada');
      
      const { error } = await supabase
        .from('categories')
        .delete()
        .in('id', ids)
        .eq('store_id', store.id);

      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['categories', store?.id] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['products', store?.id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      // Toast removido - o sistema de progressão mostra o status
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir categorias',
        description: humanizeError(error),
        variant: 'destructive',
      });
    },
  });

  return {
    categories,
    isLoading,
    refetch,
    createCategory,
    updateCategory,
    deleteCategory,
    deleteCategories,
  };
}
