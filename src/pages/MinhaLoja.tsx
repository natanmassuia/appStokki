import { useState, useEffect, useRef } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useStore } from '@/hooks/useStore';
import { usePermission } from '@/hooks/usePermission';
import { useStoreMembers } from '@/hooks/useStoreMembers';
import { useAuth } from '@/contexts/AuthContext';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { fetchStatus } from '@/services/whatsappService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Save, Palette, MessageCircle, Users, Mail, UserPlus, Trash2, Lock, CheckCircle2, XCircle, Store, Globe, Smartphone, Instagram, AlertTriangle, ImagePlus, Upload, Database, FileSpreadsheet, Download } from 'lucide-react';
import { WhatsAppModal } from '@/components/WhatsAppModal';
import { GlobalImportModal } from '@/components/GlobalImportModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { StoreLivePreview } from '@/components/store/StoreLivePreview';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';

import { PageHeader } from '@/components/ui/PageHeader';

export default function MinhaLoja() {
  const { user } = useAuth();
  const { store, isLoading, updateStore, deleteStore } = useStore();
  const { role, canManageWhatsapp, canManageTeam, canDeleteStore } = usePermission();
  const { members, isLoading: membersLoading, inviteMember, removeMember } = useStoreMembers();
  const { settings, updateSettings } = useStoreSettings();
  const { toast } = useToast();
  
  // Dados Reais (Persistidos)
  const [storeName, setStoreName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#10b981');
  const [address, setAddress] = useState('');
  
  // Upload Logo State
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dados Simulados (Novos campos solicitados - UI Only por enquanto)
  const [slug, setSlug] = useState('');
  const [acceptOrders, setAcceptOrders] = useState(true);
  const [showAddress, setShowAddress] = useState(true);
  const [supportEmail, setSupportEmail] = useState('');
  const [instagram, setInstagram] = useState('');
  
  const [confirmSave, setConfirmSave] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');
  
  // Estados para gestão de equipe
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'staff'>('staff');
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  
  // Estados para exclusão da loja
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetDataConfirm, setShowResetDataConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [resetDataLoading, setResetDataLoading] = useState(false);

  // Sincroniza estados quando store carrega
  useEffect(() => {
    if (store) {
      setStoreName(store.name || '');
      setWhatsapp(store.whatsapp || '');
      setPrimaryColor(store.primary_color || '#10b981');
      setAddress(store.address || '');
      
      // Inicializa slug baseado no nome se vazio
      if (!slug && store.name) {
        setSlug(store.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
      }
      
      // Inicializa email se disponível no user
      if (!supportEmail && user?.email) {
        setSupportEmail(user.email);
      }
    }
  }, [store, user]);

  // ... (Mantenho o useEffect do WhatsApp inalterado)
  useEffect(() => {
    const checkWhatsAppStatus = async () => {
      if (!user || !settings?.whatsapp_instance_name) {
        setWhatsappStatus('disconnected');
        return;
      }

      setWhatsappStatus('checking');
      try {
        const status = await fetchStatus(settings.whatsapp_instance_name);
        if (status && (status.instance?.state === 'open' || status.instance?.status === 'connected')) {
          setWhatsappStatus('connected');
        } else {
          if (status === null && settings.whatsapp_instance_name && updateSettings?.mutateAsync) {
            updateSettings.mutateAsync({ whatsapp_instance_name: null }).catch(() => {});
          }
          setWhatsappStatus('disconnected');
        }
      } catch (err) {
        if (settings?.whatsapp_instance_name && updateSettings?.mutateAsync) {
          updateSettings.mutateAsync({ whatsapp_instance_name: null }).catch(() => {});
        }
        setWhatsappStatus('disconnected');
      }
    };

    checkWhatsAppStatus();
    const interval = setInterval(checkWhatsAppStatus, 30000);
    return () => clearInterval(interval);
  }, [user, settings?.whatsapp_instance_name, isWhatsAppModalOpen]);

  useEffect(() => {
  }, [store, isLoading, user]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 2MB.',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      // Use user.id or store.id for path to keep it organized. user.id matches policies usually.
      const fileName = `${user?.id}/store-logo-${Date.now()}.${fileExt}`;

      // Upload to 'product-images' bucket since we know it works
      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('product-images').getPublicUrl(fileName);
      const publicUrl = data.publicUrl;

      // Update store logo immediately
      await updateStore.mutateAsync({
        logo_url: publicUrl
      });

      toast({
        title: 'Logo atualizada!',
        description: 'A nova logo foi salva com sucesso.',
      });

    } catch (error: any) {
      console.error('Upload error:', error);
      
      let errorMessage = error.message;
      
      if (error.message.includes('Bucket not found') || error.message.includes('not found')) {
        errorMessage = "O bucket 'product-images' não foi encontrado. Por favor, crie-o no painel do Supabase (Storage > New Bucket > 'product-images' público).";
      }

      toast({
        title: 'Erro no upload',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUploadingLogo(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = () => {
    setConfirmSave(true);
  };

  const handleConfirmSave = async () => {
    setConfirmSave(false);
    
    // Salva os dados reais
    await updateStore.mutateAsync({
      name: storeName.trim() || '',
      whatsapp: whatsapp.trim() || null,
      primary_color: primaryColor,
      address: address.trim() || null,
    });
    
    // Simula salvamento dos novos campos
    toast({
      title: "Configurações salvas",
      description: "As configurações da loja foram atualizadas com sucesso.",
    });
  };

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast({
        title: 'Email obrigatório',
        description: 'Por favor, informe o email do membro a ser convidado.',
        variant: 'destructive',
      });
      return;
    }

    await inviteMember.mutateAsync({
      target_email: inviteEmail.trim(),
      target_role: inviteRole,
    });

    setInviteEmail('');
    setInviteRole('staff');
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    await removeMember.mutateAsync(memberToRemove);
    setMemberToRemove(null);
  };

  const handleResetStoreData = async () => {
    if (!store?.id) return;
    
    setResetDataLoading(true);
    try {
      // Deletes all operational data but keeps settings/customers
      // Note: Delete order matters if there are FK constraints, but standard RLS might allow parallel.
      // Usually Transactions -> Products. But here we are wiping everything.
      
      const { error: tError } = await supabase.from('transactions').delete().eq('store_id', store.id);
      if (tError) throw tError;

      const { error: pError } = await supabase.from('products').delete().eq('store_id', store.id);
      if (pError) throw pError;

      const { error: eError } = await supabase.from('expenses').delete().eq('store_id', store.id);
      if (eError) throw eError;

      toast({
        title: 'Dados resetados com sucesso',
        description: 'Seu estoque, vendas e despesas foram limpos. As configurações foram mantidas.',
      });
      setShowResetDataConfirm(false);
    } catch (error: any) {
      console.error('Reset error:', error);
      toast({
        title: 'Erro ao resetar dados',
        description: error.message || 'Ocorreu um erro ao tentar limpar os dados.',
        variant: 'destructive',
      });
    } finally {
      setResetDataLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Proprietário';
      case 'manager': return 'Gerente';
      case 'staff': return 'Colaborador';
      default: return role;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'default';
      case 'manager': return 'secondary';
      case 'staff': return 'outline';
      default: return 'outline';
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Minha Loja">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  // Define tabs
  const tabsToShow = [
    { value: 'identidade', label: 'Identidade Visual' },
    { value: 'catalogo', label: 'Catálogo' },
    { value: 'contato', label: 'Contato' },
    { value: 'dados', label: 'Dados e Importação' },
  ];
  
  if (canManageTeam || role === 'owner' || store?.owner_id === user?.id) {
    tabsToShow.push({ value: 'equipe', label: 'Equipe' });
  }
  
  if (canManageWhatsapp || role === 'owner' || store?.owner_id === user?.id) {
    tabsToShow.push({ value: 'whatsapp', label: 'WhatsApp' });
  }

  return (
    <AppLayout title="Minha Loja">
      <div className="max-w-4xl mx-auto space-y-8 pb-10">
        <PageHeader 
          title="Configurações" 
          description="Personalize sua loja e perfil."
        />
        <Tabs defaultValue="identidade" className="w-full">
          <TabsList className="w-full justify-start h-auto p-1 bg-transparent border-b rounded-none mb-6 gap-2 overflow-x-auto flex-nowrap">
            {tabsToShow.map((tab) => (
              <TabsTrigger 
                key={tab.value} 
                value={tab.value}
                className="data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2 border-b-2 border-transparent transition-all"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {/* TAB 1: IDENTIDADE VISUAL */}
          <TabsContent value="identidade" className="space-y-6 animate-in fade-in-50">
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="h-5 w-5 text-primary" />
                    Identidade da Loja
                  </CardTitle>
                  <CardDescription>
                    Personalize como sua loja aparece para os clientes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="storeName">Nome da Loja</Label>
                    <Input
                      id="storeName"
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      placeholder="Ex: Loja do Natan"
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label className="block mb-2">Logo da Loja</Label>
                    <div className="flex items-center gap-4">
                      <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <Avatar className="h-20 w-20 border-2 border-dashed border-muted-foreground/50 hover:border-primary transition-colors">
                          <AvatarImage src={store?.logo_url || ''} className="object-cover" />
                          <AvatarFallback className="bg-transparent">
                            <ImagePlus className="h-8 w-8 text-muted-foreground" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          <Upload className="h-6 w-6 text-white" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">Faça upload da sua logo</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          Recomendado: 500x500px (PNG ou JPG)
                        </p>
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleLogoUpload}
                        />
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingLogo}
                        >
                          {isUploadingLogo ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Upload className="h-3 w-3 mr-2" />}
                          {isUploadingLogo ? 'Enviando...' : 'Escolher Arquivo'}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="primaryColor" className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Cor Primária
                    </Label>
                    <div className="flex items-center gap-4 mt-2">
                      <input
                        id="primaryColor"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-16 rounded cursor-pointer border-0 p-0"
                      />
                      <Input
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#10b981"
                        className="flex-1 font-mono"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  
                  <div className="pt-4">
                    <Button 
                      onClick={handleSave} 
                      className="w-full"
                      disabled={updateStore.isPending}
                    >
                      {updateStore.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Salvar Alterações
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Live Preview */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider font-semibold ml-1">Live Preview</Label>
                <StoreLivePreview 
                  name={storeName} 
                  logoUrl={store?.logo_url || null} 
                  primaryColor={primaryColor} 
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: CONFIGURAÇÕES DO CATÁLOGO */}
          <TabsContent value="catalogo" className="space-y-6 animate-in fade-in-50">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Configurações do Catálogo
                </CardTitle>
                <CardDescription>
                  Defina como seu catálogo funciona e é acessado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="slug">URL da Loja (Slug)</Label>
                  <div className="flex mt-2">
                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                      appstokki.com.br/
                    </span>
                    <Input
                      id="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      className="rounded-l-none"
                      placeholder="loja-do-natan"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Endereço único para seus clientes acessarem seu catálogo.
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-base">Aceitar Pedidos via WhatsApp</Label>
                    <p className="text-sm text-muted-foreground">
                      Seus clientes poderão enviar pedidos diretamente para seu WhatsApp.
                    </p>
                  </div>
                  <Switch 
                    checked={acceptOrders}
                    onCheckedChange={setAcceptOrders}
                  />
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-base">Mostrar Endereço no Rodapé</Label>
                    <p className="text-sm text-muted-foreground">
                      Exibir o endereço físico da loja no rodapé do catálogo.
                    </p>
                  </div>
                  <Switch 
                    checked={showAddress}
                    onCheckedChange={setShowAddress}
                  />
                </div>
                
                <div className="pt-2">
                  <Button onClick={handleSave} disabled={updateStore.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Configurações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 3: CONTATO */}
          <TabsContent value="contato" className="space-y-6 animate-in fade-in-50">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  Informações de Contato
                </CardTitle>
                <CardDescription>
                  Canais de atendimento para seus clientes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label htmlFor="whatsapp">WhatsApp Principal</Label>
                    <div className="relative mt-2">
                      <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="whatsapp"
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="supportEmail">Email de Suporte</Label>
                    <div className="relative mt-2">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="supportEmail"
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        placeholder="contato@sualoja.com"
                        className="pl-9"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="instagram">Instagram</Label>
                    <div className="relative mt-2">
                      <Instagram className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="instagram"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder="@sualoja"
                        className="pl-9"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="address">Endereço Completo</Label>
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Rua Exemplo, 123 - Centro"
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button onClick={handleSave} disabled={updateStore.isPending}>
                    <Save className="mr-2 h-4 w-4" />
                    Salvar Contatos
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB 4: EQUIPE */}
          {canManageTeam && (
            <TabsContent value="equipe" className="animate-in fade-in-50">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Gestão de Equipe
                  </CardTitle>
                  <CardDescription>
                    Gerencie os membros da sua equipe e suas permissões.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Formulário de Convite */}
                  <div className="p-4 rounded-lg border bg-muted/20">
                    <Label className="text-sm font-medium mb-3 block">Convidar Novo Membro</Label>
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-1">
                        <Input
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                      <div className="w-full md:w-40">
                        <Select value={inviteRole} onValueChange={(value: 'manager' | 'staff') => setInviteRole(value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manager">Gerente</SelectItem>
                            <SelectItem value="staff">Colaborador</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleInviteMember}
                        disabled={inviteMember.isPending || !inviteEmail.trim()}
                      >
                        {inviteMember.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4 mr-2" />}
                        Convidar
                      </Button>
                    </div>
                  </div>

                  {/* Lista de Membros */}
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Membro</TableHead>
                          <TableHead>Função</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={member.profiles?.avatar_url || ''} />
                                  <AvatarFallback>{member.profiles?.full_name?.[0] || 'U'}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-sm">{member.profiles?.full_name || 'Usuário'}</p>
                                  <p className="text-xs text-muted-foreground">{member.user_id.substring(0, 8)}...</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={getRoleBadgeVariant(member.role)}>
                                {getRoleLabel(member.role)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              {member.role !== 'owner' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setMemberToRemove(member.id)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}

          {/* TAB 5: WHATSAPP */}
          {canManageWhatsapp && (
            <TabsContent value="whatsapp" className="animate-in fade-in-50">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <MessageCircle className="h-5 w-5" />
                        Integração WhatsApp
                      </CardTitle>
                      <CardDescription className="mt-1">
                        Conecte sua conta WhatsApp para enviar notificações automáticas.
                      </CardDescription>
                    </div>
                    {whatsappStatus === 'checking' ? (
                      <Badge variant="outline"><Loader2 className="h-3 w-3 animate-spin mr-1" /> Verificando</Badge>
                    ) : whatsappStatus === 'connected' ? (
                      <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Conectado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground"><XCircle className="h-3 w-3 mr-1" /> Desconectado</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {whatsappStatus === 'connected' && settings?.whatsapp_instance_name && (
                    <div className="p-4 bg-muted/50 rounded-lg flex justify-between items-center">
                      <span className="text-sm font-medium">Instância Ativa</span>
                      <span className="text-xs font-mono text-muted-foreground">{settings.whatsapp_instance_name}</span>
                    </div>
                  )}
                  <Button
                    onClick={() => setIsWhatsAppModalOpen(true)}
                    className="w-full"
                    size="lg"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Gerenciar Conexão WhatsApp
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        {/* TAB 6: DADOS E IMPORTAÇÃO */}
          <TabsContent value="dados" className="space-y-6 animate-in fade-in-50">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-primary" />
                  Importação e Exportação
                </CardTitle>
                <CardDescription>
                  Gerencie seus dados em massa via planilhas.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg bg-secondary/10">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <FileSpreadsheet className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Importação Universal</h4>
                      <p className="text-sm text-muted-foreground">
                        Produtos, Clientes, Vendas e Despesas em um único arquivo.
                      </p>
                    </div>
                  </div>
                  <GlobalImportModal 
                    trigger={
                      <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Importar
                      </Button>
                    } 
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Backup e Segurança</CardTitle>
                <CardDescription>Mantenha seus dados seguros.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Seus dados são salvos automaticamente na nuvem. Você pode solicitar um backup completo entrando em contato com o suporte.
                </div>
              </CardContent>
              <CardFooter className="border-t p-4">
                <Button variant="outline" disabled>Solicitar Backup Completo</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>

          {/* DANGER ZONE */}
        {(canDeleteStore || role === 'owner' || store?.owner_id === user?.id) && (
          <Card className="border-red-200 bg-red-50/10">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2 text-base">
                <AlertTriangle className="h-5 w-5" />
                Zona de Perigo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between pb-6 border-b border-red-200">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Resetar Dados Operacionais</h4>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Exclui <strong>apenas</strong> Produtos, Vendas e Despesas. Mantém clientes, configurações e membros. Útil para corrigir importações erradas.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-100 hover:text-red-700"
                  onClick={() => setShowResetDataConfirm(true)}
                  disabled={resetDataLoading}
                >
                  {resetDataLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Resetar Dados'}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium text-sm">Excluir Loja Permanentemente</h4>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Esta ação irá apagar <strong>todos</strong> os dados da loja, incluindo produtos, vendas e clientes. Não pode ser desfeita.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteStore.isPending}
                >
                  Excluir Loja
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* DIALOGS */}
      <AlertDialog open={confirmSave} onOpenChange={setConfirmSave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Salvar Alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso atualizará as informações públicas da sua loja.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSave} disabled={updateStore.isPending}>
              {updateStore.isPending ? 'Salvando...' : 'Salvar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Excluir Loja</AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>Tem certeza absoluta? Esta ação é irreversível.</p>
              <div className="space-y-2">
                <Label>Digite <strong>EXCLUIR {store?.name?.toUpperCase()}</strong> para confirmar:</Label>
                <Input 
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={`EXCLUIR ${store?.name?.toUpperCase()}`}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteConfirmText !== `EXCLUIR ${store?.name?.trim().toUpperCase()}`}
              onClick={() => deleteStore.mutateAsync()}
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showResetDataConfirm} onOpenChange={setShowResetDataConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Resetar Dados Operacionais</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Tem certeza que deseja apagar todos os produtos, vendas e despesas?</p>
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-100">
                  <strong>O que será apagado:</strong>
                  <ul className="list-disc list-inside mt-1 ml-1">
                    <li>Todos os produtos e estoque</li>
                    <li>Todo o histórico de vendas</li>
                    <li>Todas as despesas registradas</li>
                  </ul>
                  <p className="mt-2 font-medium">Suas configurações, clientes e equipe NÃO serão afetados.</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetDataLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleResetStoreData}
              disabled={resetDataLoading}
            >
              {resetDataLoading ? 'Apagando...' : 'Sim, Apagar Dados'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WhatsAppModal open={isWhatsAppModalOpen} onOpenChange={setIsWhatsAppModalOpen} />
    </AppLayout>
  );
}
