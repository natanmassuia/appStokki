import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Lock, User, ArrowRight, TrendingUp, BarChart3, Loader2, Eye, EyeOff, MessageCircle, Package, AlertTriangle, Globe, Link2, Smartphone, ShoppingBag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { ModeToggle } from '@/components/mode-toggle';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import Autoplay from "embla-carousel-autoplay"

export default function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('login');
  
  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [twitterLoading, setTwitterLoading] = useState(false);

  const features = [
    {
      title: "Receita Mensal",
      value: "R$ 48.590",
      icon: <TrendingUp className="w-4 h-4 text-emerald-400" />,
      badge: "Analytics",
      badgeIcon: <BarChart3 className="w-3 h-3 text-blue-400" />,
      content: (
        <>
          <div className="flex items-end gap-1.5 h-12 w-full">
             {[40, 60, 45, 80, 55, 90, 70, 95, 60, 85].map((h, i) => (
               <div key={i} className="flex-1 bg-gradient-to-t from-blue-500 to-emerald-400 rounded-t-sm" style={{height: `${h}%`}} />
             ))}
          </div>
          <div className="flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
             <p className="text-emerald-600 dark:text-emerald-400 text-xs font-medium">+32% vs mês anterior</p>
          </div>
        </>
      )
    },
    {
      title: "Disparos",
      value: "98% Abertura",
      icon: <MessageCircle className="w-4 h-4 text-purple-400" />,
      badge: "Marketing",
      badgeIcon: <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />,
      content: (
        <>
           <div className="grid grid-cols-2 gap-4">
              <div>
                 <p className="text-slate-500 dark:text-slate-400 text-[11px]">Cliques</p>
                 <p className="text-2xl font-bold text-slate-900 dark:text-white">1.4k</p>
              </div>
              <div>
                 <p className="text-slate-500 dark:text-slate-400 text-[11px]">Conversão</p>
                 <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">+15%</p>
              </div>
           </div>
           <div className="w-full bg-white/40 dark:bg-white/5 rounded-lg p-2 flex justify-between items-center mt-2">
              <span className="text-slate-500 dark:text-slate-400 text-xs">ROI da Campanha</span>
              <span className="text-slate-900 dark:text-white text-xs font-bold">4.5x 🚀</span>
           </div>
        </>
      )
    },
    {
      title: "Estoque",
      value: "1.250 un.",
      icon: <Package className="w-4 h-4 text-orange-400" />,
      badge: "Controle Total",
      badgeIcon: <Package className="w-3 h-3 text-orange-400" />,
      content: (
        <div className="space-y-3">
           <div className="flex justify-between items-end">
              <div>
                 <p className="text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">Status</p>
                 <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">Em dia</p>
              </div>
              <div className="text-right">
                 <p className="text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">Valor Total</p>
                 <p className="text-slate-900 dark:text-white text-sm font-bold">R$ 125k</p>
              </div>
           </div>
           
           <div className="space-y-1.5">
              <div className="flex justify-between text-[10px]">
                 <span className="text-slate-500 dark:text-slate-400">Capacidade</span>
                 <span className="text-slate-900 dark:text-white">85%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700/50 rounded-full overflow-hidden">
                 <div className="h-full w-[85%] bg-gradient-to-r from-orange-400 to-emerald-400" />
              </div>
           </div>
        </div>
      )
    },
    {
      title: "Hub Integrado",
      value: "Sincronizado",
      icon: <Globe className="w-4 h-4 text-blue-400" />,
      badge: "Multi-Canal",
      badgeIcon: <Link2 className="w-3 h-3 text-blue-400" />,
      content: (
         <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center justify-between bg-white/40 dark:bg-white/5 p-2 rounded-lg border border-slate-100 dark:border-white/5">
               <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-slate-100 overflow-hidden">
                     <img src="/mercado-livre.png" alt="ML" className="w-4 h-4 object-contain" />
                  </div>
                  <span className="text-[10px] text-slate-600 dark:text-slate-300">Mercado Livre</span>
               </div>
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
            <div className="flex items-center justify-between bg-white/40 dark:bg-white/5 p-2 rounded-lg border border-slate-100 dark:border-white/5">
               <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center border border-slate-100 overflow-hidden">
                     <img src="/shopee.png" alt="Sh" className="w-4 h-4 object-contain" />
                  </div>
                  <span className="text-[10px] text-slate-600 dark:text-slate-300">Shopee</span>
               </div>
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            </div>
         </div>
      )
    },
    {
      title: "Vitrine Digital",
      value: "+2k Visitas",
      icon: <Smartphone className="w-4 h-4 text-pink-400" />,
      badge: "Loja Online",
      badgeIcon: <ShoppingBag className="w-3 h-3 text-pink-400" />,
      content: (
         <div className="flex flex-col gap-2 mt-1">
            {/* Fake URL Bar */}
            <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-full w-full border border-slate-200 dark:border-white/5">
               <Globe className="w-2 h-2 text-slate-400" />
               <span className="text-[9px] text-slate-500 font-medium">urbanstreet.appstokki.com</span>
            </div>

            {/* Product Notification */}
            <div className="flex items-center gap-3 bg-white/60 dark:bg-white/10 p-2 rounded-lg border border-slate-100 dark:border-white/5 shadow-sm backdrop-blur-sm">
               <div className="w-8 h-8 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center shrink-0 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=100&q=80" alt="Tênis" className="w-full h-full object-cover" />
               </div>
               <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-medium text-slate-700 dark:text-slate-200 truncate">Nike Air Jordan Red</p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400">Há 2 minutos • Pix</p>
               </div>
               <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                  R$ 899
               </span>
            </div>
            
            {/* Live Visitors */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
               <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
               </span>
               <span className="text-[9px] text-slate-400">12 clientes online em Urban Street</span>
            </div>
         </div>
      )
    }
  ];

  // Initialize tab based on route
  useEffect(() => {
    if (location.pathname === '/cadastro' || location.pathname === '/register') {
      setActiveTab('register');
    } else {
      setActiveTab('login');
    }
  }, [location.pathname]);

  // Handle URL errors
  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'no_account') {
       // Garante logout se a conta não existe
       supabase.auth.signOut();
       
       // Se estiver na aba de login, mostra lá. Se estiver na de registro (redirecionado), mostra lá.
       if (location.pathname.includes('register') || location.pathname.includes('cadastro')) {
           setRegError('Conta não encontrada. Por favor, complete seu cadastro.');
       } else {
           setLoginError('Conta não encontrada. Por favor, crie uma conta.');
       }
    }
  }, [searchParams, location.pathname]);

  const onTabChange = (value: string) => {
    setActiveTab(value);
    if (value === 'login') {
        window.history.pushState(null, '', '/login');
    } else {
        window.history.pushState(null, '', '/cadastro');
    }
  };

  const handleGoogleLogin = async () => {
    // Save intent based on active tab
    localStorage.setItem('auth_intent', activeTab);
    
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Erro no login Google:", error.message);
      setGoogleLoading(false);
      setLoginError(error.message);
    }
  };

  const handleFacebookLogin = async () => {
    localStorage.setItem('auth_intent', activeTab);
    setFacebookLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("Facebook Login Error:", error.message);
      setFacebookLoading(false);
      setLoginError(error.message);
    }
  };

  const handleXLogin = async () => {
    localStorage.setItem('auth_intent', activeTab);
    setTwitterLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: { redirectTo: `${window.location.origin}/` },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error("X Login Error:", error.message);
      setTwitterLoading(false);
      setLoginError(error.message);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim()) { setLoginError('Por favor, informe seu email.'); return; }
    if (!loginPassword.trim()) { setLoginError('Por favor, informe sua senha.'); return; }
    setLoginError('');
    setLoginLoading(true);

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });
      
      if (signInError) {
        let errorMessage = 'E-mail ou senha incorretos.';
        if (signInError.message.includes('Email not confirmed')) {
          errorMessage = 'Por favor, verifique seu e-mail e confirme sua conta antes de fazer login.';
        } else if (signInError.message.includes('Invalid login credentials')) {
          errorMessage = 'conta_nao_existe';
        }
        setLoginError(errorMessage);
        setLoginLoading(false);
        return;
      }
      
      if (!data || !data.user) {
        setLoginError('Não foi possível fazer login. Tente novamente.');
        setLoginLoading(false);
        return;
      }
      
      navigate('/');
    } catch (err) {
      setLoginError('Erro ao fazer login. Tente novamente.');
      setLoginLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!acceptedTerms) { setRegError('Você precisa aceitar os termos de uso.'); return; }
    if (regPassword.length < 6) { setRegError('A senha deve ter pelo menos 6 caracteres'); return; }

    setRegLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: regEmail.trim(),
        password: regPassword.trim(),
        options: {
            data: { full_name: regName }
        }
      });

      if (signUpError) {
        let errorMessage = 'Não foi possível criar sua conta.';
        if (signUpError.message.includes('User already registered')) errorMessage = 'Este e-mail já está cadastrado.';
        setRegError(errorMessage);
        setRegLoading(false);
        return;
      }

      if (data && data.user) {
        // Create profile
        if (data.session) {
            await supabase.from('profiles').insert({
                id: data.user.id,
                email: data.user.email || regEmail.trim(),
                full_name: regName || regEmail.trim().split('@')[0],
            });
            navigate('/onboarding', { replace: true });
        } else {
             // Verification email sent
             alert('Conta criada! Verifique seu email.');
             setActiveTab('login');
        }
      }
      setRegLoading(false);
    } catch (err) {
      setRegError('Erro ao criar conta.');
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans bg-slate-50 dark:bg-slate-950 relative overflow-hidden transition-colors duration-300">
        {/* Theme Toggle */}
        <div className="absolute top-6 right-6 z-50">
            <ModeToggle />
        </div>

        {/* Animated Background Elements - Global */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-3xl" />
        </div>

      {/* Left Side - Branding */}
      <div className="lg:w-1/2 p-8 lg:pl-12 lg:py-12 lg:pr-0 flex flex-col relative z-20 justify-between pointer-events-none lg:pointer-events-auto lg:items-end select-none">
        {/* Center Content - FORCED CENTER ALIGNMENT */}
        <div className="flex-1 flex flex-col justify-center relative z-10 py-12 lg:py-0 items-center text-center lg:-mr-[72px] xl:-mr-[115px]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center"
          >
            <h1 className="text-3xl lg:text-5xl font-bold text-slate-900 dark:text-white leading-tight mb-4 text-center transition-colors duration-300">
              Organize seu estoque.
              <br />
              <span className="bg-gradient-to-r from-blue-600 to-emerald-500 dark:from-blue-400 dark:to-emerald-400 bg-clip-text text-transparent">
                Escale o seu negócio.
              </span>
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg lg:text-xl max-w-md text-center transition-colors duration-300">
              O sistema operacional de crescimento para lojistas modernos.
            </p>
          </motion.div>

          {/* --- CAROUSEL OF FEATURES --- */}
          <div className="mt-12 hidden xl:block w-full max-w-4xl px-12 relative z-20">
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              plugins={[
                Autoplay({
                  delay: 7000,
                  stopOnInteraction: false, // Continue autoplay after interaction
                  stopOnMouseEnter: true, // Pause on hover for readability
                }),
              ]}
              className="w-full relative"
            >
              <CarouselContent className="-ml-4">
                {features.map((feature, index) => (
                  <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                      className="flex flex-col items-center gap-4"
                    >
                      {/* FIXED SIZE CONTAINER */}
                      <div className="w-[260px] h-[170px] bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 rounded-2xl p-5 shadow-xl text-left flex flex-col justify-between transition-colors duration-300 select-none cursor-grab active:cursor-grabbing">
                        <div className="flex justify-between items-start">
                           <div>
                              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">{feature.title}</p>
                              <p className="text-slate-900 dark:text-white text-2xl font-bold mt-1">{feature.value}</p>
                           </div>
                           <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                              {feature.icon}
                           </div>
                        </div>
                        {/* Dynamic Content Area */}
                        <div className="w-full">
                           {feature.content}
                        </div>
                      </div>
                      {/* Badge */}
                      <div className="w-[140px] h-[32px] rounded-full bg-white/60 dark:bg-white/10 border border-slate-200 dark:border-white/10 backdrop-blur-md flex items-center justify-center gap-2 transition-colors duration-300">
                        {feature.badgeIcon}
                        <span className="text-slate-700 dark:text-white text-xs font-medium">{feature.badge}</span>
                      </div>
                    </motion.div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="-left-12 bg-slate-200/50 dark:bg-white/10 hover:bg-slate-300/50 dark:hover:bg-white/20 border-slate-300/50 dark:border-white/10 text-slate-700 dark:text-white z-30 cursor-pointer" />
              <CarouselNext className="-right-12 bg-slate-200/50 dark:bg-white/10 hover:bg-slate-300/50 dark:hover:bg-white/20 border-slate-300/50 dark:border-white/10 text-slate-700 dark:text-white z-30 cursor-pointer" />
            </Carousel>
          </div>
        </div>

        {/* Bottom Text */}
        <p className="text-slate-500 text-sm relative z-10 hidden lg:block transition-colors duration-300">
          © 2026 AppStokki. Todos os direitos reservados.
        </p>
      </div>

      {/* Right Side - Form */}
      <div className="lg:w-1/2 p-8 lg:p-12 flex items-center justify-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-md"
        >
          {/* Card - THEME ADAPTIVE GLASS MODE */}
          <div className="bg-white/80 dark:bg-slate-900/60 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-8 transition-colors duration-300">
            {/* Header */}
            <div className="text-center mb-8">
              <img src="/logo-branca.png" alt="AppStokki" className="h-12 w-auto mx-auto mb-4 dark:hidden" />
              <img src="/logo-preta.png" alt="AppStokki" className="h-12 w-auto mx-auto mb-4 hidden dark:block" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors duration-300">
                {activeTab === 'login' ? 'Bem-vindo de volta' : 'Crie sua conta'}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 transition-colors duration-300">
                {activeTab === 'login'
                  ? 'Acesse sua conta para continuar'
                  : 'Comece sua jornada de crescimento'}
              </p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={onTabChange} className="mb-6">
              <TabsList className="grid w-full grid-cols-2 h-12 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl transition-colors duration-300">
                <TabsTrigger
                  value="login"
                  className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-500 dark:text-slate-400 text-sm font-medium transition-all"
                >
                  Entrar
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:text-slate-900 dark:data-[state=active]:text-white text-slate-500 dark:text-slate-400 text-sm font-medium transition-all"
                >
                  Criar Conta
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Social Login Grid */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              {/* Google */}
              <Button
                variant="outline"
                type="button"
                onClick={handleGoogleLogin}
                disabled={googleLoading || facebookLoading || twitterLoading || loginLoading || regLoading}
                className="h-12 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-white/5 dark:text-white"
                title="Google"
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <img src="/google.png" alt="Google" className="w-5 h-5 object-contain" />
                )}
              </Button>

              {/* Facebook */}
              <Button
                variant="outline"
                type="button"
                onClick={handleFacebookLogin}
                disabled={googleLoading || facebookLoading || twitterLoading || loginLoading || regLoading}
                className="h-12 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-white/5 dark:text-white"
                title="Facebook"
              >
                {facebookLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <img src="/facebook.png" alt="Facebook" className="w-5 h-5 object-contain" />
                )}
              </Button>

              {/* X (Twitter) */}
              <Button
                variant="outline"
                type="button"
                onClick={handleXLogin}
                disabled={googleLoading || facebookLoading || twitterLoading || loginLoading || regLoading}
                className="h-12 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 dark:bg-white/5 dark:text-white"
                title="X / Twitter"
              >
                {twitterLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <img src="/twitter.png" alt="Twitter" className="w-5 h-5 object-contain" />
                )}
              </Button>
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200 dark:border-slate-700 transition-colors duration-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-transparent text-slate-500 dark:text-slate-400">ou continue com email</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={activeTab === 'login' ? handleLogin : handleRegister} className="relative">
                {(loginError || regError) && (
                    <Alert variant="destructive" className="bg-red-900/50 border-red-800 text-red-200 mb-4">
                        <AlertDescription>{loginError || regError}</AlertDescription>
                    </Alert>
                )}

              <AnimatePresence mode="wait">
              {activeTab === 'register' ? (
                <motion.div
                  key="register"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-700 dark:text-slate-300 font-medium">Nome completo</Label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Seu nome"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      className="h-12 pl-12 rounded-xl bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="h-12 pl-12 rounded-xl bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-medium">Senha</Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                  <Input
                    id="password"
                    type={showRegPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="h-12 pl-12 pr-10 rounded-xl bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300"
                  />
                  <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-3 top-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400">
                      {showRegPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

                 <div className="flex items-start space-x-2 pt-1">
                    <Checkbox id="terms" checked={acceptedTerms} onCheckedChange={(c) => setAcceptedTerms(c === true)} className="mt-1 border-slate-300 dark:border-slate-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
                    <Label htmlFor="terms" className="text-xs text-slate-500 dark:text-slate-400 leading-normal cursor-pointer">
                        Concordo com os <Link to="/terms" className="text-blue-600 dark:text-blue-400 hover:underline">Termos</Link> e <Link to="/privacy" className="text-blue-600 dark:text-blue-400 hover:underline">Privacidade</Link>
                    </Label>
                </div>

              <Button
                type="submit"
                disabled={regLoading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg shadow-blue-500/25 mt-6 transition-all border-0"
              >
                {regLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Criar conta
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
              </motion.div>
              ) : (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-4"
                >
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 font-medium">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="h-12 pl-12 rounded-xl bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 font-medium">Senha</Label>
                  <Link to="/forgot-password" type="button" className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors duration-300">
                      Esqueceu a senha?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 dark:text-slate-500" />
                  <Input
                    id="password"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="h-12 pl-12 pr-10 rounded-xl bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors duration-300"
                  />
                  <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-3 top-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-400">
                      {showLoginPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold shadow-lg shadow-blue-500/25 mt-6 transition-all border-0"
              >
                {loginLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    Entrar
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </>
                )}
              </Button>
              </motion.div>
              )}
              </AnimatePresence>
            </form>
          </div>

          <p className="text-center text-xs text-slate-500 mt-6">
            Ao continuar, você concorda com nossos{' '}
            <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Termos</a> e{' '}
            <a href="#" className="text-blue-600 dark:text-blue-400 hover:underline">Privacidade</a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
