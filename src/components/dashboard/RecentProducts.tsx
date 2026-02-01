import { Product } from '@/hooks/useProducts';
import { formatCurrency, calculateMargin, calculateProfit } from '@/lib/format';
import { Package, Loader2 } from 'lucide-react';

interface RecentProductsProps {
  products: Product[];
  isLoading?: boolean;
}

export function RecentProducts({ products, isLoading }: RecentProductsProps) {
  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Últimos Produtos Adicionados</h3>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
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

  if (products.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Últimos Produtos Adicionados</h3>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mb-3 opacity-50" />
          <p>Nenhum produto cadastrado</p>
          <p className="text-sm">Seus produtos aparecerão aqui</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Últimos Produtos Adicionados</h3>
      <div className="space-y-3">
        {products.slice(0, 5).map((product) => {
          const margin = calculateMargin(product.cost_price, product.selling_price);
          const profit = calculateProfit(product.cost_price, product.selling_price, product.quantity);
          
          return (
            <div
              key={product.id}
              className="flex items-center justify-between p-4 rounded-lg hover:bg-secondary/50 transition-colors border border-border/50"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{product.name}</p>
                <p className="text-sm text-muted-foreground">
                  {product.categories?.name || 'Sem categoria'} • Qtd: {product.quantity}
                </p>
              </div>

              <div className="flex items-center gap-6 text-right">
                <div>
                  <p className="text-xs text-muted-foreground">Custo Unit.</p>
                  <p className="font-medium text-sm">{formatCurrency(product.cost_price)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Venda Unit.</p>
                  <p className="font-medium text-sm text-primary">{formatCurrency(product.selling_price)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lucro Est.</p>
                  <p className="font-semibold text-sm text-primary">{formatCurrency(profit)}</p>
                  <p className="text-xs text-muted-foreground">{margin.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
