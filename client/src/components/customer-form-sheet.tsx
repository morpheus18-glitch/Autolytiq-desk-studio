import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { z } from 'zod';
import type { Customer, InsertCustomer } from '@shared/schema';
import { insertCustomerSchema } from '@shared/schema';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormDescription,
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
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { AddressAutocomplete } from '@/components/address-autocomplete';
import type { AddressComponents } from '@/hooks/use-google-autocomplete';

// Use the base insert schema directly
type CustomerFormData = InsertCustomer;

interface CustomerFormSheetProps {
  mode: 'create' | 'edit';
  customer?: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (customer: Customer) => void;
}

export function CustomerFormSheet({
  mode,
  customer,
  open,
  onOpenChange,
  onSuccess,
}: CustomerFormSheetProps) {
  const { toast } = useToast();

  const form = useForm<CustomerFormData>({
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
      county: '',
      dateOfBirth: undefined,
      driversLicenseNumber: '',
      driversLicenseState: '',
      ssnLast4: '',
      employer: '',
      occupation: '',
      monthlyIncome: '',
      creditScore: undefined,
      preferredContactMethod: '',
      marketingOptIn: false,
      notes: '',
      photoUrl: '',
      licenseImageUrl: '',
      currentVehicleYear: undefined,
      currentVehicleMake: '',
      currentVehicleModel: '',
      currentVehicleTrim: '',
      currentVehicleVin: '',
      currentVehicleMileage: undefined,
      currentVehicleColor: '',
      tradeAllowance: '',
      tradeACV: '',
      tradePayoff: '',
      tradePayoffTo: '',
    },
  });

  // Reset form when customer or mode changes
  useEffect(() => {
    if (mode === 'edit' && customer) {
      form.reset({
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email || '',
        phone: customer.phone || '',
        address: customer.address || '',
        city: customer.city || '',
        state: customer.state || '',
        zipCode: customer.zipCode || '',
        county: customer.county || '',
        dateOfBirth: customer.dateOfBirth || undefined,
        driversLicenseNumber: customer.driversLicenseNumber || '',
        driversLicenseState: customer.driversLicenseState || '',
        ssnLast4: customer.ssnLast4 || '',
        employer: customer.employer || '',
        occupation: customer.occupation || '',
        monthlyIncome: customer.monthlyIncome || '',
        creditScore: customer.creditScore || undefined,
        preferredContactMethod: customer.preferredContactMethod || '',
        marketingOptIn: customer.marketingOptIn,
        notes: customer.notes || '',
        photoUrl: customer.photoUrl || '',
        licenseImageUrl: customer.licenseImageUrl || '',
        currentVehicleYear: customer.currentVehicleYear || undefined,
        currentVehicleMake: customer.currentVehicleMake || '',
        currentVehicleModel: customer.currentVehicleModel || '',
        currentVehicleTrim: customer.currentVehicleTrim || '',
        currentVehicleVin: customer.currentVehicleVin || '',
        currentVehicleMileage: customer.currentVehicleMileage || undefined,
        currentVehicleColor: customer.currentVehicleColor || '',
        tradeAllowance: customer.tradeAllowance?.toString() || '',
        tradeACV: customer.tradeACV?.toString() || '',
        tradePayoff: customer.tradePayoff?.toString() || '',
        tradePayoffTo: customer.tradePayoffTo || '',
      });
    } else {
      form.reset({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        county: '',
        dateOfBirth: undefined,
        driversLicenseNumber: '',
        driversLicenseState: '',
        ssnLast4: '',
        employer: '',
        occupation: '',
        monthlyIncome: '',
        creditScore: undefined,
        preferredContactMethod: '',
        marketingOptIn: false,
        notes: '',
        photoUrl: '',
        licenseImageUrl: '',
        currentVehicleYear: undefined,
        currentVehicleMake: '',
        currentVehicleModel: '',
        currentVehicleTrim: '',
        currentVehicleVin: '',
        currentVehicleMileage: undefined,
        currentVehicleColor: '',
        tradeAllowance: '',
        tradeACV: '',
        tradePayoff: '',
        tradePayoffTo: '',
      });
    }
  }, [mode, customer, form, open]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const res = await apiRequest('POST', '/api/customers', data);
      return await res.json();
    },
    onSuccess: (newCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: 'Customer created',
        description: `${newCustomer.firstName} ${newCustomer.lastName} has been added.`,
      });
      onOpenChange(false);
      onSuccess?.(newCustomer);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create customer',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      if (!customer) throw new Error('No customer to update');
      const res = await apiRequest('PATCH', `/api/customers/${customer.id}`, data);
      return await res.json();
    },
    onSuccess: (updatedCustomer) => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: 'Customer updated',
        description: `${updatedCustomer.firstName} ${updatedCustomer.lastName} has been updated.`,
      });
      onOpenChange(false);
      onSuccess?.(updatedCustomer);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update customer',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    if (mode === 'create') {
      createMutation.mutate(data);
    } else {
      updateMutation.mutate(data);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl overflow-y-auto"
        data-testid="sheet-customer-form"
      >
        <SheetHeader>
          <SheetTitle>
            {mode === 'create' ? 'Add New Customer' : 'Edit Customer'}
          </SheetTitle>
          <SheetDescription>
            {mode === 'create'
              ? 'Enter customer information to create a new record'
              : 'Update customer information'}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-6">
            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-6 sticky top-0 z-10 bg-background">
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="residency">Residency</TabsTrigger>
                <TabsTrigger value="identification">ID</TabsTrigger>
                <TabsTrigger value="employment">Employment</TabsTrigger>
                <TabsTrigger value="vehicle">Vehicle</TabsTrigger>
                <TabsTrigger value="other">Other</TabsTrigger>
              </TabsList>

              {/* Personal Information Tab */}
              <TabsContent value="personal" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} data-testid="input-firstName" />
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
                        <Input placeholder="Doe" {...field} data-testid="input-lastName" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="john.doe@example.com"
                          {...field}
                          value={field.value || ''}
                          data-testid="input-email"
                        />
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
                        <Input
                          type="tel"
                          placeholder="(555) 123-4567"
                          {...field}
                          value={field.value || ''}
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferredContactMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Contact Method</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || ''}
                        data-testid="select-preferredContactMethod"
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="email">Email</SelectItem>
                          <SelectItem value="phone">Phone</SelectItem>
                          <SelectItem value="sms">SMS</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="marketingOptIn"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Marketing Opt-In</FormLabel>
                        <FormDescription>
                          Customer agrees to receive marketing communications
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-marketingOptIn"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Residency Tab */}
              <TabsContent value="residency" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field}) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <AddressAutocomplete
                          {...field}
                          value={field.value || ''}
                          onAddressSelect={(address: AddressComponents) => {
                            // Auto-fill all address fields including county for tax
                            form.setValue('address', address.street);
                            form.setValue('city', address.city);
                            form.setValue('state', address.stateCode);
                            form.setValue('zipCode', address.zipCode);
                            if (address.county) {
                              form.setValue('county', address.county);
                            }
                          }}
                          data-testid="input-address"
                        />
                      </FormControl>
                      <FormMessage />
                      <FormDescription className="text-xs">
                        Start typing to see address suggestions
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="New York" {...field} value={field.value || ''} data-testid="input-city" />
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
                          <Input placeholder="NY" {...field} value={field.value || ''} data-testid="input-state" />
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
                        <Input placeholder="10001" {...field} value={field.value || ''} data-testid="input-zipCode" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Identification Tab */}
              <TabsContent value="identification" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : undefined)}
                          data-testid="input-dateOfBirth"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="driversLicenseNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Driver's License Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="DL123456"
                          {...field}
                          value={field.value || ''}
                          data-testid="input-driversLicenseNumber"
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-amber-600">
                        Sensitive information - stored securely
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="driversLicenseState"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License State</FormLabel>
                      <FormControl>
                        <Input placeholder="NY" {...field} value={field.value || ''} data-testid="input-driversLicenseState" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ssnLast4"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SSN (Last 4 Digits)</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="1234"
                          maxLength={4}
                          {...field}
                          value={field.value || ''}
                          data-testid="input-ssnLast4"
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-amber-600">
                        Only enter the last 4 digits - highly sensitive data
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Employment & Credit Tab */}
              <TabsContent value="employment" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="employer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Employer</FormLabel>
                      <FormControl>
                        <Input placeholder="Acme Corp" {...field} value={field.value || ''} data-testid="input-employer" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="occupation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Occupation</FormLabel>
                      <FormControl>
                        <Input placeholder="Software Engineer" {...field} value={field.value || ''} data-testid="input-occupation" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monthlyIncome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Income</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="5000"
                          {...field}
                          value={field.value || ''}
                          data-testid="input-monthlyIncome"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="creditScore"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Credit Score</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="300"
                          max="850"
                          placeholder="700"
                          {...field}
                          value={field.value || ''}
                          data-testid="input-creditScore"
                        />
                      </FormControl>
                      <FormDescription>
                        Range: 300-850
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              {/* Vehicle & Trade Tab */}
              <TabsContent value="vehicle" className="space-y-6 mt-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2">
                    <h3 className="text-sm font-semibold">Current Vehicle</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="currentVehicleYear"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="2020"
                              {...field}
                              value={field.value || ''}
                              data-testid="input-currentVehicleYear"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currentVehicleMileage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mileage</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="50000"
                              {...field}
                              value={field.value || ''}
                              data-testid="input-currentVehicleMileage"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="currentVehicleMake"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Make</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Toyota"
                            {...field}
                            value={field.value || ''}
                            data-testid="input-currentVehicleMake"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="currentVehicleModel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Model</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Camry"
                            {...field}
                            value={field.value || ''}
                            data-testid="input-currentVehicleModel"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="currentVehicleTrim"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trim</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="XLE"
                              {...field}
                              value={field.value || ''}
                              data-testid="input-currentVehicleTrim"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currentVehicleColor"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Color</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Silver"
                              {...field}
                              value={field.value || ''}
                              data-testid="input-currentVehicleColor"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="currentVehicleVin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>VIN</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="1HGCM82633A123456"
                            {...field}
                            value={field.value || ''}
                            data-testid="input-currentVehicleVin"
                          />
                        </FormControl>
                        <FormDescription>
                          17-character vehicle identification number
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center gap-2 pb-2">
                    <h3 className="text-sm font-semibold">Trade-In Information</h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tradeAllowance"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trade Allowance</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="15000"
                              {...field}
                              value={field.value || ''}
                              data-testid="input-tradeAllowance"
                            />
                          </FormControl>
                          <FormDescription>
                            Amount offered for trade-in
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tradeACV"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trade ACV</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="14000"
                              {...field}
                              value={field.value || ''}
                              data-testid="input-tradeACV"
                            />
                          </FormControl>
                          <FormDescription>
                            Actual cash value
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="tradePayoff"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payoff Amount</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="12000"
                              {...field}
                              value={field.value || ''}
                              data-testid="input-tradePayoff"
                            />
                          </FormControl>
                          <FormDescription>
                            Remaining loan balance
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="tradePayoffTo"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payoff To</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Bank of America"
                              {...field}
                              value={field.value || ''}
                              data-testid="input-tradePayoffTo"
                            />
                          </FormControl>
                          <FormDescription>
                            Lender name
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Other Tab */}
              <TabsContent value="other" className="space-y-4 mt-4">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Additional notes about this customer..."
                          className="min-h-[120px]"
                          {...field}
                          value={field.value || ''}
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="photoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Photo URL</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com/photo.jpg"
                          {...field}
                          value={field.value || ''}
                          data-testid="input-photoUrl"
                        />
                      </FormControl>
                      <FormDescription>
                        URL to customer photo
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="licenseImageUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>License Image URL</FormLabel>
                      <FormControl>
                        <Input
                          type="url"
                          placeholder="https://example.com/license.jpg"
                          {...field}
                          value={field.value || ''}
                          data-testid="input-licenseImageUrl"
                        />
                      </FormControl>
                      <FormDescription>
                        URL to driver's license scan
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            {/* Submit Button - Sticky at bottom */}
            <div className="sticky bottom-0 pt-4 pb-2 bg-background border-t flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isPending}
                className="flex-1"
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="flex-1"
                data-testid="button-submit"
              >
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {mode === 'create' ? 'Create Customer' : 'Update Customer'}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
