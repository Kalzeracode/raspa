import { useLocation, useNavigate } from 'react-router-dom';
import { 
  BarChart3, 
  Settings, 
  Users, 
  Gift, 
  UserPlus, 
  CreditCard, 
  DollarSign,
  Palette
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from '@/components/ui/sidebar';

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const adminMenuItems = [
  {
    title: 'Dashboard',
    value: 'overview',
    icon: BarChart3,
    description: 'Visão geral e estatísticas'
  },
  {
    title: 'Raspadinhas',
    value: 'raspadinhas',
    icon: Gift,
    description: 'Gerenciar jogos'
  },
  {
    title: 'Usuários',
    value: 'users',
    icon: Users,
    description: 'Gerenciar usuários'
  },
  {
    title: 'Influenciadores',
    value: 'influencers',
    icon: UserPlus,
    description: 'Sistema de afiliados'
  },
  {
    title: 'Saques',
    value: 'withdrawals',
    icon: DollarSign,
    description: 'Solicitações de saque'
  },
  {
    title: 'Compras',
    value: 'purchases',
    icon: CreditCard,
    description: 'Histórico de depósitos'
  },
  {
    title: 'Personalização',
    value: 'personalization',
    icon: Palette,
    description: 'Assets e imagens'
  }
];

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const { setOpenMobile } = useSidebar();

  const handleItemClick = (value: string) => {
    // Fechar o menu mobile se estiver aberto
    setOpenMobile(false);
    // Mudar a tab ativa
    onTabChange(value);
  };

  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Painel Admin</h2>
            <p className="text-xs text-muted-foreground">Sistema de gestão</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Administração</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminMenuItems.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    isActive={activeTab === item.value}
                    onClick={() => handleItemClick(item.value)}
                    tooltip={item.description}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}