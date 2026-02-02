import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useStore } from '@/hooks/useStore';
import { useImport } from '@/contexts/ImportContext';
import { WhatsAppModal } from '@/components/WhatsAppModal';
import { ImportCSVModal } from '@/components/ImportCSVModal';
import { importService } from '@/services/importService';

// Hooks for Data Preview
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useTransactions } from '@/hooks/useTransactions';
import { useExpenses } from '@/hooks/useExpenses';
import { useOrders } from '@/hooks/useOrders';

// Reusable Components
import { ProductForm } from '@/components/products/ProductForm';
import { SupplierForm } from '@/components/suppliers/SupplierForm';
import { CreateOrderSheet } from '@/components/orders/CreateOrderSheet';
import { TransactionSheet } from '@/components/financial/TransactionSheet';
import { StoreLivePreview } from '@/components/store/StoreLivePreview';
import { ComparativeAreaChart } from '@/components/dashboard/ComparativeAreaChart';
import { ModeToggle } from '@/components/mode-toggle';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Loader2, 
  ArrowLeft, 
  ArrowRight, 
  X, 
  Check, 
  Sparkles, 
  FileSpreadsheet, 
  Plus, 
  UploadCloud, 
  Package, 
  TrendingUp, 
  MessageCircle, 
  QrCode, 
  CheckCircle2, 
  XCircle,
  Truck,
  ShoppingCart,
  DollarSign
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { format, subDays } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

import { fetchStatus, deleteInstance } from '@/services/whatsappService';

type Step4Mode = 'choice' | 'import' | 'manual' | 'preview';
type ManualStep = 1 | 2 | 3 | 4;

const STORAGE_KEY_STORE_ID = 'onboarding_store_id';
const STORAGE_KEY_STEP = 'onboarding_step';

