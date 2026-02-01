import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/AppLayout';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useStore } from '@/hooks/useStore';
import { useCustomers } from '@/hooks/useCustomers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Download, Loader2, Package, ChevronRight, Send, MessageCircle, ImageOff, LayoutTemplate, Palette, Type, Settings2, CheckSquare, Square } from 'lucide-react';
import * as React from 'react';
import { humanizeError } from '@/lib/utils';
import { sendMedia } from '@/services/whatsappService';
import { formatPhoneForWhatsapp } from '@/utils/phoneFormatter';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import { PageHeader } from '@/components/ui/PageHeader';
import { CatalogTemplate, CatalogFormat, CatalogTheme } from '@/components/catalogs/CatalogTemplate';

import { PhoneMockup } from '@/components/catalogs/PhoneMockup';

export default function Catalogos() {
  const { products, isLoading: productsLoading } = useProducts();
  const { categories, isLoading: categoriesLoading } = useCategories();
  const { store, isLoading: settingsLoading } = useStore();
  const { customers } = useCustomers();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  // Settings State
  const [format, setFormat] = useState<CatalogFormat>('story');
  const [theme, setTheme] = useState<CatalogTheme>('dark-modern');
  const [customTitle, setCustomTitle] = useState('Tabela de Preços');
  const [showWhatsapp, setShowWhatsapp] = useState(true);
  const [showLogo, setShowLogo] = useState(true);
  const [showStockOnly, setShowStockOnly] = useState(true);
  
  // Selection State
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('recent');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectionMode, setSelectionMode] = useState<'category' | 'manual'>('category');

  // Export/Send State
  const [isExporting, setIsExporting] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [sendPhone, setSendPhone] = useState('');
  const [sendCustomerId, setSendCustomerId] = useState<string>('none');
  const [sendCaption, setSendCaption] = useState('Olá! Segue nossa tabela de preços atualizada. 🚀');
  
  const priceTableRef = useRef<HTMLDivElement>(null);

  // Default values from store
  const storeName = store?.name || 'Minha Loja';
  const phone = store?.whatsapp || '';
  const primaryColor = store?.primary_color || '#10b981';

  // --- Filtering Logic ---

  // 1. Filter by Stock
  const availableProducts = products.filter(p => !showStockOnly || p.quantity > 0);
  
  // 2. Filter by Category or Manual Selection
  const getFilteredProducts = () => {
    if (selectionMode === 'manual') {
      return availableProducts.filter(p => selectedProductIds.includes(p.id));
    }

    if (selectedCategoryId === 'recent') {
      return [...availableProducts]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 8); // Limit slightly higher for catalogs
    }

    if (selectedCategoryId === 'all') {
      return availableProducts;
    }

    // Category logic
    const selectedCategory = categories.find(c => c.id === selectedCategoryId);
    if (!selectedCategory) return availableProducts;

    if (!selectedCategory.name.includes(' > ')) {
      // Parent category: include children
      const subcategories = categories.filter(c => c.name.startsWith(selectedCategory.name + ' > '));
      const allIds = [selectedCategoryId, ...subcategories.map(s => s.id)];
      return availableProducts.filter(p => p.category_id && allIds.includes(p.category_id));
    }

    return availableProducts.filter(p => p.category_id === selectedCategoryId);
  };

  const finalProducts = getFilteredProducts();

  // Helper for Categories
  const parentCategories = categories.filter(cat => !cat.name.includes(' > '));
  const getSubcategories = (parentId: string) => {
    const parent = categories.find(c => c.id === parentId);
    if (!parent) return [];
    return categories.filter(cat => cat.name.startsWith(parent.name + ' > '));
  };

  // Toggle product selection
  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  // --- Actions ---

  const handleExport = async () => {
    if (!priceTableRef.current) return;

    setIsExporting(true);
    try {
      // We capture the specific node. 
      // Note: scale 2 or 3 is good for crisp text.
      const canvas = await html2canvas(priceTableRef.current, {
        backgroundColor: null, // Transparent to let theme bg show
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `catalogo-${storeName.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast({
        title: 'Download iniciado! 📥',
        description: 'Sua imagem foi gerada com sucesso.',
      });
    } catch (error) {
      console.error(error);
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar a imagem.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSendWhatsApp = async () => {
    if (!priceTableRef.current) return;
    if (!store?.whatsapp_instance_name) {
      toast({
        title: 'WhatsApp não conectado',
        description: 'Conecte o WhatsApp primeiro em Minha Loja > WhatsApp.',
        variant: 'destructive',
      });
      return;
    }

    let phoneToSend = sendCustomerId !== 'none' 
      ? customers.find(c => c.id === sendCustomerId)?.phone || ''
      : sendPhone.trim();

    if (!phoneToSend) {
      toast({ title: 'Telefone necessário', variant: 'destructive' });
      return;
    }

    const formattedPhone = formatPhoneForWhatsapp(phoneToSend);
    if (!formattedPhone) {
      toast({ title: 'Telefone inválido', variant: 'destructive' });
      return;
    }

    setIsSending(true);
    try {
      const canvas = await html2canvas(priceTableRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const dataUrl = canvas.toDataURL('image/png');

      await sendMedia(
        store.whatsapp_instance_name,
        formattedPhone,
        dataUrl,
        sendCaption.trim() || undefined
      );

      toast({
        title: 'Enviado com sucesso! 🚀',
        description: 'O catálogo foi enviado para o cliente.',
      });
      setSendModalOpen(false);
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar',
        description: humanizeError(error),
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  // Dynamic Scale Calculation
    const getScale = () => {
      // 360px (Phone width) / Original Width
      // if (format === 'a4') return 360 / 1240; // ~0.29 (Not used anymore)
      return 360 / 1080; // ~0.333
    };

    const scale = getScale();

    return (
      <AppLayout title="Catálogos">
        <div className="relative h-[calc(100vh-60px)] -m-6 overflow-hidden flex">
          
          {/* --- LEFT SIDEBAR: CONTROLS --- */}
          <div className="w-[28rem] border-r bg-card/95 backdrop-blur-sm flex flex-col h-full overflow-hidden shrink-0 z-40 shadow-xl">
            
            {/* Header Moved Inside Sidebar */}
            <div className="p-6 pb-4 border-b bg-muted/10">
               <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Estúdio Criativo</h1>
               <p className="text-muted-foreground mt-1 text-sm">Crie materiais de divulgação para redes sociais em segundos.</p>
               
               <div className="flex gap-2 mt-4">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleExport}
                  disabled={isExporting || finalProducts.length === 0}
                  className="flex-1 bg-background/40 backdrop-blur-md border-primary/20 hover:bg-background/60"
                >
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Baixar
                </Button>
                <Button 
                  size="sm"
                  className="flex-1 gradient-primary shadow-lg" 
                  onClick={() => setSendModalOpen(true)}
                  disabled={finalProducts.length === 0}
                >
                  <Send className="mr-2 h-4 w-4" /> WhatsApp
                </Button>
              </div>
            </div>

            <div className="px-4 py-3 border-b bg-muted/30">
              <h2 className="font-semibold flex items-center gap-2 text-sm">
                <Settings2 className="h-4 w-4" />
                Configuração do Catálogo
              </h2>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-6">
              
              <Accordion type="single" collapsible defaultValue="content" className="w-full">
                
                {/* 1. Content Selection */}
                <AccordionItem value="content">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-primary" />
                      <span>Conteúdo & Produtos</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <Label>Título do Catálogo</Label>
                      <Input 
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        placeholder="Ex: Ofertas de Verão"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Modo de Seleção</Label>
                      <Select value={selectionMode} onValueChange={(v: any) => setSelectionMode(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="category">Por Categoria / Recentes</SelectItem>
                          <SelectItem value="manual">Seleção Manual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectionMode === 'category' ? (
                      <div className="space-y-2">
                         <Label>Categoria</Label>
                         <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Todos os Produtos</SelectItem>
                            <SelectItem value="recent" className="font-medium text-primary">Últimos Adicionados</SelectItem>
                            {parentCategories.map(cat => (
                              <React.Fragment key={cat.id}>
                                <SelectItem value={cat.id} className="font-medium">{cat.name}</SelectItem>
                                {getSubcategories(cat.id).map(sub => (
                                  <SelectItem key={sub.id} value={sub.id} className="pl-6">
                                    › {sub.name.split(' > ').pop()}
                                  </SelectItem>
                                ))}
                              </React.Fragment>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <Label>Selecionar Produtos ({selectedProductIds.length})</Label>
                        <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1">
                          {availableProducts.map(p => (
                            <div 
                              key={p.id} 
                              className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer"
                              onClick={() => toggleProductSelection(p.id)}
                            >
                              <div className={`w-4 h-4 border rounded flex items-center justify-center ${selectedProductIds.includes(p.id) ? 'bg-primary border-primary' : 'border-slate-300'}`}>
                                {selectedProductIds.includes(p.id) && <CheckSquare className="h-3 w-3 text-white" />}
                              </div>
                              <span className="text-sm truncate">{p.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <Label htmlFor="stock-filter" className="cursor-pointer">Apenas com Estoque</Label>
                      <Switch 
                        id="stock-filter"
                        checked={showStockOnly} 
                        onCheckedChange={setShowStockOnly} 
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 2. Format & Layout */}
                <AccordionItem value="format">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <LayoutTemplate className="h-4 w-4 text-primary" />
                      <span>Formato & Layout</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'story', label: 'Story', ratio: '9:16' },
                        { id: 'post', label: 'Feed', ratio: '1:1' },
                        { id: 'whatsapp-status', label: 'WhatsApp Status', ratio: '9:16' },
                        { id: 'highlights', label: 'Destaques', ratio: '1:1' },
                        { id: 'carousel_cover', label: 'Capa Carrossel', ratio: '4:5' },
                        { id: 'testimonial', label: 'Depoimento', ratio: '4:5' },
                      ].map((fmt) => (
                        <div 
                          key={fmt.id}
                          onClick={() => setFormat(fmt.id as CatalogFormat)}
                          className={`
                            cursor-pointer rounded-lg border-2 p-2 text-center transition-all
                            ${format === fmt.id ? 'border-primary bg-primary/5' : 'border-transparent bg-secondary hover:bg-secondary/80'}
                          `}
                        >
                          <div className={`mx-auto mb-1 border-2 border-current rounded-sm ${
                            fmt.id === 'story' || fmt.id === 'whatsapp-status' ? 'w-4 h-7' : 
                            fmt.id === 'post' || fmt.id === 'highlights' ? 'w-6 h-6' : 
                            fmt.id === 'carousel_cover' || fmt.id === 'testimonial' ? 'w-5 h-6' : 'w-5 h-7'
                          }`} />
                          <span className="text-xs font-medium">{fmt.label}</span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 3. Theme & Style */}
                <AccordionItem value="theme">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-primary" />
                      <span>Tema & Cores</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="space-y-2">
                      {[
                        { id: 'dark-modern', label: 'Dark Moderno', color: 'bg-slate-900' },
                        { id: 'clean-white', label: 'Clean White', color: 'bg-white border' },
                        { id: 'retail-promo', label: 'Varejo / Oferta', color: 'bg-yellow-400' },
                      ].map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setTheme(t.id as CatalogTheme)}
                          className={`
                            flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all
                            ${theme === t.id ? 'border-primary ring-1 ring-primary/20' : 'border-transparent bg-secondary/50 hover:bg-secondary'}
                          `}
                        >
                          <div className={`w-8 h-8 rounded-full shadow-sm ${t.color}`} />
                          <span className="font-medium text-sm">{t.label}</span>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* 4. Footer & Contact */}
                <AccordionItem value="footer">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Type className="h-4 w-4 text-primary" />
                      <span>Rodapé & Contato</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-whatsapp" className="cursor-pointer">Mostrar WhatsApp</Label>
                      <Switch 
                        id="show-whatsapp"
                        checked={showWhatsapp} 
                        onCheckedChange={setShowWhatsapp} 
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-logo" className="cursor-pointer">Mostrar Logo da Loja</Label>
                      <Switch 
                        id="show-logo"
                        checked={showLogo} 
                        onCheckedChange={setShowLogo} 
                      />
                    </div>
                  </AccordionContent>
                </AccordionItem>

              </Accordion>
            </div>
          </ScrollArea>
        </div>

        {/* --- RIGHT AREA: LIVE PREVIEW --- */}
        <div className="flex-1 bg-slate-100 dark:bg-slate-950/50 relative overflow-hidden flex flex-col">
           {/* Toolbar / Status */}
           <div className="absolute top-4 right-4 z-20 bg-background/80 backdrop-blur border rounded-full px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm">
             {finalProducts.length} produtos selecionados • {
               format === 'story' || format === 'whatsapp-status' ? '1080x1920' : 
               format === 'post' || format === 'highlights' ? '1080x1080' : 
               '1080x1350' // carousel & testimonial
             }
           </div>

           <div className="flex-1 overflow-auto custom-scrollbar bg-slate-200/50 dark:bg-slate-900/50 flex items-center justify-center p-8">
             {/* Phone Frame */}
             <div 
                className="relative bg-black rounded-[3rem] shadow-2xl border-8 border-slate-900 dark:border-slate-800"
                style={{ 
                  width: '360px', // Mobile width simulation
                  height: '740px',
                  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                }}
             >
               {/* Notch / Status Bar */}
               <div className="absolute top-0 inset-x-0 h-7 bg-black rounded-t-[2.5rem] z-20 flex justify-center">
                  <div className="w-32 h-5 bg-black rounded-b-xl absolute top-0"></div>
               </div>
               
               {/* Screen Content - Scaled to fit */}
               <div className={`w-full h-full bg-white dark:bg-black rounded-[2.5rem] overflow-hidden relative flex flex-col`}>
                 <PhoneMockup format={format as any} storeName={storeName} avatarUrl={store?.logo_url || undefined}>
                   <div 
                     className="flex-shrink-0 transition-transform duration-300"
                     style={{ 
                       transform: `scale(${scale})`,
                       transformOrigin: 'center center', // FIXED: Center scaling ensures it stays visible
                       width: format === 'story' || format === 'whatsapp-status' ? '1080px' : '1080px',
                       height: format === 'story' || format === 'whatsapp-status' ? '1920px' : 
                               format === 'post' || format === 'highlights' ? '1080px' : '1350px',
                     }}
                   >
                     <CatalogTemplate 
                       ref={priceTableRef}
                       products={finalProducts}
                       format={format === 'whatsapp-status' ? 'story' : format} // Use story layout for whatsapp
                       theme={theme}
                       title={customTitle}
                       storeName={storeName}
                       phone={phone}
                       primaryColor={primaryColor}
                       showWhatsapp={showWhatsapp}
                       showLogo={showLogo}
                       logoUrl={store?.logo_url || undefined}
                     />
                   </div>
                 </PhoneMockup>
               </div>
               
               {/* Home Indicator */}
               <div className="absolute bottom-2 inset-x-0 flex justify-center z-20">
                 <div className="w-32 h-1 bg-white/20 rounded-full"></div>
               </div>
             </div>
           </div>
        </div>
      </div>

      {/* --- MODALS --- */}
      <Dialog open={sendModalOpen} onOpenChange={setSendModalOpen}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Enviar Catálogo</DialogTitle>
            <DialogDescription>Compartilhe esta imagem diretamente com seus clientes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
             {/* Same logic as before for selecting customer/phone */}
             <div>
              <Label>Selecionar Cliente</Label>
              <Select 
                value={sendCustomerId} 
                onValueChange={(value) => {
                  setSendCustomerId(value);
                  if (value !== 'none') {
                    const customer = customers.find(c => c.id === value);
                    if (customer?.phone) setSendPhone(customer.phone);
                  } else {
                    setSendPhone('');
                  }
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Informar manualmente</SelectItem>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Telefone</Label>
              <Input 
                value={sendPhone}
                onChange={(e) => setSendPhone(e.target.value)}
                placeholder="(16) 99999-9999"
                disabled={sendCustomerId !== 'none'}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Legenda</Label>
              <Textarea 
                value={sendCaption}
                onChange={(e) => setSendCaption(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSendModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSendWhatsApp} disabled={isSending} className="gradient-primary">
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
