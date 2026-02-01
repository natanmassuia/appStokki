import { RecentActivity } from '@/hooks/useDashboard';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { ShoppingBag, TrendingDown, ChevronRight, Package, Receipt, ArrowUpRight, ArrowDownRight, Calendar, User, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

import { Link } from 'react-router-dom';

interface RecentActivityFeedProps {
  activities: RecentActivity[];
  isLoading?: boolean;
}

export function RecentActivityFeed({ activities, isLoading }: RecentActivityFeedProps) {
  const [selectedActivity, setSelectedActivity] = useState<RecentActivity | null>(null);

  if (isLoading) {
    return (
      <div className="base44-card h-full flex flex-col p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="h-5 w-32 bg-secondary/50 rounded animate-pulse" />
          <div className="h-4 w-12 bg-secondary/50 rounded animate-pulse" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-lg bg-secondary/50 animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 bg-secondary/50 rounded animate-pulse" />
                <div className="h-3 w-1/4 bg-secondary/50 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="base44-card h-full flex flex-col p-6">
        <h3 className="text-lg font-bold text-foreground mb-6">Atividade Recente</h3>
        <div className="flex flex-col items-center justify-center flex-1 text-muted-foreground">
          <Package className="h-12 w-12 mb-3 opacity-20" />
          <p>Nenhuma atividade registrada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="base44-card h-full flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-foreground">Atividade Recente</h3>
        <Link 
          to="/financeiro" 
          className="text-xs font-medium text-primary hover:text-primary/80 transition-colors hover:underline cursor-pointer"
        >
          Ver Extrato Completo
        </Link>
      </div>
      <div className="flex-1 min-h-0 -mr-2 pr-2">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-1">
            {activities.map((activity) => (
              <div
                key={`${activity.type}-${activity.id}`}
                className="group flex items-center gap-4 p-3 -mx-3 rounded-lg hover:bg-secondary/40 transition-colors duration-200 cursor-pointer"
                onClick={() => setSelectedActivity(activity)}
              >
                {/* Icon Squircle */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    activity.type === 'sale'
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-500/20'
                      : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-100 dark:group-hover:bg-rose-500/20'
                  }`}
                >
                  {activity.type === 'sale' ? (
                    <ArrowUpRight className="h-5 w-5" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm text-foreground truncate pr-2">
                      {activity.description}
                    </p>
                    <span
                      className={`text-sm font-bold whitespace-nowrap ${
                        activity.type === 'sale' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {activity.type === 'sale' ? '+' : '-'}
                      {formatCurrency(activity.amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                    <span className="truncate">
                      {activity.type === 'sale' 
                        ? activity.customerName 
                        : 'Despesa Operacional'}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide opacity-70">{formatDateTime(activity.date).split(' ')[0]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      <Dialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedActivity?.type === 'sale' ? (
                <ArrowUpRight className="h-5 w-5 text-emerald-500" />
              ) : (
                <ArrowDownRight className="h-5 w-5 text-rose-500" />
              )}
              Detalhes da {selectedActivity?.type === 'sale' ? 'Venda' : 'Despesa'}
            </DialogTitle>
            <DialogDescription>
              {selectedActivity?.date ? formatDateTime(selectedActivity.date) : ''}
            </DialogDescription>
          </DialogHeader>

          {selectedActivity && (
            <div className="space-y-4 py-4">
               {/* Product/Description */}
               <div className="flex items-start gap-3 p-3 bg-secondary/20 rounded-lg">
                 <div className="p-2 bg-secondary rounded-full">
                   {selectedActivity.type === 'sale' ? <Package className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                 </div>
                 <div>
                   <p className="text-sm font-medium text-muted-foreground">Descrição</p>
                   <p className="font-semibold">{selectedActivity.description}</p>
                 </div>
               </div>

               {/* Value */}
               <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                 <div className="flex items-center gap-3">
                   <div className="p-2 bg-secondary rounded-full">
                     <Receipt className="h-4 w-4" />
                   </div>
                   <p className="text-sm font-medium text-muted-foreground">Valor Total</p>
                 </div>
                 <p className={`text-xl font-bold ${selectedActivity.type === 'sale' ? 'text-emerald-500' : 'text-rose-500'}`}>
                   {formatCurrency(selectedActivity.amount)}
                 </p>
               </div>

               {/* Customer */}
               {selectedActivity.type === 'sale' && (
                 <div className="flex items-start gap-3 p-3 bg-secondary/20 rounded-lg">
                   <div className="p-2 bg-secondary rounded-full">
                     <User className="h-4 w-4" />
                   </div>
                   <div>
                     <p className="text-sm font-medium text-muted-foreground">Cliente</p>
                     <p className="font-semibold">{selectedActivity.customerName || 'Cliente não identificado'}</p>
                   </div>
                 </div>
               )}

               {/* Status */}
               <div className="flex items-center justify-between p-3 bg-secondary/20 rounded-lg">
                  <span className="text-sm font-medium text-muted-foreground">Status</span>
                  <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Concluído
                  </span>
               </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedActivity(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
