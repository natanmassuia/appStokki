import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Upload, Download, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { guessCategory } from '@/utils/categoryGuesser';
import { formatCurrency } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { mapProductHeaders } from '@/utils/csvHeaderMapper';
import { useImport } from '@/contexts/ImportContext';

interface ImportProduct {
  name: string;
  cost_price: number;
  selling_price: number;
  quantity: number;
  category: string;
  color?: string;
  errors?: string[];
  status?: 'new' | 'duplicate' | 'similar';
  existingProductId?: string;
  existingProductName?: string;
  similarity?: number;
}

interface ImportCSVModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  categories: Array<{ id: string; name: string }>;
  existingProducts: Array<{ id: string; name: string }>;
  createProduct: (product: any) => Promise<any>;
  updateProduct: (id: string, product: any) => Promise<any>;
  createCategory: (name: string) => Promise<any>;
}

export function ImportCSVModal({ open, onOpenChange, onImportComplete, categories, existingProducts, createProduct, updateProduct, createCategory }: ImportCSVModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [importData, setImportData] = useState<ImportProduct[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duplicateAction, setDuplicateAction] = useState<'ignore' | 'update'>('update');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { startImport, isImporting } = useImport();

  const downloadTemplate = () => {
    const headers = ['name', 'cost_price', 'selling_price', 'quantity', 'category', 'color'];
    const sample = [
      ['Fone Bluetooth X11', '50.00', '72.50', '10', 'Áudio', 'Preto'],
      ['Mouse Gamer RGB', '30.00', '43.50', '15', 'Periféricos', ''],
      ['Carregador USB-C', '15.00', '', '20', '', ''],
    ];
    
    const csv = [headers, ...sample].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_importacao.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'text/csv' || file.name.endsWith('.csv')) {
      handleFile(file);
    } else {
      toast({
        title: 'Arquivo inválido',
        description: 'Por favor, selecione um arquivo CSV.',
        variant: 'destructive',
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFile = (file: File) => {
    setIsProcessing(true);
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false, // CRUCIAL: Mantém tudo como string para parsing manual
      complete: (results) => {
        try {
          // Verifica se o CSV tem dados
          if (!results.data || results.data.length === 0) {
            toast({
              title: 'Planilha não reconhecida',
              description: 'O arquivo CSV está vazio ou não contém dados válidos. Verifique se o arquivo tem o formato correto.',
              variant: 'destructive',
            });
            setIsProcessing(false);
            return;
          }

          // Mapeia headers inteligentemente
          const headers = results.meta?.fields || (results.data.length > 0 ? Object.keys(results.data[0]) : []);
          const headerMapping = mapProductHeaders(headers);

          const parsed = parseCSVData(results.data as any[], headerMapping);
          
          // Parse dos dados
          
          // Verifica se conseguiu parsear pelo menos um item válido
          if (!parsed || !Array.isArray(parsed) || parsed.length === 0) {
            toast({
              title: 'Planilha não reconhecida',
              description: 'Não foi possível processar nenhum produto do arquivo. Verifique se o arquivo tem as colunas: name, cost_price, selling_price, quantity, category.',
              variant: 'destructive',
            });
            setIsProcessing(false);
            return;
          }

          const validProducts = parsed.filter(p => p && (!p.errors || p.errors.length === 0));

          if (validProducts.length === 0) {
            toast({
              title: 'Erro ao processar produtos',
              description: `Todos os ${parsed.length} produto(s) têm erros. Verifique os dados do arquivo.`,
              variant: 'destructive',
            });
            setIsProcessing(false);
            return;
          }

          // Detecta duplicatas comparando com produtos existentes
          const productsWithStatus = detectDuplicates(validProducts);
          
          setImportData(productsWithStatus);
          setIsProcessing(false);
        } catch (error: any) {
          toast({
            title: 'Planilha não reconhecida',
            description: error.message || 'O formato do arquivo CSV não é reconhecido. Verifique se o arquivo tem as colunas esperadas: name, cost_price, selling_price, quantity, category.',
            variant: 'destructive',
          });
          setIsProcessing(false);
        }
      },
      error: (error) => {
        toast({
          title: 'Erro ao ler CSV',
          description: error.message,
          variant: 'destructive',
        });
        setIsProcessing(false);
      },
    });
  };

  // Função para calcular similaridade entre duas strings (0-1)
  const calculateSimilarity = (str1: string, str2: string): number => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    // Se forem idênticos
    if (s1 === s2) return 1.0;
    
    // Se uma contém a outra
    if (s1.includes(s2) || s2.includes(s1)) {
      const minLen = Math.min(s1.length, s2.length);
      const maxLen = Math.max(s1.length, s2.length);
      return minLen / maxLen;
    }
    
    // Calcula similaridade usando palavras comuns
    const words1 = s1.split(/\s+/).filter(w => w.length > 2);
    const words2 = s2.split(/\s+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) return 0;
    
    // Conta palavras em comum
    const commonWords = words1.filter(w1 => words2.some(w2 => w1 === w2 || w1.includes(w2) || w2.includes(w1)));
    const totalWords = new Set([...words1, ...words2]).size;
    
    if (totalWords === 0) return 0;
    
    // Similaridade baseada em palavras comuns
    const wordSimilarity = (commonWords.length * 2) / totalWords;
    
    // Similaridade baseada em caracteres (Levenshtein simplificado)
    const maxLen = Math.max(s1.length, s2.length);
    let matches = 0;
    const minLen = Math.min(s1.length, s2.length);
    
    for (let i = 0; i < minLen; i++) {
      if (s1[i] === s2[i]) matches++;
    }
    
    const charSimilarity = matches / maxLen;
    
    // Combina ambas as similaridades
    return (wordSimilarity * 0.7 + charSimilarity * 0.3);
  };

  const detectDuplicates = (parsedData: ImportProduct[]): ImportProduct[] => {
    // Detecta duplicatas

    // Cria um mapa de produtos existentes (case-insensitive)
    const existingProductsMap = new Map<string, { id: string; name: string }>();
    existingProducts.forEach(prod => {
      existingProductsMap.set(prod.name.toLowerCase().trim(), prod);
    });


    // Marca duplicatas e similares
    return parsedData.map(item => {
      const itemNameLower = item.name.toLowerCase().trim();
      
      // Verifica duplicata exata
      const exactMatch = existingProductsMap.get(itemNameLower);
      if (exactMatch) {
        return {
          ...item,
          status: 'duplicate' as const,
          existingProductId: exactMatch.id,
          existingProductName: exactMatch.name,
        };
      }
      
      // Verifica produtos similares (similaridade >= 0.6)
      let bestMatch: { id: string; name: string; similarity: number } | null = null;
      let bestSimilarity = 0;
      
      for (const existing of existingProducts) {
        const similarity = calculateSimilarity(item.name, existing.name);
        if (similarity >= 0.6 && similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = {
            id: existing.id,
            name: existing.name,
            similarity,
          };
        }
      }
      
      if (bestMatch) {
        return {
          ...item,
          status: 'similar' as const,
          existingProductId: bestMatch.id,
          existingProductName: bestMatch.name,
          similarity: bestMatch.similarity,
        };
      }
      
      return {
        ...item,
        status: 'new' as const, // Produto novo, não é duplicata
      };
    });
  };

  // Valida se o CSV tem a estrutura esperada
  const validateCSVStructure = (data: any[]): { valid: boolean; error?: string } => {
    if (!data || data.length === 0) {
      return { valid: false, error: 'O arquivo CSV está vazio ou não contém dados.' };
    }

    // Verifica se tem pelo menos uma linha com dados
    const firstRow = data[0];
    if (!firstRow || Object.keys(firstRow).length === 0) {
      return { valid: false, error: 'O arquivo CSV não contém colunas válidas.' };
    }

    // Normaliza nomes de colunas para verificação
    const normalizeKey = (key: string) => key?.toLowerCase().trim().replace(/\s+/g, '_');
    const normalizedKeys = Object.keys(firstRow).map(normalizeKey);
    
    // Valida estrutura do CSV
    if (!data || !Array.isArray(data) || data.length === 0) {
      return { valid: false, error: 'O arquivo CSV está vazio ou não possui dados válidos.' };
    }

    // Verifica se tem pelo menos uma coluna esperada (usando aliases)
    const expectedAliases = [
      'name', 'nome', 'produto', 'descricao', 'item', 'modelo', 'mercadoria',
      'cost_price', 'custo', 'compra', 'pago', 'valor unitario', 'quanto paguei',
      'selling_price', 'venda', 'preco', 'valor venda', 'saida',
      'quantity', 'quantidade', 'qtd', 'estoque', 'saldo',
      'category', 'categoria', 'grupo', 'tipo', 'departamento'
    ];
    
    // Verifica match exato primeiro (mais preciso)
    const hasExactMatch = expectedAliases.some(alias => normalizedKeys.includes(alias));
    
    // Se não tem match exato, verifica se contém
    const hasPartialMatch = !hasExactMatch && expectedAliases.some(alias => 
      normalizedKeys.some(key => key.includes(alias) || alias.includes(key))
    );
    
    const hasExpectedKey = hasExactMatch || hasPartialMatch;
    

    if (!hasExpectedKey) {
      return { 
        valid: false, 
        error: 'O arquivo CSV não possui o formato esperado. As colunas devem incluir: name (ou nome/produto/mercadoria), cost_price (ou custo/compra/pago), selling_price (ou venda/preço), quantity (ou quantidade/qtd), e category (ou categoria/grupo).' 
      };
    }

    return { valid: true };
  };

  const parseCSVData = (data: any[], headerMapping: Record<string, string> = {}): ImportProduct[] => {
    // Valida estrutura antes de processar
    const validation = validateCSVStructure(data);
    if (!validation.valid) {
      throw new Error(validation.error || 'Formato de arquivo não reconhecido.');
    }

    return data.map((row, index) => {
      const errors: string[] = [];
      
      // Função helper para obter valor usando mapeamento inteligente ou fallbacks
      const getValue = (field: string, fallbacks: string[]): string => {
        // Primeiro tenta usar o mapeamento
        if (headerMapping[field] && row[headerMapping[field]] !== undefined) {
          return row[headerMapping[field]] || '';
        }
        
        // Depois tenta fallbacks normalizados
        const normalizeKey = (key: string) => key?.toLowerCase().trim().replace(/\s+/g, '_');
        for (const fallback of fallbacks) {
          const normalizedFallback = normalizeKey(fallback);
          for (const key of Object.keys(row)) {
            if (normalizeKey(key) === normalizedFallback) {
              return row[key] || '';
            }
          }
        }
        
        return '';
      };

      const name = getValue('name', ['nome', 'produto', 'descricao', 'item', 'modelo']);
      const costPrice = parseFloat(getValue('cost_price', ['custo', 'preco_custo', 'compra', 'pago']) || '0');
      let sellingPrice = parseFloat(getValue('selling_price', ['venda', 'preco_venda', 'preco', 'saida']) || '0');
      const quantity = parseInt(getValue('quantity', ['quantidade', 'qtd', 'estoque', 'saldo']) || '0');
      let category = getValue('category', ['categoria', 'grupo', 'tipo', 'departamento']);
      const color = getValue('color', ['cor', 'cores', 'variacao']);

      // Validações
      if (!name || name.trim() === '') {
        errors.push('Nome do produto é obrigatório');
      }

      if (isNaN(costPrice) || costPrice <= 0) {
        errors.push('Preço de custo inválido');
      }

      // Se não tem preço de venda, calcula com margem de 45%
      if (isNaN(sellingPrice) || sellingPrice <= 0) {
        sellingPrice = costPrice * 1.45;
      }

      if (isNaN(quantity) || quantity < 0) {
        errors.push('Quantidade inválida');
      }

      // Se não tem categoria, usa a função de guess
      if (!category || category.trim() === '') {
        category = guessCategory(name);
      }

      return {
        name: name.trim(),
        cost_price: costPrice,
        selling_price: sellingPrice,
        quantity: quantity,
        category: category.trim(),
        color: color.trim() || undefined,
        errors: errors.length > 0 ? errors : [],
      };
    }).filter(item => item.name); // Remove linhas sem nome
  };

  const handleImport = async () => {
    const validItems = importData.filter(item => !item.errors || item.errors.length === 0);
    
    if (validItems.length === 0) {
      toast({
        title: 'Nenhum item válido',
        description: 'Corrija os erros antes de importar.',
        variant: 'destructive',
      });
      return;
    }

    // Filtra itens baseado na ação escolhida para duplicatas
    let itemsToProcess: ImportProduct[];
    if (duplicateAction === 'ignore') {
      // Ignora duplicatas, só importa novos
      itemsToProcess = validItems.filter(item => item.status === 'new');
    } else {
      // Atualiza duplicatas, importa novos
      itemsToProcess = validItems;
    }

    if (itemsToProcess.length === 0) {
      const duplicateCount = validItems.filter(item => item.status === 'duplicate' || item.status === 'similar').length;
      toast({
        title: 'Nenhum produto para importar',
        description: duplicateAction === 'ignore' 
          ? `Não existem produtos para implementar, pois todos os ${duplicateCount} produto${duplicateCount > 1 ? 's' : ''} já existem na planilha.`
          : 'Nenhum item válido para importar.',
        variant: duplicateAction === 'ignore' ? 'default' : 'destructive',
      });
      return;
    }

    // Prepara dados para importação em segundo plano
    try {
      // Helper para normalizar texto (remove acentos e lowercase)
      const normalizeText = (text: string) => 
        text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "").trim();

      // Busca IDs das categorias e cria um mapa (preparação)
      const categoryMap = new Map<string, string>();
      categories.forEach(cat => {
        const catNameNorm = normalizeText(cat.name);
        categoryMap.set(catNameNorm, cat.id);
        
        // Também mapeia o nome original lowercased para garantir
        categoryMap.set(cat.name.toLowerCase().trim(), cat.id);

        if (cat.name.includes(' > ')) {
          const parentName = cat.name.split(' > ')[0];
          const subcatName = cat.name.split(' > ')[1];
          
          categoryMap.set(normalizeText(subcatName), cat.id);
          
          if (!categoryMap.has(normalizeText(parentName))) {
            // Nota: isso aponta para a subcategoria se o pai não existir como categoria própria, 
            // o que pode não ser ideal, mas mantém lógica anterior de fallback
             // CORREÇÃO: A lógica original parecia tentar mapear partes. 
             // Vamos manter simples: mapeia a string normalizada.
          }
        }
      });

      // Função auxiliar para encontrar ou criar categoria
      const findOrCreateCategory = async (categoryName: string, map: Map<string, string>): Promise<string | null> => {
        const categoryNorm = normalizeText(categoryName);
        
        // 1. Tenta match exato normalizado
        if (map.has(categoryNorm)) {
          return map.get(categoryNorm)!;
        }

        // 2. Tenta busca fuzzy nas chaves normalizadas
        for (const [catName, catId] of map.entries()) {
          if (categoryNorm === catName || 
              categoryNorm.includes(catName) || 
              catName.includes(categoryNorm)) {
            return catId;
          }
        }

        // 3. Se não achou, cria nova
        if (categoryName && categoryName.trim() !== '') {
          try {
            const newCategory = await createCategory(categoryName.trim());
            if (newCategory && newCategory.id) {
              map.set(categoryNorm, newCategory.id);
              return newCategory.id;
            }
          } catch (catError: any) {
            // Silenciosamente ignora erros ao criar categoria
          }
        }
        return null;
      };

      // Separa novos e duplicados
      const newItems = itemsToProcess.filter(item => item.status === 'new');
      const duplicateItems = duplicateAction === 'update' 
        ? itemsToProcess.filter(item => item.status === 'duplicate' || item.status === 'similar')
        : [];

      // Prepara todos os itens para importação
      const allItemsToImport = [...newItems, ...duplicateItems];

      if (allItemsToImport.length === 0) {
        const duplicateCount = validItems.filter(item => item.status === 'duplicate' || item.status === 'similar').length;
        toast({
          title: 'Nenhum produto para importar',
          description: duplicateAction === 'ignore' 
            ? `Não existem produtos para implementar, pois todos os ${duplicateCount} produto${duplicateCount > 1 ? 's' : ''} já existem na planilha.`
            : 'Nenhum item válido para importar.',
          variant: duplicateAction === 'ignore' ? 'default' : 'destructive',
        });
        return;
      }

      // Prepara função de importação para cada item
      const importItems = allItemsToImport.map(item => ({
        id: item.name + '_' + item.cost_price + '_' + item.selling_price,
        name: item.name,
      }));

      // Pré-processamento: Identifica e cria categorias inexistentes sequencialmente
      // Isso evita condições de corrida onde múltiplos produtos tentam criar a mesma categoria ao mesmo tempo
      const uniqueCategoriesToCreate = new Map<string, string>();
      
      allItemsToImport.forEach(item => {
        if (item.category && item.category.trim() !== '') {
          const catNorm = normalizeText(item.category);
          // Só adiciona se não estiver no mapa de existentes E não estiver na lista de criação
          if (!categoryMap.has(catNorm) && !uniqueCategoriesToCreate.has(catNorm)) {
            uniqueCategoriesToCreate.set(catNorm, item.category.trim());
          }
        }
      });

      // Cria as categorias novas uma por uma
      if (uniqueCategoriesToCreate.size > 0) {
        toast({
          title: 'Criando categorias...',
          description: `Criando ${uniqueCategoriesToCreate.size} nova(s) categoria(s) antes de importar produtos.`,
        });

        for (const [_, originalName] of uniqueCategoriesToCreate) {
          try {
            const newCategory = await createCategory(originalName);
            if (newCategory && newCategory.id) {
              // Adiciona ambas as versões ao mapa para garantir
              categoryMap.set(normalizeText(originalName), newCategory.id);
              categoryMap.set(originalName.toLowerCase().trim(), newCategory.id);
            }
          } catch (error) {
            console.error(`Erro ao criar categoria ${originalName}:`, error);
          }
        }
      }

      // Função que será chamada para cada item
      const importFn = async (importItem: { id: string; name: string }) => {
        const item = allItemsToImport.find(i => 
          (i.name + '_' + i.cost_price + '_' + i.selling_price) === importItem.id
        );
        
        if (!item) {
          throw new Error('Item não encontrado');
        }

        // Agora findOrCreateCategory provavelmente vai encontrar no mapa, 
        // mas mantemos como fallback seguro
        const categoryId = await findOrCreateCategory(item.category, categoryMap);
        
        if (item.status === 'new') {
          // Cria novo produto
          const productData: any = {
            name: item.name,
            cost_price: item.cost_price,
            selling_price: item.selling_price,
            quantity: item.quantity,
            category_id: categoryId,
            color: item.color || null,
          };
          await createProduct(productData);
        } else if (item.status === 'duplicate' || item.status === 'similar') {
          // Atualiza produto existente
          if (!item.existingProductId) {
            throw new Error('ID do produto não encontrado');
          }
          const productData: any = {
            name: item.name,
            cost_price: item.cost_price,
            selling_price: item.selling_price,
            quantity: item.quantity,
            category_id: categoryId,
            color: item.color || null,
          };
          await updateProduct(item.existingProductId, productData);
        }
      };

      // Inicia importação em segundo plano
      await startImport('products', importItems, importFn);

      // Toast removido - o sistema de progressão mostra o status automaticamente

      // Fecha o modal (status fica no indicador flutuante)
      handleClose();
      // Não chama onImportComplete aqui para evitar recarregar a página
      // A atualização será feita automaticamente pelo ImportContext quando terminar
    } catch (error: any) {
      toast({
        title: 'Erro ao iniciar importação',
        description: error.message || 'Não foi possível iniciar a importação.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setImportData([]);
    setIsDragging(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-card max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Produtos via CSV</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV com seus produtos. O sistema categorizará automaticamente produtos sem categoria e detectará produtos com nomes similares ou duplicados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Download Template */}
          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Não tem um modelo? Baixe nosso template
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate}>
              <Download className="h-4 w-4 mr-2" />
              Download Modelo
            </Button>
          </div>

          {/* Upload Area */}
          {importData.length === 0 && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Processando arquivo...</p>
                </div>
              ) : (
                <>
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">
                    Arraste e solte seu arquivo CSV aqui
                  </p>
                  <p className="text-sm text-muted-foreground mb-4">ou</p>
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Selecionar Arquivo
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </>
              )}
            </div>
          )}

          {/* Preview Table */}
          {importData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Preview: {importData.length} produto(s) encontrado(s)
                </p>
                <Button variant="outline" size="sm" onClick={() => setImportData([])}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[400px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Custo</TableHead>
                        <TableHead>Venda</TableHead>
                        <TableHead>Qtd</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importData.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>{formatCurrency(item.cost_price)}</TableCell>
                          <TableCell>{formatCurrency(item.selling_price)}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>
                            <span className="text-xs bg-secondary px-2 py-1 rounded">
                              {item.category}
                            </span>
                          </TableCell>
                          <TableCell>
                            {item.errors && item.errors.length > 0 ? (
                              <div className="flex flex-col gap-1 text-destructive text-xs">
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>{item.errors.join(', ')}</span>
                                </div>
                              </div>
                            ) : item.status === 'duplicate' ? (
                              <div className="flex flex-col gap-1 text-yellow-600 dark:text-yellow-500 text-xs">
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>Já Existe</span>
                                </div>
                                {item.existingProductName && (
                                  <span className="text-[10px] opacity-75">
                                    Produto: {item.existingProductName}
                                  </span>
                                )}
                              </div>
                            ) : item.status === 'similar' ? (
                              <div className="flex flex-col gap-1 text-orange-600 dark:text-orange-500 text-xs">
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>Nome Similar</span>
                                </div>
                                {item.existingProductName && (
                                  <span className="text-[10px] opacity-75">
                                    Similar a: {item.existingProductName}
                                    {item.similarity && ` (${Math.round(item.similarity * 100)}%)`}
                                  </span>
                                )}
                              </div>
                            ) : item.status === 'new' ? (
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-500 text-xs">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Novo</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Novo</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-4">
          {/* Opções para duplicatas e similares */}
          {importData.length > 0 && (importData.some(item => item.status === 'duplicate' && (!item.errors || item.errors.length === 0)) || 
                                     importData.some(item => item.status === 'similar' && (!item.errors || item.errors.length === 0))) && (
            <div className="w-full p-4 bg-secondary/30 rounded-lg space-y-3">
              <Label className="text-sm font-medium">
                Para produtos duplicados ou com nomes similares:
              </Label>
              <div className="flex flex-col gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="duplicateAction"
                    value="ignore"
                    checked={duplicateAction === 'ignore'}
                    onChange={(e) => setDuplicateAction(e.target.value as 'ignore' | 'update')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Ignorar (não importar produtos duplicados/similares)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="duplicateAction"
                    value="update"
                    checked={duplicateAction === 'update'}
                    onChange={(e) => setDuplicateAction(e.target.value as 'ignore' | 'update')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Atualizar dados existentes (preços, categoria, quantidade)</span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                {importData.filter(item => item.status === 'duplicate' && (!item.errors || item.errors.length === 0)).length > 0 && (
                  <span>
                    {importData.filter(item => item.status === 'duplicate' && (!item.errors || item.errors.length === 0)).length} produto(s) com nome idêntico encontrado(s).
                  </span>
                )}
                {importData.filter(item => item.status === 'similar' && (!item.errors || item.errors.length === 0)).length > 0 && (
                  <span className={importData.filter(item => item.status === 'duplicate' && (!item.errors || item.errors.length === 0)).length > 0 ? ' ml-2' : ''}>
                    {importData.filter(item => item.status === 'similar' && (!item.errors || item.errors.length === 0)).length} produto(s) com nome similar encontrado(s).
                  </span>
                )}
              </p>
            </div>
          )}

          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={importData.length === 0 || isImporting}
              className="gradient-primary flex-1"
            >
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  {duplicateAction === 'ignore' 
                    ? `Importar ${importData.filter(item => item.status === 'new' && (!item.errors || item.errors.length === 0)).length} novo(s)`
                    : `Importar ${importData.filter(item => !item.errors || item.errors.length === 0).length} produto(s)`
                  }
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
