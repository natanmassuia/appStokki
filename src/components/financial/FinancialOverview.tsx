import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FinancialCharts } from '@/components/financial/FinancialCharts';
import { RecentActivityFeed } from '@/components/dashboard/RecentActivityFeed';
import { formatCurrency } from '@/lib/format';
import { useDashboard } from '@/hooks/useDashboard';
import { DollarSign, TrendingDown, TrendingUp, ArrowRight, ArrowUp, ArrowDown } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

import { DateRange } from '@/components/financial/DateRangeFilter';

interface FinancialOverviewProps {
  onTabChange: (tab: string) => void;
  dateFilter?: DateRange;
}

export function FinancialOverview({ onTabChange, dateFilter = 'month' }: FinancialOverviewProps) {
  const { kpis, salesHistory, expensesHistory, recentActivity, kpisLoading, historyLoading } = useDashboard(dateFilter);

  const income = kpis?.monthlyRevenue || 0;
  const expenses = kpis?.monthlyExpenses || 0;
  const netFlow = income - expenses;
  const accountsPayable = kpis?.accountsPayable || 0;
  const accountsReceivable = kpis?.accountsReceivable || 0;
  
  // Ratio for the progress bar (Expenses / Income)
  // If income is 0, avoid division by zero. If expenses > income, cap at 100%
  const expenseRatio = income > 0 ? Math.min((expenses / income) * 100, 100) : (expenses > 0 ? 100 : 0);

  if (kpisLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-[350px] bg-secondary/20 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 0. NEW: Accounts Payable/Receivable */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">A Pagar (Hoje/Atrasado)</p>
              <p className="text-2xl font-bold text-rose-600">{formatCurrency(accountsPayable)}</p>
            </div>
            <div className="p-2 bg-rose-100 rounded-full text-rose-600">
              <ArrowDown className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">A Receber (Pendente)</p>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(accountsReceivable)}</p>
            </div>
            <div className="p-2 bg-emerald-100 rounded-full text-emerald-600">
              <ArrowUp className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 1. TOP GRID: Cash Flow & Donuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* COL 1: Cash Flow Summary (The "Wallet" Card) */}
        <div className="base44-card p-6 flex flex-col justify-between relative overflow-hidden group">
          {/* Decorative Background Blur */}
          <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full blur-3xl opacity-20 transition-colors duration-500 ${netFlow >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-bold text-foreground mb-1">Fluxo de Caixa Líquido</h3>
              <p className="text-sm text-muted-foreground">Balanço do mês atual</p>
            </div>
            {netFlow >= 0 ? (
               <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none flex items-center gap-1">
                 <TrendingUp className="h-3 w-3" /> Fluxo Positivo
               </Badge>
            ) : (
               <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none flex items-center gap-1">
                 <TrendingDown className="h-3 w-3" /> Fluxo Negativo
               </Badge>
            )}
          </div>

          <div className="my-8">
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-3 rounded-2xl ${netFlow >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                <DollarSign className="h-8 w-8" />
              </div>
              <div>
                <p className={`text-4xl font-black tracking-tight ${netFlow >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {netFlow >= 0 ? '+' : ''}{formatCurrency(netFlow)}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Income Row */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600">
                  <ArrowUp className="h-3 w-3" />
                </div>
                <span className="font-medium text-muted-foreground">Entradas</span>
              </div>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(income)}</span>
            </div>

            {/* Expense Row */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-rose-500/10 text-rose-600">
                  <ArrowDown className="h-3 w-3" />
                </div>
                <span className="font-medium text-muted-foreground">Saídas</span>
              </div>
              <span className="font-bold text-rose-600 dark:text-rose-400">{formatCurrency(expenses)}</span>
            </div>

            {/* Ratio Bar */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Taxa de Comprometimento</span>
                <span className={`${expenseRatio > 80 ? 'text-rose-600' : 'text-foreground'}`}>
                  {expenseRatio.toFixed(1)}%
                </span>
              </div>
              <Progress value={expenseRatio} className={`h-2 ${expenseRatio > 80 ? 'bg-rose-100' : ''}`} indicatorClassName={expenseRatio > 80 ? 'bg-rose-500' : 'bg-slate-900 dark:bg-slate-400'} />
            </div>
          </div>
        </div>

        {/* COL 2 & 3: Donut Charts (Income & Expense) */}
        <div className="md:col-span-2">
           <FinancialCharts 
             salesData={salesHistory} 
             expensesData={expensesHistory} 
             isLoading={historyLoading} 
           />
        </div>
      </div>

      {/* 2. BOTTOM: Recent Transactions (Wide) */}
      <div className="base44-card p-0 overflow-hidden">
        <div className="p-6 border-b border-border/50 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-foreground">Transações Recentes</h3>
            <p className="text-sm text-muted-foreground">Últimas movimentações financeiras</p>
          </div>
          <button className="text-sm font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
            Ver Extrato Completo <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        
        {/* Reusing RecentActivityFeed Logic but styling it wider */}
        <div className="p-0">
           <RecentActivityFeed activities={recentActivity} isLoading={historyLoading} />
        </div>
      </div>
    </div>
  );
}
