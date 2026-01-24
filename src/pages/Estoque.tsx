import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useProducts, Product } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency, calculateMargin } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, ShoppingCart, Loader2, Package } from 'lucide-react';

export default function Estoque() {
  const { products, isLoading, sellProduct } = useProducts();
  const { categories } = useCategories();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sellModal, setSellModal] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const [sellQuantity, setSellQuantity] = useState(1);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || p.category_id === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const getStockBadge = (quantity: number) => {
    if (quantity === 0) return <Badge className="badge-danger">Esgotado</Badge>;
    if (quantity < 3) return <Badge className="badge-warning">Baixo</Badge>;
    return <Badge className="badge-success">Em Estoque</Badge>;
  };

  const handleSell = async () => {
    if (!sellModal.product) return;
    await sellProduct.mutateAsync({ productId: sellModal.product.id, quantity: sellQuantity });
    setSellModal({ open: false, product: null });
    setSellQuantity(1);
  };

  return (
    <AppLayout title="Estoque">
      <div className="space-y-6">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 input-glass" />
          </div>
          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="px-4 py-2 rounded-lg bg-secondary border border-border text-foreground">
            <option value="">Todas as categorias</option>
            {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="glass-card rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mb-3 opacity-50" />
              <p>Nenhum produto encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border/30">
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProducts.map(product => (
                  <TableRow key={product.id} className="border-border/30 hover:bg-secondary/30">
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.categories?.name || '-'}</TableCell>
                    <TableCell className="text-center">{getStockBadge(product.quantity)} <span className="ml-2">{product.quantity}</span></TableCell>
                    <TableCell className="text-right">{formatCurrency(product.cost_price)}</TableCell>
                    <TableCell className="text-right text-primary font-medium">{formatCurrency(product.selling_price)}</TableCell>
                    <TableCell className="text-right">{calculateMargin(product.cost_price, product.selling_price).toFixed(1)}%</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" disabled={product.quantity === 0} onClick={() => { setSellModal({ open: true, product }); setSellQuantity(1); }}>
                        <ShoppingCart className="h-4 w-4 mr-1" /> Vender
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Sell Modal */}
      <Dialog open={sellModal.open} onOpenChange={(open) => setSellModal({ open, product: open ? sellModal.product : null })}>
        <DialogContent className="glass-card">
          <DialogHeader><DialogTitle>Vender {sellModal.product?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div><Label>Quantidade</Label><Input type="number" min={1} max={sellModal.product?.quantity || 1} value={sellQuantity} onChange={(e) => setSellQuantity(Number(e.target.value))} className="input-glass" /></div>
            {sellModal.product && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm text-muted-foreground">Valor da venda</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(sellModal.product.selling_price * sellQuantity)}</p>
                <p className="text-sm text-muted-foreground mt-1">Lucro: {formatCurrency((sellModal.product.selling_price - sellModal.product.cost_price) * sellQuantity)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSellModal({ open: false, product: null })}>Cancelar</Button>
            <Button onClick={handleSell} disabled={sellProduct.isPending} className="gradient-primary">
              {sellProduct.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Confirmar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
