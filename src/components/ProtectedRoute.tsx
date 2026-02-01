import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useStore } from '@/hooks/useStore';

interface ProtectedRouteProps {
  children: ReactNode;
}

/**
 * AuthGuard - Gerencia o lifecycle completo de autenticação
 * 
 * Lógica simplificada:
 * 1. Se loading: Mostra spinner
 * 2. Se !user: Redireciona para /login
 * 3. Se !profile OU !store: Redireciona para /onboarding
 * 4. Se tudo ok: Permite acesso
 */
export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  // Use useStore hook for store verification - this ensures we share cache with Onboarding
  const { store, isLoading: storeLoading } = useStore();
  const location = useLocation();
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);
  const [redirectToRegister, setRedirectToRegister] = useState(false);

  useEffect(() => {
    if (authLoading) {
      setCheckingProfile(true);
      return;
    }

    if (!user) {
      setCheckingProfile(false);
      return;
    }

    const checkProfile = async () => {
      try {
        // Check profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          setHasProfile(false);
          setCheckingProfile(false);
          return;
        }

        if (!profile) {
          const intent = localStorage.getItem('auth_intent');
          if (intent === 'login') {
            localStorage.removeItem('auth_intent');
            setRedirectToRegister(true);
            return;
          }

          setHasProfile(false);
          setCheckingProfile(false);
          return;
        }

        setHasProfile(true);
        setCheckingProfile(false);
      } catch {
        setHasProfile(false);
        setCheckingProfile(false);
      }
    };

    checkProfile();
  }, [user, authLoading]);

  // Show spinner while loading
  if (authLoading || checkingProfile || (storeLoading && !!user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (redirectToRegister) {
    return <Navigate to="/register?error=no_account" replace />;
  }

  // No user - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Allow access to /onboarding regardless of profile/store state
  if (location.pathname === '/onboarding') {
    return <>{children}</>;
  }

  // No profile or no store - redirect to onboarding
  // We check 'store' from useStore hook which is null if no store found
  if (!hasProfile || !store) {
    return <Navigate to="/onboarding" replace />;
  }
  if (location.pathname === '/' && store && !(store as any).onboarding_completed_at) {
    return <Navigate to="/onboarding" replace />;
  }

  // Everything ok - allow access
  return <>{children}</>;
}
