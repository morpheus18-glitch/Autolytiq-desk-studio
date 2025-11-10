import { Calculator, User, Car, Package, FileText } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface DealWorksheetTabsProps {
  defaultTab?: string;
  onTabChange?: (tab: string) => void;
  children?: {
    numbers?: React.ReactNode;
    customer?: React.ReactNode;
    vehicle?: React.ReactNode;
    products?: React.ReactNode;
    docs?: React.ReactNode;
  };
  className?: string;
}

const tabs = [
  { id: 'numbers', label: 'Numbers', icon: Calculator },
  { id: 'customer', label: 'Customer', icon: User },
  { id: 'vehicle', label: 'Vehicle', icon: Car },
  { id: 'products', label: 'Products', icon: Package },
  { id: 'docs', label: 'Docs', icon: FileText },
] as const;

export function DealWorksheetTabs({
  defaultTab = 'numbers',
  onTabChange,
  children,
  className,
}: DealWorksheetTabsProps) {
  return (
    <Tabs 
      defaultValue={defaultTab} 
      className={cn("flex flex-col h-full", className)}
      onValueChange={onTabChange}
      data-testid="deal-worksheet-tabs"
    >
      {/* Mobile-First Tab Navigation - Scrollable on mobile */}
      <TabsList 
        className={cn(
          "w-full h-auto p-0 bg-card border-b rounded-none gap-0",
          "flex overflow-x-auto scrollbar-hide sm:grid sm:grid-cols-5",
          "sticky z-30"
        )}
        style={{ top: 'calc(var(--header-height, 73px) + var(--hero-height, 180px))' } as React.CSSProperties}
        data-testid="tabs-navigation"
      >
        {tabs.map(({ id, label, icon: Icon }) => (
          <TabsTrigger
            key={id}
            value={id}
            className={cn(
              "flex flex-col items-center gap-1.5 sm:gap-2",
              "px-4 sm:px-4 py-3 sm:py-4 min-w-[80px] sm:min-w-0",
              "rounded-none border-b-2 border-transparent",
              "data-[state=active]:border-primary data-[state=active]:bg-transparent",
              "data-[state=active]:shadow-none",
              "transition-all duration-200",
              "hover-elevate"
            )}
            data-testid={`tab-trigger-${id}`}
          >
            <Icon className="w-5 h-5 sm:w-6 sm:h-6" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-medium">{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>

      {/* Tab Content Areas with fade animation */}
      <div className="flex-1 overflow-y-auto">
        <TabsContent 
          value="numbers" 
          className="mt-0 h-full data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-right-2 duration-200"
          data-testid="tab-content-numbers"
        >
          {children?.numbers || (
            <div className="p-6 text-muted-foreground">
              Numbers tab content
            </div>
          )}
        </TabsContent>

        <TabsContent 
          value="customer" 
          className="mt-0 h-full data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-right-2 duration-200"
          data-testid="tab-content-customer"
        >
          {children?.customer || (
            <div className="p-6 text-muted-foreground">
              Customer tab content
            </div>
          )}
        </TabsContent>

        <TabsContent 
          value="vehicle" 
          className="mt-0 h-full data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-right-2 duration-200"
          data-testid="tab-content-vehicle"
        >
          {children?.vehicle || (
            <div className="p-6 text-muted-foreground">
              Vehicle tab content
            </div>
          )}
        </TabsContent>

        <TabsContent 
          value="products" 
          className="mt-0 h-full data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-right-2 duration-200"
          data-testid="tab-content-products"
        >
          {children?.products || (
            <div className="p-6 text-muted-foreground">
              Products tab content
            </div>
          )}
        </TabsContent>

        <TabsContent 
          value="docs" 
          className="mt-0 h-full data-[state=inactive]:hidden data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-right-2 duration-200"
          data-testid="tab-content-docs"
        >
          {children?.docs || (
            <div className="p-6 text-muted-foreground">
              Docs tab content
            </div>
          )}
        </TabsContent>
      </div>
    </Tabs>
  );
}
