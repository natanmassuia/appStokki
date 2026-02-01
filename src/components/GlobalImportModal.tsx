import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileSpreadsheet, Check, Loader2, Trash2, X, Package, BarChart3, Users, Truck } from 'lucide-react';
import { useUniversalImport } from '@/hooks/useUniversalImport';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface GlobalImportModalProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GlobalImportModal({ trigger, open, onOpenChange }: GlobalImportModalProps) {
  const {
    isProcessing,
    previewData,
    fileInputRef,
    handleFileUpload,
    resetImport,
    confirmImport,
    hasData
  } = useUniversalImport();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="glass-card max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            Importação Universal
          </DialogTitle>
          <DialogDescription>
            Importe produtos, vendas, despesas, clientes e fornecedores de uma só vez via Excel.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-[300px]">
          {!hasData ? (
            <div 
              className="flex-1 border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors rounded-xl flex flex-col items-center justify-center p-8 bg-background/50 cursor-pointer m-4"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <UploadCloud className="h-8 w-8 text-primary" />
              </div>
              <p className="font-semibold text-lg">Clique para fazer upload</p>
              <p className="text-sm text-muted-foreground mt-1">Suporta arquivos .xlsx</p>
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx"
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-4 p-4 overflow-hidden">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 shrink-0">
                {previewData.products.length > 0 && (
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-center">
                    <Package className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <p className="font-bold">{previewData.products.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Produtos</p>
                  </div>
                )}
                {previewData.sales.length > 0 && (
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20 text-center">
                    <BarChart3 className="h-4 w-4 mx-auto mb-1 text-green-500" />
                    <p className="font-bold">{previewData.sales.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Vendas</p>
                  </div>
                )}
                {previewData.expenses.length > 0 && (
                  <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-center">
                    <FileSpreadsheet className="h-4 w-4 mx-auto mb-1 text-red-500" />
                    <p className="font-bold">{previewData.expenses.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Despesas</p>
                  </div>
                )}
                {previewData.customers.length > 0 && (
                  <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 text-center">
                    <Users className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                    <p className="font-bold">{previewData.customers.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Clientes</p>
                  </div>
                )}
                {previewData.suppliers.length > 0 && (
                  <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-center">
                    <Truck className="h-4 w-4 mx-auto mb-1 text-amber-500" />
                    <p className="font-bold">{previewData.suppliers.length}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">Fornecedores</p>
                  </div>
                )}
              </div>

              {/* Data Preview Tabs */}
              <Tabs defaultValue="all" className="flex-1 flex flex-col min-h-0">
                <TabsList className="w-full justify-start overflow-x-auto shrink-0">
                  <TabsTrigger value="all">Visão Geral</TabsTrigger>
                  {previewData.products.length > 0 && <TabsTrigger value="products">Produtos</TabsTrigger>}
                  {previewData.sales.length > 0 && <TabsTrigger value="sales">Vendas</TabsTrigger>}
                  {previewData.expenses.length > 0 && <TabsTrigger value="expenses">Despesas</TabsTrigger>}
                  {previewData.customers.length > 0 && <TabsTrigger value="customers">Clientes</TabsTrigger>}
                  {previewData.suppliers.length > 0 && <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>}
                </TabsList>

                <div className="flex-1 border rounded-lg mt-2 overflow-hidden bg-background/50">
                  <ScrollArea className="h-full">
                    {/* Simplified All View or specific tabs */}
                    {['products', 'sales', 'expenses', 'customers', 'suppliers'].map(key => {
                      const data = previewData[key as keyof typeof previewData];
                      if (!data || data.length === 0) return null;

                      return (
                        <TabsContent key={key} value={key} className="m-0 h-full">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {Object.keys(data[0]).slice(0, 5).map(h => (
                                  <TableHead key={h} className="text-xs h-8">{h}</TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {data.slice(0, 20).map((row: any, i: number) => (
                                <TableRow key={i} className="h-8">
                                  {Object.values(row).slice(0, 5).map((v: any, j: number) => (
                                    <TableCell key={j} className="text-xs py-1">{String(v)}</TableCell>
                                  ))}
                                </TableRow>
                              ))}
                              {data.length > 20 && (
                                <TableRow>
                                  <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-2">
                                    ...e mais {data.length - 20} registros
                                  </TableCell>
                                </TableRow>
                              )}
                            </TableBody>
                          </Table>
                        </TabsContent>
                      );
                    })}

                    <TabsContent value="all" className="m-0 p-4 space-y-4">
                      <div className="text-center text-muted-foreground py-8">
                        <p>Selecione uma aba acima para ver os detalhes dos dados.</p>
                        <p className="text-sm mt-2">
                          Detectamos automaticamente o tipo de dado baseado no nome das abas ou colunas.
                        </p>
                      </div>
                    </TabsContent>
                  </ScrollArea>
                </div>
              </Tabs>
              
              <div className="flex justify-between items-center shrink-0 pt-2">
                 <Button variant="ghost" onClick={resetImport} className="text-destructive hover:bg-destructive/10">
                   <Trash2 className="h-4 w-4 mr-2" />
                   Descartar
                 </Button>
                 
                 <Button onClick={confirmImport} disabled={isProcessing} className="gradient-primary">
                   {isProcessing ? (
                     <>
                       <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                       Importando...
                     </>
                   ) : (
                     <>
                       <Check className="h-4 w-4 mr-2" />
                       Confirmar Importação
                     </>
                   )}
                 </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
