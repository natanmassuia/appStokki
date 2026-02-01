import { useState, useRef } from 'react';
import Papa from 'papaparse';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, Download, FileText, X, CheckCircle2, AlertCircle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useImport } from '@/contexts/ImportContext';

interface ImportCustomer {
  name: string;
  phone: string;
  errors?: string[];
  status?: 'new' | 'duplicate';
  existingCustomerId?: string;
  existingCustomerName?: string;
  existingCustomerPhone?: string;
}

interface CustomersImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete: () => void;
  existingCustomers: Array<{ id: string; name: string; phone: string }>;
  createCustomer: (customer: { name: string; phone: string }) => Promise<any>;
  updateCustomer: (id: string, customer: { name: string; phone: string }) => Promise<any>;
}

// Função para normalizar telefone (remove caracteres não numéricos)
const normalizePhone = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
};

// Função para detectar duplicados
const detectDuplicates = (
  parsedData: ImportCustomer[],
  existingCustomers: Array<{ id: string; name: string; phone: string }>
): ImportCustomer[] => {
  return parsedData.map(item => {
    const normalizedPhone = normalizePhone(item.phone);
    
    if (!normalizedPhone || normalizedPhone.length < 10) {
      return {
        ...item,
        errors: [...(item.errors || []), 'Telefone inválido'],
        status: undefined,
      };
    }

    // Busca duplicado por telefone (normalizado)
    const duplicate = existingCustomers.find(existing => {
      const existingPhone = normalizePhone(existing.phone);
      return existingPhone === normalizedPhone && normalizedPhone !== '';
    });

    if (duplicate) {
      return {
        ...item,
        status: 'duplicate' as const,
        existingCustomerId: duplicate.id,
        existingCustomerName: duplicate.name,
        existingCustomerPhone: duplicate.phone,
      };
    }

    return {
      ...item,
      status: 'new' as const,
    };
  });
};

// Função para parsear VCF (vCard)
const parseVCF = (content: string): ImportCustomer[] => {
  const contacts: ImportCustomer[] = [];
  const lines = content.split(/\r?\n/);
  
  let currentContact: Partial<ImportCustomer> = {};
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('BEGIN:VCARD')) {
      currentContact = {};
    } else if (line.startsWith('END:VCARD')) {
      if (currentContact.name || currentContact.phone) {
        contacts.push({
          name: currentContact.name || 'Sem Nome',
          phone: currentContact.phone || '',
          errors: currentContact.errors || [],
        });
      }
      currentContact = {};
    } else if (line.startsWith('FN:') || line.startsWith('N:')) {
      // Nome completo (FN) ou Nome estruturado (N)
      const name = line.substring(line.indexOf(':') + 1).replace(/\\,/g, ',').replace(/\\;/g, ';');
      if (name && name.trim()) {
        currentContact.name = name.trim();
      }
    } else if (line.startsWith('TEL')) {
      // Telefone (pode ter tipos: CELL, WORK, HOME, etc)
      const phoneMatch = line.match(/TEL[^:]*:(.+)/);
      if (phoneMatch) {
        const phone = phoneMatch[1].replace(/\D/g, '');
        if (phone && phone.length >= 10) {
          // Se não começa com código do país, assume Brasil (55)
          let normalized = phone;
          if (phone.length === 10 || phone.length === 11) {
            // DDD + número (10 ou 11 dígitos)
            if (!phone.startsWith('55')) {
              normalized = '55' + phone;
            }
          }
          currentContact.phone = normalized;
        }
      }
    }
  }
  
  // Adiciona último contato se houver
  if (currentContact.name || currentContact.phone) {
    contacts.push({
      name: currentContact.name || 'Sem Nome',
      phone: currentContact.phone || '',
      errors: currentContact.errors || [],
    });
  }
  
  return contacts.filter(c => c.phone && normalizePhone(c.phone).length >= 10);
};

