import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/hooks/useStore';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { 
  createInstance, 
  connectInstance, 
  fetchStatus, 
  logoutInstance,
  deleteInstance,
  fetchInstanceInfo,
  ConnectionState 
} from '@/services/whatsappService';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { MessageCircle, Loader2, CheckCircle2, XCircle, QrCode, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface WhatsAppModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function WhatsAppModal({ open, onOpenChange }: WhatsAppModalProps) {
  const { user } = useAuth();
  const { store } = useStore();
  const { settings, updateSettings } = useStoreSettings();
  const { toast } = useToast();
  
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [qrCode, setQrCode] = useState<string>('');
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [instanceName, setInstanceName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const qrCodeRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasAutoClosedRef = useRef<boolean>(false); // Flag para rastrear se já fechou automaticamente
  const isGeneratingQRRef = useRef<boolean>(false); // Flag para rastrear se está gerando QR Code

  // Gera nome da instância baseado no user ID
  const generateInstanceName = () => {
    if (!user?.id) return '';
    return `user_${user.id.replace(/-/g, '_')}`;
  };

  // Carrega status inicial ao montar o componente
  useEffect(() => {
    // Se está gerando QR Code, não interfere
    if (isGeneratingQRRef.current) {
      return;
    }
    
    // Se já está conectado, não precisa verificar novamente
    if (status === 'connected') {
      return;
    }
    
    if (user && settings && open) {
      // Gera o nome da instância baseado no user atual
      const currentInstanceName = generateInstanceName();
      setInstanceName(currentInstanceName);
      
      const storedInstanceName = settings.whatsapp_instance_name;
      
      // Se há uma instância salva no banco
      if (storedInstanceName) {
        // Verifica se corresponde ao usuário atual
        if (storedInstanceName === currentInstanceName) {
          // É a instância correta, verifica status silenciosamente (não inicia polling)
          // Isso apenas atualiza o estado, mas não fecha o modal
          // Usa silent=true para evitar logs desnecessários
          checkConnectionStatus(storedInstanceName, true).catch(() => {
            // Se der erro ao verificar (404 = instância não existe), limpa do banco
            // Isso acontece quando a instância foi deletada mas ainda está salva no banco
            updateStoreSettings({ whatsapp_instance_name: null }).catch(() => {
              // Silenciosamente ignora erros ao limpar
            });
            setStatus('disconnected');
          });
        } else {
          // Instância de outro usuário, limpa e usa a nova
          updateStoreSettings({ whatsapp_instance_name: null }).catch(() => {
            // Silenciosamente ignora erros ao limpar instância antiga
          });
          setStatus('disconnected');
        }
      } else {
        // Não há instância salva, apenas define como desconectado
        setStatus('disconnected');
      }
    } else if (user && open) {
      setInstanceName(generateInstanceName());
      setStatus('disconnected');
    }
  }, [user, settings, open]);

  // NÃO fecha modal automaticamente quando conectar
  // O usuário deve fechar manualmente para ter controle
  // Removido o auto-close para evitar que o modal suma quando o QR Code está sendo exibido

  // Reseta a flag quando o modal fecha ou quando desconecta
  useEffect(() => {
    if (!open) {
      // Quando o modal fecha, reseta a flag para permitir fechar automaticamente na próxima conexão
      // Mas só se o status não for 'connected' (ou seja, se foi fechado manualmente ou desconectado)
      if (status !== 'connected') {
        hasAutoClosedRef.current = false;
      }
    }
  }, [open, status]);

  // Reseta a flag quando desconecta
  useEffect(() => {
    if (status === 'disconnected') {
      hasAutoClosedRef.current = false;
    }
  }, [status]);

  // Limpa intervalos ao desmontar ou fechar modal
  useEffect(() => {
    if (!open) {
      isGeneratingQRRef.current = false; // Reseta flag quando fecha
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
      if (qrCodeRefreshIntervalRef.current) {
        clearInterval(qrCodeRefreshIntervalRef.current);
        qrCodeRefreshIntervalRef.current = null;
      }
    }
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (qrCodeRefreshIntervalRef.current) {
        clearInterval(qrCodeRefreshIntervalRef.current);
      }
    };
  }, [open]);

  // Verifica status de conexão
  const checkConnectionStatus = async (instance: string, silent = false) => {
    try {
      const connectionState = await fetchStatus(instance);
      
      // Se retornou null, a instância não existe ou servidor não disponível
      if (connectionState === null) {
        // Se há uma instância salva no banco mas ela não existe mais, limpa
        if (settings?.whatsapp_instance_name === instance) {
          updateStoreSettings({ whatsapp_instance_name: null }).catch(() => {
            // Silenciosamente ignora erros ao limpar
          });
        }
        if (!silent) {
          setStatus('disconnected');
        }
        return;
      }
      
      const connectionStatus = connectionState.instance?.state || connectionState.instance?.status;
      
      if (connectionStatus === 'open' || connectionStatus === 'connected') {
        setStatus('connected');
        // Limpa QR Code quando conectar (não precisa mais)
        // Mas só limpa se realmente estava conectando (tinha QR Code)
        if (qrCode) {
          isGeneratingQRRef.current = false; // Reseta flag quando conectar
          setQrCode('');
          // Para refresh do QR Code
          if (qrCodeRefreshIntervalRef.current) {
            clearInterval(qrCodeRefreshIntervalRef.current);
            qrCodeRefreshIntervalRef.current = null;
          }
          // Mostra toast de sucesso quando conectar via QR Code
          if (!silent) {
            toast({
              title: 'WhatsApp conectado!',
              description: 'Sua conta WhatsApp foi conectada com sucesso.',
            });
            // FECHA O MODAL AUTOMATICAMENTE após 1.5 segundos (tempo para ver o toast)
            setTimeout(() => {
              onOpenChange(false);
            }, 1500);
          }
        }
        // Busca informações da instância para obter número de telefone
        try {
          const info = await fetchInstanceInfo(instance);
          if (info && info.phone?.phoneNumber) {
            setPhoneNumber(info.phone.phoneNumber);
          }
        } catch (err: any) {
          // Não é crítico, apenas não mostra o número
        }
        stopPolling();
      } else if (connectionStatus === 'connecting') {
        setStatus('connecting');
      } else {
        if (!silent) {
          setStatus('disconnected');
        }
      }
    } catch (err: any) {
      // Se a instância não existe (404), limpa do banco e considera desconectado (sem erro)
      if (err.message?.includes('not found') || err.message?.includes('404') || err.message?.includes('Instância não encontrada') || err.message?.includes('Conexão perdida')) {
        setStatus('disconnected');
        // Remove instância do banco se não existir mais
        if (instance) {
          try {
            await updateStoreSettings({ whatsapp_instance_name: null });
          } catch (updateErr) {
            // Silenciosamente ignora erros ao limpar instância
          }
        }
      } else {
        setStatus('disconnected');
        // Não mostra erro para o usuário, apenas considera desconectado
      }
    }
  };

  // Inicia polling para verificar status
  const startPolling = (instance: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }
    
    pollingIntervalRef.current = setInterval(() => {
      checkConnectionStatus(instance);
    }, 3000); // Verifica a cada 3 segundos para detecção mais rápida
  };

  // Para polling
  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // Atualiza QR Code periodicamente (expira após ~40 segundos)
  const refreshQRCode = async (instance: string) => {
    try {
      const newQrCode = await connectInstance(instance);
      if (newQrCode) {
        setQrCode(newQrCode);
      }
    } catch (err) {
      // Silenciosamente ignora erros ao atualizar QR Code
    }
  };

  // Inicia refresh do QR Code
  const startQRCodeRefresh = (instance: string) => {
    if (qrCodeRefreshIntervalRef.current) {
      clearInterval(qrCodeRefreshIntervalRef.current);
    }
    
    // Atualiza QR Code a cada 30 segundos
    qrCodeRefreshIntervalRef.current = setInterval(() => {
      refreshQRCode(instance);
    }, 30000);
  };

  // Para refresh do QR Code
  const stopQRCodeRefresh = () => {
    if (qrCodeRefreshIntervalRef.current) {
      clearInterval(qrCodeRefreshIntervalRef.current);
      qrCodeRefreshIntervalRef.current = null;
    }
  };

  // Atualiza stores no Supabase
  const updateStoreSettings = async (updates: { whatsapp_instance_name?: string | null }) => {
    if (!user || !store) return;
    
    try {
      // Prepara updates limpos (apenas whatsapp_instance_name)
      const cleanUpdates: Record<string, any> = {};
      if (updates.whatsapp_instance_name !== undefined) {
        cleanUpdates.whatsapp_instance_name = updates.whatsapp_instance_name?.trim() || null;
      }
      
      // Se não há nada para atualizar, retorna
      if (Object.keys(cleanUpdates).length === 0) {
        return;
      }
      
      // Atualiza a loja diretamente na tabela stores
      // Usa apenas o ID - RLS policy deve verificar owner_id automaticamente
      // Não usa .select() para evitar problemas com erro 400
      const { error } = await supabase
        .from('stores')
        .update(cleanUpdates)
        .eq('id', store.id);
      
      if (error) {
        // Log do erro para debug
        console.error('Erro ao atualizar whatsapp_instance_name:', {
          error: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          status: error.status,
          updates: cleanUpdates,
          storeId: store.id,
        });
        // Não lança erro - deixa o fluxo continuar mesmo se falhar ao salvar
        // O whatsapp_instance_name é opcional e não deve bloquear a conexão
      }
    } catch (err) {
      // Silenciosamente ignora erros ao atualizar configurações
      // Erro não crítico - não precisa logar
    }
  };

  // Conecta WhatsApp
  const handleConnect = async () => {
    if (!user || !instanceName) {
      toast({
        title: 'Erro',
        description: 'Usuário não autenticado',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    setError('');
    setStatus('connecting');

    try {
      // Verifica se a instância já existe
      // NOTA: Se a instância não existir, fetchStatus retorna null (não lança erro)
      // O navegador pode logar um 404 no console, mas isso é esperado e não é um erro
      let instanceExists = false;
      const status = await fetchStatus(instanceName);
      
      if (status === null) {
        // Instância não existe (404) - caso esperado ao criar uma nova instância
        // O 404 no console é normal e não afeta o funcionamento
        instanceExists = false;
        // Limpa o whatsapp_instance_name do banco se estava salvo de outra conta (não bloqueia se falhar)
        if (settings?.whatsapp_instance_name && settings.whatsapp_instance_name !== instanceName) {
          updateStoreSettings({ whatsapp_instance_name: null }).catch(() => {
            // Erro ao limpar não deve bloquear o fluxo
          });
        }
      } else {
        // Instância existe
        instanceExists = true;
        
        // Se já está conectada, atualiza o estado mas NÃO fecha o modal
        // O usuário pode querer ver as informações ou desconectar
        if (status.instance?.state === 'open' || status.instance?.status === 'connected') {
          setStatus('connected');
          // Limpa QR Code se estava sendo exibido
          setQrCode('');
          // Para refresh do QR Code se estava rodando
          if (qrCodeRefreshIntervalRef.current) {
            clearInterval(qrCodeRefreshIntervalRef.current);
            qrCodeRefreshIntervalRef.current = null;
          }
          // Busca informações da instância
          try {
            const info = await fetchInstanceInfo(instanceName);
            if (info && info.phone?.phoneNumber) {
              setPhoneNumber(info.phone.phoneNumber);
            }
          } catch (err) {
            // Silenciosamente ignora erros ao buscar número
          }
          // NÃO retorna aqui - deixa o modal aberto para o usuário ver o status
          setIsLoading(false);
          return;
        }
      }
      
      // Se a instância não existe, tenta criar uma nova
      if (!instanceExists) {
        const response = await createInstance(instanceName);
        
        // Se retornou null, significa que a instância já existe (erro 403 tratado)
        if (response === null) {
          instanceExists = true;
        } else {
          instanceExists = true;
        }
      }
      
      // Salva nome da instância no banco (não bloqueia se falhar)
      updateStoreSettings({ whatsapp_instance_name: instanceName }).catch((err) => {
        // Erro ao salvar no banco não deve bloquear o fluxo de conexão
        // O usuário pode continuar mesmo se não salvar no banco
        if (import.meta.env.DEV) {
          console.warn('Não foi possível salvar whatsapp_instance_name no banco:', err);
        }
      });

      // Busca QR Code (tanto para instância nova quanto existente)
      let qrCodeData = '';
      try {
        qrCodeData = await connectInstance(instanceName);
      } catch (err: any) {
        // Se não conseguir buscar QR Code, mas a instância existe, verifica status
        if (instanceExists) {
          const status = await fetchStatus(instanceName);
          if (status && (status.instance?.state === 'open' || status.instance?.status === 'connected')) {
            setStatus('connected');
            return;
          }
        }
        throw new Error('Não foi possível gerar o QR Code. Aguarde um momento e tente novamente.');
      }

      if (qrCodeData) {
        // Marca que está gerando QR Code para evitar interferência do useEffect
        isGeneratingQRRef.current = true;
        
        // Normaliza o QR Code (remove prefixo duplicado se existir)
        let normalizedQrCode = qrCodeData;
        if (normalizedQrCode.startsWith('data:image/png;base64,data:image/png;base64,')) {
          normalizedQrCode = normalizedQrCode.replace('data:image/png;base64,data:image/png;base64,', 'data:image/png;base64,');
        } else if (!normalizedQrCode.startsWith('data:')) {
          // Se não tem prefixo, adiciona
          normalizedQrCode = `data:image/png;base64,${normalizedQrCode}`;
        }
        
        setQrCode(normalizedQrCode);
        setStatus('connecting');
        
        // Inicia polling para verificar quando conectar
        startPolling(instanceName);
        
        // Inicia refresh do QR Code
        startQRCodeRefresh(instanceName);
        
        // Reseta a flag após um pequeno delay para permitir que o QR Code seja exibido
        setTimeout(() => {
          isGeneratingQRRef.current = false;
        }, 1000);
      } else {
        throw new Error('Não foi possível gerar o QR Code. Aguarde um momento e tente novamente.');
      }
    } catch (err: any) {
      setStatus('error');
      
      // Humaniza mensagens de erro
      let errorMessage = 'Ocorreu um erro inesperado. Tente novamente.';
      if (err.message?.includes('not found') || err.message?.includes('404') || err.message?.includes('Instância não encontrada')) {
        errorMessage = 'Conexão perdida. Por favor, conecte novamente.';
      } else if (err.message?.includes('QR Code')) {
        errorMessage = 'Não foi possível gerar o QR Code. Aguarde um momento e tente novamente.';
      } else if (err.message?.includes('Network') || err.message?.includes('fetch')) {
        errorMessage = 'Falha na conexão. Verifique sua internet.';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      toast({
        title: 'Erro ao conectar',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Desconecta WhatsApp e DELETA a instância completamente (reset)
  const handleDisconnect = async () => {
    if (!instanceName) return;

    setIsLoading(true);
    setError('');

    try {
      // Primeiro tenta fazer logout (pode falhar se já estiver desconectado, não é crítico)
      try {
        await logoutInstance(instanceName);
      } catch (logoutErr: any) {
        // Continua mesmo se logout falhar
      }
      
      // DELETA completamente a instância (reset total)
      try {
        await deleteInstance(instanceName);
      } catch (deleteErr: any) {
        // Se 404, a instância já não existe (não é erro)
        // Outro erro - tenta continuar mesmo assim
      }
      
      // Remove instância do banco de dados
      await updateStoreSettings({ whatsapp_instance_name: null });
      
      // Limpa todo o estado
      setStatus('disconnected');
      setQrCode('');
      setPhoneNumber('');
      stopPolling();
      stopQRCodeRefresh();
      
      // Fecha o modal após desconectar
      onOpenChange(false);
      
      toast({
        title: 'WhatsApp desconectado e resetado',
        description: 'A instância foi completamente removida. Ao conectar novamente, uma nova instância será criada.',
      });
    } catch (err: any) {
      const errorMessage = err.message || 'Ocorreu um erro ao desconectar. Tente novamente.';
      setError(errorMessage);
      toast({
        title: 'Erro ao desconectar',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handler para controlar quando o modal pode ser fechado
  const handleOpenChange = (newOpen: boolean) => {
    // Se está tentando fechar e há QR Code sendo exibido, não permite fechar
    // (usuário deve escanear o QR Code primeiro)
    if (!newOpen && qrCode && status === 'connecting') {
      // Não fecha se há QR Code sendo exibido
      return;
    }
    
    // Se está tentando fechar e está carregando, não permite fechar
    if (!newOpen && isLoading) {
      return;
    }
    
    // Permite fechar normalmente
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <MessageCircle className="h-6 w-6 text-primary" />
            Integração WhatsApp
          </DialogTitle>
          <DialogDescription>
            Conecte sua conta WhatsApp para enviar notificações automáticas e recibos para seus clientes.
          </DialogDescription>
        </DialogHeader>

        {error && status === 'error' && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {status === 'disconnected' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold">Benefícios:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>Notificações automáticas de vendas</li>
                <li>Envio de recibos para clientes</li>
                <li>Comunicação direta com clientes</li>
                <li>Integração completa com o sistema</li>
              </ul>
            </div>
            <Button 
              onClick={handleConnect} 
              disabled={isLoading || !user}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando QR CODE...
                </>
              ) : (
                <>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Conectar WhatsApp
                </>
              )}
            </Button>
          </div>
        )}

        {status === 'connecting' && (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Escanear QR Code</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Use seu WhatsApp para escanear o código abaixo
              </p>
            </div>
            {qrCode ? (
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white rounded-lg border-2 border-dashed border-primary/20">
                  <img 
                    src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                    alt="QR Code WhatsApp" 
                    className="w-64 h-64"
                  />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    <QrCode className="inline h-4 w-4 mr-1" />
                    Abra o WhatsApp no seu celular
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Vá em <strong>Aparelhos Conectados</strong> → <strong>Escanear código QR</strong>
                  </p>
                  <p className="text-xs text-muted-foreground mt-4">
                    O QR Code será atualizado automaticamente a cada 30 segundos
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <p className="text-sm text-primary font-medium animate-pulse">
                      Aguardando leitura do código...
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleDisconnect}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-4 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Carregando QR Code...</p>
              </div>
            )}
          </div>
        )}

        {status === 'connected' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">WhatsApp Conectado</h3>
                <p className="text-sm text-muted-foreground">
                  Sua conta WhatsApp está conectada e pronta para uso
                </p>
              </div>
              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Conectado
              </Badge>
            </div>
            <div className="space-y-2 p-4 bg-muted/50 rounded-lg">
              {phoneNumber && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Número Conectado:</span>
                  <span className="text-sm text-muted-foreground">{phoneNumber}</span>
                </div>
              )}
              {!phoneNumber && (
                 <div className="text-center text-sm text-muted-foreground">
                   Conexão ativa e pronta para enviar mensagens.
                 </div>
              )}
            </div>
            <Button 
              variant="destructive" 
              onClick={handleDisconnect}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Desconectando...
                </>
              ) : (
                <>
                  <XCircle className="mr-2 h-4 w-4" />
                  Desconectar WhatsApp
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
