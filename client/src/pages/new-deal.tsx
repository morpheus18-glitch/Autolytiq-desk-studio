import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Search, Plus, ArrowLeft, FileText } from 'lucide-react';
import { StockNumberQuickAdd } from '@/components/stock-number-quick-add';
import { PageLayout } from '@/components/page-layout';
import { PageHero } from '@/components/page-hero';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Customer, Vehicle, User } from '@shared/schema';
import {
  containerPadding,
  layoutSpacing,
  premiumCardClasses,
  formSpacing,
  statusColors,
  primaryButtonClasses
} from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

const newDealSchema = z.object({
  customerId: z.string().uuid('Please select a customer'),
  vehicleId: z.string().uuid('Please select a vehicle'),
  salespersonId: z.string().uuid('Salesperson is required'),
  salesManagerId: z.string().uuid().optional(),
});

type NewDealForm = z.infer<typeof newDealSchema>;

export default function NewDeal() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [customerSearch, setCustomerSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  
  // Read vehicleId from URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const vehicleIdFromUrl = urlParams.get('vehicleId');
  
  // Get all users for selecting salesperson
  const { data: users } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  const { data: customers } = useQuery<Customer[]>({
    queryKey: ['/api/customers/search', customerSearch],
    enabled: customerSearch.length > 0,
  });
  
  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ['/api/vehicles/search', vehicleSearch],
    enabled: vehicleSearch.length > 0,
  });
  
  // Fetch vehicle from URL if vehicleId is provided
  const { data: vehicleFromUrl } = useQuery<Vehicle>({
    queryKey: vehicleIdFromUrl ? [`/api/vehicles/${vehicleIdFromUrl}`] : [],
    enabled: !!vehicleIdFromUrl,
  });
  
  const form = useForm<NewDealForm>({
    resolver: zodResolver(newDealSchema),
    defaultValues: {
      customerId: '',
      vehicleId: vehicleIdFromUrl || '',
      salespersonId: '',
      salesManagerId: '',
    },
  });
  
  // Pre-populate vehicle when coming from inventory
  useEffect(() => {
    if (vehicleFromUrl && vehicleIdFromUrl) {
      setSelectedVehicle(vehicleFromUrl);
      form.setValue('vehicleId', vehicleIdFromUrl);
    }
  }, [vehicleFromUrl, vehicleIdFromUrl, form]);
  
  const createDealMutation = useMutation({
    mutationFn: async (data: NewDealForm) => {
      // First, check if we have valid IDs or need to create entities
      const dealData = {
        ...data,
        salesManagerId: data.salesManagerId || undefined,
      };
      const response = await apiRequest('POST', '/api/deals', dealData);
      const result = await response.json();

      // Handle new atomic operations response format
      if (result.success === false) {
        throw new Error(result.error || 'Failed to create deal');
      }

      // Return the deal from the atomic operations result
      return result.data?.deal || result;
    },
    onSuccess: (deal) => {
      toast({ title: 'Deal created successfully!' });
      setLocation(`/deals/${deal.id}`);
    },
    onError: (error: Error) {
      toast({
        title: 'Failed to create deal',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
  
  const onSubmit = (data: NewDealForm) => {
    createDealMutation.mutate(data);
  };
  
  // For demo purposes, we'll allow quick creation with sample data
  const createQuickDeal = async () => {
    try {
      // Create a new customer
      const customerRes = await apiRequest('POST', '/api/customers', {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '(555) 555-5555',
        address: '123 Main Street',
        city: 'Los Angeles',
        state: 'CA',
        zipCode: '90001',
      });
      const customer = await customerRes.json();
      
      // Create a new vehicle
      const vehicleRes = await apiRequest('POST', '/api/vehicles', {
        stockNumber: `V${Date.now()}`,
        vin: `VIN${Date.now()}`,
        year: 2024,
        make: 'Honda',
        model: 'Civic',
        trim: 'EX',
        mileage: 10,
        price: '28500',
        msrp: '30000',
        isNew: true,
      });
      const vehicle = await vehicleRes.json();
      
      // Get a user (we'll use the first salesperson from the list)
      // In a real app, this would be the logged-in user
      if (!users || users.length === 0) {
        throw new Error('No users available. Please seed the database first.');
      }
      const salesperson = users.find(u => u.role === 'salesperson') || users[0];
      const salespersonId = salesperson.id;
      
      // Create the deal (using atomic operations)
      const dealRes = await apiRequest('POST', '/api/deals', {
        customerId: customer.id,
        vehicleId: vehicle.id,
        salespersonId,
      });
      const dealResult = await dealRes.json();

      // Handle new atomic operations response format
      if (dealResult.success === false) {
        throw new Error(dealResult.error || 'Failed to create deal');
      }

      const deal = dealResult.data?.deal || dealResult;
      
      // Create an initial scenario
      await apiRequest('POST', `/api/deals/${deal.id}/scenarios`, {
        scenarioType: 'FINANCE_DEAL',
        name: 'Finance - 60 Month',
        vehiclePrice: vehicle.price,
        downPayment: '5000',
        apr: '4.99',
        term: 60,
        tradeAllowance: '0',
        tradePayoff: '0',
        dealerFees: [{ name: 'Doc Fee', amount: 85, taxable: false }],
        accessories: [],
      });
      
      toast({ title: 'Deal created successfully!' });
      setLocation(`/deals/${deal.id}`);
    } catch (error: any) {
      toast({
        title: 'Failed to create deal',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <PageLayout className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <PageHero
        icon={FileText}
        title="Create New Deal"
        description="Set up a new deal with customer and vehicle information"
        backButton={{
          label: "Back to Deals",
          onClick: () => setLocation('/deals'),
          testId: "button-back"
        }}
      />

      {/* Main Content */}
      <div className={cn(containerPadding, layoutSpacing.page)}>
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Quick Start Option */}
          <Card className={cn(premiumCardClasses, statusColors.info, "p-6")}>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-2">Quick Start Demo</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Create a sample deal with pre-filled customer and vehicle data to explore the platform
                </p>
                <Button
                  onClick={createQuickDeal}
                  className={primaryButtonClasses}
                  data-testid="button-quick-start"
                >
                  <Plus className="w-4 h-4" />
                  Create Demo Deal
                </Button>
              </div>
            </div>
          </Card>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or create manually</span>
            </div>
          </div>
          
          {/* Manual Creation Form */}
          <Card className={cn(premiumCardClasses, "p-6")}>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className={formSpacing.section}>
                <div className={formSpacing.fields}>
                  <h3 className="text-lg font-semibold">Deal Information</h3>
                  
                  <FormField
                    control={form.control}
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Customer *</FormLabel>
                        <FormControl>
                          <div className={formSpacing.fieldGroup}>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                placeholder="Search by name, email, or phone..."
                                value={customerSearch}
                                onChange={(e) => setCustomerSearch(e.target.value)}
                                className="pl-10"
                                data-testid="input-customer-search"
                              />
                            </div>
                            {customers && customers.length > 0 && (
                              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                                {customers.map((customer) => (
                                  <div
                                    key={customer.id}
                                    className={cn(
                                      "p-3 cursor-pointer hover-elevate",
                                      field.value === customer.id && statusColors.info
                                    )}
                                    onClick={() => field.onChange(customer.id)}
                                  >
                                    <div className="font-medium">
                                      {customer.firstName} {customer.lastName}
                                    </div>
                                    <div className="text-sm text-muted-foreground">
                                      {customer.email} • {customer.phone}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="vehicleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle *</FormLabel>
                        <FormControl>
                          <div className={formSpacing.fields}>
                            {/* Stock Number Quick Add - Primary Method */}
                            <StockNumberQuickAdd
                              onVehicleSelect={(vehicle) => {
                                field.onChange(vehicle.id);
                                setSelectedVehicle(vehicle);
                              }}
                              onClear={() => {
                                field.onChange('');
                                setSelectedVehicle(null);
                              }}
                              selectedVehicle={selectedVehicle}
                              placeholder="Type stock# for quick add..."
                            />

                            {/* Divider */}
                            <div className="relative">
                              <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                              </div>
                              <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">or search</span>
                              </div>
                            </div>

                            {/* Text Search */}
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                placeholder="Search by VIN, make, or model..."
                                value={vehicleSearch}
                                onChange={(e) => setVehicleSearch(e.target.value)}
                                className="pl-10"
                                data-testid="input-vehicle-search"
                              />
                            </div>
                            {vehicles && vehicles.length > 0 && (
                              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                                {vehicles.map((vehicle) => (
                                  <div
                                    key={vehicle.id}
                                    className={cn(
                                      "p-3 cursor-pointer hover-elevate",
                                      field.value === vehicle.id && statusColors.info
                                    )}
                                    onClick={() => {
                                      field.onChange(vehicle.id);
                                      setSelectedVehicle(vehicle);
                                    }}
                                  >
                                    <div className="font-medium">
                                      {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim}
                                    </div>
                                    <div className="text-sm text-muted-foreground font-mono">
                                      Stock #{vehicle.stockNumber} • ${parseFloat(vehicle.price).toLocaleString()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>


                <div className="flex gap-3 justify-end pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation('/deals')}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createDealMutation.isPending}
                    className={primaryButtonClasses}
                    data-testid="button-create"
                  >
                    {createDealMutation.isPending ? 'Creating...' : 'Create Deal'}
                  </Button>
                </div>
              </form>
            </Form>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
