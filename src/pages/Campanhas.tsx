import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { useCustomers } from '@/hooks/useCustomers';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useCampaign } from '@/contexts/CampaignContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Send, Megaphone, AlertTriangle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PageHeader } from '@/components/ui/PageHeader';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Campanhas() {
  const navigate = useNavigate();
  const { customers } = useCustomers();
  const { settings: storeSettings } = useStoreSettings();
  const { toast } = useToast();
  const { startCampaign, toggleModal } = useCampaign();
  
  const [search, setSearch] = useState('');
  const [selectedClients, setSelectedClients] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('Olá {nome}! 🎉\n\nTemos novidades incríveis para você!\n\nConfira nossos produtos e aproveite as ofertas especiais.\n\nVolte sempre!');
  const [confirmationModalOpen, setConfirmationModalOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');

  const scripts = [
    { id: 'recuperacao', label: 'Recuperação de Venda', text: "Oi {nome}! Vi que você não finalizou sua compra. Conseguimos um desconto especial de 5% se fechar hoje! 📦" },
    { id: 'novidade', label: 'Novidade / Reposição', text: "Chegou reposição do [Produto] que você gosta! Quer que eu separe um para você? 🔥" },
    { id: 'feedback', label: 'Solicitar Feedback', text: "Oi {nome}, tudo bem? O que achou do seu pedido? Sua opinião é muito importante pra gente! ⭐" }
  ];

  const handleScriptChange = (value: string) => {
    const script = scripts.find(s => s.id === value);
    if (script) {
      setMessage(script.text);
    }
  };

  // Filtra clientes por busca
  const filteredCustomers = customers.filter(customer => {
    const searchLower = search.toLowerCase();
    return customer.name.toLowerCase().includes(searchLower) ||
           customer.phone?.toLowerCase().includes(searchLower);
  });

  // Limit to Top 10 (sorted by last interaction if available)
  const displayedCustomers = filteredCustomers
    .sort((a, b) => {
      const dateA = a.last_purchase_date ? new Date(a.last_purchase_date).getTime() : 0;
      const dateB = b.last_purchase_date ? new Date(b.last_purchase_date).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 10);

  const allSelected = displayedCustomers.length > 0 && 
    displayedCustomers.every(c => selectedClients.has(c.id));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedClients(new Set(displayedCustomers.map(c => c.id)));
    } else {
      setSelectedClients(new Set());
    }
  };

  const handleSelectClient = (clientId: string, checked: boolean) => {
    const newSelected = new Set(selectedClients);
    if (checked) {
      newSelected.add(clientId);
    } else {
      newSelected.delete(clientId);
    }
    setSelectedClients(newSelected);
  };

  const handlePrepareSend = () => {
    if (selectedClients.size === 0) {
      toast({
        title: 'Nenhum cliente selecionado',
        description: 'Selecione pelo menos um cliente para enviar a campanha.',
        variant: 'destructive',
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: 'Mensagem vazia',
        description: 'Digite uma mensagem para enviar.',
        variant: 'destructive',
      });
      return;
    }

    if (!storeSettings?.whatsapp_instance_name) {
      toast({
        title: 'WhatsApp não conectado',
        description: 'Conecte o WhatsApp primeiro na aba WhatsApp do menu.',
        variant: 'destructive',
      });
      return;
    }

    // Verifica se os clientes selecionados têm telefone
    const selectedClientsList = filteredCustomers
      .filter(c => selectedClients.has(c.id))
      .map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
      }));

    const clientsWithoutPhone = selectedClientsList.filter(c => !c.phone || c.phone.trim() === '');
    if (clientsWithoutPhone.length > 0) {
      toast({
        title: 'Clientes sem telefone',
        description: `${clientsWithoutPhone.length} cliente(s) selecionado(s) não têm número de telefone cadastrado.`,
        variant: 'destructive',
      });
      return;
    }

    setConfirmationText('');
    setConfirmationModalOpen(true);
  };

  const handleStartCampaign = async () => {
    if (confirmationText.trim().toUpperCase() !== 'ENVIAR') {
      toast({
        title: 'Confirmação incorreta',
        description: 'Digite "ENVIAR" para confirmar o disparo.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const selectedClientsList = filteredCustomers
        .filter(c => selectedClients.has(c.id))
        .map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone || '',
        }));

      await startCampaign(selectedClientsList, message);
      
      setConfirmationModalOpen(false);
      setConfirmationText('');
      
      toast({
        title: 'Campanha iniciada em segundo plano! 📱',
        description: `A campanha foi iniciada. Você pode navegar pela aplicação enquanto as mensagens são enviadas.`,
      });

      // Abre o modal de detalhes
      toggleModal();
    } catch (error: any) {
      toast({
        title: 'Erro ao iniciar campanha',
        description: error.message || 'Não foi possível iniciar a campanha.',
        variant: 'destructive',
      });
    }
  };

  return (
    <AppLayout title="Marketing">
      <div className="space-y-6">
        {/* Header */}
        <PageHeader 
          title="Campanhas de Marketing" 
          description="Envie mensagens promocionais para seus clientes via WhatsApp de forma segura."
        />

        {/* Step 1: Select Clients */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">1. Selecionar Clientes</h3>
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64 input-glass"
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead className="text-right">Total Gasto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12">
                      {customers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                          <Users className="h-12 w-12 mb-3 opacity-50" />
                          <p className="text-lg font-medium mb-2">Sem clientes para enviar.</p>
                          <p className="text-sm text-center max-w-md">
                            Para criar uma campanha, você precisa de público.{' '}
                            <span
                              onClick={() => navigate('/clientes')}
                              className="text-primary underline-offset-4 hover:underline cursor-pointer font-medium"
                            >
                              [Importe Contatos do WhatsApp]
                            </span>
                            {' '}ou{' '}
                            <span
                              onClick={() => navigate('/clientes')}
                              className="text-primary underline-offset-4 hover:underline cursor-pointer font-medium"
                            >
                              [Cadastre Clientes]
                            </span>
                            {' '}agora.
                          </p>
                        </div>
                      ) : (
                        <div className="text-muted-foreground">
                          <p>Nenhum cliente encontrado com a busca "{search}"</p>
                          <p className="text-sm mt-1">Tente outra busca</p>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedCustomers.map(customer => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedClients.has(customer.id)}
                          onCheckedChange={(checked) => handleSelectClient(customer.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone || '-'}</TableCell>
                      <TableCell className="text-right">
                        {customer.total_spent ? `R$ ${customer.total_spent.toFixed(2).replace('.', ',')}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-sm text-muted-foreground">
            {selectedClients.size} cliente(s) selecionado(s)
          </p>
        </div>

        {/* Step 2: Compose Message */}
        <div className="glass-card rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">2. Compor Mensagem</h3>
            <Select onValueChange={handleScriptChange}>
              <SelectTrigger className="w-[250px] input-glass">
                <SelectValue placeholder="Modelos de Mensagem" />
              </SelectTrigger>
              <SelectContent>
                {scripts.map((script) => (
                  <SelectItem key={script.id} value={script.id}>
                    {script.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Digite sua mensagem aqui..."
              className="min-h-[200px] input-glass"
            />
            <p className="text-xs text-muted-foreground">
              💡 Use <code className="bg-secondary px-1 rounded">{'{nome}'}</code> para substituir pelo nome do cliente automaticamente.
            </p>
          </div>
        </div>

        {/* Step 3: Action */}
        <div className="flex justify-end">
          <Button
            onClick={handlePrepareSend}
            disabled={selectedClients.size === 0 || !message.trim() || !storeSettings?.whatsapp_instance_name}
            className="gradient-primary"
            size="lg"
          >
            <Send className="h-4 w-4 mr-2" />
            Preparar Envio
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Dialog open={confirmationModalOpen} onOpenChange={setConfirmationModalOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Confirmar Disparo
            </DialogTitle>
            <DialogDescription>
              A campanha será executada em segundo plano. Você pode navegar pela aplicação enquanto as mensagens são enviadas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert className="bg-yellow-500/10 border-yellow-500/30">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
              <AlertDescription className="text-yellow-800 dark:text-yellow-200">
                <strong>Importante:</strong> Para evitar bloqueios, o sistema enviará uma mensagem a cada 15-40 segundos (aleatório). 
                Você pode acompanhar o progresso através do widget flutuante no canto inferior direito.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="confirmation">
                Digite <strong>"ENVIAR"</strong> para confirmar o disparo:
              </Label>
              <Input
                id="confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder="ENVIAR"
                className="input-glass font-mono uppercase"
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setConfirmationModalOpen(false);
                setConfirmationText('');
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleStartCampaign}
              disabled={confirmationText.trim().toUpperCase() !== 'ENVIAR'}
              className="gradient-primary"
            >
              <Send className="h-4 w-4 mr-2" />
              Iniciar Campanha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
