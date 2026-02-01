import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, ShoppingCart, User } from "lucide-react";

interface StoreLivePreviewProps {
  name: string;
  logoUrl: string | null;
  primaryColor: string;
}

export function StoreLivePreview({ name, logoUrl, primaryColor }: StoreLivePreviewProps) {
  return (
    <div className="border rounded-lg overflow-hidden shadow-sm">
      <div className="bg-muted/30 p-2 border-b text-xs font-medium text-muted-foreground text-center">
        Pré-visualização da Loja (Topo)
      </div>
      <div className="bg-white">
        {/* Fake Browser Header */}
        <div className="h-8 bg-gray-100 flex items-center px-3 gap-2 border-b">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
          </div>
          <div className="flex-1 bg-white h-5 rounded text-[10px] flex items-center px-2 text-muted-foreground ml-2 shadow-sm">
            loja-do-natan.appstokki.com.br
          </div>
        </div>

        {/* Store Header Preview */}
        <div className="border-b" style={{ borderColor: `${primaryColor}20` }}>
          <div className="px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8 border-2" style={{ borderColor: primaryColor }}>
                <AvatarImage src={logoUrl || undefined} className="object-cover" />
                <AvatarFallback className="text-[10px] bg-primary/10" style={{ color: primaryColor }}>
                  {name.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="font-bold text-sm text-gray-800">
                {name || "Nome da Loja"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex relative">
                <input 
                  disabled
                  className="bg-gray-50 border rounded-full px-3 py-1 text-[10px] w-32"
                  placeholder="Buscar..."
                />
                <Search className="w-3 h-3 absolute right-2 top-1.5 text-gray-400" />
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4" />
                <div className="relative">
                  <ShoppingCart className="w-4 h-4" style={{ color: primaryColor }} />
                  <span 
                    className="absolute -top-1.5 -right-1.5 text-[8px] text-white px-1 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  >
                    2
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Navigation Bar Mock */}
          <div className="px-4 py-2 flex gap-4 text-[10px] font-medium text-gray-500 border-t bg-gray-50/50">
            <span style={{ color: primaryColor, borderBottom: `2px solid ${primaryColor}` }} className="pb-0.5">Início</span>
            <span>Produtos</span>
            <span>Categorias</span>
            <span>Ofertas</span>
            <span>Contato</span>
          </div>
        </div>

        {/* Hero Banner Mock */}
        <div className="h-24 bg-gradient-to-r from-gray-100 to-gray-50 flex items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundColor: primaryColor }}></div>
          <div className="text-center z-10">
            <h3 className="text-sm font-bold text-gray-800">Ofertas Especiais</h3>
            <p className="text-[10px] text-gray-500">Confira nossos melhores produtos</p>
          </div>
        </div>
      </div>
    </div>
  );
}
