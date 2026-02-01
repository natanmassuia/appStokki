import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Search, Smartphone, Download, Plus, ArrowUpDown, RefreshCw } from 'lucide-react';
import { fetchContacts, restartInstance, WhatsAppContact } from '@/services/whatsappService';
import { useToast } from '@/hooks/use-toast';

interface MappedContact {
  name: string;
  phone: string;
  photo?: string;
  isDuplicate: boolean;
  originalContact: WhatsAppContact;
}

interface WhatsAppContactSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  instanceName: string;
  onImport: (contacts: WhatsAppContact[]) => void;
  isImporting?: boolean;
  existingPhones?: string[];
}

// Clean phone number - remove non-digits and @s.whatsapp.net
const cleanPhoneNumber = (phone: string | undefined): string => {
  if (!phone) return '';
  return phone.replace('@s.whatsapp.net', '').replace('@c.us', '').replace(/\D/g, '');
};

export function WhatsAppContactSelectorModal({
  open,
  onOpenChange,
  instanceName,
  onImport,
  isImporting = false,
  existingPhones = [],
}: WhatsAppContactSelectorModalProps) {
  const { toast } = useToast();
  const [contacts, setContacts] = useState<MappedContact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Clean existing phones for comparison
  const cleanedExistingPhones = useMemo(() => {
    return new Set(existingPhones.map(p => cleanPhoneNumber(p)));
  }, [existingPhones]);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!open) {
      setContacts([]);
      setSelectedIndices(new Set());
      setSearchQuery('');
      setSortOrder('asc');
      setSyncStatus('');
    }
  }, [open]);

  const handleFetchContacts = async () => {
    if (!instanceName) {
      toast({
        title: 'WhatsApp não conectado',
        description: 'Conecte o WhatsApp primeiro.',
        variant: 'destructive',
      });
      return;
    }

    // Clear previous state
    setContacts([]);
    setSelectedIndices(new Set());
    setSearchQuery('');
    setIsLoading(true);
    setSyncStatus('Conectando ao WhatsApp...');

    try {
      // Callback para atualizar status durante retry
      const onProgress = (attempt: number, maxAttempts: number) => {
        if (attempt === 1) {
          setSyncStatus('Sincronizando agenda do WhatsApp...');
        } else {
          setSyncStatus(`Aguardando sincronização... (tentativa ${attempt}/${maxAttempts})`);
        }
      };

      const rawContacts = await fetchContacts(instanceName, onProgress);

      setSyncStatus('Processando contatos...');

      // Map and filter contacts
      const mappedContacts: MappedContact[] = rawContacts
        .filter(contact => {
          if (contact.isGroup) return false;
          const phone = cleanPhoneNumber(contact.remoteJid || contact.id || '');
          return phone.length > 0;
        })
        .map(contact => {
          const phone = cleanPhoneNumber(contact.remoteJid || contact.id || '');
          
          // Smart Name Resolution Logic
          let name = '';
          
          // Debug para ajudar a identificar problemas de nome
          // console.log('Contact Raw:', contact);

          // 1. Priority: The name YOU saved in your phone book
          if (contact.name && contact.name !== contact.number && contact.name !== contact.id) {
            name = contact.name;
          }
          // 2. Priority: Formatted Name (often contains the saved name too)
          else if (contact.formattedName && contact.formattedName !== contact.number && contact.formattedName !== contact.id) {
            name = contact.formattedName;
          } 
          // 3. Fallback: The name THEY set on their profile (pushName)
          else if (contact.pushName) {
            name = contact.pushName;
          }
          // 4. Last Resort: Phone number
          else {
            name = contact.number || contact.id.split('@')[0];
          }

          // Check for duplicates using loose matching
          const isDuplicate = Array.from(cleanedExistingPhones).some(existingPhone => {
            if (!existingPhone || !phone) return false;
            return existingPhone.includes(phone) || phone.includes(existingPhone);
          });

          return {
            name: name.trim() || `Contato ${phone}`,
            phone,
            photo: contact.profilePictureUrl,
            isDuplicate,
            originalContact: contact,
          };
        });

      setContacts(mappedContacts);
      setSyncStatus('');

      // Auto-select all non-duplicates
      const nonDuplicateIndices = mappedContacts
        .map((_, idx) => idx)
        .filter(idx => !mappedContacts[idx].isDuplicate);
      setSelectedIndices(new Set(nonDuplicateIndices));

      const duplicateCount = mappedContacts.filter(c => c.isDuplicate).length;

      toast({
        title: 'Contatos carregados!',
        description: `${mappedContacts.length} contato(s) encontrado(s). ${duplicateCount} já cadastrado(s). Clique em "Salvar" para importar.`,
      });
    } catch (err: any) {
      setSyncStatus('');
      toast({
        title: 'Erro ao buscar contatos',
        description: err.message || 'Não foi possível buscar os contatos do WhatsApp.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Filter and sort contacts
  const getFilteredAndSortedContacts = () => {
    let filtered = contacts.map((contact, idx) => ({ contact, originalIdx: idx }));

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(({ contact }) =>
        contact.name.toLowerCase().includes(query) || contact.phone.includes(query)
      );
    }

    // Apply sort
    filtered.sort((a, b) => {
      const comparison = a.contact.name.localeCompare(b.contact.name, 'pt-BR', { sensitivity: 'base' });
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  };

  // Import selected contacts
  const handleImport = () => {
    const selectedContacts = Array.from(selectedIndices)
      .map(idx => contacts[idx])
      .filter(c => !c.isDuplicate)
      .map(c => c.originalContact);

    if (selectedContacts.length === 0) {
      toast({
        title: 'Nenhum contato selecionado',
        description: 'Selecione pelo menos um contato para importar.',
        variant: 'destructive',
      });
      return;
    }

    onImport(selectedContacts);
  };

  const filteredAndSorted = getFilteredAndSortedContacts();
  const availableCount = filteredAndSorted.filter(item => !item.contact.isDuplicate).length;
  const allSelected = availableCount > 0 && filteredAndSorted
    .filter(item => !item.contact.isDuplicate)
    .every(item => selectedIndices.has(item.originalIdx));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Importar Contatos do WhatsApp
            </DialogTitle>
            {contacts.length > 0 && !isLoading && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFetchContacts}
                disabled={isLoading}
                className="gap-2 text-muted-foreground hover:text-foreground"
                title="Forçar re-sincronização"
              >
                <RefreshCw className="h-4 w-4" />
                Re-sincronizar
              </Button>
            )}
          </div>
          <DialogDescription>
            Selecione os contatos que deseja importar para sua lista de clientes
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 min-h-0 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {syncStatus || 'Buscando contatos do WhatsApp...'}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  Isso pode levar alguns segundos na primeira sincronização
                </p>
              </div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Smartphone className="h-12 w-12 mb-3 opacity-50" />
              <p>Nenhum contato encontrado</p>
              <p className="text-sm mt-1">Clique em "Buscar Contatos" para começar</p>
            </div>
          ) : (
            <>
              {/* Search bar and sort */}
              <div className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar contato por nome ou telefone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 input-glass"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="gap-2"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
                </Button>
              </div>

              {/* Header with selection */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const allIndices = filteredAndSorted
                          .filter(item => !item.contact.isDuplicate)
                          .map(item => item.originalIdx);
                        setSelectedIndices(new Set(allIndices));
                      } else {
                        const filteredIndices = new Set(filteredAndSorted.map(item => item.originalIdx));
                        setSelectedIndices(prev => {
                          const newSet = new Set(prev);
                          filteredIndices.forEach(idx => newSet.delete(idx));
                          return newSet;
                        });
                      }
                    }}
                  />
                  <Label className="text-sm">
                    Selecionar todos ({availableCount} disponíveis)
                  </Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  {selectedIndices.size} selecionado(s) • {filteredAndSorted.length} contato(s) exibido(s)
                </p>
              </div>

              {/* Table */}
              <div className="border rounded-lg overflow-hidden" style={{ height: '400px', maxHeight: '400px' }}>
                <ScrollArea className="h-[400px] w-full">
                  <div className="pr-4">
                    <Table>
                      <TableHeader className="sticky top-0 bg-background z-10">
                        <TableRow>
                          <TableHead className="w-12 bg-background"></TableHead>
                          <TableHead className="bg-background">Avatar</TableHead>
                          <TableHead className="bg-background">Nome</TableHead>
                          <TableHead className="bg-background">Telefone</TableHead>
                          <TableHead className="bg-background">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSorted.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                              {searchQuery.trim() ? 'Nenhum contato encontrado com essa busca' : 'Nenhum contato disponível'}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAndSorted.map(({ contact, originalIdx }) => (
                            <TableRow
                              key={`${contact.name}-${contact.phone}-${originalIdx}`}
                              className={contact.isDuplicate ? 'opacity-50' : ''}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selectedIndices.has(originalIdx)}
                                  onCheckedChange={(checked) => {
                                    const newSelected = new Set(selectedIndices);
                                    if (checked && !contact.isDuplicate) {
                                      newSelected.add(originalIdx);
                                    } else {
                                      newSelected.delete(originalIdx);
                                    }
                                    setSelectedIndices(newSelected);
                                  }}
                                  disabled={contact.isDuplicate}
                                />
                              </TableCell>
                              <TableCell>
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={contact.photo} />
                                  <AvatarFallback>
                                    {contact.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              </TableCell>
                              <TableCell className="font-medium">{contact.name}</TableCell>
                              <TableCell>{contact.phone}</TableCell>
                              <TableCell>
                                {contact.isDuplicate ? (
                                  <span className="text-xs text-muted-foreground">Já Cadastrado</span>
                                ) : (
                                  <span className="text-xs text-green-600 dark:text-green-400">Novo</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isImporting}
          >
            Cancelar
          </Button>
          {contacts.length === 0 && !isLoading && (
            <Button
              onClick={handleFetchContacts}
              disabled={!instanceName || isLoading}
              className="gradient-primary"
            >
              <Download className="h-4 w-4 mr-2" />
              Buscar Contatos
            </Button>
          )}
          {contacts.length > 0 && !isLoading && (
            <Button
              onClick={handleFetchContacts}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              Buscar Novamente
            </Button>
          )}
          {contacts.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={selectedIndices.size === 0 || isImporting}
              className="gradient-primary"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Salvar {selectedIndices.size} Cliente(s)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
