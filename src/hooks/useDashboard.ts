import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays, format, startOfDay, endOfDay } from 'date-fns';

export interface DashboardStats {
  totalInvested: number;
  expectedRevenue: number;
  projectedProfit: number;
  roi: number;
}

export interface SalesData {
  date: string;
  sales: number;
  profit: number;
}

export interface CategorySalesData {
  name: string;
  value: number;
}

export function useDashboard() {
  const { user } = useAuth();

  // Fetch main stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', 'stats', user?.id],
    queryFn: async (): Promise<DashboardStats> => {
      if (!user) return { totalInvested: 0, expectedRevenue: 0, projectedProfit: 0, roi: 0 };
      
      const { data: products, error } = await supabase
        .from('products')
        .select('cost_price, selling_price, quantity')
        .eq('user_id', user.id);

      if (error) throw error;

      const totalInvested = (products || []).reduce(
        (sum, p) => sum + (Number(p.cost_price) * p.quantity),
        0
      );
      const expectedRevenue = (products || []).reduce(
        (sum, p) => sum + (Number(p.selling_price) * p.quantity),
        0
      );
      const projectedProfit = expectedRevenue - totalInvested;
      const roi = totalInvested > 0 ? (projectedProfit / totalInvested) * 100 : 0;

      return { totalInvested, expectedRevenue, projectedProfit, roi };
    },
    enabled: !!user,
  });

  // Fetch sales data for charts (last 7 days)
  const { data: salesData = [], isLoading: salesLoading } = useQuery({
    queryKey: ['dashboard', 'sales', user?.id],
    queryFn: async (): Promise<SalesData[]> => {
      if (!user) return [];

      const days = 7;
      const startDate = startOfDay(subDays(new Date(), days - 1));
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('created_at, total_amount, profit')
        .eq('user_id', user.id)
        .eq('type', 'sale')
        .gte('created_at', startDate.toISOString())
        .order('created_at');

      if (error) throw error;

      // Group by day
      const salesByDay: Record<string, SalesData> = {};
      
      for (let i = 0; i < days; i++) {
        const date = format(subDays(new Date(), days - 1 - i), 'dd/MM');
        salesByDay[date] = { date, sales: 0, profit: 0 };
      }

      (transactions || []).forEach(t => {
        const date = format(new Date(t.created_at), 'dd/MM');
        if (salesByDay[date]) {
          salesByDay[date].sales += Number(t.total_amount);
          salesByDay[date].profit += Number(t.profit) || 0;
        }
      });

      return Object.values(salesByDay);
    },
    enabled: !!user,
  });

  // Fetch category sales data
  const { data: categorySales = [], isLoading: categoryLoading } = useQuery({
    queryKey: ['dashboard', 'categories', user?.id],
    queryFn: async (): Promise<CategorySalesData[]> => {
      if (!user) return [];

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('total_amount, products(category_id, categories(name))')
        .eq('user_id', user.id)
        .eq('type', 'sale');

      if (error) throw error;

      // Group by category
      const salesByCategory: Record<string, number> = {};
      
      (transactions || []).forEach(t => {
        const categoryName = (t.products as any)?.categories?.name || 'Sem categoria';
        salesByCategory[categoryName] = (salesByCategory[categoryName] || 0) + Number(t.total_amount);
      });

      return Object.entries(salesByCategory).map(([name, value]) => ({ name, value }));
    },
    enabled: !!user,
  });

  return {
    stats: stats || { totalInvested: 0, expectedRevenue: 0, projectedProfit: 0, roi: 0 },
    salesData,
    categorySales,
    isLoading: statsLoading || salesLoading || categoryLoading,
  };
}