export default function Onboarding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { store, createStore } = useStore();
  
  // Data Hooks for Preview
  const { products: dbProducts, createProduct, updateProduct } = useProducts();
  const { categories, createCategory } = useCategories();
  const { suppliers: dbSuppliers } = useSuppliers();
  const { transactions: dbTransactions } = useTransactions();
  const { expenses: dbExpenses } = useExpenses();
  const { orders: dbOrders } = useOrders();

  const totalSteps = 4;

  // --- States ---
  const [currentStep, setCurrentStep] = useState(() => {
    if (typeof window === 'undefined') return 1;
    const savedStep = window.localStorage.getItem(STORAGE_KEY_STEP);
    const savedStoreId = window.localStorage.getItem(STORAGE_KEY_STORE_ID);
    if (savedStoreId && savedStep) {
      const parsed = parseInt(savedStep, 10);
      if (Number.isFinite(parsed) && parsed >= 1 && parsed <= totalSteps) {
        return parsed;
      }
    }
    return 1;
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [storeCreated, setStoreCreated] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!window.localStorage.getItem(STORAGE_KEY_STORE_ID);
  });

  // Step 1: Identity & Visual (Merged)
  const [storeName, setStoreName] = useState('');
  const [fullName, setFullName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [primaryColor, setPrimaryColor] = useState('#6366F1');

  // Step 2: WhatsApp (Reused Modal Logic)
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [waConnected, setWaConnected] = useState(false);

  // --- Effects ---
  const [step3Mode, setStep3Mode] = useState<Step4Mode>('choice');
  const [manualStep, setManualStep] = useState<ManualStep>(1);
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sheets State (Manual Flow)
  const [isOrderSheetOpen, setIsOrderSheetOpen] = useState(false);
  const [isTransactionSheetOpen, setIsTransactionSheetOpen] = useState(false);

  // --- Effects ---

  // Check WhatsApp Status on Mount or Step Change
  useEffect(() => {
    const checkWaStatus = async () => {
      if (!store?.whatsapp_instance_name) return;
      try {
        const status = await fetchStatus(store.whatsapp_instance_name);
        if (status && (status.instance?.state === 'open' || status.instance?.status === 'connected')) {
          setWaConnected(true);
        }
      } catch {
        // Ignore error
      }
    };

    if (currentStep === 2 && store?.whatsapp_instance_name) {
      checkWaStatus();
    }
  }, [currentStep, store?.whatsapp_instance_name]);

  // Persist Step
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY_STEP, currentStep.toString());
  }, [currentStep]);

  // Verify Store
  useEffect(() => {
    const verifyStore = async () => {
      if (typeof window === 'undefined' || !user) return;
      const savedStoreId = window.localStorage.getItem(STORAGE_KEY_STORE_ID);
      if (!savedStoreId) return;

      try {
        const { data, error } = await supabase
          .from('stores')
          .select('id, name, logo_url, primary_color')
          .eq('id', savedStoreId)
          .maybeSingle();

        if (error || !data) {
          window.localStorage.removeItem(STORAGE_KEY_STORE_ID);
          window.localStorage.removeItem(STORAGE_KEY_STEP);
          setCurrentStep(1);
          setStoreCreated(false);
        } else {
          setStoreCreated(true);
          setStoreName(data.name);
          if (data.logo_url) setLogoPreview(data.logo_url);
          if (data.primary_color) setPrimaryColor(data.primary_color);
        }
      } catch {
        // Ignore
      }
    };
    verifyStore();
  }, [user]);

  // Scroll to top
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStep, step3Mode, manualStep]);

  // --- Step 1 Handlers ---

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Tipo inválido', description: 'Selecione uma imagem.', variant: 'destructive' });
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const uploadLogoToStorage = async (storeId: string): Promise<string | null> => {
    if (!logoFile) return null;
    setIsUploadingLogo(true);
    try {
      const fileExt = logoFile.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${storeId}/logo.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('store-logos')
        .upload(fileName, logoFile, { cacheControl: '3600', upsert: true });

      if (uploadError) return null;
      const { data } = supabase.storage.from('store-logos').getPublicUrl(fileName);
      return data?.publicUrl || null;
    } catch {
      return null;
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleStep1Submit = async () => {
    if (!user) return;
    if (!storeName.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Update Profile
      const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', user.id).maybeSingle();
      if (!existingProfile) {
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email || '',
          full_name: fullName.trim() || storeName.trim(),
        });
      } else if (fullName.trim()) {
        await supabase.from('profiles').update({ full_name: fullName.trim() }).eq('id', user.id);
      }

      let currentStoreId = store?.id || window.localStorage.getItem(STORAGE_KEY_STORE_ID);

      if (!currentStoreId) {
        // Create Store
        const newStore = await createStore.mutateAsync({ name: storeName.trim() });
        if (!newStore?.id) throw new Error('Erro ao criar loja');
        currentStoreId = newStore.id;
        window.localStorage.setItem(STORAGE_KEY_STORE_ID, currentStoreId);
        setStoreCreated(true);
      } else {
        // Update Name
        await supabase.from('stores').update({ name: storeName.trim() }).eq('id', currentStoreId);
      }

      // Update Visuals
      if (logoFile) {
        const logoUrl = await uploadLogoToStorage(currentStoreId);
        if (logoUrl) {
          await supabase.from('stores').update({ logo_url: logoUrl }).eq('id', currentStoreId);
        }
      }
      await supabase.from('stores').update({ primary_color: primaryColor }).eq('id', currentStoreId);

      setCurrentStep(2);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Step 2 Handlers (WhatsApp) ---

  const handleWhatsAppSuccess = () => {
    setWaConnected(true);
    // Don't auto-advance, let user click Continue
  };

  const handleStep2Next = () => {
    setCurrentStep(3);
  };

  const handleStep2Back = async () => {
    setCurrentStep(1);
  };

  // --- Step 3 Handlers (Data) ---

  const handleImportSuccess = () => {
    queryClient.invalidateQueries();
    toast({ title: 'Dados importados com sucesso!' });
    setStep3Mode('preview');
  };

  const handleManualNext = () => {
    if (manualStep < 4) setManualStep(prev => (prev + 1) as ManualStep);
    else setStep3Mode('preview');
  };

  const handleManualBack = () => {
    if (manualStep > 1) setManualStep(prev => (prev - 1) as ManualStep);
    else setStep3Mode('choice');
  };

  // --- Step 4 Handlers (Final) ---

  const handleConfirmAndLaunch = async () => {
    if (!store) return;
    setIsSubmitting(true);
    try {
      await supabase.from('stores').update({ onboarding_completed_at: new Date().toISOString() }).eq('id', store.id);
      await queryClient.invalidateQueries();
      toast({ title: 'Loja lançada com sucesso!', description: 'Bem-vindo ao seu Dashboard.' });
      navigate('/');
    } catch (error) {
      toast({ title: 'Erro ao lançar', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAbortOnboarding = async () => {
    if (waConnected && store?.whatsapp_instance_name) {
      try {
        await deleteInstance(store.whatsapp_instance_name);
      } catch {
        // Ignore disconnect errors
      }
    }
    
    const idToDelete = store?.id || window.localStorage.getItem(STORAGE_KEY_STORE_ID);
    if (!idToDelete) {
      navigate('/login');
      return;
    }
    try {
      await supabase.rpc('delete_own_account');
      await supabase.auth.signOut();
      window.localStorage.clear();
      navigate('/login');
    } catch {
      navigate('/login');
    }
  };

  // --- Render Helpers ---

  const canProceedStep1 = !!storeName.trim() && !!fullName.trim();

  // Preview Data Calculations
  const salesTotal = dbTransactions?.filter(t => t.type === 'sale').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
  const expensesTotal = dbExpenses?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0; // dbExpenses from hook? Need to check hook name
  // Actually useTransactions returns all transactions. 
  // Let's use dbTransactions for both if type distinguishes them, but we have useExpenses too.
  // Wait, useTransactions returns `transactions` table. useExpenses returns `expenses` table.
  const expensesTotalReal = dbTransactions?.filter(t => t.type === 'expense' || t.type === 'purchase').reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
  // NOTE: Onboarding usually separates Expenses (Operational) from Transactions (Sales/Purchases).
  // But let's assume we show Summary.
  
  return (
    <div className="min-h-screen flex flex-col items-center bg-background relative">
       {/* Header */}
       <div className="w-full h-16 border-b bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
        <div className="flex items-center gap-2">
           {currentStep > 1 && (
             <Button variant="ghost" size="sm" onClick={currentStep === 2 ? handleStep2Back : () => setCurrentStep(prev => prev - 1)}>
               <ArrowLeft className="h-4 w-4 mr-2" />
               Voltar
             </Button>
           )}
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                Cancelar <X className="h-4 w-4 ml-2" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar configuração?</AlertDialogTitle>
                <AlertDialogDescription>Todo o progresso será perdido.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction onClick={handleAbortOnboarding} className="bg-destructive text-white">Sim, cancelar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <ModeToggle />
        </div>
      </div>

      <div className="w-full max-w-5xl py-6 px-4 md:px-8 flex-1 flex flex-col justify-center">

        {/* Step 1: Identity & Visual */}
        {currentStep === 1 && (
          <Card className="glass-card shadow-xl animate-in fade-in slide-in-from-bottom-4">
            <CardHeader>
              <div className="flex justify-between items-center mb-2">
                 <Badge variant="outline" className="text-muted-foreground">Passo 1 de {totalSteps}</Badge>
              </div>
              <CardTitle>Identidade da Loja</CardTitle>
              <CardDescription>Defina o nome, logo e cores da sua marca.</CardDescription>
              <Progress value={25} className="mt-2" />
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Seu Nome</Label>
                      <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ex: João Silva" />
                    </div>
                    <div>
                      <Label>Nome da Loja</Label>
                      <Input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Ex: Loja do João" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="block mb-2">Logo</Label>
                      <div onClick={() => logoInputRef.current?.click()} className="h-24 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors bg-muted/20">
                         {logoPreview ? <img src={logoPreview} className="h-full object-contain" /> : <UploadCloud className="h-6 w-6 text-muted-foreground" />}
                      </div>
                      <input type="file" ref={logoInputRef} onChange={handleLogoChange} accept="image/*" className="hidden" />
                    </div>
                    <div>
                      <Label className="block mb-2">Cor</Label>
                      <div className="flex gap-2">
                        <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-10 w-full cursor-pointer rounded-md border" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div>
                    <Label className="mb-2 block">Preview</Label>
                    <StoreLivePreview name={storeName} logoUrl={logoPreview} primaryColor={primaryColor} />
                  </div>
                  <Button 
                    className="w-full gradient-primary mt-6" 
                    onClick={handleStep1Submit} 
                    disabled={!canProceedStep1 || isSubmitting}
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" /> : 'Criar Loja e Continuar'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: WhatsApp */}
        {currentStep === 2 && (
          <Card className="glass-card shadow-xl animate-in fade-in slide-in-from-right-4">
            <CardHeader>
              <div className="flex justify-between items-center mb-2">
                 <Badge variant="outline" className="text-muted-foreground">Passo 2 de {totalSteps}</Badge>
              </div>
              <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5" /> WhatsApp</CardTitle>
              <CardDescription>Conecte para enviar recibos e notificações.</CardDescription>
              <Progress value={50} className="mt-2" />
            </CardHeader>
            <CardContent className="flex flex-col items-center py-6">
              <div className="text-center space-y-6 max-w-md w-full">
                 <div className={cn("p-4 rounded-full w-20 h-20 flex items-center justify-center mx-auto transition-colors", waConnected ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground")}>
                   {waConnected ? <CheckCircle2 className="h-10 w-10" /> : <QrCode className="h-10 w-10" />}
                 </div>
                 
                 <div className="space-y-2">
                   <h3 className="font-semibold text-lg">{waConnected ? 'Conectado com Sucesso!' : 'Conectar WhatsApp'}</h3>
                   <p className="text-sm text-muted-foreground">
                     {waConnected 
                       ? 'Sua loja já está pronta para enviar mensagens automáticas.' 
                       : 'Clique abaixo para abrir o assistente de conexão.'}
                   </p>
                 </div>

                 {!waConnected ? (
                   <div className="space-y-3">
                     <Button onClick={() => setIsWhatsAppModalOpen(true)} className="w-full gradient-primary">
                       <QrCode className="mr-2 h-4 w-4" /> Conectar Agora
                     </Button>
                     <div className="flex gap-3">
                        <Button variant="outline" onClick={handleStep2Back} className="flex-1">
                          Voltar
                        </Button>
                        <Button variant="ghost" onClick={handleStep2Next} className="flex-1">
                          Pular Etapa
                        </Button>
                     </div>
                   </div>
                 ) : (
                   <Button onClick={handleStep2Next} className="w-full gradient-primary">
                     Continuar <ArrowRight className="ml-2 h-4 w-4" />
                   </Button>
                 )}
              </div>
            </CardContent>
            <WhatsAppModal 
              open={isWhatsAppModalOpen} 
              onOpenChange={setIsWhatsAppModalOpen} 
              onConnect={handleWhatsAppSuccess}
            />
          </Card>
        )}

        {/* Step 3: Data */}
        {currentStep === 3 && (
          <div className="animate-in fade-in slide-in-from-right-4">
            
            {step3Mode === 'choice' && (
              <Card className="glass-card shadow-xl">
                 <CardHeader>
                   <div className="flex justify-between items-center mb-2">
                      <Badge variant="outline" className="text-muted-foreground">Passo 3 de {totalSteps}</Badge>
                   </div>
                   <CardTitle>Alimentar Estoque</CardTitle>
                   <CardDescription>Como você prefere inserir seus dados?</CardDescription>
                   <Progress value={75} className="mt-2" />
                 </CardHeader>
                 <CardContent className="grid md:grid-cols-2 gap-6 p-8">
                    <div 
                      onClick={() => setStep3Mode('import')}
                      className="cursor-pointer border-2 border-dashed border-muted hover:border-primary rounded-xl p-6 text-center space-y-4 transition-all hover:bg-muted/30"
                    >
                      <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                        <FileSpreadsheet className="h-8 w-8" />
                      </div>
                      <h3 className="font-bold text-lg">Importar Excel</h3>
                      <p className="text-sm text-muted-foreground">Se você já tem uma planilha pronta.</p>
                    </div>

                    <div 
                      onClick={() => setStep3Mode('manual')}
                      className="cursor-pointer border-2 border-dashed border-muted hover:border-blue-500 rounded-xl p-6 text-center space-y-4 transition-all hover:bg-muted/30"
                    >
                      <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto">
                        <Plus className="h-8 w-8" />
                      </div>
                      <h3 className="font-bold text-lg">Cadastro Manual</h3>
                      <p className="text-sm text-muted-foreground">Passo a passo com assistente.</p>
                    </div>
                 </CardContent>
                 <div className="p-6 pt-0 flex justify-start">
                    <Button variant="ghost" onClick={() => setCurrentStep(2)}>
                      <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>
                 </div>
              </Card>
            )}

            {step3Mode === 'import' && (
              <Card className="glass-card shadow-xl">
                <CardHeader>
                  <div className="flex justify-between items-center mb-2">
                     <Badge variant="outline" className="text-muted-foreground">Passo 3 de {totalSteps}</Badge>
                  </div>
                  <Button variant="ghost" className="w-fit pl-0" onClick={() => setStep3Mode('choice')}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
                  <CardTitle>Importar Planilha</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center py-10 space-y-6">
                   <div className="text-center max-w-md space-y-4">
                     <div className="p-4 bg-green-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto">
                        <FileSpreadsheet className="h-10 w-10 text-green-600" />
                     </div>
                     <h3 className="font-semibold text-lg">Assistente de Importação</h3>
                     <p className="text-muted-foreground">
                        Nosso assistente irá guiar você para importar seus produtos de uma planilha Excel ou CSV.
                        Você poderá visualizar e corrigir os dados antes de confirmar.
                     </p>
                     <Button onClick={() => setIsImportModalOpen(true)} className="w-full gradient-primary">
                        <UploadCloud className="mr-2 h-4 w-4" /> Abrir Assistente de Importação
                     </Button>
                   </div>
                   
                   <ImportCSVModal 
                      open={isImportModalOpen}
                      onOpenChange={setIsImportModalOpen}
                      onImportComplete={handleImportSuccess}
                      categories={categories}
                      existingProducts={dbProducts || []}
                      createProduct={createProduct.mutateAsync}
                      updateProduct={async (id, data) => updateProduct.mutateAsync({ id, ...data })}
                      createCategory={createCategory.mutateAsync}
                   />
                </CardContent>
              </Card>
            )}

            {step3Mode === 'manual' && (
              <Card className="glass-card shadow-xl">
                <CardHeader>
                  <div className="flex justify-between items-center mb-2">
                     <Badge variant="outline" className="text-muted-foreground">Passo 3 de {totalSteps}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                     <Button variant="ghost" className="pl-0" onClick={handleManualBack}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
                     <div className="flex gap-2">
                        {[1,2,3,4].map(s => (
                          <div key={s} className={cn("h-2 w-8 rounded-full transition-colors", manualStep >= s ? "bg-primary" : "bg-muted")} />
                        ))}
                     </div>
                  </div>
                  <CardTitle>
                    {manualStep === 1 && "1. Cadastro de Produtos"}
                    {manualStep === 2 && "2. Fornecedores"}
                    {manualStep === 3 && "3. Primeira Venda"}
                    {manualStep === 4 && "4. Despesas Iniciais"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   {manualStep === 1 && (
                     <div className="space-y-6">
                       <div className="border rounded-xl p-4 bg-background/50">
                          <ProductForm onSuccess={() => queryClient.invalidateQueries()} />
                       </div>
                       <div className="bg-muted/30 p-4 rounded-lg">
                          <h4 className="font-semibold text-sm mb-2">Adicionados Recentemente:</h4>
                          <div className="flex gap-2 overflow-x-auto pb-2">
                            {dbProducts?.slice(0,5).map(p => (
                              <Badge key={p.id} variant="secondary" className="whitespace-nowrap">{p.name}</Badge>
                            ))}
                            {(!dbProducts || dbProducts.length === 0) && <span className="text-xs text-muted-foreground">Nenhum produto ainda.</span>}
                          </div>
                       </div>
                     </div>
                   )}

                   {manualStep === 2 && (
                     <div className="space-y-6">
                       <div className="border rounded-xl p-6 bg-background/50">
                          <SupplierForm onSuccess={() => queryClient.invalidateQueries()} />
                       </div>
                       <div className="bg-muted/30 p-4 rounded-lg">
                          <h4 className="font-semibold text-sm mb-2">Fornecedores:</h4>
                          <div className="flex gap-2 overflow-x-auto">
                            {dbSuppliers?.slice(0,5).map(s => (
                              <Badge key={s.id} variant="outline" className="whitespace-nowrap">{s.name}</Badge>
                            ))}
                          </div>
                       </div>
                     </div>
                   )}

                   {manualStep === 3 && (
                     <div className="space-y-6 flex flex-col items-center justify-center py-8">
                        <ShoppingCart className="h-16 w-16 text-primary/20 mb-4" />
                        <h3 className="text-xl font-bold">Lançar Pedido de Venda</h3>
                        <p className="text-muted-foreground text-center max-w-md">Simule ou registre sua primeira venda real usando o PDV completo.</p>
                        
                        <Button size="lg" className="gradient-primary" onClick={() => setIsOrderSheetOpen(true)}>
                           <Plus className="mr-2 h-4 w-4" /> Abrir PDV
                        </Button>

                        <CreateOrderSheet 
                          open={isOrderSheetOpen} 
                          onOpenChange={setIsOrderSheetOpen} 
                          onSuccess={() => {
                            queryClient.invalidateQueries();
                            toast({ title: "Venda registrada!" });
                          }}
                        />

                        <div className="w-full mt-8 border-t pt-4">
                           <h4 className="font-semibold text-sm mb-2">Vendas Hoje:</h4>
                           {dbOrders?.slice(0,3).map(o => (
                             <div key={o.id} className="flex justify-between text-sm py-1 border-b">
                               <span>Pedido #{o.id.slice(0,4)}</span>
                               <span className="font-bold text-green-600">{formatCurrency(o.total_amount)}</span>
                             </div>
                           ))}
                        </div>
                     </div>
                   )}

                   {manualStep === 4 && (
                     <div className="space-y-6 flex flex-col items-center justify-center py-8">
                        <DollarSign className="h-16 w-16 text-red-500/20 mb-4" />
                        <h3 className="text-xl font-bold">Registrar Despesas</h3>
                        <p className="text-muted-foreground text-center max-w-md">Contas de luz, aluguel, fornecedores ou custos iniciais.</p>
                        
                        <Button size="lg" variant="destructive" onClick={() => setIsTransactionSheetOpen(true)}>
                           <ArrowRight className="mr-2 h-4 w-4" /> Lançar Despesa
                        </Button>

                        <TransactionSheet 
                          open={isTransactionSheetOpen} 
                          onOpenChange={setIsTransactionSheetOpen}
                          defaultType="expense"
                        />

                         <div className="w-full mt-8 border-t pt-4">
                           <h4 className="font-semibold text-sm mb-2">Transações Recentes:</h4>
                           {dbTransactions?.slice(0,3).map(t => (
                             <div key={t.id} className="flex justify-between text-sm py-1 border-b">
                               <span>{t.description || t.category}</span>
                               <span className={cn("font-bold", t.type === 'sale' ? "text-green-600" : "text-red-600")}>
                                 {t.type === 'sale' ? '+' : '-'}{formatCurrency(t.amount)}
                               </span>
                             </div>
                           ))}
                        </div>
                     </div>
                   )}

                   <div className="flex justify-end mt-8">
                      <Button onClick={handleManualNext} className="gradient-primary">
                        {manualStep === 4 ? 'Finalizar Manual' : 'Próximo Passo'} <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                   </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 4: Preview (Grand Finale) */}
        {currentStep === 4 && (
           <Card className="glass-card shadow-xl border-primary/20 animate-in fade-in zoom-in-95 duration-500">
             <CardHeader className="text-center pb-2 relative">
                <div className="absolute top-0 left-0">
                   <Badge variant="outline" className="text-muted-foreground">Passo 4 de {totalSteps}</Badge>
                </div>
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-primary/20 mt-6">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl">Tudo pronto para o lançamento!</CardTitle>
                <CardDescription>Confira como sua loja vai ficar.</CardDescription>
             </CardHeader>
             <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-background/50 border flex flex-col items-center justify-center text-center">
                      <Package className="h-6 w-6 text-blue-500 mb-2" />
                      <span className="text-2xl font-bold">{dbProducts?.length || 0}</span>
                      <span className="text-xs text-muted-foreground uppercase">Produtos</span>
                    </div>
                    <div className="p-4 rounded-xl bg-background/50 border flex flex-col items-center justify-center text-center">
                      <TrendingUp className="h-6 w-6 text-green-500 mb-2" />
                      <span className="text-2xl font-bold text-green-600">{formatCurrency(salesTotal)}</span>
                      <span className="text-xs text-muted-foreground uppercase">Receita</span>
                    </div>
                    <div className="p-4 rounded-xl bg-background/50 border flex flex-col items-center justify-center text-center">
                      <TrendingUp className="h-6 w-6 text-red-500 mb-2 rotate-180" />
                      <span className="text-2xl font-bold text-red-600">{formatCurrency(expensesTotalReal)}</span>
                      <span className="text-xs text-muted-foreground uppercase">Despesas</span>
                    </div>
                  </div>

                  {/* Final Actions */}
                  <div className="pt-4 space-y-3">
                    <Button 
                      className="w-full h-14 text-lg font-bold shadow-xl gradient-primary"
                      onClick={handleConfirmAndLaunch}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" /> : 'Confirmar e Lançar Loja'}
                    </Button>
                    <Button variant="ghost" onClick={() => setCurrentStep(3)} className="w-full">
                       Voltar para Revisão
                    </Button>
                  </div>
             </CardContent>
           </Card>
        )}

      </div>
    </div>
  );
}
