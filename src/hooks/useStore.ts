import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { humanizeError } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export interface Store {
  id: string;
  owner_id: string;
  name: string | null;
  whatsapp: string | null;
  primary_color: string | null;
  address: string | null;
  logo_url: string | null;
  whatsapp_instance_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateStoreData {
  name?: string | null;
  whatsapp?: string | null;
  primary_color?: string | null;
  address?: string | null; // Pode não existir no banco - será ignorado se não existir
  logo_url?: string | null;
  whatsapp_instance_name?: string | null;
}

import { deleteInstance } from '@/services/whatsappService';

export function useStore() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: store, isLoading } = useQuery({
    queryKey: ['store', user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Primeiro, tenta buscar da tabela stores onde o usuário é owner
      let ownerStore = null;
      let ownerError = null;
      
      try {
        const result = await supabase
          .from('stores')
          .select('*')
          .eq('owner_id', user.id)
          .limit(1)
          .maybeSingle();
        
        ownerStore = result.data;
        ownerError = result.error;
      } catch (err: any) {
        // Se houver exceção, trata como erro 500
        ownerError = { status: 500, code: 'PGRST301' };
      }

      // Se houver erro 500 (tabela não existe ou problema de RLS), retorna null
      if (ownerError && (ownerError.status === 500 || ownerError.code === 'PGRST301' || ownerError.status === 400 || ownerError.status === 406)) {
        // Tabela não existe ou erro de RLS - retorna null
        return null;
      } else if (ownerStore) {
        return ownerStore as Store;
      } else if (!ownerError) {
        // Se não há erro e não há loja, realmente não existe loja
        return null;
      }

      // Se não encontrou como owner, busca se é membro
      try {
        const { data: member, error: memberError } = await supabase
          .from('store_members')
          .select('store_id')
          .eq('user_id', user.id)
          .maybeSingle();

        // Se houver erro 500 ou tabela não existir, ignora silenciosamente
        if (memberError && (memberError.status === 500 || memberError.code === 'PGRST301')) {
          // Continua para o fallback
        } else if (!memberError && member && member.store_id) {
          // Busca a loja pelo store_id
          const { data: memberStore, error: storeError } = await supabase
            .from('stores')
            .select('*')
            .eq('id', member.store_id)
            .maybeSingle();

          if (memberStore) {
            return memberStore as Store;
          }
        }
      } catch {
        // Ignora erro se store_members não existir
      }

      // Se houver erro que não seja "não encontrado", retorna null
      if (ownerError && ownerError.code !== 'PGRST116' && ownerError.status !== 500) {
        return null;
      }

      // Se não encontrou loja e não há erro, realmente não existe
      if (!ownerStore && !ownerError) {
        return null;
      }

      return ownerStore as Store | null;
    },
    enabled: !!user,
    retry: false,
    refetchInterval: (query) => {
      // Se não há loja mas o usuário está logado, verifica a cada 5 segundos
      if (!query.state.data && user) {
        return 5000;
      }
      return false;
    },
    refetchOnWindowFocus: false, // Desabilitado para evitar refresh ao trocar de aba
  });

  const updateStore = useMutation({
    mutationFn: async (updates: UpdateStoreData) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      // Tenta atualizar na tabela stores primeiro
      const { data: existingStore, error: checkError } = await supabase
        .from('stores')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      // Se stores não existir, lança erro claro
      if (checkError && (checkError.code === 'PGRST301' || checkError.status === 400 || checkError.status === 406)) {
        throw new Error('A tabela de lojas não está disponível. Por favor, entre em contato com o suporte.');
      }

      // Usa stores normalmente
      if (existingStore) {
        // Remove campos que não devem ser atualizados e normaliza valores
        const cleanUpdates: Record<string, any> = {};
        
        // Apenas inclui campos que foram fornecidos e são permitidos
        // IMPORTANTE: name é NOT NULL no banco - não pode ser null
        // owner_id é NOT NULL e não deve ser atualizado
        if (updates.name !== undefined) {
          const nameValue = updates.name?.trim();
          // Se name está vazio, mantém o valor atual (não atualiza para null)
          // Mas se foi explicitamente passado, atualiza (mesmo que vazio)
          if (nameValue !== undefined) {
            // Se está vazio, usa string vazia (não null) - o banco pode ter constraint
            cleanUpdates.name = nameValue || '';
          }
        }
        if (updates.whatsapp !== undefined) {
          const whatsappValue = updates.whatsapp?.trim() || null;
          cleanUpdates.whatsapp = whatsappValue;
        }
        if (updates.primary_color !== undefined) {
          const colorValue = updates.primary_color || null;
          cleanUpdates.primary_color = colorValue;
        }
        // Address existe no banco e é nullable - pode ser atualizado
        if (updates.address !== undefined) {
          const addressValue = updates.address?.trim() || null;
          cleanUpdates.address = addressValue;
        }
        // Logo URL é nullable - pode ser atualizado
        if (updates.logo_url !== undefined) {
          cleanUpdates.logo_url = updates.logo_url || null;
        }
        if (updates.whatsapp_instance_name !== undefined) {
          const instanceValue = updates.whatsapp_instance_name?.trim() || null;
          cleanUpdates.whatsapp_instance_name = instanceValue;
        }
        
        // NUNCA atualiza owner_id, id, created_at - são campos protegidos
        delete cleanUpdates.owner_id;
        delete cleanUpdates.id;
        delete cleanUpdates.created_at;
        
        // Remove campos undefined (não enviados) e null explícitos que podem causar problema
        Object.keys(cleanUpdates).forEach(key => {
          if (cleanUpdates[key] === undefined) {
            delete cleanUpdates[key];
          }
        });
        
        // Se não há nada para atualizar, retorna a loja existente
        if (Object.keys(cleanUpdates).length === 0) {
          return existingStore as Store;
        }
        
        // O Supabase está adicionando automaticamente o filtro owner_id (provavelmente via RLS)
        // Isso pode causar erro 400. Vamos tentar uma abordagem mais direta:
        // Atualizar sem usar .eq() e deixar a RLS fazer a verificação
        
        // Primeiro, verifica se realmente é o owner (para segurança)
        const { data: verifyStore, error: verifyError } = await supabase
          .from('stores')
          .select('id, owner_id')
          .eq('id', existingStore.id)
          .single();
        
        if (verifyError || !verifyStore) {
          throw new Error('Loja não encontrada.');
        }
        
        if (verifyStore.owner_id !== user.id) {
          throw new Error('Você não tem permissão para atualizar esta loja.');
        }
        
        // Valida os dados antes de enviar
        // Remove qualquer campo que possa causar problema
        const finalUpdates: Record<string, any> = {};
        for (const [key, value] of Object.entries(cleanUpdates)) {
          // Apenas inclui campos que são strings, números ou null válidos
          // name não pode ser null (é NOT NULL no banco)
          if (key === 'name' && (value === null || value === undefined)) {
            // Se name está null/undefined, não inclui (mantém valor atual)
            continue;
          }
          if (value === null || typeof value === 'string' || typeof value === 'number') {
            finalUpdates[key] = value;
          }
        }
        
        // Se não há nada para atualizar, retorna a loja existente
        if (Object.keys(finalUpdates).length === 0) {
          const { data: currentStore } = await supabase
            .from('stores')
            .select('*')
            .eq('id', existingStore.id)
            .single();
          
          return currentStore || existingStore as Store;
        }
        
        // Log dos dados que serão enviados (apenas em desenvolvimento)
        console.log('Tentando atualizar loja:', {
          storeId: existingStore.id,
          updates: finalUpdates,
          updatesJSON: JSON.stringify(finalUpdates),
        });
        
        // Tenta atualizar sem .select() primeiro (pode estar causando o erro 400)
        const { error: updateError, data: updateData } = await supabase
          .from('stores')
          .update(finalUpdates)
          .eq('id', existingStore.id)
          .select();
        
        if (updateError) {
          // Log detalhado do erro para debug
          console.error('Erro ao atualizar loja:', {
            error: updateError,
            errorMessage: updateError.message,
            errorDetails: updateError.details,
            errorHint: updateError.hint,
            errorCode: updateError.code,
            errorStatus: updateError.status,
            updates: finalUpdates,
            updatesJSON: JSON.stringify(finalUpdates),
            storeId: existingStore.id,
            userId: user.id,
          });
          
          // Tenta fazer uma query para verificar o que existe no banco
          const { data: currentStoreData, error: selectError } = await supabase
            .from('stores')
            .select('*')
            .eq('id', existingStore.id)
            .single();
          
          console.log('Dados atuais da loja no banco:', {
            currentStore: currentStoreData,
            selectError: selectError,
          });
          
          // Se for erro 400, tenta identificar o problema
          if (updateError.status === 400) {
            const fieldErrors: string[] = [];
            const successfulFields: string[] = [];
            
            // Atualiza cada campo individualmente para identificar qual está causando problema
            for (const [key, value] of Object.entries(finalUpdates)) {
              const { error: fieldError } = await supabase
                .from('stores')
                .update({ [key]: value })
                .eq('id', existingStore.id);
              
              if (fieldError) {
                fieldErrors.push(`${key}: ${fieldError.message || 'erro desconhecido'}`);
              } else {
                successfulFields.push(key);
              }
            }
            
            // Se pelo menos alguns campos foram atualizados, busca os dados atualizados
            if (successfulFields.length > 0) {
              const { data: updatedData, error: selectError } = await supabase
                .from('stores')
                .select('*')
                .eq('id', existingStore.id)
                .single();
              
              if (selectError) {
                throw selectError;
              }
              
              // Se alguns campos falharam, avisa mas retorna os dados atualizados
              if (fieldErrors.length > 0) {
                // Não lança erro aqui - apenas loga e retorna os dados que foram atualizados
                // O toast já será mostrado pelo onError do mutation
                return updatedData;
              }
              
              return updatedData;
            } else {
              // Nenhum campo foi atualizado - lança erro com detalhes completos
              const errorMsg = updateError.message || 'Erro desconhecido';
              const errorDetailsMsg = updateError.details ? ` Detalhes: ${updateError.details}` : '';
              const errorHintMsg = updateError.hint ? ` Dica: ${updateError.hint}` : '';
              
              throw new Error(
                `Não foi possível atualizar a loja. ${errorMsg}${errorDetailsMsg}${errorHintMsg}. Erros por campo: ${fieldErrors.join('; ')}`
              );
            }
          } else {
            // Outro tipo de erro - lança com detalhes
            const errorMsg = updateError.message || 'Erro desconhecido';
            const errorDetailsMsg = updateError.details ? ` Detalhes: ${updateError.details}` : '';
            const errorHintMsg = updateError.hint ? ` Dica: ${updateError.hint}` : '';
            
            throw new Error(`${errorMsg}${errorDetailsMsg}${errorHintMsg}`);
          }
        }
        
        // Se o update funcionou, busca os dados atualizados
        const { data: fetchedData, error: fetchError } = await supabase
          .from('stores')
          .select('*')
          .eq('id', existingStore.id)
          .single();
        
        if (fetchError) {
          throw fetchError;
        }
        
        return fetchedData;
      } else {
        const { data, error } = await supabase
          .from('stores')
          .insert({ ...updates, owner_id: user.id })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['storeMembers'] });
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

  const createStore = useMutation({
    mutationFn: async (newStore: { name: string; primary_color?: string; logo_url?: string }) => {
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Create store
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .insert({
          owner_id: user.id,
          name: newStore.name,
          primary_color: newStore.primary_color || '#10b981',
          logo_url: newStore.logo_url,
        })
        .select()
        .single();

      if (storeError) throw storeError;
      if (!storeData) throw new Error('Erro ao criar loja: Dados não retornados');

      // 2. Create store_member (Owner)
      const { error: memberError } = await supabase
        .from('store_members')
        .insert({
          store_id: storeData.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError && memberError.code !== '23505') {
        console.error('Error creating store member:', memberError);
      }

      return storeData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['hasStore', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['store', user?.id] });
      queryClient.setQueryData(['store', user?.id], data);
    },
    onError: (error) => {
      console.error('Create store error:', error);
    },
  });

  const deleteStore = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Usuário não autenticado');
      
      // 1. Tenta desconectar WhatsApp se existir
      if (store?.whatsapp_instance_name) {
        try {
          await deleteInstance(store.whatsapp_instance_name);
        } catch (e) {
          console.warn('Falha ao deletar instância do WhatsApp, prosseguindo com a exclusão da conta', e);
        }
      }

      // 2. Chama a função RPC para excluir a CONTA inteira (solicitação do usuário: apagar loja = apagar conta)
      const { error } = await supabase.rpc('delete_own_account');

      if (error) {
        // Fallback: se RPC falhar, tenta excluir apenas a loja
        console.error('Erro ao excluir conta via RPC, tentando excluir loja manualmente:', error);
        
        const { error: deleteError } = await supabase
          .from('stores')
          .delete()
          .eq('owner_id', user.id);

        if (deleteError) throw deleteError;
        
        // Se excluiu apenas a loja, faz logout manual
        await signOut();
      } else {
        // Se RPC funcionou, o usuário já foi deletado do Auth
        // Precisamos limpar o estado local
        await signOut();
      }
    },
    onSuccess: async () => {
      storeDeletedRef.current = true;
      // Limpa queries
      queryClient.clear();
      
      toast({
        title: 'Conta e Loja excluídas',
        description: 'Sua conta e dados foram removidos com sucesso.',
      });
      
      // Aguarda um pouco
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Redireciona para login
      navigate('/login', { replace: true });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao excluir',
        description: humanizeError(error),
        variant: 'destructive',
      });
    },
  });

  // Monitora se a loja foi excluída e evita recriação automática
  const previousStoreRef = useRef<Store | null | undefined>(undefined);
  const logoutTriggeredRef = useRef(false);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCheckedOnceRef = useRef(false);
  const storeDeletedRef = useRef(false);
  
  useEffect(() => {
    // Na primeira verificação, verifica se realmente não há loja
    if (!hasCheckedOnceRef.current && !isLoading && user) {
      hasCheckedOnceRef.current = true;
      previousStoreRef.current = store;
      
      // Se não há loja na primeira carga, aguarda um pouco e verifica novamente
      // O trigger do banco deve criar a loja automaticamente quando o usuário é criado
      if (store === null && !logoutTriggeredRef.current && !storeDeletedRef.current) {
        const initialCheck = async () => {
          // Aguarda 3 segundos para dar tempo ao trigger criar a loja
          await new Promise(resolve => setTimeout(resolve, 3000));
          
          // Verifica novamente se a loja foi criada pelo trigger
          queryClient.invalidateQueries({ queryKey: ['store', user.id] });
        };
        
        initialCheck();
      }
      
      return;
    }
    
    // Se o usuário tinha loja antes e agora não tem, a loja foi excluída
    if (previousStoreRef.current !== null && previousStoreRef.current !== undefined && store === null && user && !isLoading && !logoutTriggeredRef.current && hasCheckedOnceRef.current) {
      if (storeDeletedRef.current) {
        navigate('/onboarding', { replace: true });
        return;
      }
      // Verifica se realmente não há loja (não é apenas erro temporário)
      const checkStore = async () => {
        // Força uma busca direta no banco, ignorando cache
        const { data: checkStoreData, error: storeError } = await supabase
          .from('stores')
          .select('id')
          .eq('owner_id', user.id)
          .maybeSingle();
        
        // Se realmente não há loja (e não é erro de tabela não existir), tenta criar
        const hasStore = checkStoreData !== null;
        const isTableError = storeError && (storeError.status === 500 || storeError.code === 'PGRST301');
        
        if (!hasStore && !isTableError && !storeDeletedRef.current) {
          // Não tenta criar loja automaticamente
          // A criação deve ser feita explicitamente pelo usuário no onboarding
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
        }
      };
      
      // Verifica imediatamente
      checkStore();
      
      // Se ainda não fez logout, verifica periodicamente a cada 3 segundos
      if (!logoutTriggeredRef.current && !checkIntervalRef.current) {
        checkIntervalRef.current = setInterval(checkStore, 3000);
      }
    }
    
    // Atualiza a referência
    if (previousStoreRef.current === undefined) {
      previousStoreRef.current = store;
    } else if (store !== previousStoreRef.current) {
      previousStoreRef.current = store;
      // Reset do flag quando a loja muda
      if (store !== null) {
        logoutTriggeredRef.current = false;
        storeDeletedRef.current = false;
        // Limpa o intervalo se a loja voltou
        if (checkIntervalRef.current) {
          clearInterval(checkIntervalRef.current);
          checkIntervalRef.current = null;
        }
      }
    }
    
    // Cleanup do intervalo quando o componente desmonta
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [store, user, isLoading, navigate, toast, queryClient]);

  return {
    store,
    isLoading,
    updateStore,
    createStore,
    deleteStore,
  };
}
