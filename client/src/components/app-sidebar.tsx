import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
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
  SidebarFooter,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  FileText,
  Car,
  Users,
  LineChart,
  CreditCard,
  Scan,
  Plus,
  Settings,
  Building2,
  LogOut,
  UserCog,
} from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { User as UserType } from '@shared/schema';

type NavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
};

const mainNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, testId: 'nav-dashboard' },
  { label: 'Deals', path: '/deals', icon: FileText, testId: 'nav-deals' },
  { label: 'Inventory', path: '/inventory', icon: Car, testId: 'nav-inventory' },
  { label: 'Customers', path: '/customers', icon: Users, testId: 'nav-customers' },
];

const toolsNavItems: NavItem[] = [
  { label: 'Add Vehicle', path: '/inventory/new', icon: Plus, testId: 'nav-inventory-new' },
  { label: 'Analytics', path: '/analytics', icon: LineChart, testId: 'nav-analytics' },
  { label: 'Credit Center', path: '/credit-center', icon: CreditCard, testId: 'nav-credit' },
  { label: 'VIN Decoder', path: '/vin-decoder', icon: Scan, testId: 'nav-vin-decoder' },
];

const settingsNavItems: NavItem[] = [
  { label: 'Account Settings', path: '/settings/account', icon: Settings, testId: 'nav-account-settings' },
  { label: 'Dealership Settings', path: '/settings/dealership', icon: Building2, testId: 'nav-dealership-settings' },
  { label: 'User Management', path: '/settings/users', icon: UserCog, testId: 'nav-user-management' },
];

export function AppSidebar() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();

  // Get current user for role-based navigation
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ['/api/user'],
  });

  // Get users for deal creation
  const { data: users, isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/logout');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.clear();
      setLocation('/login');
      toast({
        title: 'Logged out',
        description: 'You have been successfully logged out',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Logout failed',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: async () => {
      const salesperson = users?.find(u => u.role === 'salesperson') || users?.[0];
      if (!salesperson) {
        throw new Error('No users available');
      }
      
      const response = await apiRequest('POST', '/api/deals', {
        salespersonId: salesperson.id,
      });
      return await response.json();
    },
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals/stats'] });
      toast({
        title: 'Deal created',
        description: 'Opening deal worksheet...',
      });
      setLocation(`/deals/${deal.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create deal',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const handleNavigation = (path: string) => {
    setLocation(path);
  };

  const handleNewDeal = () => {
    createDealMutation.mutate();
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => {
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary/60">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Deal Studio</h1>
            {currentUser && (
              <p className="text-xs text-muted-foreground">
                {currentUser.fullName || currentUser.username}
              </p>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Quick Action */}
        <SidebarGroup>
          <SidebarGroupContent className="px-3 py-3">
            <Button
              onClick={handleNewDeal}
              disabled={createDealMutation.isPending || usersLoading}
              data-testid="sidebar-new-deal"
              className="w-full justify-start gap-3"
              size="lg"
            >
              <Plus className="w-5 h-5" />
              {usersLoading ? 'Loading...' : createDealMutation.isPending ? 'Creating...' : 'New Deal'}
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => handleNavigation(item.path)}
                      data-testid={item.testId}
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {toolsNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => handleNavigation(item.path)}
                      data-testid={item.testId}
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Settings Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Settings</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsNavItems.map((item) => {
                // Hide dealership settings and user management if not admin
                if ((item.path === '/settings/dealership' || item.path === '/settings/users') && currentUser?.role !== 'admin') {
                  return null;
                }
                
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      onClick={() => handleNavigation(item.path)}
                      data-testid={item.testId}
                      isActive={active}
                      tooltip={item.label}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t px-3 py-3">
        <Button
          variant="ghost"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          data-testid="sidebar-logout"
          className="w-full justify-start gap-3"
        >
          <LogOut className="w-5 h-5" />
          {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
