import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialOverview } from "@/components/financial/FinancialOverview";
import { FinancialSales } from "@/components/financial/FinancialSales";
import { FinancialExpenses } from "@/components/financial/FinancialExpenses";
import { AppLayout } from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Plus, Download, FileSpreadsheet, Trash2, ShoppingCart } from 'lucide-react';
import { PageHeader } from '@/components/ui/PageHeader';
import { DateRangeFilter, DateRange } from '@/components/financial/DateRangeFilter';
import { TransactionSheet } from '@/components/financial/TransactionSheet';
import { useExpenses } from '@/hooks/useExpenses';
import { useTransactions } from '@/hooks/useTransactions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function FinancialPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const defaultTab = location.state?.tab || 'overview';
  const [currentTab, setCurrentTab] = useState(defaultTab);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateRange>('month');

  // Specific state for sub-components logic (Sales/Expenses)
  // Ideally, these would be managed by context or lifted state, 
  // but for now we render buttons based on active tab to keep "Control Bar" unified.
  
  return (
    <AppLayout title="Financeiro">
      <div className="container mx-auto p-6 space-y-6">
        {/* UNIFIED CONTROL BAR */}
        <PageHeader 
          title="Fluxo de Caixa" 
          description="Central de controle financeiro e relatórios."
        >
           <div className="flex flex-wrap items-center gap-2">
              {/* Global Date Filter (Visible everywhere) */}
              <DateRangeFilter value={dateFilter} onChange={setDateFilter} />

              {/* Contextual Actions based on Tab */}
              {currentTab === 'overview' && (
                 <Button onClick={() => setIsTransactionModalOpen(true)} className="gradient-primary shadow-lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Transação
                 </Button>
              )}

              {currentTab === 'sales' && (
                 <>
                    <Button variant="outline" onClick={() => { /* Trigger Import in Sales Component via Context/Ref if needed, or just keep simple for now */ }}>
                       <FileSpreadsheet className="mr-2 h-4 w-4" /> Importar
                    </Button>
                    <Button onClick={() => navigate('/estoque')} className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg">
                       <ShoppingCart className="mr-2 h-4 w-4" /> Nova Venda
                    </Button>
                 </>
              )}

              {currentTab === 'expenses' && (
                 <>
                    <Button variant="outline">
                       <FileSpreadsheet className="mr-2 h-4 w-4" /> Importar
                    </Button>
                    <Button onClick={() => document.getElementById('add-expense-trigger')?.click()} className="gradient-primary shadow-lg">
                       <Plus className="mr-2 h-4 w-4" /> Adicionar Gasto
                    </Button>
                 </>
              )}
           </div>
        </PageHeader>

        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6 mt-6">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
            <TabsTrigger 
              value="overview" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 font-medium text-muted-foreground data-[state=active]:text-foreground transition-all"
            >
              Visão Geral
            </TabsTrigger>
            <TabsTrigger 
              value="sales" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 font-medium text-muted-foreground data-[state=active]:text-foreground transition-all"
            >
              Vendas
            </TabsTrigger>
            <TabsTrigger 
              value="expenses" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3 font-medium text-muted-foreground data-[state=active]:text-foreground transition-all"
            >
              Gastos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6 space-y-6">
            <FinancialOverview onTabChange={setCurrentTab} dateFilter={dateFilter} />
          </TabsContent>
          
          <TabsContent value="sales" className="mt-6 space-y-6">
            <FinancialSales />
          </TabsContent>
          
          <TabsContent value="expenses" className="mt-6 space-y-6">
            <FinancialExpenses />
          </TabsContent>
        </Tabs>

        <TransactionSheet 
          open={isTransactionModalOpen} 
          onOpenChange={setIsTransactionModalOpen} 
        />
      </div>
    </AppLayout>
  );
}
