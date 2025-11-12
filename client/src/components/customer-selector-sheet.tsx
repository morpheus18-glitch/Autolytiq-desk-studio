import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, User, Plus, Mail, Phone, MapPin } from 'lucide-react';

interface CustomerSelectorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealId: string;
  currentCustomerId?: string;
}

type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
};

export function CustomerSelectorSheet({ 
  open, 
  onOpenChange, 
  dealId,
  currentCustomerId 
}: CustomerSelectorSheetProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Fetch all customers
  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    enabled: open,
  });
  
  // Attach customer to deal (generates deal number on first attachment)
  const updateDealMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const response = await apiRequest('PATCH', `/api/deals/${dealId}/attach-customer`, {
        customerId,
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      toast({
        title: 'Customer attached',
        description: 'Deal has been linked to customer and deal number generated',
      });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to attach customer',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
  
  // Filter customers based on search query
  const filteredCustomers = customers?.filter(customer => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.firstName.toLowerCase().includes(query) ||
      customer.lastName.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.includes(query)
    );
  }) || [];
  
  const handleSelectCustomer = (customerId: string) => {
    updateDealMutation.mutate(customerId);
  };
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[500px]"
        data-testid="sheet-customer-selector"
      >
        <SheetHeader>
          <SheetTitle>Select Customer</SheetTitle>
          <SheetDescription>
            Choose a customer to link to this deal
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-customer-search"
            />
          </div>
          
          {/* Create New Customer Button */}
          <Button 
            variant="outline" 
            className="w-full gap-2"
            onClick={() => {
              onOpenChange(false);
              // Navigate to customer creation page - for now just toast
              toast({
                title: 'Create New Customer',
                description: 'This will navigate to customer creation (to be implemented)',
              });
            }}
            data-testid="button-create-customer"
          >
            <Plus className="w-4 h-4" />
            Create New Customer
          </Button>
          
          {/* Customer List */}
          <ScrollArea className="h-[calc(100vh-20rem)]">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading customers...
              </div>
            ) : filteredCustomers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {searchQuery ? 'No customers match your search' : 'No customers found'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredCustomers.map((customer) => (
                  <Card
                    key={customer.id}
                    className={`cursor-pointer hover-elevate active-elevate-2 transition-all ${
                      currentCustomerId === customer.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleSelectCustomer(customer.id)}
                    data-testid={`card-customer-${customer.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <User className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                            <div className="font-semibold text-base truncate">
                              {customer.firstName} {customer.lastName}
                            </div>
                          </div>
                          
                          <div className="space-y-1.5 text-sm">
                            {customer.email && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{customer.email}</span>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="font-mono">{customer.phone}</span>
                              </div>
                            )}
                            {(customer.city || customer.state) && (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">
                                  {[customer.city, customer.state].filter(Boolean).join(', ')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {currentCustomerId === customer.id && (
                          <Badge variant="default" className="flex-shrink-0">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}
