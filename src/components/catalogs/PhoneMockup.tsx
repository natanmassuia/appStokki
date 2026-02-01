import React from 'react';
import { 
  Heart, 
  MessageCircle, 
  Send, 
  Bookmark, 
  MoreHorizontal, 
  Search, 
  Home, 
  PlusSquare, 
  Clapperboard, 
  UserCircle,
  ChevronLeft,
  Phone,
  Video,
  ArrowLeft
} from 'lucide-react';

export type MockupFormat = 'story' | 'post' | 'whatsapp-status';

interface PhoneMockupProps {
  children: React.ReactNode;
  format: MockupFormat;
  storeName: string;
  avatarUrl?: string;
}

export function PhoneMockup({ children, format, storeName, avatarUrl }: PhoneMockupProps) {
  
  const Avatar = () => (
    <div className="rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600 p-[2px]">
      <div className="rounded-full bg-white p-[2px]">
         {avatarUrl ? (
           <img src={avatarUrl} alt={storeName} className="w-full h-full rounded-full object-cover" />
         ) : (
           <div className="w-full h-full rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
             <UserCircle className="w-full h-full" />
           </div>
         )}
      </div>
    </div>
  );

  const WhatsAppAvatar = () => (
    <div className="rounded-full border-2 border-green-500 p-[2px]">
         {avatarUrl ? (
           <img src={avatarUrl} alt={storeName} className="w-full h-full rounded-full object-cover" />
         ) : (
           <div className="w-full h-full rounded-full bg-slate-200 flex items-center justify-center text-slate-500">
             <UserCircle className="w-full h-full" />
           </div>
         )}
    </div>
  );

  // --- STORY MOCKUP (Instagram) ---
  if (format === 'story') {
    return (
      <div className="w-full h-full relative bg-gray-900 text-white font-sans overflow-hidden">
        
        {/* CONTENT LAYER - Z-0 to be behind everything */}
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-gray-900">
           {children}
        </div>

        {/* Top Progress Bars */}
        <div className="absolute top-0 left-0 right-0 z-30 p-2 flex gap-1 pt-3">
          <div className="h-0.5 flex-1 bg-white/40 rounded-full overflow-hidden">
             <div className="h-full w-2/3 bg-white" />
          </div>
          <div className="h-0.5 flex-1 bg-white/40 rounded-full" />
          <div className="h-0.5 flex-1 bg-white/40 rounded-full" />
        </div>

        {/* Top User Info */}
        <div className="absolute top-4 left-0 right-0 z-30 px-3 py-2 flex items-center justify-between mt-2">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8">
               <Avatar />
             </div>
             <span className="text-sm font-semibold text-white drop-shadow-md">{storeName}</span>
             <span className="text-xs text-white/70 font-medium">12h</span>
           </div>
           <div className="flex gap-4">
              <MoreHorizontal className="text-white drop-shadow-md w-5 h-5" />
              {/* Close X */}
              <div className="w-5 h-5 flex items-center justify-center">
                <span className="text-2xl font-light leading-none drop-shadow-md">&times;</span>
              </div>
           </div>
        </div>

        {/* Bottom Interaction */}
        <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-8 pt-12 bg-gradient-to-t from-black/60 to-transparent flex items-center gap-4">
           <div className="flex-1 h-11 rounded-full border border-white/30 flex items-center px-4">
             <span className="text-white/80 text-sm">Enviar mensagem...</span>
           </div>
           <Heart className="w-7 h-7 text-white" />
           <Send className="w-7 h-7 text-white -rotate-12" />
        </div>
      </div>
    );
  }

  // --- FEED MOCKUP (Instagram) ---
  if (format === 'post') {
    return (
      <div className="w-full h-full bg-black text-white flex flex-col font-sans">
        
        {/* Status Bar Mock */}
        <div className="h-7 flex justify-between items-center px-6 text-[12px] font-bold pt-2">
           <span>9:41</span>
           <div className="flex gap-1.5 items-center">
             <span className="text-[10px]">5G</span>
             <div className="w-5 h-3 border border-white/80 rounded-[3px] relative">
               <div className="absolute inset-0.5 bg-white w-2/3" />
             </div>
           </div>
        </div>

        {/* App Header */}
        <div className="h-12 border-b border-white/10 flex items-center justify-between px-4 shrink-0">
           <div className="font-semibold text-lg">Publicações</div>
           <div className="flex gap-4">
             <PlusSquare className="w-6 h-6" />
             <MessageCircle className="w-6 h-6" />
           </div>
        </div>

        {/* SCROLLABLE FEED AREA */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-black">
           
           {/* Post Header */}
           <div className="h-14 flex items-center justify-between px-3">
              <div className="flex items-center gap-2">
                 <div className="w-8 h-8">
                   <Avatar />
                 </div>
                 <div className="flex flex-col -gap-0.5">
                    <span className="text-sm font-semibold">{storeName}</span>
                    <span className="text-[10px] text-white/70">Original Audio</span>
                 </div>
              </div>
              <MoreHorizontal className="w-5 h-5" />
           </div>

           {/* POST CONTENT (The Catalog Image) */}
           <div className="w-full aspect-square bg-slate-900 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                 {children}
              </div>
           </div>

           {/* Post Actions */}
           <div className="px-3 py-3">
              <div className="flex justify-between mb-2">
                 <div className="flex gap-4">
                    <Heart className="w-6 h-6" />
                    <MessageCircle className="w-6 h-6 -rotate-90" />
                    <Send className="w-6 h-6" />
                 </div>
                 <Bookmark className="w-6 h-6" />
              </div>
              
              <div className="space-y-1">
                 <p className="text-sm font-semibold">1.234 curtidas</p>
                 <p className="text-sm">
                   <span className="font-semibold mr-2">{storeName}</span>
                   Confira nossa nova tabela de preços! 🚀
                   <span className="text-blue-400 ml-1">#ofertas #novidades</span>
                 </p>
                 <p className="text-xs text-white/50 uppercase mt-1">Há 2 horas</p>
              </div>
           </div>
        </div>

        {/* Bottom Nav */}
        <div className="h-16 border-t border-white/10 flex justify-between items-start pt-4 px-6 shrink-0 bg-black">
           <Home className="w-6 h-6" />
           <Search className="w-6 h-6" />
           <PlusSquare className="w-6 h-6" />
           <Clapperboard className="w-6 h-6" />
           <div className="w-6 h-6 rounded-full bg-slate-500 overflow-hidden">
             {avatarUrl && <img src={avatarUrl} className="w-full h-full object-cover" />}
           </div>
        </div>

      </div>
    );
  }

  // --- WHATSAPP STATUS MOCKUP ---
  if (format === 'whatsapp-status') {
    return (
      <div className="w-full h-full relative bg-gray-900 text-white font-sans overflow-hidden">
        
        {/* CONTENT LAYER - Z-0 */}
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-gray-900">
           {children}
        </div>

        {/* Top Progress Bars (WhatsApp Style - Greenish/White) */}
        <div className="absolute top-0 left-0 right-0 z-30 p-2 flex gap-1 pt-3">
          <div className="h-0.5 flex-1 bg-white/40 rounded-full overflow-hidden">
             <div className="h-full w-2/3 bg-white" />
          </div>
          <div className="h-0.5 flex-1 bg-white/40 rounded-full" />
          <div className="h-0.5 flex-1 bg-white/40 rounded-full" />
        </div>

        {/* Top User Info (WhatsApp Style) */}
        <div className="absolute top-4 left-0 right-0 z-30 px-3 py-2 flex items-center justify-between mt-2">
           <div className="flex items-center gap-3">
             <ArrowLeft className="w-6 h-6 text-white drop-shadow-md" />
             <div className="w-9 h-9 rounded-full border border-white/20 p-[1px]">
               {avatarUrl ? (
                 <img src={avatarUrl} alt={storeName} className="w-full h-full rounded-full object-cover" />
               ) : (
                 <div className="w-full h-full rounded-full bg-slate-500 flex items-center justify-center">
                   <UserCircle className="w-full h-full text-white" />
                 </div>
               )}
             </div>
             <div className="flex flex-col">
                <span className="text-sm font-semibold text-white drop-shadow-md">{storeName}</span>
                <span className="text-xs text-white/80 font-medium">Hoje 10:45</span>
             </div>
           </div>
           <div className="flex gap-4">
              <MoreHorizontal className="text-white drop-shadow-md w-5 h-5" />
           </div>
        </div>

        {/* Bottom Interaction (WhatsApp Reply) */}
        <div className="absolute bottom-0 left-0 right-0 z-30 px-4 pb-8 pt-12 flex flex-col items-center gap-4 bg-gradient-to-t from-black/60 to-transparent">
           <div className="flex flex-col items-center animate-bounce mb-2">
              <ChevronLeft className="w-5 h-5 text-white/70 rotate-90" />
              <span className="text-xs text-white/70 font-medium">Responder</span>
           </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}