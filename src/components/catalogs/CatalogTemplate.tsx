import React, { forwardRef } from 'react';
import { Package, ShoppingBag, ArrowUp, Star, Quote, ArrowRight, Sparkles } from 'lucide-react';
import { formatCurrency } from '@/lib/format';

export type CatalogFormat = 'story' | 'post' | 'a4' | 'highlights' | 'carousel_cover' | 'testimonial';
export type CatalogTheme = 'dark-modern' | 'clean-white' | 'retail-promo';

interface CatalogTemplateProps {
  products: any[];
  format: CatalogFormat;
  theme: CatalogTheme;
  title: string;
  storeName: string;
  phone?: string;
  primaryColor: string;
  showWhatsapp: boolean;
  showLogo: boolean;
  logoUrl?: string;
}

export const CatalogTemplate = forwardRef<HTMLDivElement, CatalogTemplateProps>(
  ({ products, format, theme, title, storeName, phone, primaryColor, showWhatsapp, showLogo, logoUrl }, ref) => {
    
    // --- THEME CONFIGURATION ---
    const themeStyles = {
      'dark-modern': {
        container: 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white',
        headerBorder: 'border-slate-700/50',
        cardBg: 'bg-slate-800/80 backdrop-blur-sm border-slate-700/50 shadow-lg',
        cardText: 'text-white',
        priceColor: primaryColor,
        subText: 'text-slate-400',
        accentBg: `${primaryColor}20`,
        accentBorder: `${primaryColor}50`,
        badgeBg: 'bg-emerald-500',
        badgeText: 'text-white'
      },
      'clean-white': {
        container: 'bg-white text-slate-900',
        headerBorder: 'border-slate-200',
        cardBg: 'bg-white border-slate-200 shadow-md',
        cardText: 'text-slate-900',
        priceColor: '#0f172a', // slate-900
        subText: 'text-slate-500',
        accentBg: '#f1f5f9', // slate-100
        accentBorder: '#e2e8f0', // slate-200
        badgeBg: 'bg-slate-900',
        badgeText: 'text-white'
      },
      'retail-promo': {
        container: 'bg-yellow-400 text-red-900',
        headerBorder: 'border-red-900/20',
        cardBg: 'bg-white border-red-600 shadow-xl',
        cardText: 'text-slate-900',
        priceColor: '#dc2626', // red-600
        subText: 'text-slate-600',
        accentBg: '#fef3c7', // amber-100
        accentBorder: '#b45309', // amber-700
        badgeBg: 'bg-red-600',
        badgeText: 'text-white'
      }
    };

    const currentTheme = themeStyles[theme];

    // --- HELPER: RENDER PLACEHOLDER IMAGE ---
    const renderProductImage = (product: any, sizeClass: string) => {
      if (product.image_url) {
        return (
          <img
            src={product.image_url}
            alt={product.name}
            className={`object-cover ${sizeClass}`}
          />
        );
      }
      
      // Smart Placeholder: Use first letter or icon
      const initial = product.name.charAt(0).toUpperCase();
      const colors = ['bg-blue-100 text-blue-600', 'bg-emerald-100 text-emerald-600', 'bg-purple-100 text-purple-600', 'bg-orange-100 text-orange-600'];
      const randomColor = colors[product.name.length % colors.length];

      return (
        <div className={`flex items-center justify-center ${sizeClass} ${randomColor}`}>
           <span className="text-4xl font-black opacity-50">{initial}</span>
        </div>
      );
    };

    // --- LAYOUT A: STORY (9:16 Vertical) ---
    if (format === 'story') {
      return (
        <div
          ref={ref}
          className={`${currentTheme.container} flex flex-col relative overflow-hidden`}
          style={{
            width: '1080px',
            height: '1920px',
            padding: '80px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Story Header */}
          <div className="text-center mb-12">
            {showLogo && logoUrl ? (
               <img src={logoUrl} alt={storeName} className="h-40 mx-auto mb-6 object-contain drop-shadow-lg" />
            ) : (
               showLogo && (
                 <div className="flex justify-center mb-4">
                   <div className={`p-6 rounded-3xl ${currentTheme.accentBg}`}>
                      <ShoppingBag className="h-20 w-20" style={{ color: primaryColor }} />
                   </div>
                 </div>
               )
            )}
            <h1 className={`text-6xl font-black tracking-tight mb-4 ${theme === 'retail-promo' ? 'uppercase' : ''}`}>
              {title}
            </h1>
            <div className={`inline-block px-6 py-2 rounded-full border ${currentTheme.headerBorder} ${currentTheme.accentBg}`}>
              <p className="text-2xl font-bold opacity-90">{storeName}</p>
            </div>
          </div>

          {/* Story Body - Vertical Stack */}
          <div className="flex-1 flex flex-col gap-6">
            {products.slice(0, 5).map((product) => ( // Limit to 5 for story
              <div 
                key={product.id}
                className={`flex items-center p-5 rounded-3xl border ${currentTheme.cardBg}`}
              >
                <div className="shrink-0 mr-6">
                  {renderProductImage(product, "w-32 h-32 rounded-2xl shadow-sm")}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`text-3xl font-bold mb-1 truncate ${currentTheme.cardText}`}>
                    {product.name}
                  </h3>
                  {product.color && product.color.toLowerCase() !== 'padrão' && (
                    <p className={`text-xl mb-2 ${currentTheme.subText}`}>{product.color}</p>
                  )}
                  <p className="text-5xl font-black tracking-tighter" style={{ color: currentTheme.priceColor }}>
                    {formatCurrency(product.selling_price)}
                  </p>
                </div>
              </div>
            ))}
            {products.length > 5 && (
               <div className="text-center py-4">
                 <p className={`text-2xl font-medium ${currentTheme.subText}`}>+ {products.length - 5} outros produtos...</p>
               </div>
            )}
          </div>

          {/* Story Footer - "Swipe Up" style */}
          <div className="mt-auto pt-10 text-center relative z-10">
            {showWhatsapp && phone && (
              <div className="animate-bounce mb-4">
                 <ArrowUp className="h-12 w-12 mx-auto opacity-80" />
              </div>
            )}
            <div 
              className={`py-6 px-8 rounded-t-3xl mx-4 -mb-20 pb-24 border-t ${currentTheme.headerBorder}`}
              style={{ backgroundColor: currentTheme.accentBg }}
            >
              <p className="text-3xl font-black mb-2" style={{ color: primaryColor }}>
                Peça agora no WhatsApp
              </p>
              <p className="text-4xl font-bold opacity-80">{phone}</p>
            </div>
          </div>
        </div>
      );
    }

    // --- LAYOUT: HIGHLIGHTS (1:1 Square - Icon Focus) ---
    if (format === 'highlights') {
      return (
        <div
          ref={ref}
          className={`${currentTheme.container} flex flex-col items-center justify-center relative overflow-hidden`}
          style={{
            width: '1080px',
            height: '1080px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10" style={{ 
             backgroundImage: `radial-gradient(${primaryColor} 2px, transparent 2px)`,
             backgroundSize: '40px 40px'
          }}></div>

          <div className="relative z-10 flex flex-col items-center">
             <div className="w-[600px] h-[600px] rounded-full border-[20px] flex items-center justify-center bg-white/10 backdrop-blur-md shadow-2xl" style={{ borderColor: primaryColor }}>
                {showLogo && logoUrl ? (
                   <img src={logoUrl} alt="Icon" className="w-[400px] h-[400px] object-contain drop-shadow-2xl" />
                ) : (
                   <Sparkles className="w-[300px] h-[300px]" style={{ color: primaryColor }} />
                )}
             </div>
             <h1 className="text-7xl font-black mt-16 tracking-tight uppercase drop-shadow-lg">{title || 'Destaques'}</h1>
          </div>
        </div>
      );
    }

    // --- LAYOUT: CAROUSEL COVER (4:5 Portrait - Hook) ---
    if (format === 'carousel_cover') {
      return (
        <div
          ref={ref}
          className={`${currentTheme.container} flex flex-col relative overflow-hidden`}
          style={{
            width: '1080px',
            height: '1350px', // 4:5 Aspect Ratio
            padding: '80px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <div className="flex-1 flex flex-col justify-center items-center text-center z-10">
             <div className="mb-8 px-6 py-2 rounded-full border-2 font-bold uppercase tracking-widest text-xl" style={{ borderColor: primaryColor, color: primaryColor }}>
                {storeName}
             </div>
             
             <h1 className="text-[120px] leading-[0.9] font-black mb-8 tracking-tighter">
               {title || 'TÍTULO DO POST'}
             </h1>
             
             <p className={`text-4xl font-medium max-w-2xl ${currentTheme.subText}`}>
               Confira as melhores ofertas que separamos para você esta semana.
             </p>

             {/* Arrow Indicator */}
             <div className="absolute bottom-20 right-20 flex items-center gap-4 animate-pulse">
                <span className="text-3xl font-bold">Arraste para o lado</span>
                <ArrowRight className="w-16 h-16" />
             </div>
          </div>
        </div>
      );
    }

    // --- LAYOUT: TESTIMONIAL (4:5 Portrait - Social Proof) ---
    if (format === 'testimonial') {
       // Use first product image as "client photo" placeholder if available, else generic
       const clientImage = products[0]?.image_url;

      return (
        <div
          ref={ref}
          className={`${currentTheme.container} flex flex-col relative overflow-hidden`}
          style={{
            width: '1080px',
            height: '1350px', // 4:5 Aspect Ratio
            padding: '80px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <Quote className="w-32 h-32 absolute top-20 left-20 opacity-20" style={{ color: primaryColor }} />
          
          <div className="flex-1 flex flex-col justify-center items-center z-10">
             {/* Client Print Placeholder */}
             <div className="w-[800px] aspect-[4/3] bg-white rounded-3xl shadow-2xl rotate-2 border-4 overflow-hidden relative mb-12 flex items-center justify-center" style={{ borderColor: primaryColor }}>
                {clientImage ? (
                  <img src={clientImage} className="w-full h-full object-cover opacity-50 blur-sm" />
                ) : (
                  <div className="bg-slate-100 w-full h-full flex items-center justify-center">
                     <p className="text-slate-400 text-3xl font-bold">Print do Cliente</p>
                  </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                   <p className="text-slate-900 text-4xl font-bold bg-white/90 px-8 py-4 rounded-xl shadow-lg transform -rotate-2">
                     "Melhor compra que já fiz!"
                   </p>
                </div>
             </div>

             <div className="flex gap-2 mb-6">
                {[1,2,3,4,5].map(i => (
                  <Star key={i} className="w-12 h-12 fill-yellow-400 text-yellow-400" />
                ))}
             </div>
             
             <h2 className="text-4xl font-bold mb-2">Cliente Satisfeito</h2>
             <p className={`text-2xl ${currentTheme.subText}`}>Compra verificada • {storeName}</p>
          </div>
        </div>
      );
    }

    // --- LAYOUT B: POST (1:1 Square) ---
    if (format === 'post') {
      // Determine grid layout based on item count
      const isSingleItem = products.length === 1;
      // User requested grid: grid-cols-1 md:grid-cols-3 lg:grid-cols-4
      // Since this is a fixed 1080px container, we can just set it to 3 or 4 cols if not single.
      // But let's use the responsive classes as requested, they will resolve to 'lg' (4 cols) inside 1080px viewport context if used in a web page,
      // but here it is an isolated div. However, if we want 4 columns fixed:
      const gridClass = isSingleItem ? 'grid-cols-1' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';

      return (
        <div
          ref={ref}
          className={`${currentTheme.container} flex flex-col`}
          style={{
            width: '1080px',
            height: '1080px',
            padding: '60px',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          {/* Post Header */}
          <div className="flex items-center justify-between mb-8">
             <div className="flex items-center gap-4">
                {showLogo && logoUrl && (
                  <img src={logoUrl} alt="Logo" className="h-20 w-20 object-contain rounded-xl bg-white/10 p-2" />
                )}
                <div>
                   <h2 className="text-4xl font-black leading-none">{storeName}</h2>
                   <p className={`text-xl font-medium opacity-70 ${currentTheme.subText}`}>{title}</p>
                </div>
             </div>
             {theme === 'retail-promo' && (
                <div className="bg-red-600 text-white px-6 py-2 rounded-full transform -rotate-2">
                   <span className="text-2xl font-black uppercase">Oferta</span>
                </div>
             )}
          </div>

          {/* Post Grid */}
          <div className={`grid ${gridClass} gap-6 flex-1 content-start`}>
             {products.slice(0, 8).map((product) => ( // Increased limit for grid
                <div 
                  key={product.id} 
                  className={`relative overflow-hidden rounded-3xl border ${currentTheme.cardBg} ${isSingleItem ? 'flex items-center p-10 gap-10' : 'p-5 flex flex-col justify-between h-full min-h-[300px]'}`}
                >
                   {/* Badge */}
                   <div className={`absolute top-0 right-0 px-4 py-2 rounded-bl-2xl font-bold z-10 ${currentTheme.badgeBg} ${currentTheme.badgeText}`}>
                      {formatCurrency(product.selling_price)}
                   </div>

                   <div className={`${isSingleItem ? 'w-1/2' : 'w-full mb-4 flex-1 flex items-center justify-center'}`}>
                      {renderProductImage(product, isSingleItem ? "w-full h-80 rounded-2xl shadow-lg" : "w-full aspect-square rounded-xl shadow-sm object-cover")}
                   </div>
                   
                   <div className={`${isSingleItem ? 'w-1/2 text-left' : 'text-center'}`}>
                      <h3 className={`${isSingleItem ? 'text-5xl' : 'text-xl'} font-bold leading-tight mb-2 ${currentTheme.cardText} line-clamp-2`}>
                        {product.name}
                      </h3>
                      {isSingleItem && (
                         <p className={`text-2xl mb-6 ${currentTheme.subText}`}>
                           Disponível para entrega imediata.
                         </p>
                      )}
                      {!isSingleItem && (
                         <div className={`h-1 w-12 mx-auto my-2 rounded-full`} style={{ backgroundColor: primaryColor }} />
                      )}
                   </div>
                </div>
             ))}
          </div>
          
          {/* Post Footer */}
          <div className="mt-8 flex justify-between items-center border-t pt-6" style={{ borderColor: currentTheme.headerBorder }}>
             <p className="text-xl font-medium opacity-70">Validade: {new Date().toLocaleDateString('pt-BR')}</p>
             {showWhatsapp && (
                <p className="text-2xl font-bold" style={{ color: primaryColor }}>{phone}</p>
             )}
          </div>
        </div>
      );
    }

    // --- LAYOUT C: LIST (A4 - Clean Table) ---
    // Default fallback to 'a4' logic
    return (
      <div
        ref={ref}
        className={`${currentTheme.container} flex flex-col relative`}
        style={{
          width: '1240px',
          minHeight: '1754px', // A4 Height @ 150DPI approx
          padding: '80px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* A4 Header */}
        <div className="flex items-end justify-between mb-12 border-b-4 pb-6" style={{ borderColor: primaryColor }}>
           <div>
              <h1 className="text-6xl font-black mb-2 uppercase tracking-tight">{title}</h1>
              <p className={`text-3xl font-light ${currentTheme.subText}`}>Tabela de Preços • {storeName}</p>
           </div>
           {showLogo && logoUrl && (
              <img src={logoUrl} alt="Logo" className="h-32 object-contain" />
           )}
        </div>

        {/* A4 List */}
        <div className="flex-1">
           {/* Table Header */}
           <div className="grid grid-cols-12 gap-4 px-6 py-3 mb-4 rounded-lg font-bold text-xl uppercase tracking-wider opacity-70" style={{ backgroundColor: currentTheme.accentBg }}>
              <div className="col-span-7">Produto / Descrição</div>
              <div className="col-span-5 text-right">Valor Unitário</div>
           </div>

           {/* Items */}
           <div className="space-y-1">
              {products.map((product, index) => (
                 <div 
                   key={product.id}
                   className={`grid grid-cols-12 gap-4 items-center px-6 py-4 rounded-lg ${index % 2 === 0 ? 'bg-black/5 dark:bg-white/5' : 'bg-transparent'}`}
                 >
                    <div className="col-span-7 flex items-center gap-6">
                       <div className="shrink-0">
                          {renderProductImage(product, "w-16 h-16 rounded-full object-cover shadow-sm border-2 border-white/20")}
                       </div>
                       <div>
                          <p className={`text-2xl font-bold ${currentTheme.cardText}`}>{product.name}</p>
                          {product.color && (
                             <p className={`text-lg ${currentTheme.subText}`}>{product.color}</p>
                          )}
                       </div>
                    </div>
                    <div className="col-span-5 text-right">
                       <p className="text-3xl font-bold tracking-tight" style={{ color: currentTheme.priceColor }}>
                          {formatCurrency(product.selling_price)}
                       </p>
                    </div>
                 </div>
              ))}
           </div>
        </div>

        {/* A4 Footer */}
        <div className="mt-auto pt-12 border-t-2 flex justify-between items-center" style={{ borderColor: currentTheme.headerBorder }}>
           <div>
              <p className="text-xl font-medium opacity-60">Gerado em {new Date().toLocaleDateString('pt-BR')}</p>
              <p className="text-lg opacity-50">Sujeito a alteração de estoque.</p>
           </div>
           {showWhatsapp && (
              <div className="text-right">
                 <p className="text-xl font-bold opacity-70">Central de Vendas</p>
                 <p className="text-4xl font-black" style={{ color: primaryColor }}>{phone}</p>
              </div>
           )}
        </div>
      </div>
    );
  }
);

CatalogTemplate.displayName = 'CatalogTemplate';
