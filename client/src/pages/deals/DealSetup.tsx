/**
 * Deal Setup Component
 *
 * First step in the deal creation flow - select customer and vehicle.
 * Provides searchable selection for both with inline creation option.
 */

import { useState, useMemo, type JSX } from 'react';
import {
  Search,
  User,
  Car,
  Plus,
  Check,
  ChevronRight,
  Loader2,
  X,
  Phone,
  Mail,
} from 'lucide-react';
import { Button, Card, CardContent, FormInput, FormField } from '@design-system';
import {
  useCustomers,
  useCreateCustomer,
  getCustomerName,
  type Customer,
} from '@/hooks/useCustomers';
import { useVehicles, getVehicleName, type Vehicle } from '@/hooks/useInventory';
import { cn, formatCurrency } from '@/lib/utils';
import { useToast } from '@/components/ui';

export interface DealSetupData {
  customerId: string;
  customerName: string;
  vehicleId: string;
  vehicleName: string;
  vehiclePrice: number;
  customer: Customer;
  vehicle: Vehicle;
}

interface DealSetupProps {
  onContinue: (data: DealSetupData) => void;
  onCancel: () => void;
}

interface QuickCustomerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

/**
 * Searchable selection list item
 */
interface SelectionItemProps {
  isSelected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function SelectionItem({ isSelected, onClick, children }: SelectionItemProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full p-3 text-left rounded-lg border transition-all',
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">{children}</div>
        {isSelected && (
          <div className="flex-shrink-0 ml-2">
            <Check className="h-5 w-5 text-primary" />
          </div>
        )}
      </div>
    </button>
  );
}

/**
 * Customer card for display
 */
