import { RecentActivity } from '@/hooks/useDashboard';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { ArrowUpRight } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface RecentSalesTableProps {
  activities: RecentActivity[];
  isLoading?: boolean;
}

export function RecentSalesTable({ activities, isLoading }: RecentSalesTableProps) {
  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Últimas Vendas</h3>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.filter(a => a.type === 'sale').length === 0) {
    return (
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Últimas Vendas</h3>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <p>Nenhuma venda registrada ainda</p>
          <p className="text-sm">Suas vendas aparecerão aqui</p>
        </div>
      </div>
    );
  }

  const sales = activities.filter(a => a.type === 'sale').slice(0, 5);

  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Últimas Vendas</h3>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Qtd</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.map((sale) => (
              <TableRow key={sale.id}>
                <TableCell className="font-medium">
                  {sale.customerName || 'Cliente não informado'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {sale.productName || sale.description}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {sale.quantity || '-'}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {format(new Date(sale.date), 'dd/MM/yyyy HH:mm')}
                </TableCell>
                <TableCell className="text-right font-semibold text-primary">
                  {formatCurrency(sale.amount)}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                    <ArrowUpRight className="h-3 w-3" />
                    Concluída
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
