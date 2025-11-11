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
      className="group overflow-hidden backdrop-blur-md bg-card/40 border-card-border hover-elevate transition-all duration-200 cursor-pointer h-full"
      data-testid={`card-customer-${customer.id}`}
      onClick={onViewDetails}
    >
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center border-2 border-primary/30">
            <span className="text-lg font-bold text-primary">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base leading-tight truncate" data-testid={`text-customer-name-${customer.id}`}>
              {customer.firstName} {customer.lastName}
            </h3>
            <p className="text-xs text-muted-foreground">Customer</p>
          </div>
        </div>
      </div>

      <CardContent className="p-4 space-y-3">
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
      <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-14 h-14 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>
      <CardContent className="p-4 space-y-3">
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
    // Navigate to customer detail or edit page
    console.log('View customer:', customer.id);
    // setLocation(`/customers/${customer.id}`);
  };

  return (
    <PageLayout className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b">
        <div className="container mx-auto px-3 md:px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold">Customer Management</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  View and manage all your customers
                </p>
              </div>
              <Button className="gap-2" data-testid="button-add-customer">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add Customer</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
            
            {/* Search Bar */}
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
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-3 md:px-4 py-6">
        <div className="flex-1 min-w-0 overflow-hidden">
          {error ? (
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-destructive" />
                <h3 className="text-lg font-semibold">Failed to load customers</h3>
                <p className="text-sm text-muted-foreground">
                  There was an error loading the customer list. Please try again.
                </p>
                <Button onClick={() => refetch()} data-testid="button-retry">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </div>
            </Card>
          ) : isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <CustomerCardSkeleton key={i} />
              ))}
            </div>
          ) : filteredCustomers.length === 0 ? (
            <Card className="p-12">
              <div className="flex flex-col items-center justify-center text-center space-y-4">
                <FileUser className="w-12 h-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold">No customers found</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {searchQuery
                    ? "No customers match your search criteria. Try adjusting your search."
                    : "No customers in the system yet. Add your first customer to get started."}
                </p>
                {!searchQuery && (
                  <Button data-testid="button-add-first-customer">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Customer
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <>
              {/* Mobile: Horizontal Snap Scroll */}
              {isMobile ? (
                <div className="overflow-x-auto snap-x snap-mandatory -mx-3 px-3 pb-4 scrollbar-hide">
                  <div className="flex gap-3">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className="snap-center shrink-0 basis-[calc(100%-1.5rem)] max-w-[20rem]"
                      >
                        <CustomerCard
                          customer={customer}
                          onViewDetails={() => handleViewDetails(customer)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Desktop/Tablet: Grid */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredCustomers.map((customer) => (
                    <CustomerCard
                      key={customer.id}
                      customer={customer}
                      onViewDetails={() => handleViewDetails(customer)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
