import { AppLayout } from '@/components/AppLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { ProfitChart } from '@/components/dashboard/ProfitChart';
import { CategoryChart } from '@/components/dashboard/CategoryChart';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { useDashboard } from '@/hooks/useDashboard';
import { useTransactions } from '@/hooks/useTransactions';
import { Wallet, TrendingUp, Sparkles, BarChart3, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { stats, salesData, categorySales, isLoading } = useDashboard();
  const { transactions, isLoading: transactionsLoading } = useTransactions(5);

  if (isLoading) {
    return (
      <AppLayout title="Painel Principal">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Painel Principal">
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Investido"
            value={stats.totalInvested}
            icon={Wallet}
            trend="neutral"
          />
          <StatCard
            title="Receita Prevista"
            value={stats.expectedRevenue}
            icon={TrendingUp}
            trend="up"
          />
          <StatCard
            title="Lucro Projetado"
            value={stats.projectedProfit}
            icon={Sparkles}
            trend="up"
          />
          <StatCard
            title="ROI Atual"
            value={stats.roi}
            icon={BarChart3}
            isPercent
            trend={stats.roi > 0 ? 'up' : 'neutral'}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <SalesChart data={salesData} />
          <ProfitChart data={salesData} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CategoryChart data={categorySales} />
          <RecentTransactions transactions={transactions} isLoading={transactionsLoading} />
        </div>
      </div>
    </AppLayout>
  );
}
