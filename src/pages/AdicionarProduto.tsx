import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { formatCurrency, calculateMargin, calculateSellingPrice, calculateProfit } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';

export default function AdicionarProduto() {
  const navigate = useNavigate();
  const { createProduct } = useProducts();
  const { categories } = useCategories();
  
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [costPrice, setCostPrice] = useState(0);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [manualPrice, setManualPrice] = useState(false);

  useEffect(() => {
    if (!manualPrice && costPrice > 0) {
      setSellingPrice(calculateSellingPrice(costPrice, 45));
    }
  }, [costPrice, manualPrice]);

  const margin = costPrice > 0 ? calculateMargin(costPrice, sellingPrice) : 0;
  const profit = calculateProfit(costPrice, sellingPrice, quantity);
  const isLowMargin = margin < 45 && margin > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProduct.mutateAsync({
      name,
      quantity,
      cost_price: costPrice,
      selling_price: sellingPrice,
      category_id: categoryId || null,
    });
    navigate('/estoque');
  };

  return (
    <AppLayout title="Adicionar Produto">
      <div className="max-w-2xl mx-auto">
        <Card className="glass-card">
          <CardHeader><CardTitle>Novo Produto</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2"><Label>Nome do Produto</Label><Input value={name} onChange={(e) => setName(e.target.value)} className="input-glass" required /></div>
                <div><Label>Categoria</Label>
                  <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full px-4 py-2 rounded-lg bg-secondary border border-border text-foreground">
                    <option value="">Sem categoria</option>
                    {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                  </select>
                </div>
                <div><Label>Quantidade</Label><Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} className="input-glass" required /></div>
                <div><Label>Preço de Custo (R$)</Label><Input type="number" step="0.01" min={0} value={costPrice || ''} onChange={(e) => { setCostPrice(Number(e.target.value)); setManualPrice(false); }} className="input-glass" required /></div>
                <div><Label>Preço de Venda (R$)</Label><Input type="number" step="0.01" min={0} value={sellingPrice || ''} onChange={(e) => { setSellingPrice(Number(e.target.value)); setManualPrice(true); }} className="input-glass" required /></div>
              </div>

              {isLowMargin && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning">
                  <AlertTriangle className="h-5 w-5" />
                  <span className="text-sm font-medium">Atenção: Margem Baixa ({'<'}45%)</span>
                </div>
              )}

              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-2 mb-2"><Sparkles className="h-5 w-5 text-primary" /><span className="font-medium">Lucro Estimado</span></div>
                <p className="text-3xl font-bold text-primary">{formatCurrency(profit)}</p>
                <p className="text-sm text-muted-foreground mt-1">Margem: {margin.toFixed(1)}% | Total: {formatCurrency(sellingPrice * quantity)}</p>
              </div>

              <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={() => navigate('/estoque')} className="flex-1">Cancelar</Button>
                <Button type="submit" disabled={createProduct.isPending} className="flex-1 gradient-primary">
                  {createProduct.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Adicionar Produto
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
