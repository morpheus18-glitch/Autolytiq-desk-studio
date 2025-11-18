import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertCustomerSchema, type InsertCustomer } from '@shared/schema';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Search, User, Plus, Mail, Phone, MapPin, ArrowLeft, UserPlus, Loader2 } from 'lucide-react';

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
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form for creating new customer
  const form = useForm<InsertCustomer>({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      marketingOptIn: false,
    },
  });
  
  // Fetch all customers
  const { data: customers, isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
    enabled: open,
  });
  
  // Create customer and attach to deal
  const createAndAttachMutation = useMutation({
    mutationFn: async (data: InsertCustomer) => {
      // First create the customer
      const createResponse = await apiRequest('POST', '/api/customers', data);
      const newCustomer = await createResponse.json();
      
      // Then attach to deal
      const attachResponse = await apiRequest('PATCH', `/api/deals/${dealId}/attach-customer`, {
        customerId: newCustomer.id,
      });
      return await attachResponse.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      toast({
        title: 'Customer created and attached',
        description: 'New customer has been created and linked to the deal',
      });
      form.reset();
      setShowCreateForm(false);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create customer',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
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
    <Sheet open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        setShowCreateForm(false);
        setSearchQuery('');
        form.reset();
      }
    }}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-[500px]"
        data-testid="sheet-customer-selector"
      >
        <SheetHeader>
          <SheetTitle>
            {showCreateForm ? 'Create New Customer' : 'Select Customer'}
          </SheetTitle>
          <SheetDescription>
            {showCreateForm 
              ? 'Enter customer details to create and attach to this deal' 
              : 'Choose a customer to link to this deal'
            }
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-4">
          {showCreateForm ? (
            <Form {...form}>
              <form 
                onSubmit={form.handleSubmit(async (data) => {
                  try {
                    await createAndAttachMutation.mutateAsync(data);
                  } catch (error) {
                    // Error is already handled by mutation's onError
                  }
                })} 
                className="space-y-4"
              >
                <ScrollArea className="h-[calc(100vh-16rem)] pr-4">
                  <div className="space-y-4">
                    {/* Name Fields */}
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="John" data-testid="input-customer-firstname" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name *</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Doe" data-testid="input-customer-lastname" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Contact Fields */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                {...field}
                                value={field.value || ''}
                                type="email"
                                placeholder="john@example.com"
                                className="pl-10"
                                data-testid="input-customer-email"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                {...field}
                                value={field.value || ''}
                                type="tel"
                                placeholder="(555) 123-4567"
                                className="pl-10"
                                data-testid="input-customer-phone"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Address Fields */}
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="123 Main St" data-testid="input-customer-address" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} placeholder="New York" data-testid="input-customer-city" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input {...field} value={field.value || ''} placeholder="NY" maxLength={2} data-testid="input-customer-state" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="10001" data-testid="input-customer-zipcode" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </ScrollArea>

                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={() => {
                      setShowCreateForm(false);
                      form.reset();
                    }}
                    disabled={createAndAttachMutation.isPending}
                    data-testid="button-cancel-create-customer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to List
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 gap-2"
                    disabled={createAndAttachMutation.isPending}
                    data-testid="button-submit-create-customer"
                  >
                    {createAndAttachMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        Create & Attach
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          ) : (
            <>
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
                onClick={() => setShowCreateForm(true)}
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
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
