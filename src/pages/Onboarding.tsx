import { cn } from "@/lib/utils";
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useCustomers } from '@/hooks/useCustomers';
import { useTransactions } from '@/hooks/useTransactions';
import { useExpenses } from '@/hooks/useExpenses';
import { useStoreSettings } from '@/hooks/useStoreSettings';
import { useStore } from '@/hooks/useStore';
import { useImport } from '@/contexts/ImportContext';
import { fetchStatus, deleteInstance } from '@/services/whatsappService';
import { importService } from '@/services/importService';
import { ImportCSVModal } from '@/components/ImportCSVModal';
import { SalesImportModal } from '@/components/SalesImportModal';
import { ExpensesImportModal } from '@/components/ExpensesImportModal';
import { WhatsAppModal } from '@/components/WhatsAppModal';
import { ImportFloatingStatus } from '@/components/ImportFloatingStatus';
import { ImportModal } from '@/components/ImportModal';
import { BulkOperationFloatingStatus } from '@/components/BulkOperationFloatingStatus';
import { BulkOperationModal } from '@/components/BulkOperationModal';
import { ModeToggle } from '@/components/mode-toggle';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ComparativeAreaChart } from '@/components/dashboard/ComparativeAreaChart';
import { StoreLivePreview } from '@/components/store/StoreLivePreview';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatCurrency } from '@/lib/format';
import { format, startOfDay, subDays } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Store, 
  Package, 
  MessageCircle, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft,
  Loader2,
  FileSpreadsheet,
  Users,
  BarChart3,
  Sparkles,
  Smartphone,
  UploadCloud,
  X,
  Check,
  Trash2,
  Lock,
  Globe,
  Instagram,
  Plus,
  Truck,
  DollarSign,
  TrendingUp,
  Box,
  TrendingDown
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type WhatsAppStatus = 'connected' | 'disconnected' | 'checking';
type Step4Mode = 'choice' | 'import' | 'manual' | 'preview';
type ManualStep = 1 | 2 | 3;

const STORAGE_KEY_STORE_ID = 'onboarding_store_id';
const STORAGE_KEY_STEP = 'onboarding_step';

