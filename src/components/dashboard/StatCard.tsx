import { LucideIcon } from 'lucide-react';
import { formatCurrency, formatPercent } from '@/lib/format';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  isCurrency?: boolean;
  isPercent?: boolean;
  trend?: 'up' | 'down' | 'neutral';
}

export function StatCard({ title, value, icon: Icon, isCurrency = true, isPercent = false, trend = 'neutral' }: StatCardProps) {
  const formattedValue = isPercent 
    ? formatPercent(value) 
    : isCurrency 
      ? formatCurrency(value) 
      : value.toString();

  const trendColors = {
    up: 'text-primary',
    down: 'text-destructive',
    neutral: 'text-foreground',
  };

  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className={`text-2xl font-bold ${trendColors[trend]}`}>
            {formattedValue}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-primary/20">
          <Icon className="h-6 w-6 text-primary" />
        </div>
      </div>
    </div>
  );
}
