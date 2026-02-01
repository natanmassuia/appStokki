import { useState, useEffect, useMemo } from 'react';
import * as React from 'react';
import { AppLayout } from '@/components/AppLayout';
import { useProducts, Product } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useCustomers } from '@/hooks/useCustomers';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { formatCurrency, calculateMargin } from '@/lib/format';
import { humanizeError } from '@/lib/utils';
import { sendText } from '@/services/whatsappService';
import { formatPhoneForWhatsapp } from '@/utils/phoneFormatter';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Search, ShoppingCart, Loader2, Package, Trash2, ChevronRight, Pencil, Camera, X, ArrowUp, ArrowDown, ArrowUpDown, RotateCcw, Upload, Download, PackageOpen, AlertTriangle, XCircle, Tags, Calendar as CalendarIcon, Filter, FileSpreadsheet } from 'lucide-react';
import { exportToCSV, formatCurrencyForCSV } from '@/utils/exportUtils';
import { ImportCSVModal } from '@/components/ImportCSVModal';
import { GlobalImportModal } from '@/components/GlobalImportModal';
import { useBulkOperation } from '@/contexts/BulkOperationContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductForm } from '@/components/products/ProductForm';
import { QuickEditCell } from '@/components/products/QuickEditCell';
import { CategoryQuickAssign } from '@/components/products/CategoryQuickAssign';
import { CategoryManager } from '@/components/CategoryManager';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DateRange } from 'react-day-picker';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

