import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useSuppliers } from '@/hooks/useSuppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { 
  Loader2, Plus, Trash2, Pencil, Search, Truck, MessageCircle, Mail, Smartphone,
  Calendar as CalendarIcon, FileSpreadsheet, Download
} from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { GlobalImportModal } from '@/components/GlobalImportModal';
import { DateRange } from 'react-day-picker';
import { exportToCSV } from '@/utils/exportUtils';
import { useToast } from '@/hooks/use-toast';

import { SupplierForm } from '@/components/suppliers/SupplierForm';

export default function Fornecedores() {
  const { toast } = useToast();
  const { suppliers, isLoading, deleteSupplier } = useSuppliers();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', category: '', phone: '', email: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const uniqueCategories = Array.from(new Set(suppliers.map(s => s.category).filter(Boolean))) as string[];

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (supplier.category && supplier.category.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || supplier.category === categoryFilter;

    let matchesDate = true;
    if (dateRange?.from) {
      const createdDate = new Date(supplier.created_at);
      const fromDate = new Date(dateRange.from);
      fromDate.setHours(0, 0, 0, 0);
      
      if (createdDate < fromDate) matchesDate = false;
      
      if (dateRange.to) {
        const toDate = new Date(dateRange.to);
        toDate.setHours(23, 59, 59, 999);
        if (createdDate > toDate) matchesDate = false;
      }
    }

    return matchesSearch && matchesCategory && matchesDate;
  });

  const handleExportCSV = () => {
    try {
      if (filteredSuppliers.length === 0) {
        toast({
          title: 'Nada para exportar',
          description: 'A lista está vazia.',
          variant: 'destructive',
        });
        return;
      }

      const data = filteredSuppliers.map(s => ({
        Nome: s.name,
        Categoria: s.category || '',
        Telefone: s.phone || '',
        Email: s.email || '',
        'Data Cadastro': s.created_at ? new Date(s.created_at).toLocaleDateString('pt-BR') : '-'
      }));
      
      exportToCSV(data, `fornecedores_${new Date().toISOString().split('T')[0]}.csv`);
      
      toast({
        title: 'Exportação concluída',
        description: `${data.length} fornecedores exportados.`,
      });
    } catch (error) {
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar o arquivo.',
        variant: 'destructive',
      });
    }
  };

  const handleOpenDialog = () => {
    setIsEditMode(false);
    setFormData({ id: '', name: '', category: '', phone: '', email: '' });
    setIsDialogOpen(true);
  };

  const handleEditClick = (supplier: any) => {
    setIsEditMode(true);
    setFormData({
      id: supplier.id,
      name: supplier.name,
      category: supplier.category || '',
      phone: supplier.phone || '',
      email: supplier.email || ''
    });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setFormData({ id: '', name: '', category: '', phone: '', email: '' });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.id) return;
    try {
      await deleteSupplier.mutateAsync(deleteConfirm.id);
      setDeleteConfirm({ open: false, id: null });
    } catch (error) {
      // Error handled in hook
    }
  };

  const openWhatsApp = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}`, '_blank');
  };

  return (
    <AppLayout title="Fornecedores">
      <div className="space-y-6">
        <PageHeader 
          title="Fornecedores" 
          description="Gerencie seus parceiros de negócio e fontes de produtos."
        >
          <div className="flex gap-2">
            <GlobalImportModal 
              trigger={
                <Button variant="outline" className="gap-2 hidden sm:flex">
                  <FileSpreadsheet className="h-4 w-4" />
                  Importar
                </Button>
              } 
            />
            <Button variant="outline" className="gap-2 hidden sm:flex" onClick={handleExportCSV}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={handleOpenDialog} className="gradient-primary">
              <Plus className="h-4 w-4 mr-2" />
              Novo Fornecedor
            </Button>
          </div>
        </PageHeader>

        {/* Toolbar de Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full flex-1">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar fornecedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {uniqueCategories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
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

            {(searchQuery || categoryFilter !== 'all' || dateRange?.from) && (
              <Button 
                variant="ghost" 
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('all');
                  setDateRange(undefined);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Limpar
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredSuppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground glass-card rounded-xl">
            {searchQuery ? (
              <>
                <Search className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhum fornecedor encontrado</p>
              </>
            ) : (
              <>
                <Truck className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhum fornecedor cadastrado</p>
                <p className="text-sm text-center max-w-md">
                  Cadastre seus fornecedores para vincular aos produtos e facilitar a reposição.
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="base44-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Nome / Empresa</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id} className="hover:bg-muted/20">
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {supplier.name.substring(0, 2).toUpperCase()}
                        </div>
                        {supplier.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {supplier.category || <span className="text-muted-foreground">-</span>}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-sm">
                        {supplier.phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Smartphone className="h-3 w-3" />
                            {supplier.phone}
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {supplier.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        {supplier.phone && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => openWhatsApp(supplier.phone)}
                            title="Conversar no WhatsApp"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={() => handleEditClick(supplier)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteConfirm({ open: true, id: supplier.id })}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Editar Fornecedor' : 'Adicionar Fornecedor'}</DialogTitle>
            <DialogDescription>
              Preencha os dados do fornecedor.
            </DialogDescription>
          </DialogHeader>
          <SupplierForm 
            initialData={isEditMode ? formData : undefined}
            isEditMode={isEditMode}
            onSuccess={handleCloseDialog}
            onCancel={handleCloseDialog}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open, id: null })}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este fornecedor?
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
    </AppLayout>
  );
}
