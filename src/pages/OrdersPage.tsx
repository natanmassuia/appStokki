import React, { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { CreateOrderSheet } from '@/components/orders/CreateOrderSheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  MoreHorizontal, 
  Eye, 
  Printer, 
  Truck, 
  CheckCircle, 
  XCircle, 
  Package, 
  Clock,
  Plus,
  Loader2,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  Calendar as CalendarIcon,
  ShoppingCart
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useOrders, Order } from '@/hooks/useOrders';
import { formatCurrency } from '@/lib/format';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlobalImportModal } from '@/components/GlobalImportModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 border-yellow-200">Pendente</Badge>;
    case 'approved':
      return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 border-blue-200">Aprovado</Badge>;
    case 'packing':
      return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 hover:bg-purple-500/20 border-purple-200">Em Separação</Badge>;
    case 'shipped':
      return <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 border-indigo-200">Enviado</Badge>;
    case 'delivered':
      return <Badge variant="outline" className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-200">Concluído</Badge>;
    case 'cancelled':
      return <Badge variant="outline" className="bg-red-500/10 text-red-600 hover:bg-red-500/20 border-red-200">Cancelado</Badge>;
    default:
      return <Badge variant="outline">Desconhecido</Badge>;
  }
};

export default function OrdersPage() {
  const { orders, isLoading, refetch } = useOrders();
  const { toast } = useToast();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });

  // Filter Logic
  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      (order.id && order.id.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (order.customer?.name && order.customer.name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;

    const matchesDate = 
      (!dateRange.from || new Date(order.created_at) >= dateRange.from) &&
      (!dateRange.to || new Date(order.created_at) <= dateRange.to);

    return matchesSearch && matchesStatus && matchesDate;
  });

  const exportToCSV = () => {
    // Basic CSV Export
    if (filteredOrders.length === 0) {
      toast({ title: "Nada para exportar", description: "A lista está vazia.", variant: "destructive" });
      return;
    }
    
    const headers = ["ID", "Data", "Cliente", "Status", "Total"];
    const rows = filteredOrders.map(o => [
      o.id,
      format(new Date(o.created_at), 'dd/MM/yyyy HH:mm'),
      o.customer?.name || 'Cliente Desconhecido',
      o.status,
      o.total_amount
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "pedidos.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Subscribe to realtime updates
  React.useEffect(() => {
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        () => {
          refetch();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const handleOpenDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  return (
    <AppLayout title="Pedidos">
      <div className="space-y-6 animate-in fade-in duration-500">
        <PageHeader 
          title="Pedidos" 
          description="Gerencie seus pedidos, status e envios."
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
            <Button variant="outline" className="gap-2 hidden sm:flex" onClick={exportToCSV}>
              <Download className="h-4 w-4" />
              Exportar
            </Button>
            <Button onClick={() => setIsCreateOrderOpen(true)} className="gradient-primary shadow-sm hover:shadow-md transition-all">
              <Plus className="h-4 w-4 mr-2" />
              Novo Pedido
            </Button>
          </div>
        </PageHeader>

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full flex-1">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar por cliente ou ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="packing">Em Separação</SelectItem>
                <SelectItem value="shipped">Enviado</SelectItem>
                <SelectItem value="delivered">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full sm:w-[240px] justify-start text-left font-normal", !dateRange.from && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/y", { locale: ptBR })} -{" "}
                        {format(dateRange.to, "dd/MM/y", { locale: ptBR })}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/y", { locale: ptBR })
                    )
                  ) : (
                    <span>Filtrar por data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={dateRange}
                  onSelect={(range: any) => setDateRange(range || { from: undefined, to: undefined })}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
            
            {(searchTerm || statusFilter !== 'all' || dateRange.from) && (
               <Button 
                variant="ghost" 
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                  setDateRange({ from: undefined, to: undefined });
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                Limpar
              </Button>
            )}
          </div>
        </div>

        <div className="glass-card rounded-lg border overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="bg-primary/10 p-4 rounded-full mb-4">
                <Package className="h-8 w-8 text-primary" />
              </div>
              
              {searchTerm || statusFilter !== 'all' || dateRange.from ? (
                <>
                  <h3 className="text-lg font-medium">Nenhum pedido encontrado para essa busca</h3>
                  <p className="text-muted-foreground mt-1 max-w-sm mb-4">
                    Tente ajustar os filtros ou o termo de busca.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setSearchTerm('');
                      setStatusFilter('all');
                      setDateRange({ from: undefined, to: undefined });
                    }}
                  >
                    Limpar Filtros
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium">Nenhum pedido encontrado</h3>
                  <p className="text-muted-foreground mt-1 max-w-sm mb-4">
                    Seus pedidos aparecerão aqui. Clique em "Novo Pedido" para registrar sua primeira venda ou importe seu histórico.
                  </p>
                  <div className="flex gap-2">
                    <GlobalImportModal 
                      trigger={
                        <Button variant="outline">
                          <FileSpreadsheet className="mr-2 h-4 w-4" />
                          Importar Histórico
                        </Button>
                      } 
                    />
                    <Button onClick={() => setIsCreateOrderOpen(true)}>
                      Criar Pedido
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-6">
                    Dica: Importe seu histórico de vendas antigo para começar com o pé direito.
                  </p>
                </>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-[100px]">ID</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleOpenDetails(order)}>
                    <TableCell className="font-medium text-primary">#{order.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={order.customer?.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {order.customer?.name?.substring(0, 2).toUpperCase() || 'CL'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{order.customer?.name || 'Cliente Desconhecido'}</span>
                          <span className="text-xs text-muted-foreground">{order.customer?.phone || '-'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(order.created_at), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.total_amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Abrir menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDetails(order)}>
                            <Eye className="mr-2 h-4 w-4" />
                            Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Printer className="mr-2 h-4 w-4" />
                            Imprimir Pedido
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Truck className="mr-2 h-4 w-4" />
                            Atualizar Rastreio
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <SheetContent className="sm:max-w-xl overflow-y-auto">
            {selectedOrder && (
              <>
                <SheetHeader className="mb-6">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="text-xl">Pedido #{selectedOrder.id.slice(0, 8)}</SheetTitle>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <SheetDescription>
                    Realizado em {format(new Date(selectedOrder.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-6">
                  {/* Customer Info */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-[10px]">
                          {selectedOrder.customer?.name?.substring(0, 2).toUpperCase() || 'CL'}
                        </AvatarFallback>
                      </Avatar>
                      Dados do Cliente
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm bg-muted/30 p-4 rounded-lg">
                      <div>
                        <p className="text-muted-foreground text-xs">Nome</p>
                        <p className="font-medium">{selectedOrder.customer?.name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs">Telefone</p>
                        <p className="font-medium">{selectedOrder.customer?.phone || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Itens do Pedido
                    </h3>
                    <div className="space-y-3">
                      {selectedOrder.order_items?.map((item, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg bg-card">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-muted rounded-md flex items-center justify-center">
                              {item.product?.image_url ? (
                                <img src={item.product.image_url} alt={item.product.name} className="h-full w-full object-cover rounded-md" />
                              ) : (
                                <Package className="h-5 w-5 text-muted-foreground/50" />
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{item.product?.name || 'Produto'}</p>
                              <p className="text-xs text-muted-foreground">{item.quantity}x {formatCurrency(item.unit_price)}</p>
                            </div>
                          </div>
                          <p className="text-sm font-semibold">
                            {formatCurrency(item.quantity * item.unit_price)}
                          </p>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2 border-t mt-2">
                        <p className="font-medium">Total</p>
                        <p className="text-lg font-bold text-primary">
                          {formatCurrency(selectedOrder.total_amount)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Timeline (Mock for now, using created_at) */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Histórico
                    </h3>
                    <div className="relative pl-4 border-l-2 border-muted space-y-4">
                      <div className="relative">
                        <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                        <p className="text-sm font-medium">Pedido Criado</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(selectedOrder.created_at), "dd/MM/yyyy 'às' HH:mm")}</p>
                      </div>
                      {selectedOrder.status !== 'pending' && (
                        <div className="relative">
                          <div className="absolute -left-[21px] top-1 h-3 w-3 rounded-full bg-green-500 ring-4 ring-background" />
                          <p className="text-sm font-medium">Pagamento Confirmado</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(selectedOrder.created_at), "dd/MM/yyyy 'às' HH:mm")}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2 pt-4">
                    <Button className="w-full gradient-primary">
                      <Truck className="mr-2 h-4 w-4" />
                      Marcar como Enviado
                    </Button>
                    <Button variant="outline" className="w-full text-destructive hover:text-destructive border-destructive/20 hover:bg-destructive/10">
                      <XCircle className="mr-2 h-4 w-4" />
                      Cancelar Pedido
                    </Button>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        <CreateOrderSheet 
          open={isCreateOrderOpen} 
          onOpenChange={setIsCreateOrderOpen} 
          onSuccess={() => {
            refetch();
          }}
        />
      </div>
    </AppLayout>
  );
}
