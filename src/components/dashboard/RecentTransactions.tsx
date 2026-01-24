import { Transaction } from '@/hooks/useTransactions';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { ArrowUpRight, ArrowDownLeft, Package } from 'lucide-react';

interface RecentTransactionsProps {
  transactions: Transaction[];
  isLoading?: boolean;
}

export function RecentTransactions({ transactions, isLoading }: RecentTransactionsProps) {
  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Últimas Movimentações</h3>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-secondary" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-secondary rounded" />
                <div className="h-3 w-1/4 bg-secondary rounded" />
              </div>
              <div className="h-4 w-20 bg-secondary rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Últimas Movimentações</h3>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mb-3 opacity-50" />
          <p>Nenhuma movimentação registrada</p>
          <p className="text-sm">Suas vendas aparecerão aqui</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Últimas Movimentações</h3>
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
          >
            <div
              className={`p-2 rounded-full ${
                transaction.type === 'sale'
                  ? 'bg-primary/20 text-primary'
                  : 'bg-warning/20 text-warning'
              }`}
            >
              {transaction.type === 'sale' ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : (
                <ArrowDownLeft className="h-5 w-5" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">
                {transaction.products?.name || 'Produto removido'}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDateTime(transaction.created_at)} • {transaction.quantity} un.
              </p>
            </div>

            <div className="text-right">
              <p className={`font-semibold ${
                transaction.type === 'sale' ? 'text-primary' : 'text-warning'
              }`}>
                {transaction.type === 'sale' ? '+' : '-'}
                {formatCurrency(transaction.total_amount)}
              </p>
              {transaction.profit && transaction.profit > 0 && (
                <p className="text-xs text-muted-foreground">
                  Lucro: {formatCurrency(transaction.profit)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