// Função para mapear headers do CSV (similar ao csvHeaderMapper)
const mapCustomerHeaders = (headers: string[]): { name: string | null; phone: string | null } => {
  const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
  
  let nameIndex: number | null = null;
  let phoneIndex: number | null = null;
  
  // Mapeia nome
  const nameAliases = ['name', 'nome', 'contato', 'pessoa', 'cliente', 'contact', 'person'];
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const header = normalizedHeaders[i];
    if (nameAliases.some(alias => header.includes(alias))) {
      nameIndex = i;
      break;
    }
  }
  
  // Mapeia telefone (prioridade: phone, telefone, numero, celular, mobile, whatsapp)
  const phoneAliases = ['phone', 'telefone', 'numero', 'celular', 'mobile', 'whatsapp', 'tel', 'fone'];
  for (let i = 0; i < normalizedHeaders.length; i++) {
    const header = normalizedHeaders[i];
    if (phoneAliases.some(alias => header.includes(alias))) {
      phoneIndex = i;
      break;
    }
  }
  
  return {
    name: nameIndex !== null ? headers[nameIndex] : null,
    phone: phoneIndex !== null ? headers[phoneIndex] : null,
  };
};

export function CustomersImportModal({
  open,
  onOpenChange,
  onImportComplete,
  existingCustomers,
  createCustomer,
  updateCustomer,
}: CustomersImportModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [importData, setImportData] = useState<ImportCustomer[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [duplicateAction, setDuplicateAction] = useState<'ignore' | 'update'>('update');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { startImport } = useImport();

  const downloadTemplate = () => {
    const headers = ['name', 'phone'];
    const sample = [
      ['João Silva', '5516999887766'],
      ['Maria Santos', '5511988776655'],
      ['Pedro Oliveira', '5511877665544'],
    ];
    
    const csv = [headers, ...sample].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_importacao_clientes.csv');
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

  const handleFile = async (file: File) => {
    setIsProcessing(true);
    setImportData([]);

    try {
      const isVCF = file.name.endsWith('.vcf') || file.type === 'text/vcard' || file.type === 'text/x-vcard';
      const isCSV = file.name.endsWith('.csv') || file.type === 'text/csv';

      if (!isVCF && !isCSV) {
        toast({
          title: 'Arquivo inválido',
          description: 'Por favor, selecione um arquivo VCF ou CSV.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      const text = await file.text();
      let parsed: ImportCustomer[] = [];

      if (isVCF) {
        // Parse VCF
        parsed = parseVCF(text);
      } else {
        // Parse CSV (síncrono com Promise)
        const parseResult = await new Promise<ImportCustomer[]>((resolve, reject) => {
          Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: false, // CRUCIAL: Mantém tudo como string para parsing manual
            complete: (results) => {
              try {
                const rows = results.data as any[];
                const headers = results.meta.fields || [];
                
                
                // Mapeia headers
                const mappedHeaders = mapCustomerHeaders(headers);
                
                if (!mappedHeaders.name && !mappedHeaders.phone) {
                  reject(new Error('Não foi possível identificar as colunas "nome" e "telefone" na planilha.'));
                  return;
                }
                
                const parsedRows = rows
                  .map((row, index) => {
                    const name = mappedHeaders.name ? (row[mappedHeaders.name] || '').trim() : '';
                    const phoneRaw = mappedHeaders.phone ? (row[mappedHeaders.phone] || '').trim() : '';
                    
                    // Normaliza telefone (remove caracteres não numéricos)
                    let phone = phoneRaw.replace(/\D/g, '');
                    
                    // Se tem 10 ou 11 dígitos e não começa com código do país, adiciona 55 (Brasil)
                    if (phone.length === 10 || phone.length === 11) {
                      if (!phone.startsWith('55')) {
                        phone = '55' + phone;
                      }
                    }
                    
                    // Se tem código do país mas não tem 55, tenta normalizar
                    if (phone.length > 11 && !phone.startsWith('55')) {
                      // Mantém como está (pode ser outro país)
                    }
                    
                    if (!name && !phone) {
                      return null;
                    }
                    
                    return {
                      name: name || 'Sem Nome',
                      phone: phone || '',
                      errors: [] as string[],
                    };
                  })
                  .filter((item): item is ImportCustomer => item !== null && item.phone.length >= 10);
                
                resolve(parsedRows);
              } catch (error) {
                reject(error);
              }
            },
            error: (error) => {
              reject(new Error(error.message || 'Não foi possível ler o arquivo CSV.'));
            },
          });
        });
        
        parsed = parseResult;
      }

      if (parsed.length === 0) {
        toast({
          title: 'Nenhum contato encontrado',
          description: 'O arquivo não contém contatos válidos.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      // Valida dados
      const validCustomers = parsed.filter(item => {
        const errors: string[] = [];
        
        if (!item.name || item.name.trim().length < 2) {
          errors.push('Nome muito curto ou vazio');
        }
        
        const normalizedPhone = normalizePhone(item.phone);
        if (!normalizedPhone || normalizedPhone.length < 10) {
          errors.push('Telefone inválido');
        }
        
        item.errors = errors.length > 0 ? errors : undefined;
        return errors.length === 0;
      });

      if (validCustomers.length === 0) {
        toast({
          title: 'Nenhum contato válido',
          description: 'Todos os contatos têm erros. Verifique o arquivo.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      // Detecta duplicados
      const customersWithStatus = detectDuplicates(validCustomers, existingCustomers);
      setImportData(customersWithStatus);

      // Toast removido - o sistema de progressão mostra o status automaticamente
    } catch (error: any) {
      // Erro ao processar arquivo - já tratado no toast
      toast({
        title: 'Erro ao processar arquivo',
        description: error.message || 'Não foi possível processar o arquivo.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (importData.length === 0) {
      toast({
        title: 'Nenhum dado para importar',
        description: 'Não há contatos válidos para importar.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const newItems = importData.filter(item => item.status === 'new' && (!item.errors || item.errors.length === 0));
      const duplicateItems = duplicateAction === 'update' 
        ? importData.filter(item => item.status === 'duplicate')
        : [];

      if (newItems.length === 0 && duplicateItems.length === 0) {
        toast({
          title: 'Nenhum contato para importar',
          description: 'Todos os contatos têm erros ou já estão cadastrados.',
          variant: 'destructive',
        });
        return;
      }

      // Prepara todos os itens para importação
      const allItemsToImport = [...newItems, ...duplicateItems];

      // Prepara função de importação para cada item
      const importItems = allItemsToImport.map(item => ({
        id: item.name + '_' + item.phone,
        name: item.name,
      }));

      // Função que será chamada para cada item
      const importFn = async (importItem: { id: string; name: string }) => {
        const item = allItemsToImport.find(i => 
          (i.name + '_' + i.phone) === importItem.id
        );
        
        if (!item) {
          throw new Error('Item não encontrado');
        }

        if (item.status === 'new') {
          // Cria novo cliente
          await createCustomer({
            name: item.name,
            phone: item.phone,
          });
        } else if (item.status === 'duplicate') {
          // Atualiza cliente existente
          if (!item.existingCustomerId) {
            throw new Error('ID do cliente não encontrado');
          }
          await updateCustomer(item.existingCustomerId, {
            name: item.name,
            phone: item.phone,
          });
        }
      };

      // Inicia importação em segundo plano
      await startImport('customers', importItems, importFn);

      // Toast removido - o sistema de progressão mostra o status automaticamente

      // Fecha o modal (status fica no indicador flutuante)
      onOpenChange(false);
      setImportData([]);
      // Não chama onImportComplete aqui para evitar recarregar a página
      // A atualização será feita automaticamente pelo ImportContext quando terminar
    } catch (error: any) {
      // Erro na importação - já tratado no toast
      toast({
        title: 'Erro ao iniciar importação',
        description: error.message || 'Não foi possível iniciar a importação.',
        variant: 'destructive',
      });
    }
  };

  const newCount = importData.filter(c => c.status === 'new' && (!c.errors || c.errors.length === 0)).length;
  const duplicateCount = importData.filter(c => c.status === 'duplicate').length;
  const errorCount = importData.filter(c => c.errors && c.errors.length > 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Importar Clientes
          </DialogTitle>
          <DialogDescription>
            Importe contatos de arquivos VCF (vCard) ou CSV. Suporta diferentes formatos de telefone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {importData.length === 0 ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? 'border-primary bg-primary/5' : 'border-border'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".vcf,.csv,text/vcard,text/csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {isProcessing ? (
                <div className="space-y-4">
                  <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
                  <p className="text-sm text-muted-foreground">Processando arquivo...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                  <div>
                    <p className="font-medium">Arraste um arquivo aqui ou clique para selecionar</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Formatos suportados: VCF (vCard) ou CSV
                    </p>
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isProcessing}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Selecionar Arquivo
                    </Button>
                    <Button
                      variant="outline"
                      onClick={downloadTemplate}
                      disabled={isProcessing}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Modelo CSV
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Estatísticas */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600 dark:text-green-400">
                    <CheckCircle2 className="inline h-4 w-4 mr-1" />
                    {newCount} novo(s)
                  </span>
                  <span className="text-yellow-600 dark:text-yellow-400">
                    <AlertCircle className="inline h-4 w-4 mr-1" />
                    {duplicateCount} duplicado(s)
                  </span>
                  {errorCount > 0 && (
                    <span className="text-destructive">
                      <X className="inline h-4 w-4 mr-1" />
                      {errorCount} com erro(s)
                    </span>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setImportData([]);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Limpar
                </Button>
              </div>

              {/* Opções de duplicados */}
              {duplicateCount > 0 && (
                <div className="p-4 border rounded-lg space-y-2">
                  <Label className="text-sm font-semibold">
                    Ação para {duplicateCount} cliente(s) duplicado(s):
                  </Label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="duplicateAction"
                        value="ignore"
                        checked={duplicateAction === 'ignore'}
                        onChange={(e) => setDuplicateAction(e.target.value as 'ignore' | 'update')}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Ignorar (não importar clientes duplicados)</span>
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
                      <span className="text-sm">Sobrescrever (atualizar clientes existentes)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Preview */}
              <ScrollArea className="flex-1 border rounded-lg" style={{ height: '400px' }}>
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="bg-background">Status</TableHead>
                      <TableHead className="bg-background">Nome</TableHead>
                      <TableHead className="bg-background">Telefone</TableHead>
                      <TableHead className="bg-background">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {item.errors && item.errors.length > 0 ? (
                            <span className="text-xs text-destructive flex items-center gap-1">
                              <X className="h-3 w-3" />
                              Erro
                            </span>
                          ) : item.status === 'duplicate' ? (
                            <span className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Duplicado
                            </span>
                          ) : (
                            <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Novo
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.phone}</TableCell>
                        <TableCell>
                          {item.status === 'duplicate' && (
                            <span className="text-xs text-muted-foreground">
                              {item.existingCustomerName} ({item.existingCustomerPhone})
                            </span>
                          )}
                          {item.errors && item.errors.length > 0 && (
                            <span className="text-xs text-destructive">
                              {item.errors.join(', ')}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {importData.length > 0 && (
            <Button
              onClick={handleImport}
              disabled={newCount === 0 && duplicateCount === 0}
              className="gradient-primary"
            >
              <Upload className="h-4 w-4 mr-2" />
              Importar {newCount + (duplicateAction === 'update' ? duplicateCount : 0)} Cliente(s)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
