import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from './useStore';
import { useToast } from '@/hooks/use-toast';
import { humanizeError } from '@/lib/utils';

export interface StoreMember {
  id: string;
  store_id: string;
  user_id: string;
  role: 'owner' | 'manager' | 'staff';
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  auth?: {
    email: string;
  } | null;
}

export interface InviteMemberData {
  target_email: string;
  target_role: 'manager' | 'staff';
}

export function useStoreMembers() {
  const { user } = useAuth();
  const { store } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['storeMembers', store?.id],
    queryFn: async (): Promise<StoreMember[]> => {
      if (!store) return [];

      try {
        // Busca membros da loja com informações do perfil
        const { data, error } = await supabase
          .from('store_members')
          .select(`
            *,
            profiles (
              full_name,
              avatar_url
            )
          `)
          .eq('store_id', store.id)
          .order('created_at', { ascending: true });

        if (error) {
          // Se a tabela não existir ou houver erro 500, retorna array vazio
          if (error.code === 'PGRST301' || error.status === 400 || error.status === 406 || error.status === 500) {
            return [];
          }
          throw error;
        }

        // Mapeia os dados retornados
        const membersWithProfile = (data || []).map((member: any) => {
          // O join pode retornar como array ou objeto único dependendo da relação
          const profile = Array.isArray(member.profiles) 
            ? member.profiles[0] 
            : member.profiles;

          return {
            ...member,
            profiles: profile || null,
            auth: null, // Email não disponível via client-side, pode ser adicionado via RPC se necessário
          } as StoreMember;
        });

        return membersWithProfile;
      } catch (error: any) {
        console.error('Erro ao buscar membros:', error);
        return [];
      }
    },
    enabled: !!store,
    retry: false,
  });

  const inviteMember = useMutation({
    mutationFn: async ({ target_email, target_role }: InviteMemberData) => {
      if (!user || !store) throw new Error('Usuário ou loja não encontrado');

      // Chama a função RPC invite_member
      const { data, error } = await supabase.rpc('invite_member', {
        target_email,
        target_role,
        target_store_id: store.id,
      });

      if (error) {
        // Trata erros específicos da RPC
        if (error.message.includes('limit reached') || error.message.includes('limite')) {
          throw new Error('Limite de membros atingido para este plano.');
        }
        if (error.message.includes('not found') || error.message.includes('não encontrado')) {
          throw new Error('Usuário não encontrado. O email precisa estar cadastrado no sistema.');
        }
        if (error.message.includes('already') || error.message.includes('já')) {
          throw new Error('Este usuário já é membro da loja.');
        }
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storeMembers', store?.id] });
      toast({
        title: 'Convite enviado!',
        description: 'O membro foi adicionado à equipe com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao convidar membro',
        description: humanizeError(error) || error.message || 'Não foi possível convidar o membro.',
        variant: 'destructive',
      });
    },
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      if (!user || !store) throw new Error('Usuário ou loja não encontrado');

      const { error } = await supabase
        .from('store_members')
        .delete()
        .eq('id', memberId)
        .eq('store_id', store.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['storeMembers', store?.id] });
      toast({
        title: 'Membro removido',
        description: 'O membro foi removido da equipe com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover membro',
        description: humanizeError(error) || error.message || 'Não foi possível remover o membro.',
        variant: 'destructive',
      });
    },
  });

  return {
    members,
    isLoading,
    inviteMember,
    removeMember,
  };
}
