import { AppLayout } from '@/components/AppLayout';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatCard } from '@/components/dashboard/StatCard';
import { ComparativeAreaChart } from '@/components/dashboard/ComparativeAreaChart';
import { RecentActivityFeed } from '@/components/dashboard/RecentActivityFeed';
import { useDashboard } from '@/hooks/useDashboard';
import { DollarSign, Users, AlertTriangle, Wallet, Plus, ShoppingCart, FileText, TrendingDown, Calendar, Settings, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

import { TransactionSheet } from '@/components/financial/TransactionSheet';
import { GlobalImportModal } from '@/components/GlobalImportModal';
import { useState } from 'react';

export default function Dashboard() {
  const [transactionSheetOpen, setTransactionSheetOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('income');
  
  const { 
    kpis, 
    salesHistory, 
    expensesHistory,
    recentActivity, 
    isLoading 
  } = useDashboard();
  
  const navigate = useNavigate();

  const handleLowStockClick = () => {
    navigate('/estoque', { state: { filterLowStock: true } });
  };

  const handleNewTransaction = (type: 'income' | 'expense') => {
    setTransactionType(type);
    setTransactionSheetOpen(true);
  };

  // Calculate profit for the profit card
  const profit = (kpis?.monthlyRevenue || 0) - (expensesHistory?.reduce((acc, curr) => acc + curr.amount, 0) || 0);

  return (
    <AppLayout title="Visão Geral">
      <div className="flex flex-col h-[calc(100vh-100px)] gap-4 overflow-hidden">
        
        <PageHeader 
          title="Centro de Operações" 
          description="Bem-vindo de volta! Aqui está o resumo do seu negócio."
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-1 rounded-full border border-border/50">
              <Calendar className="h-4 w-4" />
              <span>{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8 gap-2 bg-secondary/50 border-border/50 hover:bg-secondary hover:text-primary transition-colors"
              onClick={() => navigate('/minha-loja?tab=dados')}
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only sm:not-sr-only">Configurações</span>
            </Button>
          </div>
        </PageHeader>
        
        {/* Top Row: KPI Cards (Fixed height) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
          {isLoading ? (
            [1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-card border-none shadow-sm rounded-xl p-4 h-24">
                <Skeleton className="h-full w-full" />
              </div>
            ))
          ) : (
            <>
              <div onClick={() => navigate('/financeiro')} className="cursor-pointer transition-transform duration-200 hover:scale-[1.02]">
                <StatCard
                  title="Receita Total"
                  value={kpis.monthlyRevenue}
                  icon={DollarSign}
                  trend="up"
                  trendValue="vs mês anterior"
                  variant="default" // Base44 Revenue (Blue)
                />
              </div>
              
              <div onClick={() => navigate('/financeiro')} className="cursor-pointer transition-transform duration-200 hover:scale-[1.02]">
                <StatCard
                  title="Lucro Líquido"
                  value={profit}
                  icon={Wallet}
                  trend={profit > 0 ? 'up' : 'down'}
                  trendValue="vs mês anterior"
                  variant="emerald" // Base44 Net Profit (Green)
                />
              </div>
              
              <div onClick={() => navigate('/clientes')} className="cursor-pointer transition-transform duration-200 hover:scale-[1.02]">
                <StatCard
                  title="Clientes Ativos"
                  value={kpis.activeCustomers}
                  icon={Users}
                  trend="neutral"
                  variant="teal" // Base44 Customers (Teal)
                  isCurrency={false}
                />
              </div>

              <div onClick={handleLowStockClick} className="cursor-pointer transition-transform duration-200 hover:scale-[1.02]">
                <StatCard
                  title="Estoque Baixo"
                  value={kpis.lowStockCount}
                  icon={AlertTriangle}
                  trend={kpis.lowStockCount > 0 ? 'down' : 'neutral'}
                  trendValue="Requer atenção"
                  variant="rose" // Base44 Low Stock (Rose)
                  isCurrency={false}
                />
              </div>
            </>
          )}
        </div>

        {/* Middle Row: Main Content (Fills remaining space) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-10 gap-4 min-h-0">
          {/* Chart (70%) */}
          <div className="lg:col-span-7 h-full min-h-0">
            <ComparativeAreaChart 
              salesData={salesHistory} 
              expensesData={expensesHistory}
              isLoading={isLoading} 
            />
          </div>
          
          {/* Feed (30%) */}
          <div className="lg:col-span-3 h-full min-h-0">
            <RecentActivityFeed 
              activities={recentActivity} 
              isLoading={isLoading} 
            />
          </div>
        </div>

        {/* Bottom Row: Quick Actions (Fixed height) */}
        <div className="flex-shrink-0 grid grid-cols-4 gap-4 py-2">
          <Button 
            size="lg" 
            className="h-14 text-base font-medium bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-900/20 text-white dark:bg-emerald-600 dark:hover:bg-emerald-700"
            onClick={() => handleNewTransaction('income')} 
          >
            <ShoppingCart className="mr-2 h-5 w-5" />
            Nova Venda
          </Button>
          
          <Button 
            size="lg" 
            variant="outline"
            className="h-14 text-base font-medium bg-card border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:bg-card dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/10"
            onClick={() => handleNewTransaction('expense')}
          >
            <TrendingDown className="mr-2 h-5 w-5" />
            Novo Gasto
          </Button>
          
          <Button 
            size="lg" 
            variant="outline"
            className="h-14 text-base font-medium bg-card border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-primary dark:bg-card dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={() => navigate('/catalogos')}
          >
            <FileText className="mr-2 h-5 w-5" />
            Ver Catálogo
          </Button>

          <GlobalImportModal 
            trigger={
              <Button 
                size="lg" 
                variant="outline"
                className="h-14 text-base font-medium bg-card border-blue-200 text-blue-600 hover:bg-blue-50 hover:border-blue-300 dark:bg-card dark:border-blue-900/50 dark:text-blue-400 dark:hover:bg-blue-900/10 w-full"
              >
                <Download className="mr-2 h-5 w-5" />
                Importar
              </Button>
            } 
          />
        </div>

        <TransactionSheet 
          open={transactionSheetOpen} 
          onOpenChange={setTransactionSheetOpen} 
          defaultType={transactionType}
        />

      </div>
    </AppLayout>
  );
}
