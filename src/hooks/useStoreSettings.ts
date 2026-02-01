import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from './useStore';
import { useToast } from '@/hooks/use-toast';
import { humanizeError } from '@/lib/utils';

// Interface compatível com o código existente que usa storeSettings
export interface StoreSettings {
  id: string;
  user_id: string;
  store_name: string | null;
  phone: string | null;
  primary_color: string | null;
  whatsapp_instance_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateStoreSettingsData {
  store_name?: string | null;
  phone?: string | null;
  primary_color?: string | null;
  whatsapp_instance_name?: string | null;
}

/**
 * Hook que mapeia stores para StoreSettings (compatibilidade)
 * Agora usa stores diretamente em vez de store_settings
 */
export function useStoreSettings() {
  const { user } = useAuth();
  const { store, updateStore } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mapeia store para StoreSettings (compatibilidade com código existente)
  const settings: StoreSettings | null = store ? {
    id: store.id,
    user_id: store.owner_id,
    store_name: store.name,
    phone: store.whatsapp,
    primary_color: store.primary_color,
    whatsapp_instance_name: store.whatsapp_instance_name,
    created_at: store.created_at,
    updated_at: store.updated_at,
  } : null;

  const isLoading = !store && !!user; // Loading se há usuário mas não há loja ainda

  const updateSettings = useMutation({
    mutationFn: async (updates: UpdateStoreSettingsData) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      // Mapeia UpdateStoreSettingsData para UpdateStoreData
      const storeUpdates = {
        name: updates.store_name,
        whatsapp: updates.phone,
        primary_color: updates.primary_color,
        whatsapp_instance_name: updates.whatsapp_instance_name,
      };

      // Usa updateStore do hook useStore
      return await updateStore.mutateAsync(storeUpdates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storeSettings', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['store', user?.id] });
      toast({
        title: 'Configurações salvas!',
        description: 'As configurações da loja foram atualizadas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao salvar configurações',
        description: humanizeError(error),
        variant: 'destructive',
      });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings,
  };
}
