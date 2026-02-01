import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para verificar se o usuário tem uma loja
 * CRITICAL: Verifica APENAS store_members (não stores.owner_id)
 * Se o usuário tem profile mas NÃO tem store_members, retorna false (deve ir para onboarding)
 * 
 * @returns { hasStore: boolean, isLoading: boolean }
 */
export function useHasStore() {
  const { user } = useAuth();

  const { data: hasStore, isLoading } = useQuery({
    queryKey: ['hasStore', user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;

      try {
        // CRITICAL: Verifica APENAS store_members
        // Se o usuário tem profile mas NÃO tem store_members, retorna false
        const { data: memberData, error: memberError } = await supabase
          .from('store_members')
          .select('id')
          .eq('user_id', user.id)
          .limit(1); // Usa limit(1) em vez de maybeSingle para melhor performance

        // Se houver erro 500 ou tabela não existe, retorna false (sem loja)
        if (memberError) {
          // PGRST116 = no rows returned (normal - usuário não tem loja)
          if (memberError.code === 'PGRST116') {
            return false;
          }
          // PGRST301 = relation does not exist (tabela não existe)
          if (memberError.code === 'PGRST301' || memberError.status === 500 || memberError.status === 400 || memberError.status === 406) {
            // Tabela não existe ou erro de RLS - retorna false (sem loja)
            console.warn('[useHasStore] Erro ao verificar store_members:', memberError);
            return false;
          }
          // Outros erros - retorna false (sem loja)
          console.warn('[useHasStore] Erro ao verificar store_members:', memberError);
          return false;
        }

        // Se encontrou pelo menos um membro, tem loja
        return (memberData && memberData.length > 0) || false;
      } catch (error) {
        // Em caso de erro, retorna false (sem loja)
        console.warn('[useHasStore] Erro ao verificar loja:', error);
        return false;
      }
    },
    enabled: !!user,
    retry: false,
    staleTime: 10000, // Cache por 10 segundos (reduzido para evitar loops)
    refetchOnWindowFocus: false, // Evita refetch desnecessário que pode causar loops
  });

  return {
    hasStore: hasStore ?? false,
    isLoading,
  };
}
