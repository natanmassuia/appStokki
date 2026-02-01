import { LucideIcon } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  isCurrency?: boolean;
  variant?: 'default' | 'emerald' | 'orange' | 'slate' | 'indigo' | 'rose' | 'teal';
}

export function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendValue, 
  isCurrency = true,
  variant = 'default' 
}: StatCardProps) {
  
  // Base44 Style Mapping
  const styleMap = {
    default: {
      bg: 'bg-card',
      iconBg: 'bg-slate-100 dark:bg-slate-800',
      iconColor: 'text-slate-600 dark:text-slate-400'
    },
    emerald: {
      bg: 'bg-card',
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
      iconColor: 'text-emerald-600 dark:text-emerald-400'
    },
    orange: {
      bg: 'bg-card',
      iconBg: 'bg-orange-50 dark:bg-orange-500/10',
      iconColor: 'text-orange-600 dark:text-orange-400'
    },
    slate: {
      bg: 'bg-card',
      iconBg: 'bg-slate-50 dark:bg-slate-800',
      iconColor: 'text-slate-600 dark:text-slate-400'
    },
    indigo: {
      bg: 'bg-card',
      iconBg: 'bg-indigo-50 dark:bg-indigo-500/10',
      iconColor: 'text-indigo-600 dark:text-indigo-400'
    },
    rose: {
      bg: 'bg-card',
      iconBg: 'bg-rose-50 dark:bg-rose-500/10',
      iconColor: 'text-rose-600 dark:text-rose-400'
    },
    teal: {
      bg: 'bg-card',
      iconBg: 'bg-teal-50 dark:bg-teal-500/10',
      iconColor: 'text-teal-600 dark:text-teal-400'
    }
  };

  const currentStyle = styleMap[variant] || styleMap.default;

  return (
    <div className={`base44-card p-5 flex items-center justify-between h-24 ${currentStyle.bg}`}>
      {/* Left: Text Info */}
      <div className="flex flex-col justify-center">
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-foreground tracking-tight">
          {isCurrency ? formatCurrency(value) : value}
        </h3>
        {trendValue && (
          <p className="text-xs text-muted-foreground mt-1">
            {trendValue}
          </p>
        )}
      </div>

      {/* Right: Big Icon (Squircle) */}
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${currentStyle.iconBg}`}>
        <Icon className={`h-6 w-6 ${currentStyle.iconColor}`} />
      </div>
    </div>
  );
}