function CustomerCard({ customer }: { customer: Customer }): JSX.Element {
  return (
    <div>
      <p className="font-medium text-foreground">{getCustomerName(customer)}</p>
      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
        {customer.email && (
          <span className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            {customer.email}
          </span>
        )}
        {customer.phone && (
          <span className="flex items-center gap-1">
            <Phone className="h-3 w-3" />
            {customer.phone}
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Vehicle card for display
 */
function VehicleCard({ vehicle }: { vehicle: Vehicle }): JSX.Element {
  return (
    <div>
      <p className="font-medium text-foreground">{getVehicleName(vehicle)}</p>
      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
        <span>{vehicle.exterior_color}</span>
        <span>{vehicle.mileage.toLocaleString()} mi</span>
        <span className="font-medium text-foreground">{formatCurrency(vehicle.list_price)}</span>
      </div>
      {vehicle.stock_number && (
        <p className="text-xs text-muted-foreground mt-1">Stock #{vehicle.stock_number}</p>
      )}
    </div>
  );
}

/**
 * Quick customer creation form
 */
interface QuickCustomerFormProps {
  onSubmit: (data: QuickCustomerFormData) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

function QuickCustomerForm({ onSubmit, onCancel, isLoading }: QuickCustomerFormProps): JSX.Element {
  const [formData, setFormData] = useState<QuickCustomerFormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const updateField =
    (field: keyof QuickCustomerFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const isValid = formData.firstName.trim() && formData.lastName.trim();

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border"
    >
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-foreground">Quick Add Customer</h4>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded hover:bg-muted text-muted-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="First Name" required>
          <FormInput
            value={formData.firstName}
            onChange={updateField('firstName')}
            placeholder="John"
            autoFocus
          />
        </FormField>
        <FormField label="Last Name" required>
          <FormInput
            value={formData.lastName}
            onChange={updateField('lastName')}
            placeholder="Smith"
          />
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Email">
          <FormInput
            type="email"
            value={formData.email}
            onChange={updateField('email')}
            placeholder="john@example.com"
          />
        </FormField>
        <FormField label="Phone">
          <FormInput
            type="tel"
            value={formData.phone}
            onChange={updateField('phone')}
            placeholder="(555) 123-4567"
          />
        </FormField>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={!isValid || isLoading}>
          {isLoading ? 'Adding...' : 'Add Customer'}
        </Button>
      </div>
    </form>
  );
}

/**
 * Selected item summary card
 */
interface SelectedSummaryProps {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClear: () => void;
}

function SelectedSummary({ label, icon, children, onClear }: SelectedSummaryProps): JSX.Element {
  return (
    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">{icon}</div>
          <div>
            <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">
              {label}
            </p>
            {children}
          </div>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="p-1 rounded hover:bg-primary/10 text-primary/60 hover:text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function DealSetup({ onContinue, onCancel }: DealSetupProps): JSX.Element {
  const toast = useToast();

  // Search states
  const [customerSearch, setCustomerSearch] = useState('');
  const [vehicleSearch, setVehicleSearch] = useState('');

  // Selection states
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  // Quick add customer form
  const [showQuickCustomerForm, setShowQuickCustomerForm] = useState(false);

  // Data fetching
  const { data: customersData, isLoading: isLoadingCustomers } = useCustomers({
    search: customerSearch || undefined,
    limit: 50,
  });
  const { data: vehiclesData, isLoading: isLoadingVehicles } = useVehicles({
    search: vehicleSearch || undefined,
    status: 'AVAILABLE',
    limit: 50,
  });

  // Mutations
  const createCustomer = useCreateCustomer();

  // Filter results
  const customers = useMemo(() => {
    return customersData?.customers ?? [];
  }, [customersData]);

  const vehicles = useMemo(() => {
    return vehiclesData?.vehicles ?? [];
  }, [vehiclesData]);

  // Handlers
  const handleQuickCustomerSubmit = async (data: QuickCustomerFormData) => {
    try {
      const newCustomer = await createCustomer.mutateAsync({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
      });
      setSelectedCustomer(newCustomer);
      setShowQuickCustomerForm(false);
      toast.success('Customer added', `${data.firstName} ${data.lastName} has been created.`);
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Failed to create customer');
    }
  };

  const handleContinue = () => {
    if (!selectedCustomer || !selectedVehicle) return;

    onContinue({
      customerId: selectedCustomer.id,
      customerName: getCustomerName(selectedCustomer),
      vehicleId: selectedVehicle.id,
      vehicleName: getVehicleName(selectedVehicle),
      vehiclePrice: selectedVehicle.list_price,
      customer: selectedCustomer,
      vehicle: selectedVehicle,
    });
  };

  const canContinue = selectedCustomer && selectedVehicle;

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-medium">
          1
        </span>
        <span className="font-medium text-foreground">Select Customer & Vehicle</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground font-medium">
          2
        </span>
        <span className="text-muted-foreground">Deal Worksheet</span>
      </div>

      {/* Selected items summary */}
      {(selectedCustomer || selectedVehicle) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {selectedCustomer && (
            <SelectedSummary
              label="Customer"
              icon={<User className="h-4 w-4" />}
              onClear={() => setSelectedCustomer(null)}
            >
              <CustomerCard customer={selectedCustomer} />
            </SelectedSummary>
          )}
          {selectedVehicle && (
            <SelectedSummary
              label="Vehicle"
              icon={<Car className="h-4 w-4" />}
              onClear={() => setSelectedVehicle(null)}
            >
              <VehicleCard vehicle={selectedVehicle} />
            </SelectedSummary>
          )}
        </div>
      )}

      {/* Selection panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Selection */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-foreground">Select Customer</h3>
              </div>
              {!showQuickCustomerForm && (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => setShowQuickCustomerForm(true)}
                >
                  New
                </Button>
              )}
            </div>

            {showQuickCustomerForm ? (
              <QuickCustomerForm
                onSubmit={handleQuickCustomerSubmit}
                onCancel={() => setShowQuickCustomerForm(false)}
                isLoading={createCustomer.isPending}
              />
            ) : (
              <>
                {/* Search input */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search customers by name, email, phone..."
                    value={customerSearch}
                    onChange={(e) => setCustomerSearch(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                {/* Customer list */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {isLoadingCustomers && (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!isLoadingCustomers && customers.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No customers found</p>
                      <p className="text-sm mt-1">Try a different search or add a new customer</p>
                    </div>
                  )}
                  {!isLoadingCustomers &&
                    customers.map((customer) => (
                      <SelectionItem
                        key={customer.id}
                        isSelected={selectedCustomer?.id === customer.id}
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <CustomerCard customer={customer} />
                      </SelectionItem>
                    ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Vehicle Selection */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <Car className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold text-foreground">Select Vehicle</h3>
              <span className="ml-auto text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Available only
              </span>
            </div>

            {/* Search input */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by year, make, model, stock #..."
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Vehicle list */}
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {isLoadingVehicles && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isLoadingVehicles && vehicles.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Car className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No available vehicles found</p>
                  <p className="text-sm mt-1">Try a different search</p>
                </div>
              )}
              {!isLoadingVehicles &&
                vehicles.map((vehicle) => (
                  <SelectionItem
                    key={vehicle.id}
                    isSelected={selectedVehicle?.id === vehicle.id}
                    onClick={() => setSelectedVehicle(vehicle)}
                  >
                    <VehicleCard vehicle={vehicle} />
                  </SelectionItem>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleContinue}
          disabled={!canContinue}
          icon={<ChevronRight className="h-4 w-4" />}
        >
          Continue to Worksheet
        </Button>
      </div>
    </div>
  );
}
