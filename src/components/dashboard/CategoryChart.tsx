import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CategorySalesData } from '@/hooks/useDashboard';
import { formatCurrency } from '@/lib/format';

interface CategoryChartProps {
  data: CategorySalesData[];
}

const COLORS = [
  'hsl(160 84% 39%)',   // primary
  'hsl(160 84% 50%)',   // lighter green
  'hsl(180 70% 45%)',   // teal
  'hsl(200 80% 50%)',   // blue
  'hsl(220 70% 55%)',   // indigo
  'hsl(280 70% 55%)',   // purple
];

export function CategoryChart({ data }: CategoryChartProps) {
  if (data.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">Categorias Mais Vendidas</h3>
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          Nenhuma venda registrada
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Categorias Mais Vendidas</h3>
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={2}
              dataKey="value"
              nameKey="name"
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              formatter={(value: number) => [formatCurrency(value), 'Vendas']}
            />
            <Legend 
              formatter={(value) => <span className="text-foreground">{value}</span>}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
