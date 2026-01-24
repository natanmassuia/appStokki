import { useState } from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Loader2, Tags } from 'lucide-react';

export default function Categorias() {
  const { categories, isLoading, createCategory, updateCategory, deleteCategory } = useCategories();
  const [newCategory, setNewCategory] = useState('');
  const [editModal, setEditModal] = useState<{ open: boolean; id: string; name: string }>({ open: false, id: '', name: '' });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    await createCategory.mutateAsync(newCategory.trim());
    setNewCategory('');
  };

  const handleUpdate = async () => {
    if (!editModal.name.trim()) return;
    await updateCategory.mutateAsync({ id: editModal.id, name: editModal.name.trim() });
    setEditModal({ open: false, id: '', name: '' });
  };

  return (
    <AppLayout title="Categorias">
      <div className="max-w-2xl mx-auto space-y-6">
        <form onSubmit={handleCreate} className="flex gap-4">
          <Input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Nova categoria..." className="input-glass flex-1" />
          <Button type="submit" disabled={createCategory.isPending} className="gradient-primary">
            {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />} Adicionar
          </Button>
        </form>

        <div className="glass-card rounded-xl divide-y divide-border/30">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Tags className="h-12 w-12 mb-3 opacity-50" /><p>Nenhuma categoria cadastrada</p>
            </div>
          ) : (
            categories.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-4 hover:bg-secondary/30">
                <div><p className="font-medium">{cat.name}</p><p className="text-sm text-muted-foreground">{cat.product_count || 0} produtos</p></div>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setEditModal({ open: true, id: cat.id, name: cat.name })}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteCategory.mutate(cat.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={editModal.open} onOpenChange={(open) => setEditModal({ ...editModal, open })}>
        <DialogContent className="glass-card">
          <DialogHeader><DialogTitle>Editar Categoria</DialogTitle></DialogHeader>
          <div className="py-4"><Label>Nome</Label><Input value={editModal.name} onChange={(e) => setEditModal({ ...editModal, name: e.target.value })} className="input-glass" /></div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal({ open: false, id: '', name: '' })}>Cancelar</Button>
            <Button onClick={handleUpdate} disabled={updateCategory.isPending} className="gradient-primary">Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
