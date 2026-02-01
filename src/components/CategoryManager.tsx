import { useState } from 'react';
import { useCategories } from '@/hooks/useCategories';
import { useProducts } from '@/hooks/useProducts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Loader2, Tags, ChevronRight, ChevronDown, Package, Download, Search } from 'lucide-react';
import { exportToCSV } from '@/utils/exportUtils';
import { useToast } from '@/hooks/use-toast';
import { useBulkOperation } from '@/contexts/BulkOperationContext';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { formatCurrency } from '@/lib/format';
import { humanizeError } from '@/lib/utils';
import type { Category } from '@/hooks/useCategories';

interface CategoryManagerProps {
  onCategorySelect?: (categoryId: string) => void;
  selectedCategoryId?: string;
}

export function CategoryManager({ onCategorySelect, selectedCategoryId }: CategoryManagerProps) {
  const { categories, isLoading, refetch, createCategory, updateCategory, deleteCategory, deleteCategories } = useCategories();
  const { products } = useProducts();
  const { toast } = useToast();
  const { startOperation, toggleModal } = useBulkOperation();
  const [newCategory, setNewCategory] = useState('');
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<{ open: boolean; id: string; name: string; isSubcategory: boolean; parentName?: string }>({ open: false, id: '', name: '', isSubcategory: false });
  const [subcategoryModal, setSubcategoryModal] = useState<{ open: boolean; parentId: string; parentName: string }>({ open: false, parentId: '', parentName: '' });
  const [newSubcategory, setNewSubcategory] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  const [deleteMultipleConfirm, setDeleteMultipleConfirm] = useState(false);
  const [exportMultipleConfirm, setExportMultipleConfirm] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const [confirmCreateCategory, setConfirmCreateCategory] = useState(false);
  const [confirmCreateSubcategory, setConfirmCreateSubcategory] = useState(false);
  const [confirmUpdateCategory, setConfirmUpdateCategory] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Organiza categorias em hierarquia (pais e filhos)
  const parentCategories = categories.filter(cat => !cat.name.includes(' > '));
  const getSubcategories = (parentId: string) => {
    const parent = categories.find(c => c.id === parentId);
    if (!parent) return [];
    return categories.filter(cat => cat.name.startsWith(parent.name + ' > '));
  };

  // Filtra categorias baseado na busca
  const filteredParentCategories = parentCategories.filter(cat => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const matchesParent = cat.name.toLowerCase().includes(query);
    const subcategories = getSubcategories(cat.id);
    const matchesSub = subcategories.some(sub => sub.name.toLowerCase().includes(query));
    return matchesParent || matchesSub;
  });

  // Obtém produtos de uma categoria/subcategoria
  const getProductsByCategory = (categoryId: string) => {
    return products.filter(p => p.category_id === categoryId);
  };

  // Calcula o total de produtos de uma categoria pai (incluindo subcategorias)
  const getTotalProductsForParentCategory = (parentId: string) => {
    const subcategories = getSubcategories(parentId);
    const parentProducts = getProductsByCategory(parentId).length;
    const subcategoryProducts = subcategories.reduce((total, subcat) => {
      return total + getProductsByCategory(subcat.id).length;
    }, 0);
    return parentProducts + subcategoryProducts;
  };

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!newCategory.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite um nome para a categoria.',
        variant: 'destructive',
      });
      return;
    }
    
    // Mostra confirmação antes de criar
    setConfirmCreateCategory(true);
  };

  const handleConfirmCreateCategory = async () => {
    setConfirmCreateCategory(false);
    
    const parent = parentCategoryId ? categories.find(c => c.id === parentCategoryId) : null;
    const categoryName = parent 
      ? `${parent.name} > ${newCategory.trim()}`
      : newCategory.trim();
    
    try {
      const newCat = await createCategory.mutateAsync(categoryName);
      setNewCategory('');
      setParentCategoryId(null);
      
      // Força atualização imediata da lista
      await refetch();
      
      // Toast de sucesso (apenas para criação manual)
      toast({
        title: 'Categoria criada!',
        description: 'A categoria foi adicionada com sucesso.',
      });
      
      // Seleciona automaticamente se houver callback
      // Isso fecha o dialog e seleciona a categoria no formulário de produto
      if (onCategorySelect && newCat?.id) {
        // Pequeno delay para garantir que a categoria foi criada
        setTimeout(() => {
          try {
            onCategorySelect(newCat.id);
          } catch (err) {
            // Erro ao selecionar categoria - silenciosamente ignora
          }
        }, 200);
      }
    } catch (error) {
      // Erro ao criar categoria - já tratado no toast
    }
  };

  const handleCreateSubcategory = () => {
    if (!newSubcategory.trim() || !subcategoryModal.parentName) return;
    setConfirmCreateSubcategory(true);
  };

  const handleConfirmCreateSubcategory = async () => {
    setConfirmCreateSubcategory(false);
    const categoryName = `${subcategoryModal.parentName} > ${newSubcategory.trim()}`;
    
    try {
      const newCat = await createCategory.mutateAsync(categoryName);
      setNewSubcategory('');
      setSubcategoryModal({ open: false, parentId: '', parentName: '' });
      
      // Força atualização imediata da lista
      await refetch();
      
      // Toast de sucesso (apenas para criação manual)
      toast({
        title: 'Subcategoria criada!',
        description: 'A subcategoria foi adicionada com sucesso.',
      });
      
      // Seleciona automaticamente se houver callback
      // Isso fecha o dialog e seleciona a subcategoria no formulário de produto
      if (onCategorySelect && newCat?.id) {
        // Pequeno delay para garantir que a subcategoria foi criada
        setTimeout(() => {
          try {
            onCategorySelect(newCat.id);
          } catch (err) {
            // Erro ao selecionar subcategoria - silenciosamente ignora
          }
        }, 200);
      }
    } catch (error) {
      // Erro já é tratado na UI
    }
  };

  const handleUpdate = () => {
    if (!editModal.name.trim()) return;
    setConfirmUpdateCategory(true);
  };

  const handleConfirmUpdateCategory = async () => {
    setConfirmUpdateCategory(false);
    
    // Se for subcategoria, reconstrói o nome completo
    let finalName = editModal.name.trim();
    if (editModal.isSubcategory && editModal.parentName) {
      finalName = `${editModal.parentName} > ${editModal.name.trim()}`;
    }
    
    await updateCategory.mutateAsync({ id: editModal.id, name: finalName });
    
    // Força atualização imediata da lista
    await refetch();
    
    setEditModal({ open: false, id: '', name: '', isSubcategory: false });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedCategories(new Set(categories.map(c => c.id)));
    } else {
      setSelectedCategories(new Set());
    }
  };

  const handleSelectCategory = (categoryId: string, checked: boolean) => {
    const newSelected = new Set(selectedCategories);
    const category = categories.find(c => c.id === categoryId);
    
    if (checked) {
      newSelected.add(categoryId);
      // Se for categoria pai, seleciona todas as subcategorias também
      if (category && !category.name.includes(' > ')) {
        const subcategories = getSubcategories(categoryId);
        subcategories.forEach(sub => newSelected.add(sub.id));
      }
    } else {
      newSelected.delete(categoryId);
      // Se for categoria pai, desmarca todas as subcategorias também
      if (category && !category.name.includes(' > ')) {
        const subcategories = getSubcategories(categoryId);
        subcategories.forEach(sub => newSelected.delete(sub.id));
      }
    }
    setSelectedCategories(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (deleteConfirm.ids.length === 0) return;
    try {
      await deleteCategories.mutateAsync(deleteConfirm.ids);
      
      // Força atualização imediata da lista
      await refetch();
      
      setSelectedCategories(new Set());
      setDeleteConfirm({ open: false, ids: [] });
    } catch (error) {
      // Erro ao excluir categorias - já tratado no toast
      // Mantém o dialog aberto em caso de erro
    }
  };

  const handleDeleteSingle = (categoryId: string) => {
    setDeleteConfirm({ open: true, ids: [categoryId] });
  };

  const handleDeleteMultiple = () => {
    if (selectedCategories.size === 0) return;
    setDeleteMultipleConfirm(true);
  };

  const confirmDeleteMultiple = () => {
    setDeleteMultipleConfirm(false);
    
    const selectedIds = Array.from(selectedCategories);
    const itemsToDelete = categories
      .filter(c => selectedIds.includes(c.id))
      .map(c => ({ id: c.id, name: c.name }));

    if (itemsToDelete.length === 0) return;

    // Inicia operação em massa com progresso
    // O modal será aberto automaticamente pelo contexto
    startOperation(
      'delete',
      'categories',
      itemsToDelete,
      async (item) => {
        await deleteCategory.mutateAsync(item.id);
      }
    ).then(() => {
      // Limpa seleção após iniciar (não espera terminar)
      setSelectedCategories(new Set());
      // O refetch será feito automaticamente pelo contexto quando a operação terminar
    }).catch((error) => {
      // Erro ao iniciar exclusão em massa - já tratado no toast
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a exclusão em massa.',
        variant: 'destructive',
      });
    });
  };

  const handleExportCSV = (categoryId?: string) => {
    // Se não é exportação individual e há categorias selecionadas, pede confirmação
    if (!categoryId && selectedCategories.size > 0) {
      setExportMultipleConfirm(true);
      return;
    }
    
    executeExportCSV(categoryId);
  };

  const executeExportCSV = (categoryId?: string) => {
    try {
      let categoriesToExport;
      if (categoryId) {
        // Exporta apenas uma categoria
        const category = categories.find(c => c.id === categoryId);
        if (!category) {
          toast({
            title: 'Categoria não encontrada',
            variant: 'destructive',
          });
          return;
        }
        const categoryProducts = getProductsByCategory(category.id);
        const isSubcategory = category.name.includes(' > ');
        categoriesToExport = [{
          nome: category.name,
          tipo: isSubcategory ? 'Subcategoria' : 'Categoria',
          total_produtos: categoryProducts.length.toString(),
        }];
      } else if (selectedCategories.size > 0) {
        // Exporta apenas as selecionadas
        const selectedIds = Array.from(selectedCategories);
        categoriesToExport = categories
          .filter(cat => selectedIds.includes(cat.id))
          .map(cat => {
            const categoryProducts = getProductsByCategory(cat.id);
            const isSubcategory = cat.name.includes(' > ');
            return {
              nome: cat.name,
              tipo: isSubcategory ? 'Subcategoria' : 'Categoria',
              total_produtos: categoryProducts.length.toString(),
            };
          });
      } else {
        // Exporta todas
        categoriesToExport = categories.map(cat => {
          const categoryProducts = getProductsByCategory(cat.id);
          const isSubcategory = cat.name.includes(' > ');
          return {
            nome: cat.name,
            tipo: isSubcategory ? 'Subcategoria' : 'Categoria',
            total_produtos: categoryProducts.length.toString(),
          };
        });
      }

      if (categoriesToExport.length === 0) {
        toast({
          title: 'Nenhuma categoria para exportar',
          description: 'Selecione categorias ou ajuste os filtros.',
          variant: 'destructive',
        });
        return;
      }

      const filename = categoryId
        ? `categoria_${categoriesToExport[0].nome.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`
        : selectedCategories.size > 0
        ? `categorias_selecionadas_${selectedCategories.size}_${new Date().toISOString().split('T')[0]}.csv`
        : `categorias_${new Date().toISOString().split('T')[0]}.csv`;

      exportToCSV(categoriesToExport, filename);
      
      toast({
        title: 'Exportação concluída!',
        description: `${categoriesToExport.length} categoria(s) exportada(s) com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao exportar',
        description: humanizeError(error),
        variant: 'destructive',
      });
    }
  };

  const allSelected = categories.length > 0 && selectedCategories.size === categories.length;
  const someSelected = selectedCategories.size > 0 && selectedCategories.size < categories.length;

  return (
    <div className="space-y-6">
      {/* Toolbar de Ações */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar categorias..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 bg-background"
          />
        </div>

        <div className="flex justify-end gap-2 w-full sm:w-auto">
          <Button
            type="button"
            className="gradient-primary"
            onClick={() => setIsCreateCategoryOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Categoria
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleExportCSV()}
            disabled={categories.length === 0}
            title={selectedCategories.size > 0 ? `Exportar ${selectedCategories.size} selecionada(s)` : 'Exportar todas'}
          >
            <Download className="h-4 w-4 mr-2" />
            {selectedCategories.size > 0 ? `Exportar (${selectedCategories.size})` : 'Exportar CSV'}
          </Button>
        {selectedCategories.size > 0 && (
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeleteMultiple}
            disabled={deleteCategories.isPending}
          >
            {deleteCategories.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Excluir ({selectedCategories.size})
          </Button>
        )}
      </div>
      </div>

      <div className="glass-card rounded-xl divide-y divide-border/30">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredParentCategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Tags className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-lg font-medium mb-2">
              {searchQuery ? 'Nenhuma categoria encontrada.' : 'Nenhuma categoria cadastrada.'}
            </p>
            {!searchQuery && (
              <p className="text-sm text-center max-w-md">
                Organize seus produtos criando categorias.{' '}
                <span className="text-primary font-medium">
                  Digite o nome acima e clique em "Adicionar" para começar.
                </span>
              </p>
            )}
          </div>
        ) : (
          <>
            {categories.length > 0 && (
              <div className="p-4 border-b border-border/30 bg-secondary/20">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                  />
                  <span className="text-sm text-muted-foreground">
                    {selectedCategories.size > 0 
                      ? `${selectedCategories.size} categoria${selectedCategories.size > 1 ? 's' : ''} selecionada${selectedCategories.size > 1 ? 's' : ''}`
                      : 'Selecionar todas'
                    }
                  </span>
                </div>
              </div>
            )}
            {filteredParentCategories.map(cat => {
              const subcategories = getSubcategories(cat.id);
              // Se tiver busca, expande automaticamente se houver subcategorias
              const isExpanded = searchQuery ? true : expandedCategories.has(cat.id);
              const hasSubcategories = subcategories.length > 0;
              const parentProducts = getProductsByCategory(cat.id);
              const hasParentProducts = parentProducts.length > 0;
              
              return (
                <Collapsible 
                  key={cat.id}
                  open={isExpanded}
                  onOpenChange={(open) => {
                    // Se tiver busca, não permite fechar (ou permite, mas o padrão é aberto)
                    // Vamos permitir controle manual mesmo com busca
                    const newExpanded = new Set(expandedCategories);
                    if (open) {
                      newExpanded.add(cat.id);
                    } else {
                      newExpanded.delete(cat.id);
                    }
                    setExpandedCategories(newExpanded);
                  }}
                >
                  <div>
                    <CollapsibleTrigger asChild>
                      <div className={`flex items-center justify-between p-4 hover:bg-secondary/30 cursor-pointer ${selectedCategoryId === cat.id ? 'bg-primary/10' : ''}`}>
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            checked={selectedCategories.has(cat.id)}
                            onCheckedChange={(checked) => handleSelectCategory(cat.id, checked as boolean)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          {(hasSubcategories || hasParentProducts) && (
                            <div className="shrink-0">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-primary" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{cat.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {subcategories.length > 0 && `${subcategories.length} subcategoria${subcategories.length > 1 ? 's' : ''} • `}
                              {getTotalProductsForParentCategory(cat.id)} produtos
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleExportCSV(cat.id);
                            }}
                            title="Exportar esta categoria"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSubcategoryModal({ open: true, parentId: cat.id, parentName: cat.name });
                              setNewSubcategory('');
                            }}
                            title="Adicionar subcategoria"
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setEditModal({ open: true, id: cat.id, name: cat.name, isSubcategory: false });
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleDeleteSingle(cat.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          {onCategorySelect && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                onCategorySelect(cat.id);
                              }}
                              className={selectedCategoryId === cat.id ? 'bg-primary text-primary-foreground' : ''}
                            >
                              Selecionar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>
                    {(hasSubcategories || hasParentProducts) && (
                      <CollapsibleContent>
                        {hasSubcategories && (
                          <div className="ml-8 border-l-2 border-primary/40 bg-secondary/10 divide-y divide-border/20">
                            {subcategories.map(subcat => {
                            const subcatProducts = getProductsByCategory(subcat.id);
                            const isSubcatExpanded = expandedSubcategories.has(subcat.id);
                            const hasProducts = subcatProducts.length > 0;
                            
                            return (
                              <Collapsible
                                key={subcat.id}
                                open={isSubcatExpanded}
                                onOpenChange={(open) => {
                                  const newExpanded = new Set(expandedSubcategories);
                                  if (open) {
                                    newExpanded.add(subcat.id);
                                  } else {
                                    newExpanded.delete(subcat.id);
                                  }
                                  setExpandedSubcategories(newExpanded);
                                }}
                              >
                                <div>
                                  <CollapsibleTrigger asChild>
                                    <div
                                      className={`flex items-center justify-between p-3 pl-8 hover:bg-secondary/30 cursor-pointer ${selectedCategoryId === subcat.id ? 'bg-primary/10' : ''}`}
                                    >
                                      <div className="flex items-center gap-3 flex-1">
                                        <Checkbox
                                          checked={selectedCategories.has(subcat.id)}
                                          onCheckedChange={(checked) => handleSelectCategory(subcat.id, checked as boolean)}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        {hasProducts && (
                                          <div className="shrink-0">
                                            {isSubcatExpanded ? (
                                              <ChevronDown className="h-4 w-4 text-primary" />
                                            ) : (
                                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                            )}
                                          </div>
                                        )}
                                        {!hasProducts && (
                                          <ChevronRight className="h-4 w-4 text-primary shrink-0 ml-2 opacity-50" />
                                        )}
                                        <div className="flex-1">
                                          <p className="font-medium text-sm">{subcat.name.split(' > ').pop()}</p>
                                          <p className="text-xs text-muted-foreground">{subcat.product_count || 0} produtos</p>
                                        </div>
                                      </div>
                                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleExportCSV(subcat.id);
                                          }}
                                          title="Exportar esta subcategoria"
                                        >
                                          <Download className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            const subcategoryName = subcat.name.split(' > ').pop() || '';
                                            const parentName = subcat.name.split(' > ').slice(0, -1).join(' > ');
                                            setEditModal({ 
                                              open: true, 
                                              id: subcat.id, 
                                              name: subcategoryName,
                                              isSubcategory: true,
                                              parentName: parentName
                                            });
                                          }}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          className="text-destructive hover:text-destructive"
                                          onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            handleDeleteSingle(subcat.id);
                                          }}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                        {onCategorySelect && (
                                          <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={(e) => {
                                              e.preventDefault();
                                              e.stopPropagation();
                                              onCategorySelect(subcat.id);
                                            }}
                                            className={selectedCategoryId === subcat.id ? 'bg-primary text-primary-foreground' : ''}
                                          >
                                            Selecionar
                                          </Button>
                                        )}
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>
                                  {hasProducts && (
                                    <CollapsibleContent>
                                      <div className="ml-6 border-l-2 border-primary/20 bg-secondary/5 divide-y divide-border/10">
                                        {subcatProducts.map(product => {
                                          const profit = (product.selling_price - product.cost_price) * product.quantity;
                                          const margin = product.cost_price > 0 
                                            ? ((product.selling_price - product.cost_price) / product.cost_price) * 100 
                                            : 0;
                                          
                                          return (
                                            <div
                                              key={product.id}
                                              className="flex items-center justify-between p-3 pl-6 hover:bg-secondary/20"
                                            >
                                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                                {product.image_url && product.image_url.trim() !== '' ? (
                                                  <div className="relative shrink-0">
                                                    <img
                                                      src={product.image_url}
                                                      alt={product.name}
                                                      className="w-10 h-10 object-cover rounded-lg border border-border/50"
                                                      onError={(e) => {
                                                        // Se a imagem falhar ao carregar, mostra o placeholder
                                                        const target = e.target as HTMLImageElement;
                                                        target.style.display = 'none';
                                                        const parent = target.parentElement;
                                                        if (parent && !parent.querySelector('.image-fallback')) {
                                                          const fallback = document.createElement('div');
                                                          fallback.className = 'image-fallback w-10 h-10 bg-secondary/50 rounded-lg border border-border/50 flex items-center justify-center shrink-0';
                                                          fallback.innerHTML = '<svg class="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>';
                                                          parent.appendChild(fallback);
                                                        }
                                                      }}
                                                    />
                                                  </div>
                                                ) : (
                                                  <div className="w-10 h-10 bg-secondary/50 rounded-lg border border-border/50 flex items-center justify-center shrink-0">
                                                    <Package className="h-5 w-5 text-muted-foreground" />
                                                  </div>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                  <p className="font-medium text-sm truncate">{product.name}</p>
                                                  <p className="text-xs text-muted-foreground">
                                                    Qtd: {product.quantity} • Custo: {formatCurrency(product.cost_price)} • Venda: {formatCurrency(product.selling_price)}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="text-right shrink-0 ml-4">
                                                <p className="font-semibold text-sm text-primary">
                                                  {formatCurrency(profit)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                  {margin.toFixed(1)}% margem
                                                </p>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </CollapsibleContent>
                                  )}
                                </div>
                              </Collapsible>
                            );
                            })}
                          </div>
                        )}
                        {hasParentProducts && (
                          <div className={`ml-8 border-l-2 border-primary/40 bg-secondary/10 divide-y divide-border/20 ${hasSubcategories ? 'mt-4' : ''}`}>
                            {parentProducts.map(product => {
                            const profit = (product.selling_price - product.cost_price) * product.quantity;
                            const margin = product.cost_price > 0 
                              ? ((product.selling_price - product.cost_price) / product.cost_price) * 100 
                              : 0;
                            
                            return (
                              <div
                                key={product.id}
                                className="flex items-center justify-between p-3 pl-6 hover:bg-secondary/20"
                              >
                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                  {product.image_url && product.image_url.trim() !== '' ? (
                                    <div className="relative shrink-0">
                                      <img
                                        src={product.image_url}
                                        alt={product.name}
                                        className="w-10 h-10 object-cover rounded-lg border border-border/50"
                                        onError={(e) => {
                                          // Se a imagem falhar ao carregar, mostra o placeholder
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                          const parent = target.parentElement;
                                          if (parent && !parent.querySelector('.image-fallback')) {
                                            const fallback = document.createElement('div');
                                            fallback.className = 'image-fallback w-10 h-10 bg-secondary/50 rounded-lg border border-border/50 flex items-center justify-center shrink-0';
                                            fallback.innerHTML = '<svg class="h-5 w-5 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>';
                                            parent.appendChild(fallback);
                                          }
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 bg-secondary/50 rounded-lg border border-border/50 flex items-center justify-center shrink-0">
                                      <Package className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm truncate">{product.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      Qtd: {product.quantity} • Custo: {formatCurrency(product.cost_price)} • Venda: {formatCurrency(product.selling_price)}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0 ml-4">
                                  <p className="font-semibold text-sm text-primary">
                                    {formatCurrency(profit)}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {margin.toFixed(1)}% margem
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        )}
                      </CollapsibleContent>
                    )}
                  </div>
                </Collapsible>
              );
            })}
          </>
        )}
      </div>

      {/* Dialog de Criação de Categoria */}
      <Dialog open={isCreateCategoryOpen} onOpenChange={setIsCreateCategoryOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Nova Categoria</DialogTitle>
            <DialogDescription>
              Crie uma nova categoria principal para organizar seus produtos.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Nome da Categoria</Label>
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Ex: Eletrônicos, Roupas..."
              className="input-glass mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (newCategory.trim()) {
                    handleCreate();
                    setIsCreateCategoryOpen(false);
                  }
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateCategoryOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                handleCreate();
                setIsCreateCategoryOpen(false);
              }} 
              disabled={!newCategory.trim()} 
              className="gradient-primary"
            >
              Continuar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição */}
      <Dialog open={editModal.open} onOpenChange={(open) => setEditModal({ ...editModal, open })}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>{editModal.isSubcategory ? 'Editar Subcategoria' : 'Editar Categoria'}</DialogTitle>
            <DialogDescription>
              {editModal.isSubcategory 
                ? `Edite apenas o nome da subcategoria. A categoria pai "${editModal.parentName}" não pode ser alterada aqui.`
                : 'Edite o nome da categoria.'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {editModal.isSubcategory && editModal.parentName && (
              <div className="mb-4 p-3 rounded-lg bg-secondary/50 border border-border">
                <Label className="text-xs text-muted-foreground">Categoria Pai</Label>
                <p className="font-medium">{editModal.parentName}</p>
              </div>
            )}
            <Label>{editModal.isSubcategory ? 'Nome da Subcategoria' : 'Nome da Categoria'}</Label>
            <Input
              value={editModal.name}
              onChange={(e) => {
                // Para subcategorias, não permite apagar tudo - sempre mantém algo
                const newValue = e.target.value;
                if (editModal.isSubcategory && !newValue.trim()) {
                  return; // Não permite campo vazio para subcategoria
                }
                setEditModal({ ...editModal, name: newValue });
              }}
              className="input-glass"
              placeholder={editModal.isSubcategory ? "Nome da subcategoria..." : "Nome da categoria..."}
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal({ open: false, id: '', name: '', isSubcategory: false })}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdate} 
              disabled={updateCategory.isPending || !editModal.name.trim()} 
              className="gradient-primary"
            >
              {updateCategory.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Criar Categoria */}
      <AlertDialog open={confirmCreateCategory} onOpenChange={setConfirmCreateCategory}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Criação de Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja criar a categoria "{newCategory.trim()}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCreateCategory}
              className="gradient-primary"
              disabled={createCategory.isPending}
            >
              {createCategory.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Criando...
                </>
              ) : (
                'Sim, Criar Categoria'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Criar Subcategoria */}
      <AlertDialog open={confirmCreateSubcategory} onOpenChange={setConfirmCreateSubcategory}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Criação de Subcategoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja criar a subcategoria "{newSubcategory.trim()}" na categoria "{subcategoryModal.parentName}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCreateSubcategory}
              className="gradient-primary"
              disabled={createCategory.isPending}
            >
              {createCategory.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Criando...
                </>
              ) : (
                'Sim, Criar Subcategoria'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Atualizar Categoria */}
      <AlertDialog open={confirmUpdateCategory} onOpenChange={setConfirmUpdateCategory}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Alterações</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja salvar as alterações na {editModal.isSubcategory ? 'subcategoria' : 'categoria'} "{editModal.name.trim()}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmUpdateCategory}
              className="gradient-primary"
              disabled={updateCategory.isPending}
            >
              {updateCategory.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Sim, Salvar Alterações'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Subcategoria */}
      <Dialog open={subcategoryModal.open} onOpenChange={(open) => setSubcategoryModal({ ...subcategoryModal, open })}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Nova Subcategoria</DialogTitle>
            <DialogDescription>
              Crie uma nova subcategoria para a categoria "{subcategoryModal.parentName}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label>Categoria pai: <strong>{subcategoryModal.parentName}</strong></Label>
            <Input
              value={newSubcategory}
              onChange={(e) => setNewSubcategory(e.target.value)}
              placeholder="Nome da subcategoria..."
              className="input-glass"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleCreateSubcategory();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubcategoryModal({ open: false, parentId: '', parentName: '' })}>
              Cancelar
            </Button>
            <Button
              onClick={handleCreateSubcategory}
              disabled={!newSubcategory.trim() || createCategory.isPending}
              className="gradient-primary"
            >
              {createCategory.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Criando...
                </>
              ) : (
                'Criar Subcategoria'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open, ids: [] })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm.ids.length === 1 
                ? 'Tem certeza que deseja excluir esta categoria? Esta ação não pode ser desfeita.'
                : `Tem certeza que deseja excluir ${deleteConfirm.ids.length} categorias? Esta ação não pode ser desfeita.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={deleteCategories.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteCategories.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                'Excluir'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Exclusão em Massa */}
      <AlertDialog open={deleteMultipleConfirm} onOpenChange={setDeleteMultipleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão em massa</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedCategories.size} categoria(s) selecionada(s)? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteMultiple}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim, Excluir Tudo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de Exportação em Massa */}
      <AlertDialog open={exportMultipleConfirm} onOpenChange={setExportMultipleConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exportação</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja exportar {selectedCategories.size} categoria(s) selecionada(s) para CSV?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setExportMultipleConfirm(false);
                executeExportCSV();
              }}
            >
              Sim, Exportar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
