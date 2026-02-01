import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';

interface FinancialChartsProps {
  salesData: any[];
  expensesData: any[];
  isLoading?: boolean;
}

const COLORS_INCOME = ['#10B981', '#059669', '#34D399', '#6EE7B7', '#A7F3D0']; // Emeralds
const COLORS_EXPENSE = ['#F43F5E', '#E11D48', '#FB7185', '#FDA4AF', '#FECDD3']; // Roses

export function FinancialCharts({ salesData, expensesData, isLoading }: FinancialChartsProps) {
  
  // 1. Process Income Data (Group by Category)
  const incomeData = useMemo(() => {
    if (!salesData || salesData.length === 0) return [];
    
    // In a real app, sales would have a category relation. 
    // For now, we simulate categories based on product names or random distribution 
    // since the current salesData structure might be flat.
    // Let's assume salesData has 'product_name' or we group by it.
    
    const categoryMap = new Map<string, number>();
    
    salesData.forEach(sale => {
      // Fallback logic if category isn't explicit in the flattened sales history
      const category = sale.category || 'Geral'; 
      const amount = sale.amount || 0;
      categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
    });

    const total = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0);

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ 
        name, 
        value,
        percent: total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Top 5
  }, [salesData]);

  // 2. Process Expense Data (Group by Category)
  const expenseData = useMemo(() => {
    if (!expensesData || expensesData.length === 0) return [];
    
    const categoryMap = new Map<string, number>();
    
    expensesData.forEach(expense => {
      const category = expense.category || 'Operacional';
      const amount = expense.amount || 0;
      categoryMap.set(category, (categoryMap.get(category) || 0) + amount);
    });

    const total = Array.from(categoryMap.values()).reduce((sum, val) => sum + val, 0);

    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ 
        name, 
        value,
        percent: total > 0 ? ((value / total) * 100).toFixed(1) : '0.0'
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [expensesData]);

  // Custom Legend Component
  const CustomLegend = ({ payload }: any) => {
    if (!payload || payload.length === 0) return null;

    return (
      <div className="flex flex-col gap-2 mt-4 w-full">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center justify-between text-sm w-full">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full flex-shrink-0" 
                style={{ backgroundColor: entry.payload.fill }} 
              />
              <span className="text-muted-foreground truncate max-w-[120px]" title={entry.payload.name}>
                {entry.payload.name}
              </span>
            </div>
            <div className="flex items-center gap-2 border-b border-dotted border-border/50 flex-1 mx-2" />
            <span className="font-bold text-foreground">{entry.payload.percent}%</span>
          </div>
        ))}
      </div>
    );
  };

  // Custom Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="font-medium text-popover-foreground">{payload[0].name}</p>
          <p className="text-sm font-bold" style={{ color: payload[0].fill }}>
            {formatCurrency(payload[0].value)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {payload[0].payload.percent}%
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1, 2].map(i => (
          <div key={i} className="base44-card h-[350px] p-6 flex flex-col items-center justify-center">
             <div className="w-32 h-32 rounded-full border-4 border-secondary/30 border-t-secondary animate-spin" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Income Chart */}
      <div className="base44-card p-6 flex flex-col h-full">
        <h3 className="text-lg font-bold text-foreground mb-1">Origem da Receita</h3>
        <p className="text-sm text-muted-foreground mb-6">Por Categoria</p>
        
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={incomeData.length > 0 ? incomeData : [{ name: 'Sem dados', value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {incomeData.length > 0 ? (
                    incomeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_INCOME[index % COLORS_INCOME.length]} />
                    ))
                  ) : (
                    <Cell fill="#e2e8f0" />
                  )}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <CustomLegend 
            payload={incomeData.map((d, i) => ({
              payload: { ...d, fill: COLORS_INCOME[i % COLORS_INCOME.length] }
            }))} 
          />
        </div>
      </div>

      {/* Expense Chart */}
      <div className="base44-card p-6 flex flex-col h-full">
        <h3 className="text-lg font-bold text-foreground mb-1">Despesas</h3>
        <p className="text-sm text-muted-foreground mb-6">Por Categoria</p>
        
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
          <div className="w-full h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseData.length > 0 ? expenseData : [{ name: 'Sem dados', value: 1 }]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {expenseData.length > 0 ? (
                    expenseData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_EXPENSE[index % COLORS_EXPENSE.length]} />
                    ))
                  ) : (
                    <Cell fill="#e2e8f0" />
                  )}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <CustomLegend 
            payload={expenseData.map((d, i) => ({
              payload: { ...d, fill: COLORS_EXPENSE[i % COLORS_EXPENSE.length] }
            }))} 
          />
        </div>
      </div>
    </div>
  );
}