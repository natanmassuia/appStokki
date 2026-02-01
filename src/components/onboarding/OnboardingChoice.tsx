import { FileSpreadsheet, ListPlus, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface OnboardingChoiceProps {
  onSelect: (method: 'import' | 'manual') => void;
}

export function OnboardingChoice({ onSelect }: OnboardingChoiceProps) {
  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Como você quer começar?</h2>
        <p className="text-muted-foreground">
          Escolha a melhor forma de configurar sua loja.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Importação */}
        <Card 
          className="relative group cursor-pointer border-2 hover:border-primary/50 transition-all duration-300 overflow-hidden"
          onClick={() => onSelect('import')}
        >
          <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-primary/10 p-1 rounded-full">
              <Check className="h-4 w-4 text-primary" />
            </div>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <FileSpreadsheet className="h-6 w-6 text-blue-500" />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">Importação Rápida</h3>
                <span className="text-[10px] font-medium bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full">
                  Recomendado
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Importe seus produtos e clientes de um arquivo Excel ou CSV em segundos. Ideal se você já tem uma planilha.
              </p>
            </div>
          </div>
          
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Card>

        {/* Card Manual */}
        <Card 
          className="relative group cursor-pointer border-2 hover:border-primary/50 transition-all duration-300 overflow-hidden"
          onClick={() => onSelect('manual')}
        >
          <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-primary/10 p-1 rounded-full">
              <Check className="h-4 w-4 text-primary" />
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <ListPlus className="h-6 w-6 text-emerald-500" />
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-lg">Passo a Passo</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Vou cadastrar meus itens um por um através do assistente. Ideal para quem está começando do zero.
              </p>
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </Card>
      </div>
    </div>
  );
}
