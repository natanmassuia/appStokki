import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/hooks/useStore';
import { subDays, format, startOfDay, endOfDay, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { DateRange } from '@/components/financial/DateRangeFilter';

export interface DashboardKPIs {
  salesToday: number;
  monthlyRevenue: number;
  activeCustomers: number;
  lowStockCount: number;
  monthlyExpenses: number;
  accountsPayable: number;
  accountsReceivable: number;
}

export interface SalesHistoryData {
  date: string;
  amount: number;
}

export interface RecentActivity {
  id: string;
  type: 'sale' | 'expense';
  description: string;
  amount: number;
  date: string;
  customerName?: string;
  productName?: string;
  quantity?: number;
}

export interface LowStockProduct {
  id: string;
  name: string;
  quantity: number;
  image_url?: string;
}

export function useDashboard(dateFilter: DateRange = 'month') {
  const { user } = useAuth();
  const { store } = useStore();

  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case 'week':
        return { start: startOfWeek(now, { weekStartsOn: 0 }), end: endOfWeek(now, { weekStartsOn: 0 }) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'all':
      default:
        // For 'all', we might want a reasonable default or really all.
        // Let's use start of year or a far past date if 'all' means genuinely everything.
        // However, for charts usually we limit.
        // For KPIs like 'Revenue', 'all' means total revenue ever.
        return { start: new Date('2000-01-01'), end: endOfDay(now) };
    }
  };

  const { start: filterStart, end: filterEnd } = getDateRange();

  // Fetch KPIs
  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ['dashboard', 'kpis', store?.id, dateFilter],
    queryFn: async (): Promise<DashboardKPIs> => {
      if (!store) return { 
        salesToday: 0, 
        monthlyRevenue: 0, 
        activeCustomers: 0, 
        lowStockCount: 0,
        monthlyExpenses: 0
      };
      
      const todayStart = startOfDay(new Date());
      const todayEnd = endOfDay(new Date());
      // Uses the selected filter range for "Revenue" and "Expenses"
      
      // Vendas de hoje (Always today for the specific "Sales Today" KPI, or should it respect filter? 
      // Usually "Sales Today" is specifically today. "Revenue" respects filter.)
      const { data: todaySales, error: todayError } = await supabase
        .from('transactions')
        .select('total_amount')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .gte('created_at', todayStart.toISOString())
        .lte('created_at', todayEnd.toISOString());

      if (todayError) throw todayError;

      const salesToday = (todaySales || []).reduce(
        (sum, t) => sum + Number(t.total_amount),
        0
      );

      // Faturamento do Período (Revenue respects filter)
      const { data: periodSales, error: periodError } = await supabase
        .from('transactions')
        .select('total_amount')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .gte('created_at', filterStart.toISOString())
        .lte('created_at', filterEnd.toISOString());

      if (periodError) throw periodError;

      const revenue = (periodSales || []).reduce(
        (sum, t) => sum + Number(t.total_amount),
        0
      );

      // Despesas do Período (Expenses respects filter)
      const { data: periodExpenses, error: periodExpensesError } = await supabase
        .from('expenses')
        .select('amount')
        .eq('store_id', store.id)
        .gte('date', filterStart.toISOString())
        .lte('date', filterEnd.toISOString());

      if (periodExpensesError) throw periodExpensesError;

      const expenses = (periodExpenses || []).reduce(
        (sum, e) => sum + Number(e.amount),
        0
      );

      // Clientes ativos
      const { count: customersCount, error: customersError } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('store_id', store.id);

      if (customersError) throw customersError;

      // Produtos com estoque baixo (< 5)
      const { data: lowStockProducts, error: productsError } = await supabase
        .from('products')
        .select('id')
        .eq('store_id', store.id)
        .lt('quantity', 5);

      if (productsError) throw productsError;

      // Contas a Pagar (Pending Purchases) - Temporarily disabled due to missing columns
      /*
      const { data: pendingPayables, error: payablesError } = await supabase
        .from('transactions')
        .select('amount')
        .eq('store_id', store.id)
        .eq('type', 'purchase')
        .eq('status', 'pending');

      if (payablesError && payablesError.code !== 'PGRST301' && payablesError.status !== 400) {
         console.error('Error fetching payables:', payablesError);
      }
      */
      const accountsPayable = 0; // (pendingPayables || []).reduce((sum, t) => sum + Number(t.amount || 0), 0);

      // Contas a Receber (Pending Sales) - Temporarily disabled due to missing columns
      /*
      const { data: pendingReceivables, error: receivablesError } = await supabase
        .from('transactions')
        .select('total_amount')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .eq('status', 'pending');

      if (receivablesError && receivablesError.code !== 'PGRST301' && receivablesError.status !== 400) {
         console.error('Error fetching receivables:', receivablesError);
      }
      */
      const accountsReceivable = 0; // (pendingReceivables || []).reduce((sum, t) => sum + Number(t.total_amount || 0), 0);

      return {
        salesToday,
        monthlyRevenue: revenue, 
        monthlyExpenses: expenses,
        activeCustomers: customersCount || 0,
        lowStockCount: lowStockProducts?.length || 0,
        accountsPayable,
        accountsReceivable
      };
    },
    enabled: !!store,
  });

  // Fetch sales history (last 30 days OR respecting filter if applicable for charts)
  // For charts, usually we want to see the trend WITHIN the selected period.
  const { data: salesHistory = [], isLoading: historyLoading } = useQuery({
    queryKey: ['dashboard', 'sales-history', store?.id, dateFilter],
    queryFn: async (): Promise<SalesHistoryData[]> => {
      if (!store) return [];

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('created_at, total_amount')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .gte('created_at', filterStart.toISOString())
        .lte('created_at', filterEnd.toISOString())
        .order('created_at');

      if (error) throw error;

      // Group by day
      const salesByDay: Record<string, number> = {};
      
      // We iterate through the actual data instead of pre-filling all days 
      // because the range might be huge ('all') or just 1 day ('today').
      // For a better chart, if 'today', we might want hourly? 
      // For simplicity, let's group by day for now.
      
      (transactions || []).forEach(t => {
        const date = format(new Date(t.created_at), 'dd/MM');
        if (!salesByDay[date]) salesByDay[date] = 0;
        salesByDay[date] += Number(t.total_amount);
      });

      // If needed we can fill gaps, but let's return sparse data for now or fill based on range diff.
      // Returning just the data points we have is safer for dynamic ranges.
      
      return Object.entries(salesByDay).map(([date, amount]) => ({ date, amount }));
    },
    enabled: !!store,
  });

  // Fetch expenses history
  const { data: expensesHistory = [], isLoading: expensesHistoryLoading } = useQuery({
    queryKey: ['dashboard', 'expenses-history', store?.id, dateFilter],
    queryFn: async (): Promise<SalesHistoryData[]> => {
      if (!store) return [];

      const { data: expenses, error } = await supabase
        .from('expenses')
        .select('date, amount')
        .eq('store_id', store.id)
        .gte('date', filterStart.toISOString())
        .lte('date', filterEnd.toISOString())
        .order('date');

      if (error) throw error;

      const expensesByDay: Record<string, number> = {};
      
      (expenses || []).forEach(e => {
        const date = format(new Date(e.date), 'dd/MM');
        if (!expensesByDay[date]) expensesByDay[date] = 0;
        expensesByDay[date] += Number(e.amount);
      });

      return Object.entries(expensesByDay).map(([date, amount]) => ({ date, amount }));
    },
    enabled: !!store,
  });

  // Fetch recent activity (last 5 transactions or expenses)
  const { data: recentActivity = [], isLoading: activityLoading } = useQuery({
    queryKey: ['dashboard', 'recent-activity', store?.id],
    queryFn: async (): Promise<RecentActivity[]> => {
      if (!store) return [];

      // Fetch last 5 sales with customer info
      const { data: sales, error: salesError } = await supabase
        .from('transactions')
        .select('id, created_at, total_amount, product_name, quantity, type, customers(name)')
        .eq('store_id', store.id)
        .eq('type', 'sale')
        .order('created_at', { ascending: false })
        .limit(5);

      if (salesError) throw salesError;

      // Fetch last 2 expenses
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('id, date, amount, description')
        .eq('store_id', store.id)
        .order('date', { ascending: false })
        .limit(2);

      if (expensesError) throw expensesError;

      const activities: RecentActivity[] = [];

      // Add sales
      (sales || []).forEach(sale => {
        const customer = (sale as any).customers;
        const customerName = customer?.name || 'Cliente não informado';
        const productName = sale.product_name || 'Produto removido';
        activities.push({
          id: sale.id,
          type: 'sale',
          description: productName,
          amount: Number(sale.total_amount),
          date: sale.created_at,
          customerName,
          productName,
          quantity: sale.quantity,
        });
      });

      // Add expenses
      (expenses || []).forEach(expense => {
        activities.push({
          id: expense.id,
          type: 'expense',
          description: expense.description || 'Despesa',
          amount: Number(expense.amount),
          date: expense.date,
        });
      });

      // Sort by date desc and take top 5
      return activities
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);
    },
    enabled: !!store,
  });

  return {
    kpis: kpis || { 
      salesToday: 0, 
      monthlyRevenue: 0, 
      monthlyExpenses: 0,
      activeCustomers: 0, 
      lowStockCount: 0,
      accountsPayable: 0,
      accountsReceivable: 0
    },
    salesHistory,
    expensesHistory,
    recentActivity,
    isLoading: kpisLoading || historyLoading || expensesHistoryLoading || activityLoading,
  };
}
