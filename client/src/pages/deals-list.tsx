import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, FileText, User, Car, DollarSign, Calendar, Hash, Package, ArrowRight, Zap } from 'lucide-react';
import type { DealWithRelations, Vehicle, Customer, User as UserType } from '@shared/schema';
import { EmptyState } from '@/components/ui/empty-state';
import { useLocation } from 'wouter';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { PageLayout } from '@/components/page-layout';
import { PageHero } from '@/components/page-hero';
import { premiumCardClasses } from '@/lib/design-tokens';

const DEAL_STATE_COLORS: Record<string, string> = {
  DRAFT: 'bg-yellow-100 text-yellow-800 border-0 shadow-md rounded-full',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 border-0 shadow-md rounded-full',
  APPROVED: 'bg-green-100 text-green-800 border-0 shadow-md rounded-full',
  CANCELLED: 'bg-red-100 text-red-800 border-0 shadow-md rounded-full',
};

// Deal Card Component
function DealCard({ deal }: { deal: DealWithRelations }) {
  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(price));
  };

  // Get primary scenario for financial info
  const primaryScenario = deal.scenarios?.[0];
  const scenarioCount = deal.scenarios?.length || 0;
  
  // Extract all financial components from scenario (or null if no scenario)
  const vehiclePrice = primaryScenario ? Number(primaryScenario.vehiclePrice || deal.vehicle?.price || 0) : null;
  const totalTax = primaryScenario ? Number(primaryScenario.totalTax || 0) : null;
  const totalFees = primaryScenario ? Number(primaryScenario.totalFees || 0) : null;
  const tradeAllowance = primaryScenario ? Number(primaryScenario.tradeAllowance || 0) : null;
  const tradePayoff = primaryScenario ? Number(primaryScenario.tradePayoff || 0) : null;
  const downPayment = primaryScenario ? Number(primaryScenario.downPayment || 0) : null;
  
  // Calculate aftermarket products total
  const aftermarketProducts = (primaryScenario?.aftermarketProducts || []) as any[];
  const aftermarketTotal = primaryScenario ? aftermarketProducts.reduce(
    (sum, product) => sum + Number(product.price || 0),
    0
  ) : null;
  
  // Calculate amount financed: Vehicle + Tax + Fees + Aftermarket + Payoff - Down - Trade Allowance
  const amountFinanced = primaryScenario && vehiclePrice !== null 
    ? vehiclePrice + (totalTax || 0) + (totalFees || 0) + (aftermarketTotal || 0) + (tradePayoff || 0) - (downPayment || 0) - (tradeAllowance || 0)
    : null;
  
  const monthlyPayment = primaryScenario?.monthlyPayment;
  const term = primaryScenario?.term;
  const apr = primaryScenario?.apr;

  return (
    <Link href={`/deals/${deal.id}`}>
      <Card 
        className={cn(premiumCardClasses, "group overflow-hidden cursor-pointer h-full")}
        data-testid={`card-deal-${deal.id}`}
      >
        {/* Compact Header */}
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <div className="font-mono font-bold text-sm text-foreground" data-testid={`text-deal-number-${deal.id}`}>
                {deal.dealNumber || <span className="text-muted-foreground italic font-normal">Pending customer</span>}
              </div>
              <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3" />
                {new Date(deal.createdAt).toLocaleDateString()}
              </div>
            </div>
            <Badge 
              className={cn("text-xs font-semibold uppercase", DEAL_STATE_COLORS[deal.dealState] || '')}
              data-testid={`badge-status-${deal.id}`}
            >
              {deal.dealState.replace('_', ' ')}
            </Badge>
          </div>
          
          {/* Customer & Vehicle Badges */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {deal.customer ? (
              <div className="flex items-center gap-1 text-muted-foreground">
                <User className="w-3 h-3" />
                <span className="font-medium">{deal.customer.firstName} {deal.customer.lastName}</span>
              </div>
            ) : (
              <Badge variant="outline" className="text-xs">No Customer</Badge>
            )}
            <span className="text-muted-foreground">•</span>
            {deal.vehicle ? (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Car className="w-3 h-3" />
                <span className="font-medium">{deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}</span>
              </div>
            ) : (
              <Badge variant="outline" className="text-xs">No Vehicle</Badge>
            )}
            {scenarioCount > 0 && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">{scenarioCount} scenario{scenarioCount !== 1 ? 's' : ''}</span>
              </>
            )}
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Financial Breakdown Grid */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            <div>
              <div className="text-muted-foreground uppercase tracking-wide mb-0.5">Vehicle Price</div>
              <div className="font-mono tabular-nums font-semibold" data-testid={`text-price-${deal.id}`}>
                {vehiclePrice !== null && vehiclePrice > 0 ? formatPrice(vehiclePrice) : '—'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground uppercase tracking-wide mb-0.5">Taxes</div>
              <div className="font-mono tabular-nums font-semibold">
                {totalTax !== null && totalTax > 0 ? formatPrice(totalTax) : '—'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground uppercase tracking-wide mb-0.5">Fees</div>
              <div className="font-mono tabular-nums font-semibold">
                {totalFees !== null && totalFees > 0 ? formatPrice(totalFees) : '—'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground uppercase tracking-wide mb-0.5">Aftermarket</div>
              <div className="font-mono tabular-nums font-semibold">
                {aftermarketTotal !== null && aftermarketTotal > 0 ? formatPrice(aftermarketTotal) : '—'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground uppercase tracking-wide mb-0.5">Trade Allowance</div>
              <div className="font-mono tabular-nums font-semibold text-green-600">
                {tradeAllowance !== null && tradeAllowance > 0 ? formatPrice(tradeAllowance) : '—'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground uppercase tracking-wide mb-0.5">Trade Payoff</div>
              <div className="font-mono tabular-nums font-semibold text-red-600">
                {tradePayoff !== null && tradePayoff > 0 ? formatPrice(tradePayoff) : '—'}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground uppercase tracking-wide mb-0.5">Down Payment</div>
              <div className="font-mono tabular-nums font-semibold" data-testid={`text-down-${deal.id}`}>
                {downPayment !== null && downPayment > 0 ? formatPrice(downPayment) : '—'}
              </div>
            </div>
          </div>
          
          {/* Amount Financed */}
          <div className="pt-2 border-t">
            <div className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Amount Financed</div>
            <div className="font-mono tabular-nums font-bold text-lg text-blue-600" data-testid={`text-financed-${deal.id}`}>
              {amountFinanced !== null && amountFinanced > 0 ? formatPrice(amountFinanced) : '—'}
            </div>
          </div>
          
          {/* Recap Footer */}
          {primaryScenario && (
            <div className="pt-2 border-t bg-muted/20 -mx-4 -mb-4 p-3 grid grid-cols-3 gap-2 text-xs">
              <div>
                <div className="text-muted-foreground uppercase tracking-wide mb-0.5">Term</div>
                <div className="font-mono tabular-nums font-semibold">
                  {term || '—'} mo
                </div>
              </div>
              <div>
                <div className="text-muted-foreground uppercase tracking-wide mb-0.5">APR</div>
                <div className="font-mono tabular-nums font-semibold">
                  {apr ? `${Number(apr).toFixed(2)}%` : '—'}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground uppercase tracking-wide mb-0.5">Monthly</div>
                <div className="font-mono tabular-nums font-semibold text-blue-600" data-testid={`text-monthly-${deal.id}`}>
                  {monthlyPayment ? `${formatPrice(monthlyPayment)}` : '—'}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// Card Skeleton
function DealCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full" />
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DealsList() {
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [showVehiclePicker, setShowVehiclePicker] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  
  // Build query params for pagination and filtering
  const queryParams = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    ...(searchQuery && { search: searchQuery }),
    ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
  });
  
  const { data, isLoading } = useQuery<{
    deals: DealWithRelations[];
    total: number;
    pages: number;
  }>({
    queryKey: [`/api/deals?${queryParams.toString()}`],
  });
  
  // Get users for salesperson
  const { data: users, isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
  });
  
  // Vehicle search for picker
  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['/api/inventory/search'],
    enabled: showVehiclePicker,
  });
  
  // Customer search for picker
  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['/api/customers/search', customerSearchQuery],
    enabled: showCustomerPicker && customerSearchQuery.length > 0,
  });
  
  const deals = data?.deals || [];
  const totalPages = data?.pages || 1;
  
  // Filter vehicles by search
  const filteredVehicles = vehicles?.filter((v) => {
    const search = vehicleSearchQuery.toLowerCase();
    return (
      v.make.toLowerCase().includes(search) ||
      v.model.toLowerCase().includes(search) ||
      v.year.toString().includes(search) ||
      v.stockNumber?.toLowerCase().includes(search)
    );
  });
  
  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: async (data: { vehicleId?: string; customerId?: string }) => {
      // Get salesperson (first user or first salesperson)
      const salesperson = users?.find(u => u.role === 'salesperson') || users?.[0];
      if (!salesperson) {
        throw new Error('No users available');
      }
      
      const dealData = {
        salespersonId: salesperson.id,
        vehicleId: data.vehicleId || undefined,
        customerId: data.customerId || undefined,
      };
      
      const response = await apiRequest('POST', '/api/deals', dealData);
      return await response.json();
    },
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
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
  
  const handleStartBlankDeal = () => {
    createDealMutation.mutate({});
  };
  
  const handleStartWithVehicle = (vehicleId: string) => {
    createDealMutation.mutate({ vehicleId });
    setShowVehiclePicker(false);
  };
  
  const handleStartWithCustomer = (customerId: string) => {
    createDealMutation.mutate({ customerId });
    setShowCustomerPicker(false);
  };
  
  return (
    <PageLayout className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <PageHero
        icon={FileText}
        title="Desk HQ"
        description="Your universal deal command center"
        actions={
          <Button 
            size="lg"
            onClick={handleStartBlankDeal}
            disabled={usersLoading || createDealMutation.isPending}
            data-testid="button-start-blank-deal"
            className="gap-2 shadow-lg shadow-primary/20"
          >
            <Zap className="w-4 h-4" />
            {usersLoading ? 'Loading...' : 'Start Deal'}
          </Button>
        }
      />
      
      {/* Filters Section */}
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search deals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-deals"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40" data-testid="select-status-filter">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Deals Grid */}
      <div className="container mx-auto px-3 md:px-4 py-6">
        <div className="flex-1 min-w-0 overflow-hidden">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <DealCardSkeleton key={i} />
              ))}
            </div>
          ) : deals.length === 0 ? (
            <Card className="p-12">
              <EmptyState
                icon={searchQuery || statusFilter !== 'all' ? Filter : FileText}
                title={searchQuery || statusFilter !== 'all' ? 'No deals found' : 'No deals yet'}
                description={
                  searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your search query or filter settings to find what you\'re looking for.'
                    : 'Create your first deal to start managing customer transactions and building your deal pipeline.'
                }
                containerTestId="empty-state-deals"
                action={
                  !searchQuery && statusFilter === 'all'
                    ? {
                        label: 'Start Blank Deal',
                        onClick: handleStartBlankDeal,
                        testId: 'button-create-first-deal',
                      }
                    : undefined
                }
              />
            </Card>
          ) : (
            <>
              {/* Unified vertical grid layout - mobile and desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {deals.map((deal) => (
                  <DealCard key={deal.id} deal={deal} />
                ))}
              </div>
              
              {/* Pagination */}
              {data && data.pages > 1 && (
                <div className="flex items-center justify-center mt-8 gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <div className="flex items-center px-4">
                    <span className="text-sm text-muted-foreground">
                      Page {page} of {totalPages}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    data-testid="button-next-page"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Vehicle Picker Dialog */}
      <Dialog open={showVehiclePicker} onOpenChange={setShowVehiclePicker}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Vehicle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-auto">
            <Input
              type="text"
              placeholder="Search by make, model, year, or stock#..."
              value={vehicleSearchQuery}
              onChange={(e) => setVehicleSearchQuery(e.target.value)}
              data-testid="input-vehicle-picker-search"
            />
            <div className="space-y-2">
              {filteredVehicles?.map((v) => (
                <Card
                  key={v.id}
                  className="hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => handleStartWithVehicle(v.id)}
                  data-testid={`card-vehicle-picker-${v.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">
                          {v.year} {v.make} {v.model}
                        </h3>
                        {v.trim && <p className="text-sm text-muted-foreground">{v.trim}</p>}
                        <p className="text-xs text-muted-foreground font-mono mt-1">
                          Stock #{v.stockNumber}
                        </p>
                      </div>
                      <p className="text-lg font-bold">${v.price.toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Customer Picker Dialog */}
      <Dialog open={showCustomerPicker} onOpenChange={setShowCustomerPicker}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-auto">
            <Input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={customerSearchQuery}
              onChange={(e) => setCustomerSearchQuery(e.target.value)}
              data-testid="input-customer-picker-search"
            />
            <div className="space-y-2">
              {customers?.map((c) => (
                <Card
                  key={c.id}
                  className="hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => handleStartWithCustomer(c.id)}
                  data-testid={`card-customer-picker-${c.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">
                          {c.firstName} {c.lastName}
                        </h3>
                        <p className="text-sm text-muted-foreground">{c.email}</p>
                        {c.phone && <p className="text-xs text-muted-foreground">{c.phone}</p>}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {customerSearchQuery.length > 0 && (!customers || customers.length === 0) && (
                <div className="text-center text-muted-foreground py-8">
                  No customers found. Try a different search.
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
