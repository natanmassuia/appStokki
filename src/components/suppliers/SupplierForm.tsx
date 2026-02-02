import { useState, useEffect } from 'react';
import { useSuppliers } from '@/hooks/useSuppliers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface SupplierFormProps {
  initialData?: {
    id?: string;
    name: string;
    category: string;
    phone: string;
    email: string;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
  isEditMode?: boolean;
}

export function SupplierForm({ initialData, onSuccess, onCancel, isEditMode = false }: SupplierFormProps) {
  const { createSupplier, updateSupplier } = useSuppliers();
  const [formData, setFormData] = useState({ 
    id: '', 
    name: '', 
    category: '', 
    phone: '', 
    email: '' 
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        id: initialData.id || '',
        name: initialData.name || '',
        category: initialData.category || '',
        phone: initialData.phone || '',
        email: initialData.email || ''
      });
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (isEditMode && formData.id) {
        await updateSupplier.mutateAsync({
          id: formData.id,
          name: formData.name,
          category: formData.category,
          phone: formData.phone,
          email: formData.email
        });
      } else {
        await createSupplier.mutateAsync({
          name: formData.name,
          category: formData.category,
          phone: formData.phone,
          email: formData.email
        });
      }
      if (onSuccess) onSuccess();
    } catch (error) {
      // Error handled in hook
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Nome da Empresa / Fornecedor</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Ex: Distribuidora Silva"
          className="input-glass mt-2"
          required
        />
      </div>
      <div>
        <Label htmlFor="category">Categoria (Opcional)</Label>
        <Input
          id="category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          placeholder="Ex: Embalagens, Eletrônicos"
          className="input-glass mt-2"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Telefone / WhatsApp</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="(00) 00000-0000"
            className="input-glass mt-2"
          />
        </div>
        <div>
          <Label htmlFor="email">Email (Opcional)</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="contato@empresa.com"
            className="input-glass mt-2"
          />
        </div>
      </div>
      <div className="flex gap-2 justify-end pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={createSupplier.isPending || updateSupplier.isPending}
          className="gradient-primary"
        >
          {(createSupplier.isPending || updateSupplier.isPending) ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Salvando...
            </>
          ) : (
            isEditMode ? 'Salvar Alterações' : 'Adicionar Fornecedor'
          )}
        </Button>
      </div>
    </form>
  );
}
