import { cn } from '@/lib/utils';
import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { formatCurrency } from '@/lib/format';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ComparativeAreaChartProps {
  salesData: Array<{ date: string; amount: number }>;
  expensesData: Array<{ date: string; amount: number }>;
  isLoading?: boolean;
  className?: string;
  chartHeight?: number | string;
}

export function ComparativeAreaChart({ 
  salesData, 
  expensesData, 
  isLoading, 
  className,
  chartHeight = 300 
}: ComparativeAreaChartProps) {
  // Merge sales and expenses data by date
  const chartData = useMemo(() => {
    const dataMap = new Map<string, { date: string; receita: number; despesas: number }>();

    // Add sales data
    salesData.forEach(item => {
      const existing = dataMap.get(item.date) || { date: item.date, receita: 0, despesas: 0 };
      existing.receita = item.amount;
      dataMap.set(item.date, existing);
    });

    // Add expenses data
    expensesData.forEach(item => {
      const existing = dataMap.get(item.date) || { date: item.date, receita: 0, despesas: 0 };
      existing.despesas = item.amount;
      dataMap.set(item.date, existing);
    });

    // Sort by date
    const sorted = Array.from(dataMap.values()).sort((a, b) => {
      const [dayA, monthA] = a.date.split('/').map(Number);
      const [dayB, monthB] = b.date.split('/').map(Number);
      if (monthA !== monthB) return monthA - monthB;
      return dayA - dayB;
    });

    return sorted;
  }, [salesData, expensesData]);

  // Calculate totals
  const totals = useMemo(() => {
    const totalReceita = chartData.reduce((sum, item) => sum + item.receita, 0);
    const totalDespesas = chartData.reduce((sum, item) => sum + item.despesas, 0);
    const saldo = totalReceita - totalDespesas;
    return { totalReceita, totalDespesas, saldo };
  }, [chartData]);

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const receita = payload.find((p: any) => p.dataKey === 'receita')?.value || 0;
      const despesas = payload.find((p: any) => p.dataKey === 'despesas')?.value || 0;
      const lucro = receita - despesas;

      return (
        <div className="bg-background border border-border rounded-lg shadow-lg p-3 space-y-1 z-50">
          <p className="text-sm font-medium">{label}</p>
          <div className="space-y-1 text-sm">
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[#10B981]" />
              Receita: <span className="font-semibold text-emerald-500">{formatCurrency(receita)}</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-[#EF4444]" />
              Despesas: <span className="font-semibold text-red-500">{formatCurrency(despesas)}</span>
            </p>
            <div className="pt-1 border-t border-border mt-1">
              <p className="flex items-center gap-2">
                Lucro:{' '}
                <span className={`font-bold ${lucro >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {formatCurrency(lucro)}
                </span>
              </p>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className={cn("base44-card h-full p-6", className)}>
        <div className="flex items-center justify-between mb-6">
          <div className="h-6 w-32 bg-secondary/50 rounded animate-pulse" />
          <div className="flex gap-2">
            <div className="h-4 w-16 bg-secondary/50 rounded animate-pulse" />
            <div className="h-4 w-16 bg-secondary/50 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex items-center justify-center" style={{ height: chartHeight }}>
          <div className="animate-pulse w-full h-full bg-secondary/50 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("base44-card h-full flex flex-col p-6", className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
           <h3 className="text-lg font-bold text-foreground">Visão Geral da Receita</h3>
           <p className="text-sm text-muted-foreground">Entradas vs Saídas</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
            <span className="text-muted-foreground font-medium">Receitas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
            <span className="text-muted-foreground font-medium">Despesas</span>
          </div>
        </div>
      </div>
      <div className="flex-1" style={{ minHeight: chartHeight }}>
        <div className="h-full w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} horizontal={true} strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                tickMargin={15}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => {
                  if (value >= 1000) return `R$${(value / 1000).toFixed(0)}k`;
                  return `R$${value}`;
                }}
                width={50}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1, strokeDasharray: '3 3', strokeOpacity: 0.5 }} />
              <Area
                type="monotone"
                dataKey="receita"
                name="Receitas"
                stroke="#10B981"
                strokeWidth={3}
                fill="url(#colorIncome)"
                fillOpacity={1}
                activeDot={{ r: 6, strokeWidth: 0, fill: '#10B981' }}
              />
              <Area
                type="monotone"
                dataKey="despesas"
                name="Despesas"
                stroke="#F43F5E"
                strokeWidth={3}
                fill="url(#colorExpense)"
                fillOpacity={1}
                activeDot={{ r: 6, strokeWidth: 0, fill: '#F43F5E' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