export default function Onboarding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Hooks
  const { products, createProduct, updateProduct } = useProducts();
  const { categories, createCategory } = useCategories();
  const { customers } = useCustomers();
  const { transactions } = useTransactions();
  const { expenses, createExpense, updateExpense: updateExpenseHook } = useExpenses();
  const { store, createStore } = useStore();
  const { isImporting } = useImport();

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

  // Step 1: Identity
  const [storeName, setStoreName] = useState('');
  const [fullName, setFullName] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [primaryColor, setPrimaryColor] = useState('#6366F1');

  // Step 3: Channels
  const [storeSlug, setStoreSlug] = useState('');
  const [isSlugChecking, setIsSlugChecking] = useState(false);
  const [isSlugUnique, setIsSlugUnique] = useState(true);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [instagramHandle, setInstagramHandle] = useState('');

  // Step 4: Data Entry Logic
  const [step4Mode, setStep4Mode] = useState<Step4Mode>('choice');
  const [manualStep, setManualStep] = useState<ManualStep>(1);
  const [previewData, setPreviewData] = useState<{
    products: any[];
    sales: any[];
    expenses: any[];
    suppliers: any[];
  }>({ products: [], sales: [], expenses: [], suppliers: [] });
  
  const [isProcessingImport, setIsProcessingImport] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [missingImportType, setMissingImportType] = useState<'sales' | 'expenses' | null>(null);

  // Manual Entry States
  const [manualProduct, setManualProduct] = useState({ name: '', price: '', cost: '', quantity: '' });
  const [manualSupplier, setManualSupplier] = useState({ name: '', phone: '' });
  
  // Financial Form State (Step 4.3)
  const [financialTab, setFinancialTab] = useState<'sale' | 'expense'>('sale');
  const [financialForm, setFinancialForm] = useState({
    description: '',
    amount: 0,
    category: ''
  });

  // WhatsApp Status
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus>('disconnected');

  const progress = (currentStep / totalSteps) * 100;

  // --- Effects ---

  // Slug Validation
  useEffect(() => {
    const raw = storeSlug.toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (raw !== storeSlug) setStoreSlug(raw);
    if (!raw || raw.length < 3) {
      setIsSlugUnique(true);
      setSlugError(null);
      return;
    }
    setIsSlugChecking(true);
    const t = setTimeout(async () => {
      try {
        const { data, error } = await supabase.from('stores').select('id').eq('catalog_slug', raw).limit(1);
        if (error) {
          setIsSlugUnique(true);
          setSlugError(null);
        } else {
          setIsSlugUnique(!data || data.length === 0);
          setSlugError(data && data.length > 0 ? 'Slug já está em uso' : null);
        }
      } catch {
        setIsSlugUnique(true);
        setSlugError(null);
      } finally {
        setIsSlugChecking(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [storeSlug]);

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
          .select('id')
          .eq('id', savedStoreId)
          .maybeSingle();

        if (error || !data) {
          window.localStorage.removeItem(STORAGE_KEY_STORE_ID);
          window.localStorage.removeItem(STORAGE_KEY_STEP);
          setCurrentStep(1);
          setStoreCreated(false);
        } else {
          setStoreCreated(true);
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
  }, [currentStep, step4Mode, manualStep]);

  // WhatsApp Check
  useEffect(() => {
    if (currentStep !== 3) return; // Only check on channels step for now, or background
    const checkStatus = async () => {
      setWhatsappStatus('checking');
      try {
        const { data: storeData } = await supabase
          .from('stores')
          .select('whatsapp_instance_name')
          .eq('id', store?.id)
          .maybeSingle();
        const instanceName = storeData?.whatsapp_instance_name;
        if (!instanceName) {
          setWhatsappStatus('disconnected');
          return;
        }
        const status = await fetchStatus(instanceName);
        const connection = status?.instance?.state || status?.instance?.status;
        if (connection === 'open' || connection === 'connected') {
          setWhatsappStatus('connected');
        } else {
          setWhatsappStatus('disconnected');
        }
      } catch {
        setWhatsappStatus('disconnected');
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, [currentStep, store?.id]);

  // --- Step 1 Handlers ---

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Tipo inválido', description: 'Selecione uma imagem.', variant: 'destructive' });
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast({ title: 'Arquivo muito grande', description: 'Máximo 2MB.', variant: 'destructive' });
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

      if (uploadError && !uploadError.message.includes('Bucket not found')) {
        console.error('Logo upload error:', uploadError);
        return null;
      }
      const { data } = supabase.storage.from('store-logos').getPublicUrl(fileName);
      return data?.publicUrl || null;
    } catch {
      return null;
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleCreateStoreAndProceed = async () => {
    if (!user) return;
    if (!storeName.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create/Update Profile
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

      // Create Store
      const newStore = await createStore.mutateAsync({ name: storeName.trim() });
      if (!newStore?.id) throw new Error('Erro ao criar loja');

      // Upload Logo
      if (logoFile) {
        const logoUrl = await uploadLogoToStorage(newStore.id);
        if (logoUrl) {
          await supabase.from('stores').update({ logo_url: logoUrl }).eq('id', newStore.id);
        }
      }

      window.localStorage.setItem(STORAGE_KEY_STORE_ID, newStore.id);
      setStoreCreated(true);
      setCurrentStep(2);
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Step 2 & 3 Handlers (Identity & Channels) ---

  const handleNext = async () => {
    if (currentStep === 2) {
      // Visual Identity update
      if (!user) return;
      const savedStoreId = window.localStorage.getItem(STORAGE_KEY_STORE_ID) || store?.id;
      if (!savedStoreId) return;
      
      if (logoFile) {
        const logoUrl = await uploadLogoToStorage(savedStoreId);
        if (logoUrl) {
          await supabase.from('stores').update({ logo_url: logoUrl }).eq('id', savedStoreId);
        }
      }
      await supabase.from('stores').update({ primary_color: primaryColor }).eq('id', savedStoreId);
      setCurrentStep(3);
      return;
    }

    if (currentStep === 3) {
      // Channels update
      if (!user) return;
      const savedStoreId = window.localStorage.getItem(STORAGE_KEY_STORE_ID) || store?.id;
      if (!savedStoreId) return;

      const phoneDigits = whatsappNumber.replace(/\D/g, '');
      const normalizedPhone = whatsappNumber.startsWith('+') ? whatsappNumber : `+${phoneDigits}`;
      const cleanInstagram = instagramHandle.replace(/^@/, '');
      
      await supabase.from('stores').update({
        whatsapp: normalizedPhone,
        catalog_slug: storeSlug,
        slug: storeSlug,
        instagram_handle: cleanInstagram || null
      }).eq('id', savedStoreId);
      
      setCurrentStep(4);
      return;
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      if (currentStep === 2 && storeCreated) return;
      setCurrentStep(prev => prev - 1);
    }
  };

  // --- Step 4 Handlers (Data) ---

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.xlsx')) {
      toast({ title: 'Formato inválido', description: 'Use apenas .xlsx', variant: 'destructive' });
      return;
    }

    setIsProcessingImport(true);
    try {
      const data = await importService.parseExcelFile(file);
      // Ensure suppliers is initialized if not present in return type (adapting to service)
      const fullData = { 
        products: data.products || [], 
        sales: data.sales || [], 
        expenses: data.expenses || [], 
        suppliers: (data as any).suppliers || [] 
      };

      setPreviewData(fullData);

      // Gap Detection
      if (fullData.products.length > 0 && fullData.sales.length === 0) {
        setMissingImportType('sales');
      } else {
        setStep4Mode('preview');
      }
    } catch (error) {
      toast({ title: 'Erro ao ler arquivo', variant: 'destructive' });
    } finally {
      setIsProcessingImport(false);
    }
  };

  const handleAddManualProduct = () => {
    if (!manualProduct.name || !manualProduct.price) return;
    const newProduct = {
      name: manualProduct.name,
      selling_price: parseFloat(manualProduct.price),
      cost_price: parseFloat(manualProduct.cost) || 0,
      quantity: parseInt(manualProduct.quantity) || 1,
      // Add temp ID for list rendering
      _tempId: Date.now()
    };
    setPreviewData(prev => ({ ...prev, products: [...prev.products, newProduct] }));
    setManualProduct({ name: '', price: '', cost: '', quantity: '' });
    toast({ title: 'Produto adicionado à lista!' });
  };

  const handleAddManualSupplier = () => {
    if (!manualSupplier.name) return;
    const newSupplier = {
      name: manualSupplier.name,
      phone: manualSupplier.phone,
      _tempId: Date.now()
    };
    setPreviewData(prev => ({ ...prev, suppliers: [...prev.suppliers, newSupplier] }));
    setManualSupplier({ name: '', phone: '' });
    toast({ title: 'Fornecedor adicionado à lista!' });
  };

  // Financial Handlers (Step 4.3)
  const handleAddFinancialItem = () => {
    if (!financialForm.description || financialForm.amount <= 0) return;

    const newItem = {
      description: financialForm.description,
      amount: financialForm.amount, // Valor já vem numérico do CurrencyInput
      category: financialForm.category || (financialTab === 'sale' ? 'Venda' : 'Geral'),
      date: new Date().toISOString(),
      type: financialTab, // 'sale' or 'expense'
      _tempId: Date.now()
    };

    if (financialTab === 'sale') {
      // Adapt structure for sales (transactions)
      const newSale = {
        ...newItem,
        product_name: newItem.description,
        total_amount: newItem.amount,
        quantity: 1,
      };
      setPreviewData(prev => ({ ...prev, sales: [...prev.sales, newSale] }));
    } else {
      // Adapt structure for expenses
      setPreviewData(prev => ({ ...prev, expenses: [...prev.expenses, newItem] }));
    }

    setFinancialForm({ description: '', amount: 0, category: '' });
    toast({ title: `${financialTab === 'sale' ? 'Venda' : 'Despesa'} adicionada!` });
  };

  const handleRemoveFinancialItem = (type: 'sale' | 'expense', index: number) => {
    if (type === 'sale') {
      setPreviewData(prev => ({ ...prev, sales: prev.sales.filter((_, i) => i !== index) }));
    } else {
      setPreviewData(prev => ({ ...prev, expenses: prev.expenses.filter((_, i) => i !== index) }));
    }
  };

  const handleManualFinish = () => {
    setStep4Mode('preview');
  };

  // --- Final Confirmation & Save ---

  const handleConfirmAndLaunch = async () => {
    if (!store) return;
    setIsSubmitting(true);

    try {
      // 1. Save Suppliers
      if (previewData.suppliers.length > 0) {
        const formattedSuppliers = previewData.suppliers.map(s => ({
          store_id: store.id,
          name: s.name,
          phone: s.phone
        }));
        await supabase.from('suppliers' as any).insert(formattedSuppliers);
      }

      // 2. Save Products (and Categories if needed)
      if (previewData.products.length > 0) {
        const formattedProducts = importService.normalizeProducts(previewData.products, store.id);
        const { error } = await supabase.from('products').insert(formattedProducts.map(p => {
          const { _tempId, ...rest } = p; // Remove temp ID
          return rest;
        }));
        if (error) throw error;
      }

      // 3. Save Sales
      if (previewData.sales.length > 0) {
        const formattedSales = importService.normalizeSales(previewData.sales, store.id);
        const { error } = await supabase.from('transactions').insert(formattedSales);
        if (error) throw error;
      }

      // 4. Save Expenses
      if (previewData.expenses.length > 0) {
        const formattedExpenses = importService.normalizeExpenses(previewData.expenses, store.id);
        const { error } = await supabase.from('expenses').insert(formattedExpenses);
        if (error) throw error;
      }

      // 5. Mark Onboarding as Completed
      await supabase.from('stores').update({ onboarding_completed_at: new Date().toISOString() }).eq('id', store.id);

      // 6. Invalidate Queries & Navigate
      await queryClient.invalidateQueries();
      toast({ title: 'Loja lançada com sucesso!', description: 'Bem-vindo ao seu Dashboard.' });
      navigate('/');

    } catch (error: any) {
      console.error('Launch error:', error);
      toast({ title: 'Erro ao lançar loja', description: error.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAbortOnboarding = async () => {
    // Reuse existing abort logic...
    const idToDelete = store?.id || window.localStorage.getItem(STORAGE_KEY_STORE_ID);
    if (!idToDelete) {
      navigate('/login');
      return;
    }
    setIsSubmitting(true);
    try {
      await supabase.rpc('delete_own_account');
      queryClient.clear();
      await supabase.auth.signOut();
      window.localStorage.removeItem(STORAGE_KEY_STORE_ID);
      window.localStorage.removeItem(STORAGE_KEY_STEP);
      navigate('/login');
    } catch {
      // Fallback
      await supabase.auth.signOut();
      navigate('/login');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Computed Data for Preview ---
  const salesTotal = useMemo(() => previewData.sales.reduce((acc, curr) => acc + Number(curr.total_amount || 0), 0), [previewData.sales]);
  const expensesTotal = useMemo(() => previewData.expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0), [previewData.expenses]);
  const projectedBalance = salesTotal - expensesTotal;

  const chartData = useMemo(() => {
    // Generate dummy chart data based on previewData for visualization
    const salesMap = new Map();
    const expensesMap = new Map();
    
    const today = new Date();
    for(let i=6; i>=0; i--) {
      const d = format(subDays(today, i), 'dd/MM');
      salesMap.set(d, 0);
      expensesMap.set(d, 0);
    }

    previewData.sales.forEach(s => {
      const d = s.date ? format(new Date(s.date), 'dd/MM') : format(today, 'dd/MM');
      salesMap.set(d, (salesMap.get(d) || 0) + Number(s.total_amount || 0));
    });

    previewData.expenses.forEach(e => {
      const d = e.date ? format(new Date(e.date), 'dd/MM') : format(today, 'dd/MM');
      expensesMap.set(d, (expensesMap.get(d) || 0) + Number(e.amount || 0));
    });

    return {
      sales: Array.from(salesMap.entries()).map(([date, amount]) => ({ date, amount })),
      expenses: Array.from(expensesMap.entries()).map(([date, amount]) => ({ date, amount }))
    };
  }, [previewData]);


  // --- Render Helpers ---

  const canProceedStep1 = !!storeName.trim() && !!fullName.trim();
  const canProceedStep2 = !!logoPreview && /^#([0-9A-Fa-f]{6})$/.test(primaryColor);
  const canProceedStep3 = /^[a-z0-9-]{3,30}$/.test(storeSlug) && isSlugUnique && !isSlugChecking;

  return (
    <div className="min-h-screen flex flex-col items-center bg-background relative">
      {/* Header */}
      <div className="w-full h-16 border-b bg-background/80 backdrop-blur-sm flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
        <div className="flex items-center gap-2">
           {currentStep > 1 && !storeCreated && (
             <Button variant="ghost" size="sm" onClick={handleBack}>
               <ArrowLeft className="h-4 w-4 mr-2" />
               Voltar
             </Button>
           )}
        </div>
        <div className="flex items-center gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                Cancelar
                <X className="h-4 w-4 ml-2" />
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

      <div className="w-full max-w-4xl py-6 px-4 md:px-8 flex-1 flex flex-col justify-center">
        
        {/* Step 1: Identity */}
        {currentStep === 1 && (
          <Card className="glass-card shadow-xl animate-in fade-in slide-in-from-bottom-4">
            <CardHeader>
              <CardTitle>Identidade da Loja</CardTitle>
              <CardDescription>Comece definindo o nome e responsável.</CardDescription>
              <Progress value={25} className="mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Seu Nome</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ex: João Silva" />
              </div>
              <div>
                <Label>Nome da Loja</Label>
                <Input value={storeName} onChange={e => setStoreName(e.target.value)} placeholder="Ex: Loja do João" />
              </div>
              <Button 
                className="w-full gradient-primary mt-4" 
                onClick={handleCreateStoreAndProceed} 
                disabled={!canProceedStep1 || isSubmitting}
              >
                {isSubmitting ? <Loader2 className="animate-spin" /> : 'Criar Loja e Continuar'}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Visual */}
        {currentStep === 2 && (
          <Card className="glass-card shadow-xl animate-in fade-in slide-in-from-right-4">
            <CardHeader>
              <CardTitle>Identidade Visual</CardTitle>
              <CardDescription>Logo e cores da sua marca.</CardDescription>
              <Progress value={50} className="mt-2" />
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <Label className="block mb-2">Logo</Label>
                    <input type="file" ref={logoInputRef} onChange={handleLogoChange} accept="image/*" className="hidden" />
                    <div onClick={() => logoInputRef.current?.click()} className="w-32 h-32 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                      {logoPreview ? (
                        <img src={logoPreview} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <UploadCloud className="mx-auto h-8 w-8 mb-2" />
                          <span className="text-xs">Upload</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label>Cor Primária</Label>
                    <div className="flex gap-4 mt-2">
                      <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="h-10 w-16 cursor-pointer" />
                      <Input value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="font-mono" />
                    </div>
                  </div>
                </div>
                <div>
                  <Label className="mb-2 block">Preview</Label>
                  <StoreLivePreview name={storeName} logoUrl={logoPreview} primaryColor={primaryColor} />
                </div>
              </div>
              <div className="flex justify-between mt-8">
                <Button variant="outline" onClick={handleBack}>Voltar</Button>
                <Button className="gradient-primary" onClick={handleNext} disabled={!canProceedStep2}>Próximo</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Channels */}
        {currentStep === 3 && (
          <Card className="glass-card shadow-xl animate-in fade-in slide-in-from-right-4">
            <CardHeader>
              <CardTitle>Canais de Venda</CardTitle>
              <CardDescription>Configure seu link e contatos.</CardDescription>
              <Progress value={75} className="mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Link da Loja (Slug)</Label>
                <div className="flex mt-2">
                  <div className="bg-muted px-3 py-2 border border-r-0 rounded-l-md text-sm text-muted-foreground flex items-center">
                    appstokki.com/loja/
                  </div>
                  <Input value={storeSlug} onChange={e => setStoreSlug(e.target.value)} className="rounded-l-none" placeholder="minha-loja" />
                </div>
                {!isSlugUnique && <p className="text-xs text-destructive mt-1">Slug indisponível</p>}
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>WhatsApp</Label>
                  <div className="relative mt-2">
                    <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" value={whatsappNumber} onChange={e => setWhatsappNumber(e.target.value)} placeholder="+55..." />
                  </div>
                </div>
                <div>
                  <Label>Instagram</Label>
                  <div className="relative mt-2">
                    <Instagram className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" value={instagramHandle} onChange={e => setInstagramHandle(e.target.value)} placeholder="@loja" />
                  </div>
                </div>
              </div>
              <div className="flex justify-between mt-6">
                <Button variant="outline" onClick={handleBack}>Voltar</Button>
                <Button className="gradient-primary" onClick={handleNext} disabled={!canProceedStep3}>Próximo</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Data & Launch */}
        {currentStep === 4 && (
          <div className="animate-in fade-in slide-in-from-right-4">
            
            {/* Mode: Choice */}
            {step4Mode === 'choice' && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-bold tracking-tight">Como deseja começar?</h2>
                  <p className="text-muted-foreground">Escolha a melhor forma de preencher sua loja.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-6 mt-8">
                  <Card 
                    className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg group relative overflow-hidden"
                    onClick={() => setStep4Mode('import')}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-green-100 text-green-600 flex items-center justify-center mb-4">
                        <FileSpreadsheet className="h-6 w-6" />
                      </div>
                      <CardTitle>Importação Rápida</CardTitle>
                      <CardDescription>Ideal se você já tem uma planilha de controle.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Produtos e Estoque</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Histórico de Vendas</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-green-500" /> Despesas e Fornecedores</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card 
                    className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg group relative overflow-hidden"
                    onClick={() => setStep4Mode('manual')}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardHeader>
                      <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mb-4">
                        <Plus className="h-6 w-6" />
                      </div>
                      <CardTitle>Cadastro Manual</CardTitle>
                      <CardDescription>Comece do zero com nosso assistente passo-a-passo.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-muted-foreground">
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-500" /> Cadastro Simples</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-500" /> Controle Total</li>
                        <li className="flex items-center gap-2"><Check className="h-4 w-4 text-blue-500" /> Ideal para iniciantes</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Mode: Import */}
            {step4Mode === 'import' && (
              <Card className="glass-card shadow-xl">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => setStep4Mode('choice')}><ArrowLeft className="h-4 w-4" /></Button>
                    <CardTitle>Importar Dados</CardTitle>
                  </div>
                  <CardDescription>Faça upload da sua planilha (.xlsx)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div 
                    className="border-2 border-dashed border-border/60 rounded-xl p-10 flex flex-col items-center justify-center text-center space-y-4 bg-background/50 hover:bg-background/80 transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      {isProcessingImport ? <Loader2 className="h-8 w-8 animate-spin text-primary" /> : <UploadCloud className="h-8 w-8 text-primary" />}
                    </div>
                    <div>
                      <p className="font-semibold text-lg">Clique para fazer upload</p>
                      <p className="text-sm text-muted-foreground">Suporta arquivos .xlsx</p>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".xlsx" className="hidden" />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Mode: Manual */}
            {step4Mode === 'manual' && (
              <Card className="glass-card shadow-xl">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => {
                      if (manualStep > 1) setManualStep(prev => (prev - 1) as ManualStep);
                      else setStep4Mode('choice');
                    }}><ArrowLeft className="h-4 w-4" /></Button>
                    <CardTitle>
                      {manualStep === 1 && 'Cadastro de Estoque'}
                      {manualStep === 2 && 'Fornecedores'}
                      {manualStep === 3 && 'Movimentação Financeira'}
                    </CardTitle>
                  </div>
                  <Progress value={(manualStep / 3) * 100} className="mt-2" />
                </CardHeader>
                <CardContent className="space-y-6">
                  {manualStep === 1 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <Label>Nome do Produto</Label>
                          <Input value={manualProduct.name} onChange={e => setManualProduct(p => ({...p, name: e.target.value}))} placeholder="Ex: Camiseta Branca" />
                        </div>
                        <div>
                          <Label>Preço de Venda</Label>
                          <Input type="number" value={manualProduct.price} onChange={e => setManualProduct(p => ({...p, price: e.target.value}))} placeholder="0.00" />
                        </div>
                        <div>
                          <Label>Quantidade</Label>
                          <Input type="number" value={manualProduct.quantity} onChange={e => setManualProduct(p => ({...p, quantity: e.target.value}))} placeholder="1" />
                        </div>
                      </div>
                      <Button onClick={handleAddManualProduct} variant="secondary" className="w-full">
                        <Plus className="h-4 w-4 mr-2" /> Adicionar à Lista
                      </Button>
                      
                      {/* Mini Preview */}
                      {previewData.products.length > 0 && (
                        <div className="border rounded-lg p-4 bg-muted/30 max-h-40 overflow-y-auto space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Adicionados ({previewData.products.length})</p>
                          {previewData.products.map((p, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span>{p.name}</span>
                              <span className="text-muted-foreground">{p.quantity} un.</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-end pt-4">
                        <Button className="gradient-primary" onClick={() => setManualStep(2)}>
                          Próximo <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {manualStep === 2 && (
                    <div className="space-y-4">
                      <div className="grid gap-4">
                        <div>
                          <Label>Nome do Fornecedor</Label>
                          <Input value={manualSupplier.name} onChange={e => setManualSupplier(p => ({...p, name: e.target.value}))} placeholder="Ex: Distribuidora XYZ" />
                        </div>
                        <div>
                          <Label>Telefone (Opcional)</Label>
                          <Input value={manualSupplier.phone} onChange={e => setManualSupplier(p => ({...p, phone: e.target.value}))} placeholder="(11) 99999-9999" />
                        </div>
                      </div>
                      <Button onClick={handleAddManualSupplier} variant="secondary" className="w-full">
                        <Plus className="h-4 w-4 mr-2" /> Adicionar Fornecedor
                      </Button>

                      {previewData.suppliers.length > 0 && (
                        <div className="border rounded-lg p-4 bg-muted/30 max-h-40 overflow-y-auto space-y-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase">Adicionados ({previewData.suppliers.length})</p>
                          {previewData.suppliers.map((s, i) => (
                            <div key={i} className="text-sm">{s.name}</div>
                          ))}
                        </div>
                      )}

                      <div className="flex justify-end pt-4">
                        <Button className="gradient-primary" onClick={() => setManualStep(3)}>
                          Próximo <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Refactored Financial Step 4.3 */}
                  {manualStep === 3 && (
                    <div className="space-y-6">
                      
                      {/* Tabs */}
                      <Tabs value={financialTab} onValueChange={(v: any) => setFinancialTab(v)} className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="sale" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
                            <TrendingUp className="h-4 w-4 mr-2" /> Adicionar Venda
                          </TabsTrigger>
                          <TabsTrigger value="expense" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700">
                            <TrendingDown className="h-4 w-4 mr-2" /> Adicionar Despesa
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>

                      {/* Form */}
                      <div className="space-y-4 p-4 border rounded-lg bg-background/50">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                            <Label>Valor (R$)</Label>
                            <CurrencyInput 
                              value={financialForm.amount} 
                              onChange={(val) => setFinancialForm(prev => ({...prev, amount: val}))} 
                              placeholder="0,00"
                              className="text-lg font-bold"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Descrição</Label>
                            <Input 
                              value={financialForm.description} 
                              onChange={(e) => setFinancialForm(prev => ({...prev, description: e.target.value}))} 
                              placeholder={financialTab === 'sale' ? "Ex: Venda Balcão" : "Ex: Conta de Luz"}
                            />
                          </div>
                          <div className="col-span-2">
                             <Label>Categoria (Opcional)</Label>
                             <Select 
                               value={financialForm.category} 
                               onValueChange={(val) => setFinancialForm(prev => ({...prev, category: val}))}
                             >
                               <SelectTrigger>
                                 <SelectValue placeholder="Selecione..." />
                               </SelectTrigger>
                               <SelectContent>
                                 {financialTab === 'sale' ? (
                                   <>
                                     <SelectItem value="Venda de Produto">Venda de Produto</SelectItem>
                                     <SelectItem value="Serviço">Serviço</SelectItem>
                                     <SelectItem value="Outros">Outros</SelectItem>
                                   </>
                                 ) : (
                                   <>
                                     <SelectItem value="Fornecedor">Fornecedor</SelectItem>
                                     <SelectItem value="Aluguel">Aluguel</SelectItem>
                                     <SelectItem value="Energia">Energia</SelectItem>
                                     <SelectItem value="Funcionários">Funcionários</SelectItem>
                                     <SelectItem value="Outros">Outros</SelectItem>
                                   </>
                                 )}
                               </SelectContent>
                             </Select>
                          </div>
                        </div>
                        <Button 
                          onClick={handleAddFinancialItem} 
                          variant="secondary" 
                          className="w-full"
                          disabled={!financialForm.description || financialForm.amount <= 0}
                        >
                          <Plus className="h-4 w-4 mr-2" /> 
                          Adicionar {financialTab === 'sale' ? 'Venda' : 'Despesa'}
                        </Button>
                      </div>

                      {/* Real-time Preview Statement */}
                      {(previewData.sales.length > 0 || previewData.expenses.length > 0) && (
                        <div className="border rounded-lg overflow-hidden bg-background">
                          <div className="p-3 bg-muted/30 border-b flex justify-between items-center">
                            <h4 className="font-semibold text-sm">Extrato Prévio</h4>
                            <span className={cn("text-sm font-bold", projectedBalance >= 0 ? "text-green-600" : "text-red-600")}>
                              Saldo: {formatCurrency(projectedBalance)}
                            </span>
                          </div>
                          <div className="max-h-48 overflow-y-auto">
                            {previewData.sales.map((item, idx) => (
                              <div key={`s-${idx}`} className="flex justify-between items-center p-3 border-b last:border-0 hover:bg-muted/10">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <TrendingUp className="h-4 w-4" />
                                  </div>
                                  <div className="text-sm">
                                    <p className="font-medium">{item.description || item.product_name}</p>
                                    <p className="text-xs text-muted-foreground">{item.category}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-green-600">+{formatCurrency(item.total_amount)}</span>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveFinancialItem('sale', idx)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            {previewData.expenses.map((item, idx) => (
                              <div key={`e-${idx}`} className="flex justify-between items-center p-3 border-b last:border-0 hover:bg-muted/10">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600">
                                    <TrendingDown className="h-4 w-4" />
                                  </div>
                                  <div className="text-sm">
                                    <p className="font-medium">{item.description}</p>
                                    <p className="text-xs text-muted-foreground">{item.category}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-red-600">-{formatCurrency(item.amount)}</span>
                                  <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => handleRemoveFinancialItem('expense', idx)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Navigation */}
                      <div className="flex justify-between items-center pt-4">
                        <Button variant="ghost" onClick={handleManualFinish} className="text-muted-foreground hover:text-primary">
                          Pular Etapa
                        </Button>
                        <Button className="gradient-primary px-8" onClick={handleManualFinish}>
                          Finalizar e Revisar <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Mode: Rich Preview (Grand Finale) */}
            {step4Mode === 'preview' && (
              <Card className="glass-card shadow-xl border-primary/20 animate-in fade-in zoom-in-95 duration-500">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
                    <Sparkles className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">Tudo pronto para o lançamento!</CardTitle>
                  <CardDescription>Confira como sua loja vai ficar.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  
                  {/* Summary Cards */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-background/50 border flex flex-col items-center justify-center text-center">
                      <Package className="h-6 w-6 text-blue-500 mb-2" />
                      <span className="text-2xl font-bold">{previewData.products.length}</span>
                      <span className="text-xs text-muted-foreground uppercase">Produtos</span>
                    </div>
                    <div className="p-4 rounded-xl bg-background/50 border flex flex-col items-center justify-center text-center">
                      <TrendingUp className="h-6 w-6 text-green-500 mb-2" />
                      <span className="text-2xl font-bold text-green-600">{formatCurrency(salesTotal)}</span>
                      <span className="text-xs text-muted-foreground uppercase">Receita Est.</span>
                    </div>
                    <div className="p-4 rounded-xl bg-background/50 border flex flex-col items-center justify-center text-center">
                      <TrendingUp className="h-6 w-6 text-red-500 mb-2 rotate-180" />
                      <span className="text-2xl font-bold text-red-600">{formatCurrency(expensesTotal)}</span>
                      <span className="text-xs text-muted-foreground uppercase">Despesas</span>
                    </div>
                  </div>

                  {/* Chart Projection */}
                  {(salesTotal > 0 || expensesTotal > 0) && (
                    <div className="h-[250px] w-full border rounded-xl p-4 bg-background/50">
                      <h4 className="text-sm font-semibold mb-4 text-muted-foreground">Projeção Financeira</h4>
                      <ComparativeAreaChart 
                        salesData={chartData.sales}
                        expensesData={chartData.expenses}
                        chartHeight={200}
                        className="w-full"
                      />
                    </div>
                  )}

                  {/* Data Tables Tabs */}
                  <Tabs defaultValue="products" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="products">Produtos</TabsTrigger>
                      <TabsTrigger value="sales">Vendas</TabsTrigger>
                      <TabsTrigger value="expenses">Despesas</TabsTrigger>
                    </TabsList>
                    <div className="border rounded-b-lg border-t-0 p-4 bg-background/50 max-h-[200px] overflow-y-auto">
                      <TabsContent value="products" className="mt-0">
                        {previewData.products.length ? (
                          <div className="space-y-2">
                            {previewData.products.slice(0, 10).map((p, i) => (
                              <div key={i} className="flex justify-between text-sm border-b pb-2 last:border-0">
                                <span>{p.name}</span>
                                <span className="font-mono">{p.quantity}un</span>
                              </div>
                            ))}
                            {previewData.products.length > 10 && <p className="text-xs text-center text-muted-foreground mt-2">e mais {previewData.products.length - 10}...</p>}
                          </div>
                        ) : <p className="text-sm text-muted-foreground text-center">Nenhum produto.</p>}
                      </TabsContent>
                      <TabsContent value="sales" className="mt-0">
                        {previewData.sales.length ? (
                          <div className="space-y-2">
                            {previewData.sales.slice(0, 10).map((s, i) => (
                              <div key={i} className="flex justify-between text-sm border-b pb-2 last:border-0">
                                <span>{s.product_name || 'Venda'}</span>
                                <span className="font-mono text-green-600">+{formatCurrency(s.total_amount)}</span>
                              </div>
                            ))}
                          </div>
                        ) : <p className="text-sm text-muted-foreground text-center">Nenhuma venda.</p>}
                      </TabsContent>
                      <TabsContent value="expenses" className="mt-0">
                        {previewData.expenses.length ? (
                          <div className="space-y-2">
                            {previewData.expenses.slice(0, 10).map((e, i) => (
                              <div key={i} className="flex justify-between text-sm border-b pb-2 last:border-0">
                                <span>{e.description}</span>
                                <span className="font-mono text-red-600">-{formatCurrency(e.amount)}</span>
                              </div>
                            ))}
                          </div>
                        ) : <p className="text-sm text-muted-foreground text-center">Nenhuma despesa.</p>}
                      </TabsContent>
                    </div>
                  </Tabs>

                  {/* Final Actions */}
                  <div className="pt-4 space-y-3">
                    <Button 
                      className="w-full h-14 text-lg font-bold shadow-xl gradient-primary"
                      onClick={handleConfirmAndLaunch}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                          Lançando sua Loja...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 mr-2" />
                          Confirmar e Lançar Loja
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full text-muted-foreground"
                      onClick={() => setStep4Mode('choice')}
                      disabled={isSubmitting}
                    >
                      Voltar e Editar
                    </Button>
                  </div>

                </CardContent>
              </Card>
            )}
          </div>
        )}

      </div>

      {/* Gap Detection Dialog */}
      <AlertDialog open={!!missingImportType} onOpenChange={(open) => !open && setMissingImportType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {missingImportType === 'sales' ? 'Faltam Vendas' : 'Dados Incompletos'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Detectamos seus produtos, mas não encontramos vendas. Deseja adicionar agora ou pular?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setMissingImportType(null);
              setStep4Mode('preview');
            }}>
              Não, Pular
            </AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setMissingImportType(null);
              setStep4Mode('manual');
              setManualStep(3); // Jump to financial/sales step
            }}>
              Adicionar Manualmente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
