import { LowStockProduct } from '@/hooks/useDashboard';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Package, Pencil } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface LowStockListProps {
  products: LowStockProduct[];
  isLoading?: boolean;
  onLowStockClick?: () => void;
}

export function LowStockList({ products, isLoading, onLowStockClick }: LowStockListProps) {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Produtos Acabando</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-12 w-12 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Produtos Acabando</h3>
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Package className="h-12 w-12 mb-3 opacity-50" />
          <p>Estoque em dia!</p>
          <p className="text-sm">Todos os produtos têm estoque adequado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Produtos Acabando</h3>
        {onLowStockClick && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLowStockClick}
            className="text-xs"
          >
            Ver todos
          </Button>
        )}
      </div>
      <div className="space-y-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/50 transition-colors border border-border/50"
          >
            <Avatar className="h-12 w-12 rounded-lg">
              <AvatarImage src={product.image_url} alt={product.name} />
              <AvatarFallback className="bg-primary/20 text-primary rounded-lg">
                <Package className="h-6 w-6" />
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{product.name}</p>
              <div className="flex items-center gap-2 mt-1">
                <AlertTriangle className="h-3 w-3 text-destructive" />
                <p className="text-sm text-destructive font-medium">
                  {product.quantity} {product.quantity === 1 ? 'unidade' : 'unidades'}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Navega para estoque com filtro de estoque baixo
                navigate('/estoque', { state: { filterLowStock: true } });
              }}
            >
              <Pencil className="h-3 w-3 mr-1" />
              Repor
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
