import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useStore } from '@/hooks/useStore';
import { useToast } from '@/hooks/use-toast';
import { humanizeError } from '@/lib/utils';

export interface Supplier {
  id: string;
  store_id: string;
  name: string;
  category: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierData {
  name: string;
  category?: string;
  phone?: string;
  email?: string;
}

export function useSuppliers() {
  const { store } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ['suppliers', store?.id],
    queryFn: async () => {
      if (!store) return [];
      
      const { data, error } = await supabase
        .from('suppliers' as any) // Type cast until types are generated
        .select('*')
        .eq('store_id', store.id)
        .order('name');

      if (error) throw error;
      return data as Supplier[];
    },
    enabled: !!store,
  });

  const createSupplier = useMutation({
    mutationFn: async (supplier: CreateSupplierData) => {
      if (!store) throw new Error('Loja não encontrada');
      
      const { data, error } = await supabase
        .from('suppliers' as any)
        .insert({ ...supplier, store_id: store.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', store?.id] });
      toast({
        title: 'Fornecedor adicionado',
        description: 'Fornecedor cadastrado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao adicionar fornecedor',
        description: humanizeError(error),
        variant: 'destructive',
      });
    },
  });

  const updateSupplier = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Supplier> & { id: string }) => {
      if (!store) throw new Error('Loja não encontrada');
      
      const { data, error } = await supabase
        .from('suppliers' as any)
        .update(updates)
        .eq('id', id)
        .eq('store_id', store.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', store?.id] });
      toast({
        title: 'Fornecedor atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar fornecedor',
        description: humanizeError(error),
        variant: 'destructive',
      });
    },
  });

  const deleteSupplier = useMutation({
    mutationFn: async (id: string) => {
      if (!store) throw new Error('Loja não encontrada');
      
      const { error } = await supabase
        .from('suppliers' as any)
        .delete()
        .eq('id', id)
        .eq('store_id', store.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers', store?.id] });
      toast({
        title: 'Fornecedor excluído',
        description: 'O fornecedor foi removido com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir fornecedor',
        description: humanizeError(error),
        variant: 'destructive',
      });
    },
  });

  return {
    suppliers,
    isLoading,
    createSupplier,
    updateSupplier,
    deleteSupplier,
  };
}
