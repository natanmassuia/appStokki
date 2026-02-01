import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from './useStore';

export type UserRole = 'owner' | 'manager' | 'staff' | null;

export interface Permission {
  role: UserRole;
  canManageWhatsapp: boolean;
  canManageTeam: boolean;
  canDeleteStore: boolean;
  canManageStore: boolean;
  storeId: string | null;
}

export function usePermission(): Permission {
  const { user } = useAuth();
  const { store } = useStore();

  // Busca o role do usuário e a loja associada
  const { data: permissionData } = useQuery({
    queryKey: ['permission', user?.id],
    queryFn: async (): Promise<{ role: UserRole; storeId: string | null }> => {
      if (!user) return { role: null, storeId: null };

      // Primeiro, tenta encontrar a loja onde o usuário é owner
      try {
        let ownerStore = null;
        let ownerError = null;
        
        try {
          const result = await supabase
            .from('stores')
            .select('id, owner_id')
            .eq('owner_id', user.id)
            .maybeSingle();
          
          ownerStore = result.data;
          ownerError = result.error;
        } catch (err: any) {
          // Se houver exceção, trata como erro 500
          ownerError = { status: 500 };
        }

        // Se houver erro 500, retorna null
        if (ownerError && ownerError.status === 500) {
          return { role: null, storeId: null };
        } else if (ownerStore) {
          return { role: 'owner', storeId: ownerStore.id };
        }
      } catch {
        // Erro ao buscar stores - retorna null
        return { role: null, storeId: null };
      }

      // Se não é owner, busca em store_members
      try {
        const { data: member, error } = await supabase
          .from('store_members')
          .select('role, store_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          // Se a tabela não existir ou houver erro 500, retorna null silenciosamente
          if (error.code === 'PGRST301' || 
              error.status === 400 || 
              error.status === 406 || 
              error.status === 500) {
            return { role: null, storeId: null };
          }
          return { role: null, storeId: null };
        }

        if (member) {
          return { 
            role: (member.role as UserRole) || null, 
            storeId: member.store_id || null 
          };
        }
      } catch {
        // Ignora erro silenciosamente
        return { role: null, storeId: null };
      }

      return { role: null, storeId: null };
    },
    enabled: !!user,
    retry: false,
  });

  const role: UserRole = permissionData?.role || (store?.owner_id === user?.id ? 'owner' : null);
  const storeId = permissionData?.storeId || store?.id || null;
  
  // Se o usuário é owner da loja (mesmo sem store_members), permite exclusão
  const isOwner = role === 'owner' || store?.owner_id === user?.id;

  return {
    role,
    storeId,
    canManageWhatsapp: isOwner || role === 'manager',
    canManageTeam: isOwner || role === 'manager',
    canDeleteStore: isOwner, // Apenas owners podem excluir
    canManageStore: isOwner || role === 'manager',
  };
}
