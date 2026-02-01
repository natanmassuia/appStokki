import { useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/hooks/useStore';
import { importService, ImportData } from '@/services/importService';

export function useUniversalImport() {
  const { store } = useStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<ImportData>({
    products: [],
    sales: [],
    expenses: [],
    customers: [],
    suppliers: []
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx')) {
      toast({
        title: 'Formato inválido',
        description: 'Por favor, envie apenas arquivos Excel (.xlsx).',
        variant: 'destructive',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessing(true);

    try {
      const data = await importService.parseExcelFile(file);
      
      const totalItems = 
        data.products.length + 
        data.sales.length + 
        data.expenses.length + 
        data.customers.length + 
        data.suppliers.length;

      if (totalItems === 0) {
        toast({
          title: 'Arquivo vazio ou inválido',
          description: 'Não encontramos dados reconhecíveis na planilha.',
          variant: 'destructive',
        });
        setPreviewData({ products: [], sales: [], expenses: [], customers: [], suppliers: [] });
        return;
      }

      setPreviewData(data);
      toast({
        title: 'Arquivo processado!',
        description: `Encontramos ${totalItems} registros para importação.`,
      });
    } catch (error) {
      console.error('Error parsing file:', error);
      toast({
        title: 'Erro ao ler arquivo',
        description: 'Verifique se é um arquivo Excel válido.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const resetImport = () => {
    setPreviewData({ products: [], sales: [], expenses: [], customers: [], suppliers: [] });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const confirmImport = async () => {
    if (!store) {
      toast({ title: 'Erro', description: 'Loja não identificada.', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    try {
      // 1. Products & Categories
      if (previewData.products.length > 0) {
        let formattedProducts = importService.normalizeProducts(previewData.products, store.id);

        // --- Category Logic ---
        const uniqueCategories = new Set<string>();
        formattedProducts.forEach((p: any) => {
          if (p._category_name) uniqueCategories.add(p._category_name);
        });

        if (uniqueCategories.size > 0) {
          // Fetch existing categories
          const { data: existingCategoriesData } = await supabase
            .from('categories')
            .select('id, name')
            .eq('store_id', store.id);
          
          const categoryMap = new Map<string, string>();
          if (existingCategoriesData) {
            existingCategoriesData.forEach(c => categoryMap.set(c.name.toLowerCase(), c.id));
          }

          // Create missing categories
          const newCategoriesToInsert: { store_id: string; name: string }[] = [];
          uniqueCategories.forEach(catName => {
            if (!categoryMap.has(catName.toLowerCase())) {
              newCategoriesToInsert.push({ store_id: store.id, name: catName });
            }
          });

          if (newCategoriesToInsert.length > 0) {
            const { data: createdCategories } = await supabase
              .from('categories')
              .insert(newCategoriesToInsert)
              .select('id, name');
            
            if (createdCategories) {
              createdCategories.forEach(c => categoryMap.set(c.name.toLowerCase(), c.id));
            }
          }

          // Assign category_id
          formattedProducts = formattedProducts.map((p: any) => {
            const catName = p._category_name;
            let categoryId = null;
            if (catName && categoryMap.has(catName.toLowerCase())) {
              categoryId = categoryMap.get(catName.toLowerCase());
            }
            const { _category_name, ...rest } = p;
            return { ...rest, category_id: categoryId };
          });
        } else {
           formattedProducts = formattedProducts.map((p: any) => {
             const { _category_name, ...rest } = p;
             return rest;
           });
        }

        const { error } = await supabase.from('products').insert(formattedProducts);
        if (error) throw new Error(`Erro ao salvar produtos: ${error.message}`);
      }

      // 2. Expenses
      if (previewData.expenses.length > 0) {
        const formattedExpenses = importService.normalizeExpenses(previewData.expenses, store.id);
        const { error } = await supabase.from('expenses').insert(formattedExpenses);
        if (error) throw new Error(`Erro ao salvar despesas: ${error.message}`);
      }

      // 3. Sales
      if (previewData.sales.length > 0) {
        const formattedSales = importService.normalizeSales(previewData.sales, store.id);
        const { error } = await supabase.from('transactions').insert(formattedSales);
        if (error) throw new Error(`Erro ao salvar vendas: ${error.message}`);
      }

      // 4. Customers
      if (previewData.customers.length > 0) {
        const formattedCustomers = importService.normalizeCustomers(previewData.customers, store.id);
        // Using upsert based on phone number if possible, but for now simple insert
        // Or better: filter duplicates by phone if DB has unique constraint? 
        // Supabase `insert` fails on conflict if not handled. 
        // Let's assume user wants to import new ones. 
        // ideally we should check for duplicates, but for bulk speed we might just try insert.
        // If we want to be safe, we use upsert (if there is a unique constraint) or ignoreDuplicates.
        // Assuming no strict unique constraint on phone yet, just insert.
        const { error } = await supabase.from('customers').insert(formattedCustomers);
        if (error) throw new Error(`Erro ao salvar clientes: ${error.message}`);
      }

      // 5. Suppliers
      if (previewData.suppliers.length > 0) {
        const formattedSuppliers = importService.normalizeSuppliers(previewData.suppliers, store.id);
        const { error } = await supabase.from('suppliers' as any).insert(formattedSuppliers);
        if (error) throw new Error(`Erro ao salvar fornecedores: ${error.message}`);
      }

      toast({
        title: 'Importação concluída!',
        description: 'Todos os dados foram salvos com sucesso.',
      });

      // Reset and Refetch
      resetImport();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['expenses'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      ]);

    } catch (error: any) {
      console.error('Import error:', error);
      toast({
        title: 'Erro na importação',
        description: error.message || 'Falha ao salvar dados.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    previewData,
    fileInputRef,
    handleFileUpload,
    resetImport,
    confirmImport,
    hasData: (
      previewData.products.length > 0 || 
      previewData.sales.length > 0 || 
      previewData.expenses.length > 0 ||
      previewData.customers.length > 0 ||
      previewData.suppliers.length > 0
    )
  };
}
