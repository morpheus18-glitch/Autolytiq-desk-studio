import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  LayoutDashboard,
  FileText,
  Car,
  Users,
  Menu,
  LineChart,
  CreditCard,
  Scan,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { isMobileNavSuppressed } from '@/lib/navigation';
import type { User as UserType } from '@shared/schema';

type NavItem = {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
};

const primaryNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, testId: 'nav-dashboard' },
  { label: 'Deals', path: '/deals', icon: FileText, testId: 'nav-deals' },
  { label: 'Inventory', path: '/inventory', icon: Car, testId: 'nav-inventory' },
  { label: 'Customers', path: '/customers', icon: Users, testId: 'nav-customers' },
];

const allNavItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard, testId: 'menu-dashboard' },
  { label: 'Deals', path: '/deals', icon: FileText, testId: 'menu-deals' },
  { label: 'Inventory', path: '/inventory', icon: Car, testId: 'menu-inventory' },
  { label: 'Add Vehicle', path: '/inventory/new', icon: Plus, testId: 'menu-inventory-new' },
  { label: 'Customers', path: '/customers', icon: Users, testId: 'menu-customers' },
  { label: 'Analytics', path: '/analytics', icon: LineChart, testId: 'menu-analytics' },
  { label: 'Credit Center', path: '/credit-center', icon: CreditCard, testId: 'menu-credit' },
  { label: 'VIN Decoder', path: '/vin-decoder', icon: Scan, testId: 'menu-vin-decoder' },
];

export function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { toast } = useToast();

  // Hide navigation on deal worksheet (high-focus workflow)
  if (isMobileNavSuppressed(location)) {
    return null;
  }

  // Get users for deal creation
  const { data: users, isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
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
      setIsMenuOpen(false);
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
    setIsMenuOpen(false);
  };

  const handleNewDeal = () => {
    createDealMutation.mutate();
  };

  const isActive = (path: string) => {
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  return (
    <>
      {/* Bottom Navigation Bar - Sticky at bottom of screen */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t shadow-lg md:hidden"
        data-testid="mobile-bottom-nav"
      >
        <div className="grid grid-cols-5 gap-1 px-2 py-3 min-h-[72px]">
          {/* Primary Navigation Buttons */}
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => handleNavigation(item.path)}
                data-testid={item.testId}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-md transition-colors',
                  'hover-elevate active-elevate-2',
                  active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('w-6 h-6', active && 'text-primary')} />
                <span className="text-xs font-medium truncate w-full text-center">
                  {item.label}
                </span>
              </button>
            );
          })}

          {/* Menu Button - Bottom Right */}
          <button
            onClick={() => setIsMenuOpen(true)}
            data-testid="button-open-menu"
            className="flex flex-col items-center justify-center gap-1 px-1 py-2 rounded-md text-muted-foreground hover:text-foreground transition-colors hover-elevate active-elevate-2"
          >
            <Menu className="w-6 h-6" />
            <span className="text-xs font-medium">Menu</span>
          </button>
        </div>
      </nav>

      {/* Expandable Menu - Slides up from bottom */}
      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent 
          side="bottom" 
          className="h-[80vh] rounded-t-3xl p-0"
          data-testid="menu-sheet"
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="text-2xl font-semibold">Navigation</SheetTitle>
          </SheetHeader>
          
          {/* Scrollable Menu Content */}
          <div className="overflow-y-auto h-[calc(80vh-5rem)] px-4 py-4">
            <div className="space-y-2">
              {allNavItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Button
                    key={item.path}
                    variant={active ? 'default' : 'ghost'}
                    size="lg"
                    onClick={() => handleNavigation(item.path)}
                    data-testid={item.testId}
                    className="w-full justify-start gap-3 text-base"
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Button>
                );
              })}
            </div>

            {/* Secondary Actions Section */}
            <div className="mt-8 pt-6 border-t">
              <h3 className="text-sm font-semibold text-muted-foreground px-3 mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleNewDeal}
                  disabled={createDealMutation.isPending || usersLoading}
                  data-testid="menu-new-deal"
                  className="w-full justify-start gap-3 text-base"
                >
                  <Plus className="w-5 h-5" />
                  {usersLoading ? 'Loading...' : createDealMutation.isPending ? 'Creating...' : 'New Deal'}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
