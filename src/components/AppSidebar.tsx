import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  PlusCircle,
  Tags,
  User,
  LogOut,
  Store,
  FileText,
  Users,
  BookOpen,
  DollarSign,
  Image,
  Megaphone,
  MessageSquare,
  Settings,
  Truck,
} from 'lucide-react';

// Tipos para itens do menu
interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  onClick?: () => void;
}

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  // Grupos de menu organizados
  const menuGroups: Array<{ label: string; items: MenuItem[] }> = [
    {
      label: 'VISÃO GERAL',
      items: [
        { title: 'Centro de Operações', url: '/', icon: LayoutDashboard },
      ],
    },
    {
      label: 'OPERACIONAL',
      items: [
        { title: 'Pedidos', url: '/orders', icon: ShoppingBag },
        { title: 'Estoque', url: '/estoque', icon: Package },
        { title: 'Fornecedores', url: '/fornecedores', icon: Truck },
      ],
    },
    {
      label: 'VENDAS & FINANCEIRO',
      items: [
        { title: 'Clientes', url: '/clientes', icon: Users },
        { title: 'Financeiro', url: '/financeiro', icon: DollarSign },
      ],
    },
    {
      label: 'MARKETING & LOJA',
      items: [
        { title: 'Marketing', url: '/campanhas', icon: Megaphone },
        { title: 'Catálogos', url: '/catalogos', icon: Image },
        { title: 'Configurações', url: '/minha-loja', icon: Settings },
      ],
    },
    {
      label: 'SUPORTE',
      items: [
        { title: 'Tutoriais', url: '/tutoriais', icon: BookOpen },
        { title: 'Fale Conosco', url: '/fale-conosco', icon: MessageSquare },
      ],
    },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getInitials = () => {
    if (profile?.store_name) {
      return profile.store_name.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'RM';
  };

  const isActive = (url: string) => {
    if (url === '#' || url === '') return false; // Não marca como ativo se for link de ação
    if (url === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(url);
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/30 bg-sidebar">
      <SidebarHeader className="p-4">
        <div className="flex items-center justify-center gap-3 group-data-[collapsible=icon]:justify-center">
          <img 
            src="/logo-preta.png" 
            alt="AppStokki Logo" 
            className="h-10 w-auto object-contain transition-all group-data-[collapsible=icon]:h-8 hidden dark:block" 
          />
          <img 
            src="/logo-branca.png" 
            alt="AppStokki Logo" 
            className="h-10 w-auto object-contain transition-all group-data-[collapsible=icon]:h-8 dark:hidden" 
          />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {menuGroups.map((group, groupIndex) => (
          <SidebarGroup key={groupIndex}>
            <SidebarGroupLabel className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild={!item.onClick}
                      isActive={isActive(item.url)}
                      tooltip={item.title}
                      onClick={item.onClick}
                      className={`
                        transition-all duration-200
                        hover:bg-slate-100 dark:hover:bg-slate-800 
                        data-[active=true]:bg-blue-50 data-[active=true]:text-blue-600 
                        dark:data-[active=true]:bg-blue-500/10 dark:data-[active=true]:text-blue-400
                      `}
                    >
                      {item.onClick ? (
                        <div className="flex items-center gap-2 cursor-pointer">
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </div>
                      ) : (
                        <NavLink to={item.url}>
                          <item.icon className="h-5 w-5" />
                          <span>{item.title}</span>
                        </NavLink>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        {/* Perfil separado */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive('/perfil')}
                  tooltip="Meu Perfil"
                >
                  <NavLink to="/perfil">
                    <User className="h-5 w-5" />
                    <span>Meu Perfil</span>
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/30">
        <div className={`flex items-center gap-3 mb-3 group-data-[collapsible=icon]:justify-center`}>
          <Avatar className="h-10 w-10 border-2 border-primary/30 shrink-0">
            <AvatarImage src={profile?.avatar_url || ''} />
            <AvatarFallback className="bg-primary/20 text-primary">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="font-medium text-sm truncate">
              {profile?.store_name || 'Minha Loja'}
            </p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2"
          onClick={handleSignOut}
          title="Sair"
        >
          <LogOut className="h-4 w-4 group-data-[collapsible=icon]:mr-0 mr-2" />
          <span className="group-data-[collapsible=icon]:hidden">Sair</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
