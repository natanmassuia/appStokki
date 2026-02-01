import { useMemo, useRef, useState } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Upload, FileSpreadsheet, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/hooks/useStore';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { mapSalesHeaders, normalizeHeader } from '@/utils/csvHeaderMapper';

interface SalesImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: Array<{ id: string; name: string }>;
  customers: Array<{ id: string; name: string }>;
}

interface ImportSale {
  date: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  unitPrice: number;
  customerName: string;
  productId: string | null;
  customerId: string | null;
  productMatched: boolean;
  customerMatched: boolean;
  errors: string[];
}

const getTodayLocalDate = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function SalesImportModal({ open, onOpenChange, products, customers }: SalesImportModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [importData, setImportData] = useState<ImportSale[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { store } = useStore();
  const queryClient = useQueryClient();

  const normalizedProducts = useMemo(() => {
    return products.map(product => ({
      ...product,
      normalizedName: normalizeHeader(product.name),
    }));
  }, [products]);

  const normalizedCustomers = useMemo(() => {
    return customers.map(customer => ({
      ...customer,
      normalizedName: normalizeHeader(customer.name),
    }));
  }, [customers]);

  const handleClose = () => {
    setImportData([]);
    setIsProcessing(false);
    setIsSaving(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onOpenChange(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
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
      dynamicTyping: false,
      complete: (results) => {
        const headers = (results.meta.fields || []).filter(Boolean) as string[];
        const mapping = mapSalesHeaders(headers);
        const parsed = parseCSVData(results.data as any[], mapping);
        setImportData(parsed);
        setIsProcessing(false);
      },
      error: () => {
        setIsProcessing(false);
        toast({
          title: 'Erro ao processar CSV',
          description: 'Não foi possível ler o arquivo. Verifique o formato.',
          variant: 'destructive',
        });
      },
    });
  };

  const parseStrictDate = (rawValue: any): Date | null => {
    if (!rawValue) return null;
    const dateStr = String(rawValue).trim();

    if (/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4}$/.test(dateStr)) {
      const parts = dateStr.split(/[\/\-\.]/);
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      let year = parseInt(parts[2], 10);
      if (year < 100) {
        year = year < 50 ? 2000 + year : 1900 + year;
      }
      const date = new Date(year, month, day, 12, 0, 0);
      if (!isNaN(date.getTime()) && date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
        return date;
      }
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const date = new Date(`${dateStr}T12:00:00`);
      if (!isNaN(date.getTime())) {
        const parts = dateStr.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
          return date;
        }
      }
    }

    return null;
  };

  const parseNumber = (rawValue: any): number => {
    let value = String(rawValue ?? '').trim();
    if (!value) return NaN;

    value = value.replace(/R\$\s*/g, '').trim();
    value = value.replace(/\s/g, '');

    const hasComma = value.includes(',');
    const hasDot = value.includes('.');

    if (hasComma && hasDot) {
      value = value.replace(/\./g, '').replace(',', '.');
    } else if (hasComma && !hasDot) {
      value = value.replace(',', '.');
    } else if (!hasComma && hasDot) {
      const dotIndex = value.lastIndexOf('.');
      const afterDot = value.substring(dotIndex + 1);
      if (afterDot.length > 2) {
        value = value.replace(/\./g, '');
      }
    }

    value = value.replace(/[^\d.-]/g, '');
    return parseFloat(value);
  };

  const parseCSVData = (data: any[], headerMapping: Record<string, string>): ImportSale[] => {
    const normalizedMapping = Object.fromEntries(
      Object.entries(headerMapping).map(([key, value]) => [key, value?.toString() || ''])
    );

    const getValue = (row: Record<string, any>, field: string, aliases: string[]): string => {
      const mapped = normalizedMapping[field];
      if (mapped && row[mapped] !== undefined && row[mapped] !== null) {
        return String(row[mapped]);
      }

      const rowKeys = Object.keys(row);
      for (const alias of aliases) {
        const normalizedAlias = normalizeHeader(alias);
        const matchKey = rowKeys.find(key => normalizeHeader(key) === normalizedAlias || normalizeHeader(key).includes(normalizedAlias));
        if (matchKey && row[matchKey] !== undefined && row[matchKey] !== null) {
          return String(row[matchKey]);
        }
      }
      return '';
    };

    return data.map((row) => {
      const errors: string[] = [];
      const productRaw = getValue(row, 'product', ['produto', 'item', 'mercadoria', 'nome']);
      const quantityRaw = getValue(row, 'quantity', ['qtd', 'quantidade', 'unidades']);
      const totalRaw = getValue(row, 'total', ['total', 'valor', 'preco', 'venda']);
      const dateRaw = getValue(row, 'date', ['data', 'dia', 'date', 'criado em']);
      const customerRaw = getValue(row, 'customer', ['cliente', 'comprador', 'nome cliente']);

      const productName = productRaw.trim();
      const customerName = customerRaw.trim();

      const quantity = parseNumber(quantityRaw);
      const totalAmount = parseNumber(totalRaw);

      if (!productName) {
        errors.push('Produto vazio');
      }

      if (!Number.isFinite(quantity) || quantity <= 0) {
        errors.push('Quantidade inválida');
      } else if (!Number.isInteger(quantity)) {
        errors.push('Quantidade deve ser inteira');
      }

      if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
        errors.push('Valor total inválido');
      }

      const parsedDate = parseStrictDate(dateRaw);
      let date = getTodayLocalDate();
      if (parsedDate) {
        const finalYear = parsedDate.getFullYear();
        const finalMonth = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const finalDay = String(parsedDate.getDate()).padStart(2, '0');
        date = `${finalYear}-${finalMonth}-${finalDay}`;
      } else if (String(dateRaw || '').trim()) {
        errors.push('Data inválida - usando data de hoje');
      } else {
        errors.push('Data vazia - usando data de hoje');
      }

      const normalizedProductName = normalizeHeader(productName);
      const matchedProduct = normalizedProducts.find(product => product.normalizedName === normalizedProductName);

      const normalizedCustomerName = normalizeHeader(customerName);
      const matchedCustomer = normalizedCustomers.find(customer => customer.normalizedName === normalizedCustomerName);

      const unitPrice = Number.isFinite(quantity) && quantity > 0 && Number.isFinite(totalAmount)
        ? totalAmount / quantity
        : 0;
      if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
        errors.push('Valor unitário inválido');
      }

      return {
        date,
        productName: productName || 'Produto não informado',
        quantity: Number.isFinite(quantity) ? quantity : 0,
        totalAmount: Number.isFinite(totalAmount) ? totalAmount : 0,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        customerName,
        productId: matchedProduct ? matchedProduct.id : null,
        customerId: matchedCustomer ? matchedCustomer.id : null,
        productMatched: !!matchedProduct,
        customerMatched: !!matchedCustomer,
        errors,
      };
    }).filter(item => item.productName);
  };

  const validItems = useMemo(() => importData.filter(item => item.errors.length === 0), [importData]);
  const linkedProductsCount = useMemo(() => validItems.filter(item => item.productId).length, [validItems]);

  const handleImport = async () => {
    if (!store) {
      toast({
        title: 'Loja não encontrada',
        variant: 'destructive',
      });
      return;
    }

    if (validItems.length === 0) {
      toast({
        title: 'Nenhuma venda válida',
        description: 'Revise os dados do CSV antes de importar.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payloads = validItems.map(item => ({
        store_id: store.id,
        type: 'sale',
        total_amount: item.totalAmount,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        created_at: `${item.date}T12:00:00`,
        product_id: item.productId,
        customer_id: item.customerId,
        product_name: item.productName,
      }));

      const chunkSize = 500;
      for (let i = 0; i < payloads.length; i += chunkSize) {
        const chunk = payloads.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('transactions')
          .insert(chunk);
        if (error) {
          throw error;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['transactions', store?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      toast({
        title: 'Importação concluída!',
        description: `${validItems.length} vendas importadas. ${linkedProductsCount} produtos vinculados com sucesso.`,
      });

      handleClose();
    } catch (error: any) {
      const detailedMessage = [
        error?.message,
        error?.details,
        error?.hint,
      ].filter(Boolean).join(' | ');
      toast({
        title: 'Erro ao importar vendas',
        description: detailedMessage || 'Não foi possível importar as vendas.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="glass-card max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Histórico de Vendas (CSV)</DialogTitle>
          <DialogDescription>
            Faça upload de um CSV com Data, Produto, Quantidade, Valor Total e Cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {importData.length === 0 && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
              }`}
            >
              {isProcessing ? (
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Processando arquivo...</p>
                </div>
              ) : (
                <>
                  <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium mb-2">Arraste e solte seu arquivo CSV aqui</p>
                  <p className="text-sm text-muted-foreground mb-4">ou</p>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-2" />
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

          {importData.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Preview: {importData.length} venda(s) encontrada(s) — {validItems.length} válida(s)
                </p>
                <Button variant="outline" size="sm" onClick={() => setImportData([])}>
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <div className="max-h-[420px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {importData.map((item, index) => {
                        const hasErrors = item.errors.length > 0;
                        return (
                          <TableRow key={index}>
                            <TableCell>{formatDate(item.date)}</TableCell>
                            <TableCell className="font-medium">{item.productName}</TableCell>
                            <TableCell>{item.customerName || '-'}</TableCell>
                            <TableCell className="text-right">{item.quantity}</TableCell>
                            <TableCell className="text-right font-semibold text-destructive">
                              {formatCurrency(item.totalAmount)}
                            </TableCell>
                            <TableCell>
                              {hasErrors ? (
                                <div className="flex items-center gap-2 text-destructive text-xs">
                                  <AlertCircle className="h-4 w-4" />
                                  <span>{item.errors[0]}</span>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1 text-xs">
                                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                                    <CheckCircle2 className="h-4 w-4" />
                                    <span>{item.productMatched ? 'Produto vinculado' : 'Produto não encontrado'}</span>
                                  </div>
                                  {item.customerName && (
                                    <span className="text-muted-foreground">
                                      {item.customerMatched ? 'Cliente vinculado' : 'Cliente não encontrado'}
                                    </span>
                                  )}
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

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            className="gradient-primary"
            disabled={isSaving || importData.length === 0}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Importando...
              </>
            ) : (
              'Importar Vendas'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