export default function Estoque() {
  const { products, isLoading, sellProduct, deleteProduct, deleteProducts, updateProduct, uploadProductImage, createProduct } = useProducts();
  const { categories, createCategory } = useCategories();
  const { customers } = useCustomers();
  const { settings: storeSettings } = useStoreSettings();
  const { toast } = useToast();
  const { startOperation, toggleModal } = useBulkOperation();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockStatus, setStockStatus] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sellModal, setSellModal] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const [editModal, setEditModal] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const [sellQuantity, setSellQuantity] = useState(1);
  const [sellCustomerId, setSellCustomerId] = useState<string | undefined>(undefined);
  const [sendWhatsAppReceipt, setSendWhatsAppReceipt] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  const [deleteMultipleConfirm, setDeleteMultipleConfirm] = useState(false);
  const [exportMultipleConfirm, setExportMultipleConfirm] = useState(false);
  
  // Estados para edição
  const [editName, setEditName] = useState('');
  const [editQuantity, setEditQuantity] = useState(1);
  const [editCostPrice, setEditCostPrice] = useState(0);
  const [editSellingPrice, setEditSellingPrice] = useState(0);
  const [editCategoryId, setEditCategoryId] = useState<string | undefined>(undefined);
  const [editProductImage, setEditProductImage] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [confirmEditProduct, setConfirmEditProduct] = useState(false);
  const [confirmSellProduct, setConfirmSellProduct] = useState(false);
  const [isDraggingEdit, setIsDraggingEdit] = useState(false);
  const [shouldRemoveImage, setShouldRemoveImage] = useState(false);
  const [editColor, setEditColor] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>('name'); // Padrão: ordenação alfabética
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc'); // Padrão: A-Z
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('products');

  // Calculate Stats
  const totalProducts = products.length;
  const lowStockCount = products.filter(p => p.quantity > 0 && p.quantity <= 5).length;
  const outOfStockCount = products.filter(p => p.quantity === 0).length;

  // Organiza categorias em hierarquia (pais e filhos)
  const parentCategories = categories.filter(cat => !cat.name.includes(' > '));
  const getSubcategories = (parentId: string) => {
    const parent = categories.find(c => c.id === parentId);
    if (!parent) return [];
    return categories.filter(cat => cat.name.startsWith(parent.name + ' > '));
  };

  // Função para obter todas as IDs de subcategorias de uma categoria pai
  const getCategoryAndSubcategoryIds = (categoryId: string): string[] => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return [categoryId];
    
    // Se for categoria pai, retorna ela + todas as subcategorias
    if (!category.name.includes(' > ')) {
      const subcategories = getSubcategories(categoryId);
      return [categoryId, ...subcategories.map(sub => sub.id)];
    }
    
    // Se for subcategoria, retorna apenas ela
    return [categoryId];
  };

  const filteredProductsBase = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    
    let matchesCategory = true;
    if (categoryFilter && categoryFilter !== '' && categoryFilter !== 'all') {
      // Se tiver filtro, verifica se o produto está na categoria ou em suas subcategorias
      const categoryIds = getCategoryAndSubcategoryIds(categoryFilter);
      matchesCategory = p.category_id ? categoryIds.includes(p.category_id) : false;
    }
    
    let matchesStock = true;
    if (stockStatus !== 'all') {
      if (stockStatus === 'out_of_stock' && p.quantity > 0) matchesStock = false;
      else if (stockStatus === 'low_stock' && (p.quantity === 0 || p.quantity > 5)) matchesStock = false;
      else if (stockStatus === 'in_stock' && p.quantity === 0) matchesStock = false;
    }

    let matchesDate = true;
    if (dateRange?.from) {
      const productDate = new Date(p.created_at);
      const dateFrom = new Date(dateRange.from);
      dateFrom.setHours(0, 0, 0, 0);
      
      if (productDate < dateFrom) matchesDate = false;
      
      if (dateRange.to) {
        const dateTo = new Date(dateRange.to);
        dateTo.setHours(23, 59, 59, 999);
        if (productDate > dateTo) matchesDate = false;
      }
    }

    return matchesSearch && matchesCategory && matchesStock && matchesDate;
  });

  // Função para obter o nome da categoria pai (para ordenação)
  const getParentCategoryName = (categoryId: string | null): string => {
    if (!categoryId) return 'zzz_sem_categoria'; // Sem categoria vai para o final
    const category = categories.find(c => c.id === categoryId);
    if (!category) return 'zzz_sem_categoria';
    
    // Se for subcategoria, retorna o nome da categoria pai
    if (category.name.includes(' > ')) {
      const parentName = category.name.split(' > ')[0];
      return parentName;
    }
    
    // Se for categoria pai, retorna o nome dela
    return category.name;
  };

  // Função para obter o nome da subcategoria (para ordenação dentro da categoria pai)
  const getSubcategoryName = (categoryId: string | null): string => {
    if (!categoryId) return '';
    const category = categories.find(c => c.id === categoryId);
    if (!category) return '';
    
    // Se for subcategoria, retorna apenas o nome da subcategoria
    if (category.name.includes(' > ')) {
      return category.name.split(' > ').slice(1).join(' > ');
    }
    
    // Se for categoria pai, retorna string vazia para ordenar primeiro
    return '';
  };

  // Ordenar produtos
  const filteredProducts = [...filteredProductsBase].sort((a, b) => {
    // Ordenação padrão: por data de criação (mais recentes primeiro)
    if (!sortColumn) {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }

    let comparison = 0;

    switch (sortColumn) {
      case 'name':
        comparison = a.name.localeCompare(b.name, 'pt-BR');
        break;
      
      case 'category':
        // Primeiro ordena por categoria pai, depois por subcategoria
        const parentA = getParentCategoryName(a.category_id);
        const parentB = getParentCategoryName(b.category_id);
        comparison = parentA.localeCompare(parentB, 'pt-BR');
        
        // Se as categorias pais forem iguais, ordena por subcategoria
        if (comparison === 0) {
          const subA = getSubcategoryName(a.category_id);
          const subB = getSubcategoryName(b.category_id);
          comparison = subA.localeCompare(subB, 'pt-BR');
        }
        break;
      
      case 'quantity':
        comparison = a.quantity - b.quantity;
        break;
      
      case 'cost_price':
        comparison = a.cost_price - b.cost_price;
        break;
      
      case 'selling_price':
        comparison = a.selling_price - b.selling_price;
        break;
      
      case 'margin':
        const marginA = calculateMargin(a.cost_price, a.selling_price);
        const marginB = calculateMargin(b.cost_price, b.selling_price);
        comparison = marginA - marginB;
        break;
      
      default:
        return 0;
    }

    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Se já está ordenando por esta coluna, inverte a direção
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Se é uma nova coluna, começa com ascendente
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleResetFilters = () => {
    setSearch('');
    setCategoryFilter('all');
    setSortColumn('name');
    setSortDirection('asc');
    setSelectedProducts(new Set());
  };

  const getSortIcon = (column: string) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="h-4 w-4 text-primary" />
      : <ArrowDown className="h-4 w-4 text-primary" />;
  };

  const getSortLabel = (column: string, baseLabel: string) => {
    // Para colunas de texto (name e category), sempre mostra o indicador
    if (column === 'name' || column === 'category') {
      if (sortColumn === column) {
        // Quando está ordenando por esta coluna, mostra A-Z ou Z-A destacado
        return (
          <span className="flex items-center gap-2">
            {baseLabel}
            <span className="text-xs text-primary font-medium">
              {sortDirection === 'asc' ? 'A-Z' : 'Z-A'}
            </span>
          </span>
        );
      } else {
        // Quando não está ordenando, mostra A-Z em cinza para indicar que é ordenável
        return (
          <span className="flex items-center gap-2">
            {baseLabel}
            <span className="text-xs text-muted-foreground opacity-60">
              A-Z
            </span>
          </span>
        );
      }
    }
    return baseLabel;
  };

  const getStockBadge = (quantity: number) => {
    if (quantity === 0) return <Badge className="badge-danger">Esgotado</Badge>;
    if (quantity < 3) return <Badge className="badge-warning">Baixo</Badge>;
    return <Badge className="badge-success">Em Estoque</Badge>;
  };

  const handleSell = () => {
    if (!sellModal.product) return;
    setConfirmSellProduct(true);
  };

  const handleConfirmSell = async () => {
    if (!sellModal.product) return;
    setConfirmSellProduct(false);
    
    // Create transaction (salva o nome do produto para preservar histórico)
    // O lucro é calculado automaticamente no banco de dados via trigger/função
    // ou calculado aqui e enviado, dependendo da configuração.
    // Como o erro indica que a coluna 'profit' não existe no schema cache, 
    // vamos tentar enviar sem o profit se o erro persistir, ou garantir que a coluna exista.
    // Mas primeiro, vamos tentar enviar apenas os dados essenciais.
    await sellProduct.mutateAsync({ 
      productId: sellModal.product.id, 
      quantity: sellQuantity,
      customerId: sellCustomerId || null,
      unitPrice: sellModal.product.selling_price, // Passando preço unitário explicitamente
    });
    
    // Envia comprovante via WhatsApp se solicitado
    let whatsappSent = false;
    if (sendWhatsAppReceipt && sellCustomerId && storeSettings?.whatsapp_instance_name) {
      const selectedCustomer = customers.find(c => c.id === sellCustomerId);
      
      if (selectedCustomer?.phone) {
        try {
          const formattedPhone = formatPhoneForWhatsapp(selectedCustomer.phone);
          if (formattedPhone) {
            const storeName = storeSettings.store_name || 'Nossa Loja';
            const customerName = selectedCustomer.name;
            const productName = sellModal.product.name;
            const totalPrice = formatCurrency(sellModal.product.selling_price * sellQuantity);
            
            const message = `Olá *${customerName}*! 👋
Obrigado por comprar na *${storeName}*.

📦 *Resumo da Compra:*
${productName}
Qtd: ${sellQuantity}
Valor: ${totalPrice}

Volte sempre!`;
            
            await sendText(storeSettings.whatsapp_instance_name, formattedPhone, message);
            whatsappSent = true;
          }
        } catch (error: any) {
          // Erro ao enviar comprovante - já tratado no toast
          toast({
            title: 'Venda realizada, mas comprovante não enviado',
            description: 'A venda foi registrada, mas houve um erro ao enviar o comprovante via WhatsApp.',
            variant: 'default',
          });
        }
      }
    }
    
    // Se o WhatsApp foi enviado, aguarda um pouco e mostra toast adicional
    if (whatsappSent) {
      setTimeout(() => {
        toast({
          title: 'Recibo enviado! 📱',
          description: 'O comprovante foi enviado via WhatsApp para o cliente.',
        });
      }, 500);
    }
    
    setSellModal({ open: false, product: null });
    setSellQuantity(1);
    setSellCustomerId(undefined);
    setSendWhatsAppReceipt(false);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (deleteConfirm.ids.length === 0) return;
    await deleteProducts.mutateAsync(deleteConfirm.ids);
    setSelectedProducts(new Set());
    setDeleteConfirm({ open: false, ids: [] });
  };

  const handleDeleteSingle = (productId: string) => {
    setDeleteConfirm({ open: true, ids: [productId] });
  };

  const handleDeleteMultiple = () => {
    if (selectedProducts.size === 0) return;
    setDeleteMultipleConfirm(true);
  };

  const confirmDeleteMultiple = () => {
    setDeleteMultipleConfirm(false);
    
    const selectedIds = Array.from(selectedProducts);
    const itemsToDelete = filteredProducts
      .filter(p => selectedIds.includes(p.id))
      .map(p => ({ id: p.id, name: p.name }));

    if (itemsToDelete.length === 0) return;

    // Inicia operação em massa com progresso
    // O modal será aberto automaticamente pelo contexto
    startOperation(
      'delete',
      'products',
      itemsToDelete,
      async (item) => {
        await deleteProduct.mutateAsync(item.id);
      }
    ).then(() => {
      // Limpa seleção após iniciar (não espera terminar)
      setSelectedProducts(new Set());
    }).catch((error) => {
      // Erro ao iniciar exclusão em massa - já tratado no toast
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a exclusão em massa.',
        variant: 'destructive',
      });
    });
  };

  const handleExportCSV = (productId?: string) => {
    // Se não é exportação individual e há produtos selecionados, pede confirmação
    if (!productId && selectedProducts.size > 0) {
      setExportMultipleConfirm(true);
      return;
    }
    
    executeExportCSV(productId);
  };

  const executeExportCSV = (productId?: string) => {
    try {
      // Se um produto específico foi passado, exporta apenas ele
      let productsToExport;
      if (productId) {
        const product = products.find(p => p.id === productId);
        if (!product) {
          toast({
            title: 'Produto não encontrado',
            variant: 'destructive',
          });
          return;
        }
        const category = categories.find(c => c.id === product.category_id);
        productsToExport = [{
          name: product.name,
          cost_price: formatCurrencyForCSV(product.cost_price),
          selling_price: product.selling_price ? formatCurrencyForCSV(product.selling_price) : '',
          quantity: product.quantity.toString(),
          category: category?.name || '',
          color: product.color || '',
        }];
      } else if (selectedProducts.size > 0) {
        // Exporta apenas os selecionados
        const selectedIds = Array.from(selectedProducts);
        productsToExport = filteredProducts
          .filter(p => selectedIds.includes(p.id))
          .map(p => {
            const category = categories.find(c => c.id === p.category_id);
            return {
              name: p.name,
              cost_price: formatCurrencyForCSV(p.cost_price),
              selling_price: p.selling_price ? formatCurrencyForCSV(p.selling_price) : '',
              quantity: p.quantity.toString(),
              category: category?.name || '',
              color: p.color || '',
            };
          });
      } else {
        // Exporta todos os produtos filtrados
        productsToExport = filteredProducts.map(p => {
          const category = categories.find(c => c.id === p.category_id);
          return {
            name: p.name,
            cost_price: formatCurrencyForCSV(p.cost_price),
            selling_price: p.selling_price ? formatCurrencyForCSV(p.selling_price) : '',
            quantity: p.quantity.toString(),
            category: category?.name || '',
            color: p.color || '',
          };
        });
      }

      if (productsToExport.length === 0) {
        toast({
          title: 'Nenhum produto para exportar',
          description: 'Selecione produtos ou ajuste os filtros.',
          variant: 'destructive',
        });
        return;
      }

      const filename = productId 
        ? `produto_${productsToExport[0].name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`
        : selectedProducts.size > 0
        ? `estoque_selecionados_${selectedProducts.size}_${new Date().toISOString().split('T')[0]}.csv`
        : `estoque_${new Date().toISOString().split('T')[0]}.csv`;

      exportToCSV(productsToExport, filename);
      
      toast({
        title: 'Exportação concluída!',
        description: `${productsToExport.length} produto(s) exportado(s) com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro ao exportar',
        description: humanizeError(error),
        variant: 'destructive',
      });
    }
  };

  const handleEditClick = (product: Product) => {
    setEditModal({ open: true, product });
    setEditName(product.name);
    setEditQuantity(product.quantity);
    setEditCostPrice(product.cost_price);
    setEditSellingPrice(product.selling_price);
    setEditCategoryId(product.category_id || undefined);
    setEditProductImage(null);
    // Garante que a URL da imagem seja uma string válida
    const imageUrl = product.image_url && product.image_url.trim() !== '' ? product.image_url : null;
    
    // Verifica se a imagem é HEIC pela extensão na URL
    if (imageUrl) {
      const urlLower = imageUrl.toLowerCase();
      if (urlLower.endsWith('.heic') || urlLower.endsWith('.heif') || urlLower.includes('.heic') || urlLower.includes('.heif')) {
        setEditImagePreview('HEIC_FILE');
      } else {
        setEditImagePreview(imageUrl);
      }
    } else {
      setEditImagePreview(null);
    }
    
    setShouldRemoveImage(false);
  };

  const validateAndSetEditImage = (file: File) => {
    // Formatos aceitos
    const acceptedFormats = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/heic',
      'image/heif',
      'image/avif',
      'image/bmp',
      'image/tiff',
    ];
    
    // Valida extensão do arquivo (para formatos que podem não ter MIME type correto)
    const fileName = file.name.toLowerCase();
    const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.heif', '.avif', '.bmp', '.tiff', '.tif'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    // Verifica se é HEIC/HEIF
    const isHeic = fileName.endsWith('.heic') || fileName.endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif';
    
    // Valida tipo de arquivo ou extensão
    if (!file.type.startsWith('image/') && !acceptedFormats.includes(file.type) && !hasValidExtension) {
      alert('Por favor, selecione apenas arquivos de imagem (JPG, PNG, GIF, WEBP, HEIC, HEIF, AVIF, BMP, TIFF)');
      return;
    }

    // Valida tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB');
      return;
    }

    setEditProductImage(file);
    setShouldRemoveImage(false); // Se adicionou nova imagem, não remove mais
    
    // Para HEIC/HEIF, não cria preview (navegador não suporta)
    if (isHeic) {
      setEditImagePreview('HEIC_FILE'); // Marca especial para identificar arquivo HEIC
      return;
    }
    
    // Cria preview para outros formatos
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Verifica se o resultado é válido (não é um data URL de octet-stream)
      if (result && !result.startsWith('data:application/octet-stream')) {
        setEditImagePreview(result);
      } else {
        // Se for octet-stream, provavelmente é HEIC sem MIME type correto
        setEditImagePreview('HEIC_FILE');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleEditImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    validateAndSetEditImage(file);
  };

  const handleEditDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingEdit(true);
  };

  const handleEditDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingEdit(false);
  };

  const handleEditDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingEdit(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      validateAndSetEditImage(file);
    }
  };

  const handleRemoveEditImage = () => {
    setEditProductImage(null);
    setEditImagePreview(null);
    setShouldRemoveImage(true); // Marca que a imagem deve ser removida ao salvar
  };

  const handleEditSave = () => {
    if (!editModal.product) return;
    setConfirmEditProduct(true);
  };

  const handleConfirmEditProduct = async () => {
    if (!editModal.product) return;
    setConfirmEditProduct(false);
    
    try {
      let imageUrl: string | null = editModal.product.image_url || null;
      
      // Se o usuário removeu a imagem, define como null
      if (shouldRemoveImage) {
        imageUrl = null;
      } 
      // Caso contrário, faz upload da nova imagem se houver
      else if (editProductImage && uploadProductImage) {
        setUploadingImage(true);
        const uploadedUrl = await uploadProductImage(editProductImage);
        if (uploadedUrl) {
          imageUrl = uploadedUrl;
        }
        setUploadingImage(false);
      }
      
      await updateProduct.mutateAsync({
        id: editModal.product.id,
        name: editName,
        quantity: editQuantity,
        cost_price: editCostPrice,
        selling_price: editSellingPrice,
        category_id: editCategoryId || null,
        image_url: imageUrl,
        color: editColor.trim() || null,
      });
      toast({
        title: 'Produto atualizado!',
        description: 'As alterações foram salvas com sucesso.',
      });
      setEditModal({ open: false, product: null });
      setEditName('');
      setEditQuantity(1);
      setEditCostPrice(0);
      setEditSellingPrice(0);
      setEditCategoryId(undefined);
      setEditColor('');
      setEditProductImage(null);
      setEditImagePreview(null);
      setShouldRemoveImage(false);
    } catch (error) {
      // Erro ao editar produto - já tratado no toast
      setUploadingImage(false);
    }
  };

  const allSelected = filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length;
  const someSelected = selectedProducts.size > 0 && selectedProducts.size < filteredProducts.length;

  // Captura erros não tratados (principalmente de extensões do navegador)
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      // Ignora erros de extensões do navegador que causam "message channel closed"
      if (event.message?.includes('message channel closed') || 
          event.message?.includes('asynchronous response') ||
          event.message?.includes('Extension context invalidated')) {
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // Ignora erros de extensões do navegador
      const reason = event.reason;
      const message = reason?.message || reason?.toString() || '';
      
      if (message.includes('message channel closed') ||
          message.includes('asynchronous response') ||
          message.includes('Extension context invalidated')) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection, true);

    return () => {
      window.removeEventListener('error', handleError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection, true);
    };
  }, []);

  // Organiza categorias para o select de edição
  const parentCategoriesForEdit = categories.filter(cat => !cat.name.includes(' > '));
  const getSubcategoriesForEdit = (parentId: string) => {
    const parent = categories.find(c => c.id === parentId);
    if (!parent) return [];
    return categories.filter(cat => cat.name.startsWith(parent.name + ' > '));
  };

  return (
    <AppLayout title="Estoque">
      <div className="space-y-6">
        
        <PageHeader 
          title="Estoque" 
          description="Gerencie preços, estoque e categorias."
        />

        <Tabs defaultValue="products" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Meus Produtos
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <Tags className="h-4 w-4" />
              Categorias
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6 mt-0">
            {/* Stats Row */}
            {!isLoading && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card shadow-sm border rounded-xl p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                    <Package className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total de Produtos</p>
                    <h3 className="text-2xl font-bold">{totalProducts}</h3>
                  </div>
                </div>

                <div className="bg-card shadow-sm border rounded-xl p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-orange-50 flex items-center justify-center text-orange-600">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Estoque Baixo</p>
                    <h3 className="text-2xl font-bold">{lowStockCount}</h3>
                  </div>
                </div>

                <div className="bg-card shadow-sm border rounded-xl p-4 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
                    <XCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Esgotado</p>
                    <h3 className="text-2xl font-bold">{outOfStockCount}</h3>
                  </div>
                </div>
              </div>
            )}

            {/* Filters Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-card p-4 rounded-lg border shadow-sm">
              <div className="flex flex-col sm:flex-row items-center gap-2 w-full flex-1">
                <div className="relative w-full sm:max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar produto..." 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)} 
                    className="pl-9" 
                  />
                </div>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
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
                  </SelectContent>
                </Select>

                <Select value={stockStatus} onValueChange={setStockStatus}>
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder="Status de Estoque" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="in_stock">Em Estoque</SelectItem>
                    <SelectItem value="low_stock">Estoque Baixo</SelectItem>
                    <SelectItem value="out_of_stock">Esgotado</SelectItem>
                  </SelectContent>
                </Select>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full sm:w-[240px] justify-start text-left font-normal", !dateRange?.from && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "dd/MM/y", { locale: ptBR })} -{" "}
                            {format(dateRange.to, "dd/MM/y", { locale: ptBR })}
                          </>
                        ) : (
                          format(dateRange.from, "dd/MM/y", { locale: ptBR })
                        )
                      ) : (
                        <span>Data de Criação</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={setDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                {(search !== '' || categoryFilter !== 'all' || stockStatus !== 'all' || dateRange?.from) && (
                  <Button
                    variant="ghost"
                    onClick={handleResetFilters}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Limpar
                  </Button>
                )}
              </div>
              
              {selectedProducts.size > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleDeleteMultiple}
                  disabled={deleteProducts.isPending}
                >
                  {deleteProducts.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Excluir ({selectedProducts.size})
                </Button>
              )}
            </div>

            {/* Table */}
            <div className="glass-card rounded-xl overflow-hidden">
              {isLoading ? (
                <div className="flex items-center justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <PackageOpen className="h-12 w-12 mb-3 opacity-50" />
                  <p className="text-lg font-medium mb-2">Seu estoque está vazio.</p>
                  <p className="text-sm text-center max-w-md">
                    Para começar,{' '}
                    <span
                      onClick={() => setImportModalOpen(true)}
                      className="text-primary underline-offset-4 hover:underline cursor-pointer font-medium"
                    >
                      [Importe via CSV]
                    </span>
                    {' '}em massa ou{' '}
                    <span
                      onClick={() => setEditModal({ open: true, product: null })}
                      className="text-primary underline-offset-4 hover:underline cursor-pointer font-medium"
                    >
                      [Adicione um Produto]
                    </span>
                    {' '}manualmente.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30">
                      <TableHead className="w-12">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('name')}
                          className="flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          {getSortLabel('name', 'Produto')}
                          {getSortIcon('name')}
                        </button>
                      </TableHead>
                      <TableHead>
                        <button
                          onClick={() => handleSort('category')}
                          className="flex items-center gap-2 hover:text-primary transition-colors"
                        >
                          {getSortLabel('category', 'Categoria')}
                          {getSortIcon('category')}
                        </button>
                      </TableHead>
                      <TableHead className="text-center">
                        <button
                          onClick={() => handleSort('quantity')}
                          className="flex items-center justify-center gap-2 hover:text-primary transition-colors mx-auto"
                        >
                          Qtd
                          {getSortIcon('quantity')}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button
                          onClick={() => handleSort('cost_price')}
                          className="flex items-center gap-2 hover:text-primary transition-colors ml-auto"
                        >
                          Custo Unitário
                          {getSortIcon('cost_price')}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button
                          onClick={() => handleSort('selling_price')}
                          className="flex items-center gap-2 hover:text-primary transition-colors ml-auto"
                        >
                          Venda Unitária
                          {getSortIcon('selling_price')}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">
                        <button
                          onClick={() => handleSort('margin')}
                          className="flex items-center gap-2 hover:text-primary transition-colors ml-auto"
                        >
                          Margem
                          {getSortIcon('margin')}
                        </button>
                      </TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map(product => (
                      <TableRow key={product.id} className="border-border/30 hover:bg-secondary/30">
                        <TableCell>
                          <Checkbox
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={(checked) => handleSelectProduct(product.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.image_url && (
                              <img 
                                src={product.image_url} 
                                alt={product.name}
                                className="h-10 w-10 object-cover rounded border border-border"
                              />
                            )}
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{product.name}</span>
                              {product.color && product.color.trim() !== '' && (
                                <Badge variant="outline" className="text-xs">
                                  {product.color}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <CategoryQuickAssign 
                            currentCategoryName={product.categories?.name}
                            currentCategoryId={product.category_id}
                            productId={product.id}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            {getStockBadge(product.quantity)}
                            <QuickEditCell 
                              id={product.id}
                              value={product.quantity}
                              type="number"
                              onSave={async (newVal) => {
                                await updateProduct.mutateAsync({ id: product.id, quantity: newVal });
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(product.cost_price)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end">
                            <QuickEditCell 
                              id={product.id}
                              value={product.selling_price}
                              type="currency"
                              className="font-medium text-primary"
                              onSave={async (newVal) => {
                                await updateProduct.mutateAsync({ id: product.id, selling_price: newVal });
                              }}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{calculateMargin(product.cost_price, product.selling_price).toFixed(1)}%</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleExportCSV(product.id)}
                              title="Exportar este produto"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEditClick(product)}
                              disabled={updateProduct.isPending}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleDeleteSingle(product.id)}
                              disabled={deleteProduct.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              disabled={product.quantity === 0} 
                              onClick={() => { setSellModal({ open: true, product }); setSellQuantity(1); }}
                            >
                              <ShoppingCart className="h-4 w-4 mr-1" /> Vender
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>

          <TabsContent value="categories" className="mt-0">
            <CategoryManager />
          </TabsContent>
        </Tabs>
      </div>

      {/* Sell Modal */}
      <Dialog open={sellModal.open} onOpenChange={(open) => setSellModal({ open, product: open ? sellModal.product : null })}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Vender {sellModal.product?.name}</DialogTitle>
            <DialogDescription>
              Selecione a quantidade que deseja vender deste produto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Cliente (opcional)</Label>
              <Select 
                value={sellCustomerId || 'none'} 
                onValueChange={(value) => {
                  const customerId = value === 'none' ? undefined : value;
                  setSellCustomerId(customerId);
                  // Se selecionou um cliente com telefone, marca checkbox automaticamente
                  if (customerId) {
                    const customer = customers.find(c => c.id === customerId);
                    if (customer?.phone && storeSettings?.whatsapp_instance_name) {
                      setSendWhatsAppReceipt(true);
                    }
                  }
                }}
              >
                <SelectTrigger className="input-glass">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem cliente</SelectItem>
                  {customers.map(customer => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name} {customer.phone ? `(${customer.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Quantidade</Label><Input type="number" min={1} max={sellModal.product?.quantity || 1} value={sellQuantity} onChange={(e) => setSellQuantity(Number(e.target.value))} className="input-glass" /></div>
            {sellCustomerId && storeSettings?.whatsapp_instance_name && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="send-whatsapp"
                  checked={sendWhatsAppReceipt}
                  onCheckedChange={(checked) => setSendWhatsAppReceipt(checked as boolean)}
                />
                <Label htmlFor="send-whatsapp" className="cursor-pointer">
                  Enviar comprovante no WhatsApp?
                </Label>
              </div>
            )}
            {sellModal.product && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <p className="text-sm text-muted-foreground">Valor da venda</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(sellModal.product.selling_price * sellQuantity)}</p>
                <p className="text-sm text-muted-foreground mt-1">Lucro: {formatCurrency((sellModal.product.selling_price - sellModal.product.cost_price) * sellQuantity)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setSellModal({ open: false, product: null });
                setSellQuantity(1);
                setSellCustomerId(undefined);
                setSendWhatsAppReceipt(false);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleSell} disabled={sellProduct.isPending} className="gradient-primary">
              {sellProduct.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null} Confirmar Venda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Venda */}
      <AlertDialog open={confirmSellProduct} onOpenChange={setConfirmSellProduct}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Venda</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja vender {sellQuantity} unidade{sellQuantity > 1 ? 's' : ''} de "{sellModal.product?.name}"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          {sellModal.product && (
            <div className="mt-3 p-3 rounded-lg bg-primary/10 border border-primary/30">
              <p className="text-sm text-muted-foreground">Valor total da venda</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(sellModal.product.selling_price * sellQuantity)}</p>
              <p className="text-sm text-muted-foreground mt-1">Lucro estimado: {formatCurrency((sellModal.product.selling_price - sellModal.product.cost_price) * sellQuantity)}</p>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmSell}
              className="gradient-primary"
              disabled={sellProduct.isPending}
            >
              {sellProduct.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                'Sim, Confirmar Venda'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Product Sheet */}
      <Sheet open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto w-full">
          <SheetHeader className="mb-6">
            <SheetTitle>Adicionar Novo Produto</SheetTitle>
          </SheetHeader>
          <ProductForm 
            onSuccess={() => {
              setIsAddSheetOpen(false);
            }}
            onCancel={() => setIsAddSheetOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Edit Product Dialog */}
      <Dialog open={editModal.open} onOpenChange={(open) => setEditModal({ open, product: open ? editModal.product : null })}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Produto</DialogTitle>
            <DialogDescription>
              Atualize as informações do produto. Os valores são unitários.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Nome do Produto</Label>
                <Input 
                  value={editName} 
                  onChange={(e) => setEditName(e.target.value)} 
                  className="input-glass" 
                  required 
                />
              </div>
              
              <div>
                <Label>Cor / Variante (opcional)</Label>
                <Input 
                  value={editColor} 
                  onChange={(e) => setEditColor(e.target.value)} 
                  placeholder="Ex: Preto, Branco, Azul" 
                  className="input-glass" 
                />
              </div>
              
              {/* Upload de Imagem */}
              <div className="md:col-span-2">
                <Label>Foto do Produto (opcional)</Label>
                <div className="space-y-3">
                  {editImagePreview && editImagePreview.trim() !== '' ? (
                    editImagePreview === 'HEIC_FILE' || (typeof editImagePreview === 'string' && (editImagePreview.toLowerCase().endsWith('.heic') || editImagePreview.toLowerCase().endsWith('.heif') || editImagePreview.toLowerCase().includes('.heic') || editImagePreview.toLowerCase().includes('.heif'))) ? (
                      <div className="relative inline-block">
                        <div className="h-32 w-32 flex flex-col items-center justify-center bg-muted rounded-lg border border-border">
                          <Package className="h-8 w-8 text-muted-foreground mb-2" />
                          <p className="text-xs text-muted-foreground text-center px-2">
                            Arquivo HEIC
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Preview não disponível
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 z-10"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveEditImage();
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="relative inline-block">
                        <img 
                          src={editImagePreview} 
                          alt="Preview do produto" 
                          className="h-32 w-32 object-cover rounded-lg border border-border"
                          onError={(e) => {
                            // Se a imagem falhar ao carregar (provavelmente HEIC), mostra mensagem
                            // Erro ao carregar imagem - silenciosamente ignora
                            const target = e.target as HTMLImageElement;
                            const parent = target.parentElement;
                            if (parent && !parent.querySelector('.heic-fallback')) {
                              const fallback = document.createElement('div');
                              fallback.className = 'heic-fallback h-32 w-32 flex flex-col items-center justify-center bg-muted rounded-lg border border-border';
                              fallback.innerHTML = `
                                <svg class="h-8 w-8 text-muted-foreground mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                                </svg>
                                <p class="text-xs text-muted-foreground text-center px-2">Arquivo HEIC</p>
                                <p class="text-xs text-muted-foreground mt-1">Preview não disponível</p>
                              `;
                              target.style.display = 'none';
                              parent.appendChild(fallback);
                            }
                          }}
                          onLoad={() => {
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 z-10"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRemoveEditImage();
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )
                  ) : (
                    <label 
                      className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer transition-all ${
                        isDraggingEdit 
                          ? 'border-primary bg-primary/10 scale-105' 
                          : 'border-border hover:bg-secondary/50 hover:border-primary/50'
                      }`}
                      onDragOver={handleEditDragOver}
                      onDragLeave={handleEditDragLeave}
                      onDrop={handleEditDrop}
                    >
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <Camera className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Arraste uma imagem ou clique para selecionar
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          JPG, PNG, GIF, WEBP, HEIC, HEIF, AVIF, BMP, TIFF até 5MB
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleEditImageChange}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                  )}
                </div>
              </div>
              <div>
                <Label>Categoria</Label>
                <Select 
                  value={editCategoryId || "none"} 
                  onValueChange={(value) => setEditCategoryId(value === "none" ? undefined : value)}
                >
                  <SelectTrigger className="input-glass">
                    <SelectValue placeholder="Sem categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sem categoria</SelectItem>
                    {parentCategoriesForEdit.map(cat => {
                      const subcategories = getSubcategoriesForEdit(cat.id);
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
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={1}
                  value={editQuantity || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '') {
                      setEditQuantity(1);
                    } else {
                      const num = parseInt(val, 10);
                      if (!isNaN(num) && num > 0) {
                        setEditQuantity(num);
                      }
                    }
                  }}
                  className="input-glass"
                  required
                />
              </div>
              <div>
                <Label>Preço de Custo Unitário (R$)</Label>
                <CurrencyInput
                  value={editCostPrice}
                  onChange={(value) => setEditCostPrice(value)}
                  className="input-glass"
                  required
                />
              </div>
              <div>
                <Label>Preço de Venda Unitário (R$)</Label>
                <CurrencyInput
                  value={editSellingPrice}
                  onChange={(value) => setEditSellingPrice(value)}
                  className="input-glass"
                  required
                />
              </div>
            </div>
            {editModal.product && (
              <div className="p-4 rounded-lg bg-primary/10 border border-primary/30">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">Resumo</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Custo Total</p>
                    <p className="font-medium">{formatCurrency(editCostPrice * editQuantity)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Venda Total</p>
                    <p className="font-medium text-primary">{formatCurrency(editSellingPrice * editQuantity)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Margem</p>
                    <p className="font-medium">{calculateMargin(editCostPrice, editSellingPrice).toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Lucro Total</p>
                    <p className="font-medium text-primary">{formatCurrency((editSellingPrice - editCostPrice) * editQuantity)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal({ open: false, product: null })}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEditSave} 
              disabled={updateProduct.isPending || !editName.trim()}
              className="gradient-primary"
            >
              {updateProduct.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Editar Produto */}
      <AlertDialog open={confirmEditProduct} onOpenChange={setConfirmEditProduct}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Alterações</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja salvar as alterações no produto "{editName}"? 
              {shouldRemoveImage && ' A imagem será removida.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmEditProduct}
              className="gradient-primary"
              disabled={updateProduct.isPending || uploadingImage}
            >
              {(updateProduct.isPending || uploadingImage) ? (
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm({ open, ids: [] })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm.ids.length === 1 
                ? 'Tem certeza que deseja excluir este produto? Esta ação não pode ser desfeita.'
                : `Tem certeza que deseja excluir ${deleteConfirm.ids.length} produtos? Esta ação não pode ser desfeita.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSelected}
              disabled={deleteProducts.isPending || deleteProduct.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProducts.isPending || deleteProduct.isPending ? (
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
              Tem certeza que deseja excluir {selectedProducts.size} produto(s) selecionado(s)? Esta ação não pode ser desfeita.
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
              Deseja exportar {selectedProducts.size} produto(s) selecionado(s) para CSV?
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

      {/* Import CSV Modal */}
      <ImportCSVModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onImportComplete={() => {
          // A lista será atualizada automaticamente pelo React Query quando a importação terminar
          // O ImportContext já invalida as queries automaticamente
        }}
        categories={categories}
        existingProducts={products.map(p => ({ id: p.id, name: p.name }))}
        createProduct={async (product) => {
          await createProduct.mutateAsync(product);
        }}
        updateProduct={async (id, product) => {
          await updateProduct.mutateAsync({ id, ...product });
        }}
        createCategory={async (name) => {
          return await createCategory.mutateAsync(name);
        }}
      />
    </AppLayout>
  );
}
