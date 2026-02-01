import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { humanizeError } from '@/lib/utils';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        let errorMessage = 'Não foi possível enviar o e-mail de recuperação. Por favor, tente novamente.';
        
        // Mensagens amigáveis para erros específicos
        if (error.message) {
          if (error.message.includes('not found') || error.message.includes('não encontrado') || error.message.includes('User not found')) {
            errorMessage = 'Não encontramos uma conta com este e-mail. Verifique se você digitou corretamente ou cadastre-se se ainda não possui uma conta.';
          } else if (error.message.includes('network') || error.message.includes('conexão')) {
            errorMessage = 'Problema de conexão. Verifique sua internet e tente novamente.';
          } else if (error.message.includes('rate limit') || error.message.includes('Too many requests')) {
            errorMessage = 'Muitas tentativas. Por segurança, aguarde alguns minutos antes de solicitar novamente o link de recuperação.';
          } else if (error.message.includes('Invalid email')) {
            errorMessage = 'Por favor, insira um e-mail válido. Verifique se você digitou corretamente.';
          }
        }
        
        setError(errorMessage);
        toast({
          title: 'Não foi possível enviar',
          description: errorMessage,
          variant: 'destructive',
        });
        setLoading(false);
      } else {
        setSuccess(true);
        toast({
          title: 'Email enviado!',
          description: 'Verifique sua caixa de entrada para redefinir sua senha.',
        });
      }
    } catch (err) {
      let errorMessage = 'Não foi possível enviar o e-mail de recuperação. Por favor, tente novamente.';
      
      if (err && typeof err === 'object' && 'message' in err) {
        const errMsg = (err as any).message;
        if (errMsg?.includes('network') || errMsg?.includes('conexão')) {
          errorMessage = 'Problema de conexão. Verifique sua internet e tente novamente.';
        } else if (errMsg?.includes('timeout')) {
          errorMessage = 'A conexão demorou muito. Tente novamente em alguns instantes.';
        }
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md animate-fade-in">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="p-3 rounded-xl bg-primary/20">
              <Package className="h-8 w-8 text-primary" />
            </div>
            <span className="text-2xl font-bold gradient-text">AppStokki</span>
          </div>

          <Card className="glass-card border-border/30">
            <CardHeader className="space-y-1 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-full bg-green-500/20">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <CardTitle className="text-2xl">Email enviado!</CardTitle>
              <CardDescription>
                Enviamos um link de recuperação para <strong>{email}</strong>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
                Se não encontrar o email, verifique também a pasta de spam.
              </p>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full" variant="outline">
                <Link to="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para o login
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 rounded-xl bg-primary/20">
            <Package className="h-8 w-8 text-primary" />
          </div>
          <span className="text-2xl font-bold gradient-text">AppStokki</span>
        </div>

        <Card className="glass-card border-border/30">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Recuperar Senha</CardTitle>
            <CardDescription className="text-center">
              Digite seu email e enviaremos um link para redefinir sua senha
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 input-glass"
                    required
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full gradient-primary" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar link de recuperação'
                )}
              </Button>

              <Button asChild variant="ghost" className="w-full">
                <Link to="/login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar para o login
                </Link>
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
