import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Customer } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageLayout } from "@/components/page-layout";
import { PageHeader } from "@/components/core/page-header";
import { PageContent } from "@/components/core/page-content";
import { LoadingState } from "@/components/core/loading-state";
import { ErrorState } from "@/components/core/error-state";
import { CustomerDetailSheet } from "@/components/customer-detail-sheet";
import { CustomerFormSheet } from "@/components/customer-form-sheet";
import {
  premiumCardClasses,
  gridLayouts,
  cardSpacing,
  emptyStateClasses,
  emptyStateIconClasses,
  emptyStateTextClasses,
} from "@/lib/design-tokens";
import {
  Search,
  User,
  Mail,
  Phone,
  MapPin,
  Plus,
  ArrowRight,
  AlertCircle,
  RefreshCw,
  FileUser,
} from "lucide-react";

// Customer Card Component
function CustomerCard({ customer, onViewDetails }: {
  customer: Customer;
  onViewDetails: () => void;
}) {
  const initials = `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase();
  
  return (
    <Card
      className={cn(premiumCardClasses, "group overflow-hidden cursor-pointer h-full")}
      data-testid={`card-customer-${customer.id}`}
      onClick={onViewDetails}
    >
      <div className={cn("bg-gradient-to-br from-primary/10 to-primary/5", cardSpacing.standard)}>
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center border-2 border-primary/30 overflow-hidden">
            {customer.photoUrl ? (
              <img 
                src={customer.photoUrl} 
                alt={`${customer.firstName} ${customer.lastName}`} 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-lg font-bold text-primary">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight truncate" data-testid={`text-customer-name-${customer.id}`}>
              {customer.firstName} {customer.lastName}
            </h3>
            <p className="text-xs text-muted-foreground">Customer</p>
          </div>
        </div>
      </div>

      <CardContent className={cn(cardSpacing.compact, "space-y-3")}>
        {/* Contact Info */}
        <div className="space-y-2">
          {customer.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span className="truncate" data-testid={`text-email-${customer.id}`}>{customer.email}</span>
            </div>
          )}
          {customer.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <span>{customer.phone}</span>
            </div>
          )}
          {customer.city && customer.state && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{customer.city}, {customer.state}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="text-xs text-muted-foreground">
            {customer.zipCode || 'No ZIP'}
          </div>
          <Button variant="ghost" size="sm" className="gap-1" data-testid={`button-view-${customer.id}`}>
            View
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Card Skeleton
function CustomerCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <div className={cn("bg-gradient-to-br from-primary/10 to-primary/5", cardSpacing.standard)}>
        <div className="flex items-center gap-3">
          <Skeleton className="w-14 h-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
      <CardContent className={cn(cardSpacing.compact, "space-y-3")}>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-8 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Customers() {
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [page] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formSheetOpen, setFormSheetOpen] = useState(false);
  
  // Fetch customers
  const { data: customers, isLoading, error, refetch} = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  // Filter customers based on search
  const filteredCustomers = useMemo(() => {
    if (!customers) return [];
    
    if (!searchQuery) return customers;
    
    const query = searchQuery.toLowerCase();
    return customers.filter(customer =>
      customer.firstName.toLowerCase().includes(query) ||
      customer.lastName.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.includes(query) ||
      customer.city?.toLowerCase().includes(query)
    );
  }, [customers, searchQuery]);

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailSheetOpen(true);
  };

  const handleAddCustomer = () => {
    setFormMode('create');
    setSelectedCustomer(null);
    setFormSheetOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setFormMode('edit');
    setSelectedCustomer(customer);
    setFormSheetOpen(true);
  };

  return (
    <PageLayout className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <PageHeader
        title="Customer Management"
        subtitle="View and manage all your customers"
        icon={<FileUser />}
        actions={
          <Button className="gap-2" onClick={handleAddCustomer} data-testid="button-add-customer">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Customer</span>
            <span className="sm:hidden">Add</span>
          </Button>
        }
      />

      {/* Search Bar Section */}
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search"
            />
          </div>
        </div>
      </div>

      <PageContent>
        {error && (
          <ErrorState
            title="Failed to load customers"
            message="There was an error loading the customer list. Please try again."
            onRetry={() => refetch()}
          />
        )}

        {isLoading && <LoadingState message="Loading customers..." />}

        {!error && !isLoading && filteredCustomers.length === 0 && (
          <div className={emptyStateClasses}>
            <div className={emptyStateIconClasses}>
              <FileUser className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className={emptyStateTextClasses.title}>No customers found</h3>
            <p className={emptyStateTextClasses.description}>
              {searchQuery
                ? "No customers match your search criteria. Try adjusting your search."
                : "No customers in the system yet. Add your first customer to get started."}
            </p>
            {!searchQuery && (
              <Button onClick={handleAddCustomer} data-testid="button-add-first-customer" className="mt-4">
                <Plus className="w-4 h-4 mr-2" />
                Add First Customer
              </Button>
            )}
          </div>
        )}

        {!error && !isLoading && filteredCustomers.length > 0 && (
          <div className={gridLayouts.fourCol}>
            {filteredCustomers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onViewDetails={() => handleViewDetails(customer)}
              />
            ))}
          </div>
        )}
      </PageContent>

      {/* Customer Detail Sheet */}
      <CustomerDetailSheet
        customer={selectedCustomer}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onEdit={handleEditCustomer}
      />

      {/* Customer Form Sheet */}
      <CustomerFormSheet
        mode={formMode}
        customer={selectedCustomer}
        open={formSheetOpen}
        onOpenChange={setFormSheetOpen}
        onSuccess={(customer) => {
          setDetailSheetOpen(false);
          setFormSheetOpen(false);
        }}
      />
    </PageLayout>
  );
}
