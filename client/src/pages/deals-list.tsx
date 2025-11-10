import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, FileText, User, Car, DollarSign, Calendar, Hash, Package, ArrowRight } from 'lucide-react';
import type { DealWithRelations } from '@shared/schema';
import { EmptyState } from '@/components/ui/empty-state';
import { useLocation } from 'wouter';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const DEAL_STATE_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  APPROVED: 'bg-green-500/10 text-green-600 border-green-500/20',
  CANCELLED: 'bg-destructive/10 text-destructive border-destructive/20',
};

// Deal Card Component
function DealCard({ deal }: { deal: DealWithRelations }) {
  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(price));
  };

  const images = (deal.vehicle.images as string[]) || [];
  const primaryImage = images[0] || '/api/placeholder/400/300';
  
  // Get primary scenario for financial info
  const primaryScenario = deal.scenarios?.[0];
  const monthlyPayment = primaryScenario?.monthlyPayment;
  const vehiclePrice = primaryScenario?.vehiclePrice || deal.vehicle.price;
  const downPayment = primaryScenario?.downPayment || '0';
  const scenarioCount = deal.scenarios?.length || 0;
  
  // Calculate amount financed (vehicle price - down payment)
  const amountFinanced = Number(vehiclePrice) - Number(downPayment);

  return (
    <Link href={`/deals/${deal.id}`}>
      <Card 
        className="group overflow-hidden backdrop-blur-md bg-card/40 border-card-border hover-elevate transition-all duration-200 cursor-pointer h-full"
        data-testid={`card-deal-${deal.id}`}
      >
        <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-b from-muted/20 to-muted/40">
          <img
            src={primaryImage}
            alt={`${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute top-2 left-2 right-2 flex justify-between items-start gap-2">
            <Badge 
              className={cn("font-semibold", DEAL_STATE_COLORS[deal.dealState] || '')}
              data-testid={`badge-status-${deal.id}`}
            >
              {deal.dealState.replace('_', ' ')}
            </Badge>
            <div className="backdrop-blur-md bg-black/30 rounded px-2 py-1">
              <p className="text-white text-xs font-mono font-semibold">
                {deal.dealNumber}
              </p>
            </div>
          </div>
          {/* Monthly Payment Badge */}
          {monthlyPayment && (
            <div className="absolute bottom-2 left-2 backdrop-blur-md bg-primary/90 rounded px-2 py-1.5">
              <div className="text-white text-xs opacity-90">Payment</div>
              <div className="text-white font-bold font-mono text-sm">
                {formatPrice(monthlyPayment)}/mo
              </div>
            </div>
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Customer Info */}
          <div>
            <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
              <User className="w-3 h-3" />
              <span>Customer</span>
            </div>
            <h3 className="font-semibold text-base leading-tight" data-testid={`text-customer-${deal.id}`}>
              {deal.customer.firstName} {deal.customer.lastName}
            </h3>
            {deal.customer.email && (
              <p className="text-xs text-muted-foreground truncate">{deal.customer.email}</p>
            )}
          </div>

          {/* Vehicle Info */}
          <div>
            <div className="flex items-center gap-1 text-muted-foreground text-xs mb-1">
              <Car className="w-3 h-3" />
              <span>Vehicle</span>
            </div>
            <p className="font-medium text-sm">
              {deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}
            </p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                <Package className="w-3 h-3" />
                {deal.vehicle.stockNumber.substring(0, 8).toUpperCase()}
              </p>
              {scenarioCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {scenarioCount} scenario{scenarioCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <div>
              <div className="text-xs text-muted-foreground">Vehicle Price</div>
              <div className="font-mono font-semibold text-sm" data-testid={`text-price-${deal.id}`}>
                {formatPrice(vehiclePrice)}
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Amount Financed</div>
              <div className="font-mono font-semibold text-sm" data-testid={`text-financed-${deal.id}`}>
                {formatPrice(amountFinanced)}
              </div>
            </div>
            {primaryScenario && (
              <>
                <div>
                  <div className="text-xs text-muted-foreground">Down Payment</div>
                  <div className="font-mono font-semibold text-sm" data-testid={`text-down-${deal.id}`}>
                    {formatPrice(downPayment)}
                  </div>
                </div>
                {monthlyPayment != null && (
                  <div>
                    <div className="text-xs text-muted-foreground">Monthly</div>
                    <div className="font-mono font-semibold text-sm text-primary" data-testid={`text-monthly-${deal.id}`}>
                      {formatPrice(monthlyPayment)}/mo
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {new Date(deal.createdAt).toLocaleDateString()}
            </div>
            <Button variant="ghost" size="sm" className="gap-1" data-testid={`button-view-${deal.id}`}>
              View
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>
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
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  
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
  
  const deals = data?.deals || [];
  const totalPages = data?.pages || 1;
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b">
        <div className="container mx-auto px-3 md:px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Deals</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage and track all automotive deals
                </p>
              </div>
              <Link href="/deals/new">
                <Button size="lg" className="gap-2" data-testid="button-create-deal">
                  <Plus className="w-4 h-4" />
                  <span className="hidden sm:inline">Create New Deal</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </Link>
            </div>
            
            {/* Filters */}
            <div className="flex gap-2 md:gap-4">
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
                <SelectTrigger className="w-32 md:w-48" data-testid="select-status-filter">
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
                        label: 'Create Deal',
                        onClick: () => setLocation('/deals/new'),
                        testId: 'button-create-first-deal',
                      }
                    : undefined
                }
              />
            </Card>
          ) : (
            <>
              {/* Mobile: Horizontal Snap Scroll */}
              {isMobile ? (
                <div className="overflow-x-auto snap-x snap-mandatory -mx-3 px-3 pb-4 scrollbar-hide">
                  <div className="flex gap-3">
                    {deals.map((deal) => (
                      <div
                        key={deal.id}
                        className="snap-center shrink-0 basis-[calc(100%-1.5rem)] max-w-[20rem]"
                      >
                        <DealCard deal={deal} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Desktop/Tablet: Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {deals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} />
                  ))}
                </div>
              )}
              
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
    </div>
  );
}
