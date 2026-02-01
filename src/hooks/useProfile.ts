import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Profile {
  id: string;  // id É o user_id (não há coluna user_id separada)
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  store_name: string | null;
}

export function useProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      // IMPORTANTE: profiles.id é o user_id (não há coluna user_id separada)
      // O schema mostra: id uuid REFERENCES auth.users (id é o user_id)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)  // CORRIGIDO: usa id, não user_id
        .maybeSingle();

      if (error) throw error;
      return data as Profile | null;
    },
    enabled: !!user,
  });

  const updateProfile = useMutation({
    mutationFn: async (updates: Partial<Pick<Profile, 'full_name' | 'avatar_url'>>) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      // CRITICAL: NÃO tenta criar profile manualmente
      // O trigger handle_new_user cria o profile automaticamente no backend
      // Apenas atualiza se já existir
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id)  // id é o user_id (PK)
        .select()
        .single();

      if (error) {
        // Se o profile não existe, o trigger deveria ter criado
        // Mas se não existe ainda, apenas retorna null (não cria manualmente)
        if (error.code === 'PGRST116') {
          // Profile não existe - o trigger deveria criar, mas pode ainda estar processando
          // Retorna null em vez de criar manualmente para evitar race condition
          return null;
        }
        throw error;
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({
        title: 'Perfil atualizado!',
        description: 'Suas informações foram salvas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao atualizar perfil',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const uploadAvatar = async (file: File): Promise<string | null> => {
    if (!user) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast({
        title: 'Erro ao fazer upload',
        description: uploadError.message,
        variant: 'destructive',
      });
      return null;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName);
    return data.publicUrl;
  };

  return {
    profile,
    isLoading,
    updateProfile,
    uploadAvatar,
  };
}
