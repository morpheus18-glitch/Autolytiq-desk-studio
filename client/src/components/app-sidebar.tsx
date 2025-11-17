import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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
  ChevronDown,
  Clock,
  Mail,
  Store,
} from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { User as UserType, DealWithRelations } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

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
  { label: 'Showroom', path: '/showroom', icon: Store, testId: 'nav-showroom' },
  { label: 'Email', path: '/email', icon: Mail, testId: 'nav-email' },
];

const toolsNavItems: NavItem[] = [
  { label: 'Add Vehicle', path: '/inventory/new', icon: Plus, testId: 'nav-inventory-new' },
  { label: 'Analytics', path: '/analytics', icon: LineChart, testId: 'nav-analytics' },
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
  const [recentDealsOpen, setRecentDealsOpen] = useState(true);

  // Get current user for role-based navigation
  const { data: currentUser } = useQuery<UserType>({
    queryKey: ['/api/user'],
  });

  // Get users for deal creation
  const { data: users, isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
  });

  // Get recent deals for sidebar
  const { data: recentDealsData } = useQuery<{
    deals: DealWithRelations[];
    total: number;
    pages: number;
  }>({
    queryKey: ['/api/deals?pageSize=5&page=1'],
  });
  
  const recentDeals = recentDealsData?.deals || [];

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

  const handleNavigation = (path: string) => {
    setLocation(path);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => {
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-primary via-primary/80 to-primary/60 shadow-lg shadow-primary/20">
            <FileText className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <h1 className="text-lg font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">Deal Studio</h1>
            {currentUser && (
              <p className="text-xs text-muted-foreground font-medium">
                {currentUser.fullName || currentUser.username}
              </p>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Recent Deals - Collapsible */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <Collapsible open={recentDealsOpen} onOpenChange={setRecentDealsOpen}>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between hover:bg-sidebar-accent hover:text-sidebar-accent-foreground rounded-md px-2 py-1.5 transition-colors">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-xs font-medium">Recent Deals</span>
                </div>
                <ChevronDown className={`w-4 h-4 transition-transform ${recentDealsOpen ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent className="px-3 py-2">
                {recentDeals.length === 0 ? (
                  <div className="text-xs text-muted-foreground px-2 py-3">
                    No recent deals
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentDeals.map((deal) => (
                      <button
                        key={deal.id}
                        onClick={() => handleNavigation(`/deals/${deal.id}`)}
                        data-testid={`sidebar-deal-${deal.id}`}
                        className="w-full text-left px-2 py-2 rounded-md hover-elevate active-elevate-2 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium truncate">
                              {deal.customer ? `${deal.customer.firstName} ${deal.customer.lastName}` : 'No Customer'}
                            </div>
                            <div className="text-xs text-muted-foreground truncate">
                              {deal.vehicle ? `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}` : 'No Vehicle'}
                            </div>
                          </div>
                          <Badge 
                            variant={
                              deal.dealState === 'APPROVED' ? 'default' : 
                              deal.dealState === 'IN_PROGRESS' ? 'secondary' : 
                              'outline'
                            }
                            className="text-xs shrink-0"
                          >
                            {deal.dealState === 'IN_PROGRESS' ? 'Active' : deal.dealState === 'APPROVED' ? 'Approved' : 'Draft'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(deal.updatedAt), { addSuffix: true })}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </SidebarGroupContent>
            </CollapsibleContent>
          </Collapsible>
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
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
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
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
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
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
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
          <span className="group-data-[collapsible=icon]:hidden">
            {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
          </span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
