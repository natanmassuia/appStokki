import { useMemo } from 'react';

interface PasswordStrengthProps {
  password: string;
}

export function PasswordStrength({ password }: PasswordStrengthProps) {
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: '', checks: [] };

    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^a-zA-Z0-9]/.test(password),
    };

    if (checks.length) score += 1;
    if (checks.lowercase) score += 1;
    if (checks.uppercase) score += 1;
    if (checks.number) score += 1;
    if (checks.special) score += 1;

    let label = '';
    let color = '';
    
    if (score <= 1) {
      label = 'Muito fraca';
      color = 'bg-red-500';
    } else if (score === 2) {
      label = 'Fraca';
      color = 'bg-orange-500';
    } else if (score === 3) {
      label = 'Média';
      color = 'bg-yellow-500';
    } else if (score === 4) {
      label = 'Forte';
      color = 'bg-green-500';
    } else {
      label = 'Muito forte';
      color = 'bg-emerald-600';
    }

    return { score, label, color, checks };
  }, [password]);

  if (!password) return null;

  const percentage = (strength.score / 5) * 100;

  return (
    <div className="space-y-2">
      {/* Barra de progresso */}
      <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 ${strength.color}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Label e checks */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          Força da senha: <span className={`font-medium ${strength.color.replace('bg-', 'text-')}`}>{strength.label}</span>
        </p>
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className={`flex items-center gap-1 ${strength.checks.length ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
            <span>{strength.checks.length ? '✓' : '○'}</span>
            <span>8+ caracteres</span>
          </div>
          <div className={`flex items-center gap-1 ${strength.checks.lowercase ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
            <span>{strength.checks.lowercase ? '✓' : '○'}</span>
            <span>Minúscula</span>
          </div>
          <div className={`flex items-center gap-1 ${strength.checks.uppercase ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
            <span>{strength.checks.uppercase ? '✓' : '○'}</span>
            <span>Maiúscula</span>
          </div>
          <div className={`flex items-center gap-1 ${strength.checks.number ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
            <span>{strength.checks.number ? '✓' : '○'}</span>
            <span>Número</span>
          </div>
          <div className={`flex items-center gap-1 ${strength.checks.special ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
            <span>{strength.checks.special ? '✓' : '○'}</span>
            <span>Especial</span>
          </div>
        </div>
      </div>
    </div>
  );
}
