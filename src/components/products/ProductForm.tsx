import { useState, useEffect } from 'react';
import * as React from 'react';
import { useProducts, Product } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { CategoryManager } from '@/components/CategoryManager';
import { formatCurrency, calculateMargin, calculateSellingPrice, calculateProfit } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CurrencyInput } from '@/components/ui/currency-input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Loader2, Sparkles, Plus, ChevronRight, Camera, X, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProductFormProps {
  initialData?: Product;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
  const { createProduct, updateProduct, uploadProductImage } = useProducts();
  const { categories, createCategory } = useCategories();
  const { suppliers, createSupplier } = useSuppliers();
  const { toast } = useToast();
  
  const [name, setName] = useState(initialData?.name || '');
  const [quantity, setQuantity] = useState(initialData?.quantity || 1);
  const [costPrice, setCostPrice] = useState(initialData?.cost_price || 0);
  const [sellingPrice, setSellingPrice] = useState(initialData?.selling_price || 0);
  const [categoryId, setCategoryId] = useState<string | undefined>(initialData?.category_id || undefined);
  const [supplierId, setSupplierId] = useState<string | undefined>(initialData?.supplier_id || undefined);
  const [manualPrice, setManualPrice] = useState(!!initialData); // If editing, don't auto-calc unless changed
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCreateCategoryDialog, setShowCreateCategoryDialog] = useState(false);
  const [showCreateSupplierDialog, setShowCreateSupplierDialog] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [showSubcategoryDialog, setShowSubcategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [createdCategoryId, setCreatedCategoryId] = useState<string | null>(null);
  const [productImage, setProductImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.image_url || null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [color, setColor] = useState(initialData?.color || ''); // Assuming Product type has color, if not ignore for now or check type

  useEffect(() => {
    if (!manualPrice && costPrice > 0 && !initialData) {
      setSellingPrice(calculateSellingPrice(costPrice, 45));
    }
  }, [costPrice, manualPrice, initialData]);

  // Limpa categoria selecionada se ela foi deletada
  useEffect(() => {
    if (categoryId && categories.length > 0 && !categories.find(c => c.id === categoryId)) {
      setCategoryId(undefined);
    }
  }, [categories, categoryId]);

  // Organiza categorias em hierarquia (pais e filhos)
  const parentCategories = categories.filter(cat => !cat.name.includes(' > '));
  const getSubcategories = (parentId: string) => {
    const parent = categories.find(c => c.id === parentId);
    if (!parent) return [];
    return categories.filter(cat => cat.name.startsWith(parent.name + ' > '));
  };

  const margin = costPrice > 0 ? calculateMargin(costPrice, sellingPrice) : 0;
  const profit = calculateProfit(costPrice, sellingPrice, quantity);
  const isLowMargin = margin < 45 && margin > 0;

  const handleCategorySelect = (selectedId: string) => {
    setCategoryId(selectedId);
    setIsCategoryDialogOpen(false);
  };

  const handleCreateCategoryClick = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowCreateCategoryDialog(true);
    setNewCategoryName('');
    setNewSubcategoryName('');
    setCreatedCategoryId(null);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      const categoryName = newCategoryName.trim();
      const newCat = await createCategory.mutateAsync(categoryName);
      
      if (newCat?.id) {
        setCreatedCategoryId(newCat.id);
        setShowCreateCategoryDialog(false);
        setShowSubcategoryDialog(true);
      }
    } catch (error) {
      // Error handled by toast in hook
    }
  };

  const handleCreateSubcategory = async () => {
    if (!newSubcategoryName.trim() || !createdCategoryId || !newCategoryName.trim()) return;

    try {
      const parentCategoryName = newCategoryName.trim();
      const subcategoryName = `${parentCategoryName} > ${newSubcategoryName.trim()}`;
      const newSubcat = await createCategory.mutateAsync(subcategoryName);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      if (newSubcat?.id) {
        setCategoryId(newSubcat.id);
      }

      setShowSubcategoryDialog(false);
      setNewCategoryName('');
      setNewSubcategoryName('');
      setCreatedCategoryId(null);
    } catch (error) {
      // Error handled by UI
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplierName.trim()) return;

    try {
      const newSup = await createSupplier.mutateAsync({ name: newSupplierName.trim() });
      
      if (newSup?.id) {
        setSupplierId(newSup.id);
        setShowCreateSupplierDialog(false);
        setNewSupplierName('');
      }
    } catch (error) {
      // Error handled by hook
    }
  };

  const handleSkipSubcategory = async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    if (createdCategoryId) {
      setCategoryId(createdCategoryId);
    }
    setShowSubcategoryDialog(false);
    setNewCategoryName('');
    setNewSubcategoryName('');
    setCreatedCategoryId(null);
  };

  const validateAndSetImage = (file: File) => {
    const acceptedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif', 'image/avif', 'image/bmp', 'image/tiff'];
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.avif', '.bmp', '.tiff', '.tif'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';
    
    if (!file.type.startsWith('image/') && !acceptedFormats.includes(file.type) && !hasValidExtension) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }

    setProductImage(file);
    
    if (isHeic) {
      setImagePreview('HEIC_FILE');
      return;
    }
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      if (result && !result.startsWith('data:application/octet-stream')) {
        setImagePreview(result);
      } else {
        setImagePreview('HEIC_FILE');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndSetImage(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetImage(file);
    }
  };

  const handleRemoveImage = () => {
    setProductImage(null);
    setImagePreview(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!name.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      let imageUrl: string | null = imagePreview; // Default to existing URL if not changed
      
      if (productImage && uploadProductImage) {
        setUploadingImage(true);
        imageUrl = await uploadProductImage(productImage);
        setUploadingImage(false);
      } else if (!imagePreview && initialData?.image_url) {
        // If image removed (preview null) but had initial, it means delete/nullify? 
        // Logic for removing image might need explicit handling, for now assume null
        imageUrl = null;
      }
      
      const productData = {
        name,
        quantity,
        cost_price: costPrice,
        selling_price: sellingPrice,
        category_id: categoryId || null,
        supplier_id: supplierId || null,
        image_url: imageUrl,
        // color, // Add if supported
      };

      if (initialData) {
        await updateProduct.mutateAsync({
          id: initialData.id,
          ...productData
        });
        toast({ title: 'Produto atualizado!' });
      } else {
        await createProduct.mutateAsync(productData);
        toast({ title: 'Produto adicionado!' });
      }

      if (onSuccess) onSuccess();
      
    } catch (error) {
      setIsSubmitting(false);
      setUploadingImage(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4">
          <div>
            <Label>Nome do Produto</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="input-glass" required />
          </div>
          
          {/* Upload de Imagem */}
          <div>
            <Label>Foto do Produto (opcional)</Label>
            <div className="space-y-3 mt-1">
              {imagePreview ? (
                imagePreview === 'HEIC_FILE' ? (
                  <div className="relative inline-block">
                    <div className="h-32 w-32 flex flex-col items-center justify-center bg-muted rounded-lg border border-border">
                      <Package className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-xs text-muted-foreground text-center px-2">Arquivo HEIC</p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="relative inline-block">
                    <img 
                      src={imagePreview} 
                      alt="Preview" 
                      className="h-32 w-32 object-cover rounded-lg border border-border"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                )
              ) : (
                <label 
                  className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                    isDragging 
                      ? 'border-primary bg-primary/10 scale-105' 
                      : 'border-border hover:bg-secondary/50 hover:border-primary/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">Arraste ou clique</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    disabled={uploadingImage}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <Label>Categoria</Label>
            <div className="flex gap-2">
              <Select 
                value={categoryId || "none"} 
                onValueChange={(value) => setCategoryId(value === "none" ? undefined : value)}
                disabled={categories.length === 0}
              >
                <SelectTrigger className={`input-glass flex-1 ${categories.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <SelectValue placeholder={categories.length === 0 ? "Nenhuma categoria" : "Sem categoria"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem categoria</SelectItem>
                  {parentCategories.map(cat => {
                    const subcategories = getSubcategories(cat.id);
                    return (
                      <React.Fragment key={cat.id}>
                        <SelectItem value={cat.id} className="font-medium">
                          {cat.name}
                        </SelectItem>
                        {subcategories.map(subcat => (
                          <SelectItem 
                            key={subcat.id} 
                            value={subcat.id}
                            className="pl-10"
                          >
                            <div className="flex items-center gap-2 -ml-2">
                              <ChevronRight className="h-3 w-3 text-primary shrink-0" />
                              <span className="text-sm">{subcat.name.split(' > ').pop()}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  <div className="p-2 border-t border-border mt-2">
                    <Button
                      variant="ghost"
                      className="w-full justify-start h-8 text-xs font-medium text-primary hover:text-primary hover:bg-primary/10"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Fecha o select (hacky mas necessário às vezes com Radix)
                        const escEvent = new KeyboardEvent('keydown', { key: 'Escape' });
                        document.dispatchEvent(escEvent);
                        handleCreateCategoryClick();
                      }}
                    >
                      <Plus className="mr-2 h-3 w-3" />
                      Criar nova categoria
                    </Button>
                  </div>
                </SelectContent>
              </Select>
              <Button 
                type="button" 
                variant="outline" 
                size="icon" 
                className="shrink-0"
                onClick={handleCreateCategoryClick}
              >
                <Plus className="h-4 w-4" />
              </Button>
              
              <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    className="text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      setIsCategoryDialogOpen(true);
                    }}
                  >
                    Gerenciar
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Gerenciar Categorias</DialogTitle>
                    <DialogDescription>
                      Crie, edite ou exclua categorias.
                    </DialogDescription>
                  </DialogHeader>
                  <CategoryManager
                    onCategorySelect={handleCategorySelect}
                    selectedCategoryId={categoryId}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Quantidade</Label>
              <Input
                type="number"
                min={1}
                value={quantity || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') setQuantity(1);
                  else {
                    const num = parseInt(val, 10);
                    if (!isNaN(num) && num > 0) setQuantity(num);
                  }
                }}
                className="input-glass"
                required
              />
            </div>
            <div>
              <Label>Custo Unit. (R$)</Label>
              <CurrencyInput
                value={costPrice}
                onChange={(value) => {
                  setCostPrice(value);
                  setManualPrice(false);
                }}
                className="input-glass"
                required
              />
            </div>
          </div>

          <div>
            <Label>Preço de Venda Unit. (R$)</Label>
            <CurrencyInput
              value={sellingPrice}
              onChange={(value) => {
                setSellingPrice(value);
                setManualPrice(true);
              }}
              className="input-glass"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              Total em Estoque: {formatCurrency(sellingPrice * quantity)}
            </p>
          </div>
        </div>

        {isLowMargin && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-warning">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-medium">Margem Baixa ({'<'}45%)</span>
          </div>
        )}

        <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
          <div className="flex items-center gap-2 mb-2"><Sparkles className="h-5 w-5 text-primary" /><span className="font-medium">Lucro Estimado</span></div>
          <p className="text-3xl font-bold text-primary">{formatCurrency(profit)}</p>
          <p className="text-sm text-muted-foreground mt-1">Margem: {margin.toFixed(1)}%</p>
        </div>

        <div className="flex gap-4 pt-4">
          {onCancel && (
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel} 
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
          )}
          <Button 
            type="submit" 
            disabled={isSubmitting || uploadingImage || !name.trim()} 
            className="flex-1 gradient-primary"
          >
            {(isSubmitting || uploadingImage) ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                {uploadingImage ? 'Enviando...' : 'Salvar'}
              </>
            ) : (
              initialData ? 'Salvar Alterações' : 'Adicionar Produto'
            )}
          </Button>
        </div>
      </form>

      {/* Dialogs for Category Creation */}
      <Dialog 
        open={showCreateCategoryDialog} 
        onOpenChange={(open) => {
          setShowCreateCategoryDialog(open);
          if (!open) {
            setNewCategoryName('');
            setCreatedCategoryId(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>Nome da nova categoria.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Eletrônicos"
                className="input-glass"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCategoryName.trim()) {
                    e.preventDefault();
                    handleCreateCategory();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateCategoryDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateCategory}
              disabled={!newCategoryName.trim()}
              className="gradient-primary"
            >
              Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog 
        open={showSubcategoryDialog} 
        onOpenChange={(open) => {
          if (!open) handleSkipSubcategory();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Categoria Criada!</DialogTitle>
            <DialogDescription>Deseja adicionar uma subcategoria?</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Subcategoria</Label>
              <Input
                value={newSubcategoryName}
                onChange={(e) => setNewSubcategoryName(e.target.value)}
                placeholder="Ex: Fones Bluetooth"
                className="input-glass"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSubcategoryName.trim()) {
                    e.preventDefault();
                    handleCreateSubcategory();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleSkipSubcategory}
            >
              Pular
            </Button>
            <Button
              type="button"
              onClick={handleCreateSubcategory}
              disabled={!newSubcategoryName.trim()}
              className="gradient-primary"
            >
              Criar Subcategoria
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog 
        open={showCreateSupplierDialog} 
        onOpenChange={(open) => {
          setShowCreateSupplierDialog(open);
          if (!open) setNewSupplierName('');
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Fornecedor</DialogTitle>
            <DialogDescription>Nome do novo fornecedor.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Empresa / Fornecedor</Label>
              <Input
                value={newSupplierName}
                onChange={(e) => setNewSupplierName(e.target.value)}
                placeholder="Ex: Distribuidora Silva"
                className="input-glass"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newSupplierName.trim()) {
                    e.preventDefault();
                    handleCreateSupplier();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateSupplierDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleCreateSupplier}
              disabled={!newSupplierName.trim()}
              className="gradient-primary"
            >
              Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
