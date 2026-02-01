import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from 'lucide-react';

export type DateRange = 'today' | 'week' | 'month' | 'all';

interface DateRangeFilterProps {
  value: DateRange;
  onChange: (value: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: DateRangeFilterProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as DateRange)}>
      <SelectTrigger className="w-[180px] input-glass">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-4 w-4" />
          <SelectValue placeholder="Período" />
        </div>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todo o Período</SelectItem>
        <SelectItem value="today">Hoje</SelectItem>
        <SelectItem value="week">Esta Semana</SelectItem>
        <SelectItem value="month">Este Mês</SelectItem>
      </SelectContent>
    </Select>
  );
}
