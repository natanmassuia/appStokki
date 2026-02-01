import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, Download, FileText, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/hooks/useStore';
import { mapExpenseHeaders } from '@/utils/csvHeaderMapper';
import { useImport } from '@/contexts/ImportContext';

interface ImportExpense {
  description: string;
  amount: number;
  date: string;
  errors?: string[];
  status?: 'new' | 'duplicate' | 'similar';
  existingExpenseId?: string;
  existingExpenseDescription?: string;
  similarity?: number;
}

interface ExpensesImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  existingExpenses: Array<{ id: string; description: string; amount: number; date: string }>;
  createExpense: (expense: { description: string; amount: number; date: string }) => Promise<any>;
  updateExpense: (id: string, expense: { description: string; amount: number; date: string }) => Promise<any>;
}

// Função helper para obter data local no formato YYYY-MM-DD
const getTodayLocalDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function ExpensesImportModal({ open, onOpenChange, onImportComplete, existingExpenses, createExpense, updateExpense }: ExpensesImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [importData, setImportData] = useState<ImportExpense[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duplicateAction, setDuplicateAction] = useState<'ignore' | 'update'>('update');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { store } = useStore();
  const queryClient = useQueryClient();
  const { startImport } = useImport();

  const downloadTemplate = () => {
    const headers = ['description', 'amount', 'date'];
    const sample = [
      ['Embalagens e Sacolas', '150.50', '2026-01-10'],
      ['Uber Entrega Centro', '12.90', '2026-01-12'],
      ['Conta de Internet', '99.90', ''],
      ['Fita Adesiva', '5.00', '2026-01-24'],
      ['Marketing Instagram', '50.00', ''],
    ];
    
    const csv = [headers, ...sample].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_importacao_gastos.csv');
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
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
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
          const headerMapping = mapExpenseHeaders(headers);
          
          // Debug: Log o mapeamento
          if (import.meta.env.DEV) {
            console.log('[CSV Parse] Headers found:', headers);
            console.log('[CSV Parse] Header mapping:', headerMapping);
            if (results.data.length > 0) {
              console.log('[CSV Parse] First row sample:', results.data[0]);
            }
          }

          // Valida estrutura antes de processar
          const validation = validateCSVStructure(results.data as any[]);
          if (!validation.valid) {
            toast({
              title: 'Planilha não reconhecida',
              description: validation.error || 'O formato do arquivo CSV não é reconhecido.',
              variant: 'destructive',
            });
            setIsProcessing(false);
            return;
          }

          const parsed = parseCSVData(results.data as any[], headerMapping);
          
          // Verifica se conseguiu parsear pelo menos um item válido
          if (parsed.length === 0) {
            toast({
              title: 'Planilha não reconhecida',
              description: 'Não foi possível processar nenhum gasto do arquivo. Verifique se o arquivo tem as colunas: description, amount, date.',
              variant: 'destructive',
            });
            setIsProcessing(false);
            return;
          }

          // Detecta duplicatas comparando com gastos existentes
          const expensesWithStatus = detectDuplicates(parsed);
          setImportData(expensesWithStatus);
          setIsProcessing(false);
        } catch (error: any) {
          toast({
            title: 'Planilha não reconhecida',
            description: error.message || 'O formato do arquivo CSV não é reconhecido. Verifique se o arquivo tem as colunas esperadas: description, amount, date.',
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

    // Verifica se tem pelo menos uma coluna esperada (usando aliases)
    const expectedAliases = [
      'description', 'descricao', 'descrição', 'motivo', 'nome', 'gasto', 'despesa',
      'amount', 'valor', 'total', 'pago', 'quantia', 'custo',
      'date', 'data', 'dia', 'vencimento', 'pagamento'
    ];
    const hasExpectedKey = expectedAliases.some(alias => normalizedKeys.some(key => key.includes(alias) || alias.includes(key)));

    if (!hasExpectedKey) {
      return { 
        valid: false, 
        error: 'O arquivo CSV não possui o formato esperado. As colunas devem incluir: description (ou descrição/motivo/nome), amount (ou valor/total/pago), e date (ou data/dia/vencimento).' 
      };
    }

    return { valid: true };
  };

  const parseCSVData = (data: any[], headerMapping: Record<string, string> = {}): ImportExpense[] => {
    // Valida estrutura antes de processar
    const validation = validateCSVStructure(data);
    if (!validation.valid) {
      throw new Error(validation.error || 'Formato de arquivo não reconhecido.');
    }

    return data.map((row, index) => {
      const errors: string[] = [];
      
      // Usa o mapeamento inteligente ou fallback para nomes normalizados
      const getValue = (field: string, fallbacks: string[]): string => {
        // Primeiro tenta usar o mapeamento (mais confiável)
        if (headerMapping[field] && row[headerMapping[field]] !== undefined) {
          const value = String(row[headerMapping[field]] || '').trim();
          if (import.meta.env.DEV && field === 'date') {
            console.log(`[getValue] Field '${field}' mapped to column '${headerMapping[field]}', value:`, value);
          }
          return value;
        }
        
        // Depois tenta fallbacks normalizados (apenas se mapeamento não funcionou)
        const normalizeKey = (key: string) => key?.toLowerCase().trim().replace(/\s+/g, '_');
        for (const fallback of fallbacks) {
          const normalizedFallback = normalizeKey(fallback);
          for (const key of Object.keys(row)) {
            if (normalizeKey(key) === normalizedFallback) {
              const value = String(row[key] || '').trim();
              if (import.meta.env.DEV && field === 'date') {
                console.log(`[getValue] Field '${field}' found via fallback '${fallback}' in column '${key}', value:`, value);
              }
              return value;
            }
          }
        }
        
        if (import.meta.env.DEV && field === 'date') {
          console.warn(`[getValue] Field '${field}' NOT FOUND. Available columns:`, Object.keys(row));
        }
        return '';
      };

      const description = getValue('description', ['descricao', 'descrição', 'motivo', 'nome', 'gasto']);
      let amountStr = getValue('amount', ['valor', 'total', 'pago', 'quantia', 'custo']);
      let dateStr = getValue('date', ['data', 'dia', 'vencimento', 'pagamento']);
      
      // Debug: Log o que foi encontrado
      if (import.meta.env.DEV) {
        console.log(`[Row ${index}] Description: "${description}", Amount: "${amountStr}", Date: "${dateStr}"`);
      }
      
      // Remove caracteres invisíveis e normaliza espaços
      dateStr = dateStr.trim().replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width spaces

      // Remove formatação de moeda e normaliza para formato numérico
      amountStr = amountStr.toString().trim();
      
      // Remove R$ e espaços
      amountStr = amountStr.replace(/R\$\s*/g, '').trim();
      
      // Detecta formato: se tem vírgula, assume formato brasileiro (vírgula = decimal)
      // Se só tem ponto, precisa verificar se é decimal ou milhar
      const hasComma = amountStr.includes(',');
      const hasDot = amountStr.includes('.');
      
      if (hasComma && hasDot) {
        // Formato brasileiro: "1.500,50" ou "150,50"
        // Remove pontos (milhares) e substitui vírgula por ponto (decimal)
        amountStr = amountStr.replace(/\./g, '').replace(',', '.');
      } else if (hasComma && !hasDot) {
        // Formato brasileiro simples: "150,50"
        amountStr = amountStr.replace(',', '.');
      } else if (!hasComma && hasDot) {
        // Pode ser formato americano "150.50" ou brasileiro sem vírgula "150.50"
        // Se tem mais de um ponto ou o ponto não está nas últimas 3 posições, são milhares
        const dotIndex = amountStr.lastIndexOf('.');
        const afterDot = amountStr.substring(dotIndex + 1);
        
        // Se depois do ponto tem mais de 2 dígitos, provavelmente são milhares
        // Se tem exatamente 2 dígitos, provavelmente é decimal
        if (afterDot.length > 2) {
          // Remove todos os pontos (são separadores de milhar)
          amountStr = amountStr.replace(/\./g, '');
        }
        // Se tem 2 ou menos dígitos, mantém o ponto como decimal
      }
      // Se não tem nem vírgula nem ponto, já está no formato correto
      
      const amount = parseFloat(amountStr);

      // Validações
      if (!description || description.trim() === '') {
        errors.push('Descrição é obrigatória');
      }

      if (isNaN(amount) || amount <= 0) {
        errors.push('Valor inválido');
      }

      // Processa data com parsing "hard-coded" e robusto
      // IMPORTANTE: Se dateStr parece ser uma descrição (não tem números e separadores), ignora
      let date = dateStr;
      const dateStrTrimmed = String(dateStr || '').trim();
      
      // Verifica se parece ser uma data (tem números e separadores de data)
      // Padrão: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY ou YYYY-MM-DD
      const looksLikeDate = /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$|^\d{4}-\d{2}-\d{2}$/.test(dateStrTrimmed);
      
      if (!date || dateStrTrimmed === '' || !looksLikeDate) {
        // Se data vazia ou não parece ser data, usa hoje (mas adiciona aviso)
        if (dateStrTrimmed && !looksLikeDate) {
          // Parece ser texto (descrição), não data - provavelmente mapeamento errado
          if (import.meta.env.DEV) {
            console.warn(`[Date Parse] Value "${dateStrTrimmed}" doesn't look like a date (no date pattern found) - using today`);
            console.warn(`[Date Parse] This suggests the column mapping may be wrong. Check header mapping.`);
          }
        }
        date = getTodayLocalDate();
        if (dateStrTrimmed && !looksLikeDate) {
          errors.push('Data inválida ou coluna não encontrada - usando data de hoje');
        } else {
          errors.push('Data vazia - usando data de hoje');
        }
      } else {
        // Função helper para parsear data com logging
        const parseStrictDate = (rawValue: any): Date | null => {
          if (!rawValue) return null;
          
          // 1. Force String & Clean
          const dateStr = String(rawValue).trim();
          if (import.meta.env.DEV) {
            console.log("Processing Date Raw:", dateStr); // Debugging
          }

          // 2. Handle "DD/MM/YYYY" (Brazilian) - Manual Split
          // Accepts separators: / or - or .
          if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/.test(dateStr)) {
            const parts = dateStr.split(/[\/\-\.]/); // Split by any separator
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1; // JS Month is 0-11
            let year = parseInt(parts[2], 10);
            
            // Se ano tem 2 dígitos, assume 2000-2099
            if (year < 100) {
              year = year < 50 ? 2000 + year : 1900 + year;
            }

            // Create date at NOON (12:00) to prevent UTC rollover issues
            const date = new Date(year, month, day, 12, 0, 0);
            
            // Check for "Invalid Date" result and validate values match
            if (!isNaN(date.getTime()) && 
                date.getFullYear() === year && 
                date.getMonth() === month && 
                date.getDate() === day) {
              return date;
            }
          }

          // 3. Handle ISO "YYYY-MM-DD"
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
            const date = new Date(dateStr + "T12:00:00");
            if (!isNaN(date.getTime())) {
              // Valida se corresponde ao que foi inserido
              const parts = dateStr.split('-');
              const year = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10) - 1;
              const day = parseInt(parts[2], 10);
              
              if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
                return date;
              }
            }
          }

          if (import.meta.env.DEV) {
            console.warn("Date Parse Failed for:", dateStr);
          }
          return null;
        };
        
        const parsedDate = parseStrictDate(dateStr);
        if (parsedDate) {
          // Formata para YYYY-MM-DD
          const finalYear = parsedDate.getFullYear();
          const finalMonth = String(parsedDate.getMonth() + 1).padStart(2, '0');
          const finalDay = String(parsedDate.getDate()).padStart(2, '0');
          date = `${finalYear}-${finalMonth}-${finalDay}`;
          // Data válida - não adiciona erro
        } else {
          // Data inválida - usa hoje e adiciona aviso
          date = getTodayLocalDate();
          errors.push('Data inválida - usando data de hoje');
        }
      }

      return {
        description: description.trim(),
        amount: amount,
        date: date,
        errors: errors.length > 0 ? errors : [], // Sempre um array, nunca undefined
      };
    }).filter(item => item.description); // Remove linhas sem descrição
  };

  // Função para normalizar data para comparação (extrai apenas YYYY-MM-DD)
  const normalizeDate = (dateStr: string): string => {
    if (!dateStr) return '';
    // Se já está no formato YYYY-MM-DD, retorna
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    // Se tem timestamp, extrai apenas a data
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const detectDuplicates = (parsedData: ImportExpense[]): ImportExpense[] => {
    // Cria um mapa de gastos existentes baseado em description, amount e date
    // Normaliza para comparação (case-insensitive, mesma data, mesmo valor)
    const existingExpensesMap = new Map<string, { id: string; description: string; amount: number; date: string }>();
    
    existingExpenses.forEach(exp => {
      // Normaliza a data do gasto existente
      const normalizedDate = normalizeDate(exp.date);
      // Normaliza o amount para evitar problemas de precisão de ponto flutuante
      const normalizedAmount = Math.round(exp.amount * 100) / 100;
      // Cria uma chave única baseada em description (lowercase), amount e date
      const key = `${exp.description.toLowerCase().trim()}_${normalizedAmount}_${normalizedDate}`;
      existingExpensesMap.set(key, exp);
    });

    // Marca duplicatas
    const result = parsedData.map(item => {
      // Normaliza a data do item sendo importado
      const normalizedDate = normalizeDate(item.date);
      // Normaliza o amount
      const normalizedAmount = Math.round(item.amount * 100) / 100;
      // Cria a mesma chave para o item sendo importado
      const itemKey = `${item.description.toLowerCase().trim()}_${normalizedAmount}_${normalizedDate}`;
      const existing = existingExpensesMap.get(itemKey);
      
      if (existing) {
        return {
          ...item,
          status: 'duplicate' as const,
          existingExpenseId: existing.id,
          existingExpenseDescription: existing.description,
        };
      }
      
      return {
        ...item,
        status: 'new' as const,
      };
    });
    
    return result;
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
    let itemsToProcess: ImportExpense[];
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
        title: 'Nenhum gasto para importar',
        description: duplicateAction === 'ignore' 
          ? `Não existem gastos para implementar, pois todos os ${duplicateCount} gasto${duplicateCount > 1 ? 's' : ''} já existem na planilha.`
          : 'Nenhum item válido para importar.',
        variant: duplicateAction === 'ignore' ? 'default' : 'destructive',
      });
      return;
    }

    // Prepara dados para importação em segundo plano
    try {
      if (!user) {
        toast({
          title: 'Erro',
          description: 'Usuário não autenticado.',
          variant: 'destructive',
        });
        return;
      }

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
          title: 'Nenhum gasto para importar',
          description: duplicateAction === 'ignore' 
            ? `Não existem gastos para implementar, pois todos os ${duplicateCount} gasto${duplicateCount > 1 ? 's' : ''} já existem na planilha.`
            : 'Nenhum item válido para importar.',
          variant: duplicateAction === 'ignore' ? 'default' : 'destructive',
        });
        return;
      }

      // Prepara função de importação para cada item
      const importItems = allItemsToImport.map(item => ({
        id: item.description + '_' + item.amount + '_' + item.date,
        name: item.description,
      }));

      // Função que será chamada para cada item
      const importFn = async (importItem: { id: string; name: string }) => {
        const item = allItemsToImport.find(i => 
          (i.description + '_' + i.amount + '_' + i.date) === importItem.id
        );
        
        if (!item) {
          throw new Error('Item não encontrado');
        }

        if (item.status === 'new') {
          // Cria novo gasto
          const { error: insertError } = await supabase
            .from('expenses')
            .insert({
              description: item.description,
              amount: item.amount,
              date: item.date,
              store_id: store.id,
            });

          if (insertError) {
            // Ignora erros de constraint única
            const errorCode = insertError.code || '';
            if (errorCode !== '23505' && !insertError.message?.includes('duplicate')) {
              throw insertError;
            }
          }
        } else if (item.status === 'duplicate' || item.status === 'similar') {
          // Atualiza gasto existente
          if (!item.existingExpenseId) {
            throw new Error('ID do gasto não encontrado');
          }
          
          const { data: updatedData, error: updateError } = await supabase
            .from('expenses')
            .update({
              description: item.description,
              amount: item.amount,
              date: item.date,
            })
            .eq('id', item.existingExpenseId)
            .eq('store_id', store.id)
            .select();

          if (updateError) {
            throw updateError;
          }

          if (!updatedData || updatedData.length === 0) {
            throw new Error('Gasto não encontrado para atualizar');
          }
        }
      };

      // Inicia importação em segundo plano
      await startImport('expenses', importItems, importFn);

      // Toast removido - o sistema de progressão mostra o status automaticamente

      // Fecha o modal (status fica no indicador flutuante)
      handleClose();
      
      // A invalidação será feita pelo ImportContext quando a importação terminar,
      // mas também invalidamos aqui para garantir atualização imediata
      if (store?.id) {
        queryClient.invalidateQueries({ queryKey: ['expenses', store.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      // Chama onImportComplete para fluxos que precisem fazer algo extra
      onImportComplete?.();
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
          <DialogTitle>Importar Gastos via CSV</DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV com seus gastos. O formato esperado: description, amount, date.
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
                  Preview: {importData.length} gasto(s) encontrado(s)
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
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importData.map((item, index) => {
                        // Filtra apenas erros relacionados a data para mostrar na coluna de status
                        const dateErrors = item.errors?.filter(err => err.includes('Data') || err.includes('data')) || [];
                        const otherErrors = item.errors?.filter(err => !err.includes('Data') && !err.includes('data')) || [];
                        const hasDateError = dateErrors.length > 0;
                        const hasOtherErrors = otherErrors.length > 0;
                        
                        return (
                        <TableRow key={index}>
                          <TableCell>
                            {hasDateError ? (
                              <div className="flex flex-col gap-1">
                                <span className="text-destructive text-xs">{formatDate(item.date)}</span>
                                <span className="text-destructive text-[10px] opacity-75">(usando hoje)</span>
                              </div>
                            ) : (
                              <span className="text-sm">{formatDate(item.date)}</span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">{item.description}</TableCell>
                          <TableCell className="text-right font-semibold text-destructive">
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell>
                            {hasOtherErrors ? (
                              <div className="flex flex-col gap-1 text-destructive text-xs">
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>{otherErrors.join(', ')}</span>
                                </div>
                              </div>
                            ) : hasDateError ? (
                              <div className="flex flex-col gap-1 text-yellow-600 dark:text-yellow-500 text-xs">
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>{dateErrors[0]}</span>
                                </div>
                              </div>
                            ) : item.status === 'duplicate' ? (
                              <div className="flex flex-col gap-1 text-yellow-600 dark:text-yellow-500 text-xs">
                                <div className="flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  <span>Já Existe</span>
                                </div>
                                {item.existingExpenseDescription && (
                                  <span className="text-[10px] opacity-75">
                                    Gasto: {item.existingExpenseDescription}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>Novo</span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col gap-4">
          {/* Opções para duplicatas */}
          {importData.length > 0 && importData.some(item => item.status === 'duplicate' && (!item.errors || item.errors.length === 0)) && (
            <div className="w-full p-4 bg-secondary/30 rounded-lg space-y-3">
              <Label className="text-sm font-medium">Para gastos duplicados:</Label>
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
                  <span className="text-sm">Ignorar (não importar gastos duplicados)</span>
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
                  <span className="text-sm">Atualizar dados existentes (descrição, valor, data)</span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                {importData.filter(item => item.status === 'duplicate' && (!item.errors || item.errors.length === 0)).length} gasto(s) com dados idênticos encontrado(s).
              </p>
            </div>
          )}

          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={importData.length === 0}
              className="gradient-primary flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              {duplicateAction === 'ignore' 
                ? `Importar ${importData.filter(item => item.status === 'new' && (!item.errors || item.errors.length === 0)).length} novo(s)`
                : `Importar ${importData.filter(item => !item.errors || item.errors.length === 0).length} gasto(s)`
              }
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
