import * as React from "react";
import { NumericFormat } from "react-number-format";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number; // Espera um número puro (ex: 33.66)
  onChange: (value: number) => void;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    
    const handleValueChange = (values: any) => {
      const { value: stringValue } = values;
      // Remove tudo que não for dígito
      const numericString = stringValue.replace(/\D/g, "");

      // Se vazio, zera
      if (!numericString) {
        onChange(0);
        return;
      }

      // Lógica ATM: divide por 100 para criar os centavos
      const numericValue = Number(numericString) / 100;
      onChange(numericValue);
    };

    return (
      <NumericFormat
        getInputRef={ref}
        // TRUQUE: Passamos o valor como String fixada em 2 casas.
        // Isso garante o visual "0,00" sem usar fixedDecimalScale que trava o input.
        value={value !== undefined ? value.toFixed(2) : ""}
        onValueChange={handleValueChange}
        
        // Configuração visual
        thousandSeparator="."
        decimalSeparator=","
        prefix="R$ " // Opcional: Se quiser o R$ dentro do input
        
        // IMPORTANTE: Removemos decimalScale={2} para não bloquear a digitação
        // O .toFixed(2) no value já garante o visual correto.
        allowNegative={false}
        
        // UX: Seleciona tudo ao clicar para facilitar a edição
        onFocus={(e) => e.target.select()}
        
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
