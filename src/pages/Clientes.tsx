import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useCustomers } from '@/hooks/useCustomers';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { fetchContacts, WhatsAppContact } from '@/services/whatsappService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Loader2, Plus, Trash2, MessageCircle, Pencil, Download, Smartphone, 
  Search, ArrowUpDown, Upload, Users, RefreshCw, LayoutGrid, List,
  Calendar as CalendarIcon, DollarSign, UserCheck, UserPlus, ChevronLeft, ChevronRight
} from 'lucide-react';
import { exportToCSV } from '@/utils/exportUtils';
import { CustomersImportModal } from '@/components/CustomersImportModal';
import { formatCurrency } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { useBulkOperation } from '@/contexts/BulkOperationContext';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ImportContact {
  name: string;
  phone: string;
  photo?: string;
  isDuplicate: boolean;
  originalContact: WhatsAppContact;
}

export default function Clientes() {
  const { settings: storeSettings } = useStoreSettings();
  const { store } = useStore();
  const { toast } = useToast();
  const { startOperation } = useBulkOperation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', phone: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [confirmSave, setConfirmSave] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [selectAllGlobal, setSelectAllGlobal] = useState(false);
  const [isSelectingAllGlobal, setIsSelectingAllGlobal] = useState(false);
  const [deleteMultipleConfirm, setDeleteMultipleConfirm] = useState(false);
  const [exportMultipleConfirm, setExportMultipleConfirm] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  
  // Estados para importação do WhatsApp
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isFetchingContacts, setIsFetchingContacts] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const [importContacts, setImportContacts] = useState<ImportContact[]>([]);
  const [selectedImportContacts, setSelectedImportContacts] = useState<Set<number>>(new Set());
  const [isSavingContacts, setIsSavingContacts] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  // Estados para ordenação da lista de clientes
  const [sortBy, setSortBy] = useState<'name' | 'total_spent' | 'created_at'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  
  // Estado para importação de arquivos (VCF/CSV)
  const [fileImportModalOpen, setFileImportModalOpen] = useState(false);

  // Paginação
  const [page, setPage] = useState(1);
  const pageSize = 100;

  const { customers, totalCount, isLoading, createCustomer, createCustomersBulk, updateCustomer, deleteCustomer, deleteCustomers } = useCustomers({ page, limit: pageSize });

  // Estatísticas
  const stats = useMemo(() => {
    const total = totalCount || customers.length;
    const active = customers.filter(c => c.total_spent && c.total_spent > 0).length;
    const inactive = total - active;
    
    const now = new Date();
    const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
    const newCustomers = customers.filter(c => new Date(c.created_at) > thirtyDaysAgo).length;

    const totalRevenue = customers.reduce((acc, curr) => acc + (curr.total_spent || 0), 0);
    const avgTicket = active > 0 ? totalRevenue / active : 0;

    return { total, active, newCustomers, avgTicket };
  }, [customers]);

  const handleOpenDialog = () => {
    setIsEditMode(false);
    setFormData({ id: '', name: '', phone: '' });
    setIsDialogOpen(true);
  };

  const handleEditClick = (customer: typeof customers[0]) => {
    setIsEditMode(true);
    setFormData({ id: customer.id, name: customer.name, phone: customer.phone });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFormData({ id: '', name: '', phone: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) {
      return;
    }
    setConfirmSave(true);
  };

  const handleConfirmSave = async () => {
    setConfirmSave(false);
    try {
      if (isEditMode) {
        await updateCustomer.mutateAsync({
          id: formData.id,
          name: formData.name,
          phone: formData.phone,
        });
      } else {
        await createCustomer.mutateAsync({
          name: formData.name,
          phone: formData.phone,
        });
      }
      handleCloseDialog();
    } catch (error) {
      // Erro ao salvar cliente - já tratado no toast
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await deleteCustomer.mutateAsync(deleteConfirm.id);
      setDeleteConfirm({ open: false, id: null });
    } catch (error) {
      // Erro ao excluir cliente - já tratado no toast
    }
  };

  const getCustomerStatus = (customer: any) => {
    const now = new Date();
    const lastPurchase = customer.last_purchase_date ? new Date(customer.last_purchase_date) : null;
    
    if (!lastPurchase) {
        // Se nunca comprou, baseia no cadastro
        const createdAt = new Date(customer.created_at);
        const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        return diffDays < 30 ? 'novo' : 'inativo';
    }

    const diffDays = Math.floor((now.getTime() - lastPurchase.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays <= 30) return 'ativo';
    if (diffDays <= 90) return 'morno';
    return 'inativo';
  };

  // Filtrar e ordenar clientes (DEVE vir antes das funções que o usam)
  const filteredAndSortedCustomers = useMemo(() => {
    return customers
      .filter(customer => {
        // Filtro por Data
        if (dateRange?.from) {
          const createdDate = new Date(customer.created_at);
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          if (createdDate < fromDate) return false;
          
          if (dateRange.to) {
            const toDate = new Date(dateRange.to);
            toDate.setHours(23, 59, 59, 999);
            if (createdDate > toDate) return false;
          }
        }

        // Filtro por Status
        if (statusFilter !== 'all') {
          const status = getCustomerStatus(customer);
          
          if (statusFilter === 'vip') {
            if (!customer.total_spent || customer.total_spent < 500) return false;
          } else if (statusFilter === 'risk') {
             const ninetyDaysAgo = new Date();
             ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
             const lastInteraction = customer.last_purchase_date 
               ? new Date(customer.last_purchase_date) 
               : new Date(customer.created_at);
             if (lastInteraction > ninetyDaysAgo) return false;
          } else if (statusFilter === 'active') {
             if (status !== 'ativo') return false;
          } else if (statusFilter === 'new') {
             if (status !== 'novo') return false;
          } else if (statusFilter === 'inactive') {
             if (status !== 'inativo') return false;
          }
        }

        // Filtro de Busca
        if (!searchCustomer.trim()) return true;
        const query = searchCustomer.toLowerCase();
        return (
          customer.name.toLowerCase().includes(query) ||
          customer.phone.includes(query)
        );
      })
      .sort((a, b) => {
        let comparison = 0;
        
        switch (sortBy) {
          case 'name':
            comparison = a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
            break;
          case 'total_spent':
            const totalA = a.total_spent || 0;
            const totalB = b.total_spent || 0;
            comparison = totalA - totalB;
            break;
          case 'created_at':
            comparison = new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
            break;
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
  }, [customers, searchCustomer, sortBy, sortDirection, statusFilter, dateRange]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentIds = new Set(selectedCustomers);
      filteredAndSortedCustomers.forEach(c => currentIds.add(c.id));
      setSelectedCustomers(currentIds);
    } else {
      const currentIds = new Set(selectedCustomers);
      filteredAndSortedCustomers.forEach(c => currentIds.delete(c.id));
      setSelectedCustomers(currentIds);
      setSelectAllGlobal(false);
    }
  };

  const handleSelectAllGlobal = async () => {
    if (!store) return;
    
    setIsSelectingAllGlobal(true);
    try {
      const allIds = new Set<string>();
      let hasMore = true;
      let page = 0;
      const pageSize = 1000;

      // Loop para buscar todos os IDs paginados, contornando o limite de 1000
      while (hasMore) {
        const { data, error } = await supabase
          .from('customers')
          .select('id')
          .eq('store_id', store.id)
          .range(page * pageSize, (page + 1) * pageSize - 1);
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          data.forEach(c => allIds.add(c.id));
          
          if (data.length < pageSize) {
            hasMore = false;
          } else {
            page++;
          }
        } else {
          hasMore = false;
        }
      }
      
      if (allIds.size > 0) {
        setSelectedCustomers(allIds);
        setSelectAllGlobal(true);
        toast({
          title: 'Todos os clientes selecionados',
          description: `${allIds.size} clientes foram selecionados.`,
        });
      }
    } catch (error) {
      console.error('Erro ao selecionar todos:', error);
      toast({
        title: 'Erro ao selecionar',
        description: 'Não foi possível selecionar todos os clientes.',
        variant: 'destructive',
      });
    } finally {
      setIsSelectingAllGlobal(false);
    }
  };

  const handleSelectCustomer = (customerId: string, checked: boolean) => {
    const newSelected = new Set(selectedCustomers);
    if (checked) {
      newSelected.add(customerId);
    } else {
      newSelected.delete(customerId);
      setSelectAllGlobal(false);
    }
    setSelectedCustomers(newSelected);
  };

  const handleDeleteMultiple = () => {
    if (selectedCustomers.size === 0) return;
    setDeleteMultipleConfirm(true);
  };

  const confirmDeleteMultiple = async () => {
    setDeleteMultipleConfirm(false);
    
    const selectedIds = Array.from(selectedCustomers);
    
    if (selectedIds.length === 0) return;

    // Se forem poucos itens (ex: menos de 5), usa a lógica individual que tem feedback visual item a item
    // Se forem muitos, usa a deleção em massa real (batch delete) para performance
    if (selectedIds.length <= 5) {
      const itemsToDelete = filteredAndSortedCustomers
        .filter(c => selectedIds.includes(c.id))
        .map(c => ({ id: c.id, name: c.name }));

      startOperation(
        'delete',
        'customers',
        itemsToDelete,
        async (item) => {
          await deleteCustomer.mutateAsync(item.id);
        }
      ).then(() => {
        setSelectedCustomers(new Set());
      });
    } else {
      // Deleção em lote real (muito mais rápida)
      try {
        toast({
          title: 'Excluindo clientes...',
          description: `Processando ${selectedIds.length} clientes.`,
        });
        
        await deleteCustomers.mutateAsync(selectedIds);
        
        toast({
          title: 'Exclusão concluída',
          description: `${selectedIds.length} clientes foram removidos.`,
        });
        
        setSelectedCustomers(new Set());
      } catch (error) {
        // Erro já tratado no hook
      }
    }
  };

  const handleExportCSV = (customerId?: string) => {
    if (!customerId && selectedCustomers.size > 0) {
      setExportMultipleConfirm(true);
      return;
    }
    executeExportCSV(customerId);
  };

  const executeExportCSV = (customerId?: string) => {
    try {
      let customersToExport;
      if (customerId) {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) {
          toast({
            title: 'Cliente não encontrado',
            variant: 'destructive',
          });
          return;
        }
        customersToExport = [{
          nome: customer.name,
          telefone: customer.phone,
          total_gasto: customer.total_spent ? formatCurrency(customer.total_spent).replace('R$', '').trim() : '0,00',
        }];
      } else if (selectedCustomers.size > 0) {
        const selectedIds = Array.from(selectedCustomers);
        customersToExport = filteredAndSortedCustomers
          .filter(c => selectedIds.includes(c.id))
          .map(c => ({
            nome: c.name,
            telefone: c.phone,
            total_gasto: c.total_spent ? formatCurrency(c.total_spent).replace('R$', '').trim() : '0,00',
          }));
      } else {
        customersToExport = filteredAndSortedCustomers.map(c => ({
          nome: c.name,
          telefone: c.phone,
          total_gasto: c.total_spent ? formatCurrency(c.total_spent).replace('R$', '').trim() : '0,00',
        }));
      }

      if (customersToExport.length === 0) {
        toast({
          title: 'Nenhum cliente para exportar',
          description: 'Selecione clientes ou ajuste os filtros.',
          variant: 'destructive',
        });
        return;
      }

      const filename = customerId
        ? `cliente_${customersToExport[0].nome.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`
        : selectedCustomers.size > 0
        ? `clientes_selecionados_${selectedCustomers.size}_${new Date().toISOString().split('T')[0]}.csv`
        : `clientes_${new Date().toISOString().split('T')[0]}.csv`;

      exportToCSV(customersToExport, filename);
      
      toast({
        title: 'Exportação concluída!',
        description: `${customersToExport.length} cliente(s) exportado(s) com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao exportar',
        description: error.message || 'Não foi possível exportar os clientes.',
        variant: 'destructive',
      });
    }
  };

  const formatPhoneForWhatsApp = (phone: string) => {
    return phone.replace(/\D/g, '');
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = formatPhoneForWhatsApp(phone);
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  const cleanPhoneNumber = (remoteJid: string | undefined): string => {
    if (!remoteJid) return '';
    let clean = remoteJid.split('@')[0];
    clean = clean.replace(/\D/g, '');
    return clean;
  };

  const getFilteredAndSortedContacts = () => {
    let filtered = importContacts;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(contact => 
        contact.name.toLowerCase().includes(query) ||
        contact.phone.includes(query)
      );
    }

    const sorted = [...filtered].sort((a, b) => {
      const nameA = a.name.toLowerCase();
      const nameB = b.name.toLowerCase();
      
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB, 'pt-BR');
      } else {
        return nameB.localeCompare(nameA, 'pt-BR');
      }
    });

    return sorted.map((contact, newIdx) => {
      const originalIdx = importContacts.findIndex(c => 
        c.name === contact.name && c.phone === contact.phone
      );
      return {
        contact,
        originalIdx: originalIdx >= 0 ? originalIdx : newIdx,
        newIdx,
      };
    });
  };

  const handleFetchContacts = async (forceRefresh: boolean = false) => {
    if (!storeSettings?.whatsapp_instance_name) {
      toast({
        title: 'WhatsApp não conectado',
        description: 'Conecte o WhatsApp primeiro na aba WhatsApp do menu.',
        variant: 'destructive',
      });
      return;
    }

    setImportContacts([]);
    setSelectedImportContacts(new Set());
    setSearchQuery('');
    setIsFetchingContacts(true);
    setSyncStatus('Conectando ao WhatsApp...');

    if (forceRefresh) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    try {
      const onProgress = (attempt: number, maxAttempts: number) => {
        if (attempt === 1) {
          setSyncStatus('Sincronizando agenda do WhatsApp...');
        } else {
          setSyncStatus(`Aguardando sincronização... (tentativa ${attempt}/${maxAttempts})`);
        }
      };
      
      const rawContacts = await fetchContacts(storeSettings.whatsapp_instance_name, onProgress);
      
      setSyncStatus('Processando contatos...');
      
      const mappedContacts: ImportContact[] = rawContacts
        .map(contact => {
          const phone = cleanPhoneNumber(contact.remoteJid || contact.id || '');
          
          // Smart Name Resolution Logic
          let name = '';
          // 1. Priority: The name YOU saved in your phone book
          if (contact.name && contact.name !== contact.number) {
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
          // 4. Last Resort: formatted phone number
          else {
            name = contact.number || contact.id.split('@')[0];
          }
          
          return { ...contact, resolvedName: name, cleanPhone: phone };
        })
        .filter(contact => {
          return contact.resolvedName.trim() !== '' && contact.resolvedName.trim().length > 1;
        })
        .map(contact => {
          const existingCustomer = customers.find(c => {
            const existingPhone = cleanPhoneNumber(c.phone);
            return existingPhone === contact.cleanPhone && contact.cleanPhone !== '';
          });

          return {
            name: contact.resolvedName,
            phone: contact.cleanPhone,
            photo: contact.profilePictureUrl,
            isDuplicate: !!existingCustomer,
            originalContact: contact,
          };
        })
        .filter(contact => contact.phone !== '');

      setImportContacts(mappedContacts);
      setSyncStatus('');

      const newIndices = mappedContacts
        .map((_, idx) => idx)
        .filter(idx => !mappedContacts[idx].isDuplicate);
      setSelectedImportContacts(new Set(newIndices));

      toast({
        title: 'Contatos carregados!',
        description: `${mappedContacts.length} contato(s) encontrado(s). ${mappedContacts.filter(c => c.isDuplicate).length} já cadastrado(s). Clique em "Salvar" para importar.`,
      });
    } catch (error: any) {
      setSyncStatus('');
      toast({
        title: 'Erro ao buscar contatos',
        description: error.message || 'Não foi possível buscar os contatos do WhatsApp.',
        variant: 'destructive',
      });
    } finally {
      setIsFetchingContacts(false);
    }
  };

  const handleSaveContacts = async () => {
    if (selectedImportContacts.size === 0) {
      toast({
        title: 'Nenhum contato selecionado',
        description: 'Selecione pelo menos um contato para importar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSavingContacts(true);

    try {
      const contactsToSave = Array.from(selectedImportContacts)
        .map(idx => importContacts[idx])
        .filter(contact => !contact.isDuplicate && contact.phone !== '');

      if (contactsToSave.length === 0) {
        toast({
          title: 'Nenhum contato válido',
          description: 'Todos os contatos selecionados já estão cadastrados ou são inválidos.',
          variant: 'destructive',
        });
        setIsSavingContacts(false);
        return;
      }

      // Bulk Insert usando a nova mutation otimizada
      await createCustomersBulk.mutateAsync(
        contactsToSave.map(contact => ({
          name: contact.name,
          phone: contact.phone,
        }))
      );

      // Toast já é exibido no hook useCustomers, mas aqui mantemos o controle de estado da modal
      setImportModalOpen(false);
      setImportContacts([]);
      setSelectedImportContacts(new Set());
      setSearchQuery('');
      setSortOrder('asc');
    } catch (error: any) {
      // Erro já tratado no hook useCustomers
      console.error('Erro ao importar contatos:', error);
    } finally {
      setIsSavingContacts(false);
    }
  };

  return (
    <AppLayout title="Clientes">
      <div className="space-y-6">
        {/* Header */}
        <PageHeader 
          title="Carteira de Clientes" 
          description="Gerencie sua base e fidelize seus compradores."
        >
          <div className="flex gap-2">
             <div className="hidden md:flex gap-1 bg-secondary/30 p-1 rounded-lg mr-2">
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
                title="Visualização em Lista"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0"
                title="Visualização em Cards"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>

            <Button 
              onClick={() => setImportModalOpen(true)} 
              variant="outline"
              disabled={!storeSettings?.whatsapp_instance_name}
              title={!storeSettings?.whatsapp_instance_name ? 'Conecte o WhatsApp primeiro' : 'Importar contatos do WhatsApp'}
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">WhatsApp</span>
            </Button>
            <Button 
              onClick={() => handleExportCSV()} 
              variant="outline" 
              disabled={filteredAndSortedCustomers.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
            <Button onClick={handleOpenDialog} className="gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </PageHeader>

        {/* CRM Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total de Clientes"
            value={stats.total}
            icon={Users}
            trend="up"
            trendValue="Base completa"
            isCurrency={false}
            variant="default"
          />
          <StatCard
            title="Novos (30 dias)"
            value={stats.newCustomers}
            icon={UserPlus}
            trend={stats.newCustomers > 0 ? 'up' : 'neutral'}
            trendValue="Novos cadastros"
            isCurrency={false}
            variant="emerald"
          />
          <StatCard
            title="Clientes Ativos"
            value={stats.active}
            icon={UserCheck}
            trend="up"
            trendValue="Já compraram"
            isCurrency={false}
            variant="teal"
          />
          <StatCard
            title="Ticket Médio"
            value={stats.avgTicket}
            icon={DollarSign}
            trend="up"
            trendValue="Gasto médio"
            isCurrency={true}
            variant="indigo"
          />
        </div>

        {/* Toolbar de Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full flex-1">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchCustomer}
                onChange={(e) => setSearchCustomer(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Clientes</SelectItem>
                <SelectItem value="active">Ativos (30 dias)</SelectItem>
                <SelectItem value="new">Novos</SelectItem>
                <SelectItem value="vip">VIP (+R$ 500)</SelectItem>
                <SelectItem value="risk">Em Risco</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full sm:w-[240px] justify-start text-left font-normal", !dateRange?.from && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/y", { locale: ptBR })} -{" "}
                        {format(dateRange.to, "dd/MM/y", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/y", { locale: ptBR })
                    )
                  ) : (
                    <span>Data de Cadastro</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {(searchCustomer || statusFilter !== 'all' || dateRange?.from) && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setSearchCustomer('');
                  setStatusFilter('all');
                  setDateRange(undefined);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Limpar
              </Button>
            )}
          </div>
          
          <div className="flex gap-2">
            <Select value={sortBy} onValueChange={(value: 'name' | 'total_spent' | 'created_at') => setSortBy(value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nome</SelectItem>
                <SelectItem value="total_spent">Total Gasto</SelectItem>
                <SelectItem value="created_at">Data de Cadastro</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              title={sortDirection === 'asc' ? 'Ordem crescente' : 'Ordem decrescente'}
            >
              <ArrowUpDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content Area */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredAndSortedCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground glass-card rounded-xl">
            {searchCustomer ? (
              <>
                <MessageCircle className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhum cliente encontrado nesta página</p>
                <p className="text-sm">Tente outra busca ou mude de página</p>
              </>
            ) : (
              <>
                <Users className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-lg font-medium mb-2">Sua lista de clientes está vazia.</p>
                <p className="text-sm text-center max-w-md">
                  Comece importando contatos do WhatsApp ou adicione manualmente.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* View Mode: Grid */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredAndSortedCustomers.map((customer) => (
                  <div key={customer.id} className="base44-card p-4 hover:border-primary/30 transition-colors group relative">
                    {/* ... card content ... */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 border border-border">
                          <AvatarFallback className="bg-primary/10 text-primary font-bold">
                            {customer.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-sm line-clamp-1" title={customer.name}>
                            {customer.name}
                          </h3>
                          <div className="flex items-center text-xs text-muted-foreground gap-1">
                            <Smartphone className="h-3 w-3" />
                            {customer.phone}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleEditClick(customer)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Gasto</span>
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(customer.total_spent || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Última Compra</span>
                        <span className="text-xs">
                          {customer.last_purchase_date 
                            ? formatDistanceToNow(new Date(customer.last_purchase_date), { addSuffix: true, locale: ptBR })
                            : 'Nunca comprou'}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-auto">
                      <Button 
                        className="flex-1 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20" 
                        variant="outline" 
                        size="sm"
                        onClick={() => openWhatsApp(customer.phone)}
                      >
                        <MessageCircle className="h-4 w-4 mr-2" />
                        WhatsApp
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* View Mode: List */}
            {viewMode === 'list' && (
              <div className="base44-card overflow-hidden">
                <div className="p-4 border-b border-border/30 bg-secondary/20 flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <Checkbox
                        checked={
                          filteredAndSortedCustomers.length > 0 && 
                          filteredAndSortedCustomers.every(c => selectedCustomers.has(c.id))
                        }
                        onCheckedChange={(checked) => handleSelectAll(!!checked)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {selectedCustomers.size > 0 
                          ? `${selectedCustomers.size} selecionado(s)`
                          : 'Selecionar todos'
                        }
                      </span>
                    </div>
                    {selectedCustomers.size > 0 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={handleDeleteMultiple}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir ({selectedCustomers.size})
                      </Button>
                    )}
                </div>
                
                {/* Global Selection Banner */}
                {((filteredAndSortedCustomers.length > 0 && filteredAndSortedCustomers.every(c => selectedCustomers.has(c.id)) && totalCount > filteredAndSortedCustomers.length) || selectAllGlobal) && (
                  <div className="bg-primary/10 p-2 text-center text-sm text-primary border-b border-primary/20">
                    {!selectAllGlobal ? (
                      <>
                        Todos os {filteredAndSortedCustomers.length} clientes desta página estão selecionados.
                        <button 
                          onClick={handleSelectAllGlobal} 
                          className="font-bold ml-2 underline hover:text-primary/80 transition-colors"
                          disabled={isSelectingAllGlobal}
                        >
                          {isSelectingAllGlobal ? (
                            <span className="flex items-center inline-flex">
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              Selecionando...
                            </span>
                          ) : (
                            `Selecionar todos os ${totalCount} clientes`
                          )}
                        </button>
                      </>
                    ) : (
                      <>
                        Todos os {totalCount} clientes estão selecionados.
                        <button 
                          onClick={() => {
                            setSelectedCustomers(new Set());
                            setSelectAllGlobal(false);
                          }} 
                          className="font-bold ml-2 underline hover:text-primary/80 transition-colors"
                        >
                          Desfazer seleção
                        </button>
                      </>
                    )}
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead className="w-12"></TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="text-right">Total Gasto</TableHead>
                      <TableHead className="text-right">Última Compra</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedCustomers.map((customer) => (
                      <TableRow key={customer.id} className="hover:bg-muted/20">
                        <TableCell>
                          <Checkbox
                            checked={selectedCustomers.has(customer.id)}
                            onCheckedChange={(checked) => handleSelectCustomer(customer.id, !!checked)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarFallback className="text-xs">
                                {customer.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {customer.name}
                          </div>
                        </TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell className="text-right font-medium text-emerald-600">
                          {formatCurrency(customer.total_spent || 0)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground text-xs">
                          {customer.last_purchase_date 
                            ? formatDistanceToNow(new Date(customer.last_purchase_date), { addSuffix: true, locale: ptBR })
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              onClick={() => openWhatsApp(customer.phone)}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleEditClick(customer)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalCount > 0 && (
              <div className="flex items-center justify-between py-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {((page - 1) * pageSize) + 1} a {Math.min(page * pageSize, totalCount)} de {totalCount} clientes
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page * pageSize >= totalCount}
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Editar Cliente' : 'Adicionar Cliente'}</DialogTitle>
            <DialogDescription>
              {isEditMode ? 'Atualize as informações do cliente.' : 'Preencha os dados do novo cliente.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do cliente"
                className="input-glass mt-2"
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Telefone / WhatsApp</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(16) 99999-9999"
                className="input-glass mt-2"
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createCustomer.isPending || updateCustomer.isPending}
                className="gradient-primary"
              >
                {(createCustomer.isPending || updateCustomer.isPending) ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Salvando...
                  </>
                ) : (
                  isEditMode ? 'Salvar Alterações' : 'Adicionar Cliente'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open, id: null })}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Save Confirmation */}
      <AlertDialog open={confirmSave} onOpenChange={setConfirmSave}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>{isEditMode ? 'Confirmar Alterações' : 'Confirmar Adição'}</AlertDialogTitle>
            <AlertDialogDescription>
              {isEditMode 
                ? `Tem certeza que deseja salvar as alterações no cliente "${formData.name}"?`
                : `Tem certeza que deseja adicionar o cliente "${formData.name}"?`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSave}
              className="gradient-primary"
              disabled={createCustomer.isPending || updateCustomer.isPending}
            >
              {(createCustomer.isPending || updateCustomer.isPending) ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                isEditMode ? 'Sim, Salvar Alterações' : 'Sim, Adicionar Cliente'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Modal Reuse (Keeping existing logic for WhatsApp import) */}
      <Dialog 
        open={importModalOpen} 
        onOpenChange={(open) => {
            setImportModalOpen(open);
            if (!open) {
              setImportContacts([]);
              setSelectedImportContacts(new Set());
              setIsFetchingContacts(false);
              setSearchQuery('');
              setSortOrder('asc');
            } else {
              setImportContacts([]);
              setSelectedImportContacts(new Set());
              setIsFetchingContacts(false);
              setSearchQuery('');
              setSortOrder('asc');
            }
        }}
      >
        <DialogContent className="glass-card max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Importar Contatos do WhatsApp {importContacts.length > 0 ? `(${importContacts.length})` : ''}
              </DialogTitle>
              {importContacts.length > 0 && !isFetchingContacts && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleFetchContacts(true)}
                  disabled={isFetchingContacts}
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
            {isFetchingContacts ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    {syncStatus || 'Buscando contatos do WhatsApp...'}
                  </p>
                </div>
              </div>
            ) : importContacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Smartphone className="h-12 w-12 mb-3 opacity-50" />
                <p>Nenhum contato encontrado</p>
                <p className="text-sm mt-1">Clique em "Buscar Contatos" para começar</p>
              </div>
            ) : (
              <>
                 {/* Reusing existing table logic for import... */}
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
                </div>

                <div className="border rounded-lg overflow-hidden" style={{ height: '450px', maxHeight: '450px' }}>
                  <ScrollArea className="h-[450px] w-full">
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
                          {getFilteredAndSortedContacts().map(({ contact, originalIdx }) => (
                            <TableRow 
                              key={`${contact.name}-${contact.phone}-${originalIdx}`}
                              className={contact.isDuplicate ? 'opacity-50' : ''}
                            >
                              <TableCell>
                                <Checkbox
                                  checked={selectedImportContacts.has(originalIdx)}
                                  onCheckedChange={(checked) => {
                                    const newSelected = new Set(selectedImportContacts);
                                    if (checked && !contact.isDuplicate) {
                                      newSelected.add(originalIdx);
                                    } else {
                                      newSelected.delete(originalIdx);
                                    }
                                    setSelectedImportContacts(newSelected);
                                  }}
                                  disabled={contact.isDuplicate}
                                />
                              </TableCell>
                              <TableCell>
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={contact.photo} />
                                  <AvatarFallback>{contact.name.charAt(0).toUpperCase()}</AvatarFallback>
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
                          ))}
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
              onClick={() => {
                setImportModalOpen(false);
                setImportContacts([]);
                setSelectedImportContacts(new Set());
              }}
            >
              Cancelar
            </Button>
            {(importContacts.length === 0 && !isFetchingContacts) && (
              <Button
                onClick={() => handleFetchContacts(true)}
                disabled={!storeSettings?.whatsapp_instance_name || isFetchingContacts}
                className="gradient-primary"
              >
                <Download className="h-4 w-4 mr-2" />
                Buscar Contatos
              </Button>
            )}
            {importContacts.length > 0 && (
              <Button
                onClick={handleSaveContacts}
                disabled={selectedImportContacts.size === 0 || isSavingContacts}
                className="gradient-primary"
              >
                {isSavingContacts ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                Salvar {selectedImportContacts.size} Cliente(s)
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomersImportModal
        open={fileImportModalOpen}
        onOpenChange={setFileImportModalOpen}
        onImportComplete={() => {}}
        existingCustomers={customers}
        createCustomer={async (customer) => { await createCustomer.mutateAsync(customer); }}
        updateCustomer={async (id, customer) => { await updateCustomer.mutateAsync({ id, ...customer }); }}
      />
      
      {/* Delete Multiple Confirmation */}
      <AlertDialog open={deleteMultipleConfirm} onOpenChange={setDeleteMultipleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão em massa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedCustomers.size} cliente(s) selecionado(s)?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteMultiple} className="bg-destructive text-destructive-foreground">
              Sim, Excluir Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Export Multiple Confirmation */}
      <AlertDialog open={exportMultipleConfirm} onOpenChange={setExportMultipleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exportação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja exportar {selectedCustomers.size} cliente(s) selecionado(s) para CSV?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setExportMultipleConfirm(false); executeExportCSV(); }}>
              Sim, Exportar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
