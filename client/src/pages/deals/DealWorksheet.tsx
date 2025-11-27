/**
 * Deal Worksheet Component
 *
 * Second step in the deal creation flow - configure all deal details.
 * Shows customer/vehicle info at top with all pricing and financing options.
 */

import { useMemo, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeft,
  ChevronRight,
  User,
  DollarSign,
  Calculator,
  FileText,
  Mail,
  Phone,
  Loader2,
} from 'lucide-react';
import { VehicleIcon } from '@/assets/icons/autolytiq';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormInput,
  FormSelect,
  FormField,
} from '@design-system';
import { formatCurrency } from '@/lib/utils';
import { useUsers } from '@/hooks/useUsers';
import type { Customer } from '@/hooks/useCustomers';
import { getCustomerName } from '@/hooks/useCustomers';
import type { Vehicle } from '@/hooks/useInventory';
import { getVehicleName } from '@/hooks/useInventory';

/**
 * Worksheet form schema
 */
const worksheetSchema = z.object({
  type: z.enum(['CASH', 'FINANCE', 'LEASE'], { required_error: 'Deal type is required' }),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'APPROVED', 'COMPLETED', 'CANCELLED']),
  salePrice: z.coerce.number().min(0, 'Sale price must be positive'),
  tradeInValue: z.coerce.number().min(0).optional(),
  tradeInVehicle: z.string().optional(),
  downPayment: z.coerce.number().min(0).optional(),
  financingTerm: z.coerce.number().min(12).max(84).optional(),
  interestRate: z.coerce.number().min(0).max(30).optional(),
  salespersonId: z.string().optional(),
  notes: z.string().optional(),
});

export type WorksheetFormData = z.infer<typeof worksheetSchema>;

export interface DealWorksheetProps {
  customer: Customer;
  vehicle: Vehicle;
  initialData?: Partial<WorksheetFormData>;
  onSubmit: (data: WorksheetFormData) => Promise<void>;
  onBack: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

/**
 * Customer/Vehicle summary header
 */
interface DealSummaryHeaderProps {
  customer: Customer;
  vehicle: Vehicle;
}

function DealSummaryHeader({ customer, vehicle }: DealSummaryHeaderProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Customer Info */}
      <Card variant="outlined">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Customer
              </p>
              <p className="font-semibold text-foreground truncate">{getCustomerName(customer)}</p>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                {customer.email && (
                  <span className="flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </span>
                )}
                {customer.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3 flex-shrink-0" />
                    {customer.phone}
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Info */}
      <Card variant="outlined">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <VehicleIcon size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Vehicle
              </p>
              <p className="font-semibold text-foreground truncate">{getVehicleName(vehicle)}</p>
              <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span>{vehicle.exterior_color}</span>
                <span>{vehicle.mileage.toLocaleString()} mi</span>
                <span className="font-medium text-foreground">
                  List: {formatCurrency(vehicle.list_price)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Deal summary calculations panel
 */
interface DealCalculationsProps {
  salePrice: number;
  tradeInValue: number;
  downPayment: number;
  financingTerm: number;
  interestRate: number;
  dealType: 'CASH' | 'FINANCE' | 'LEASE';
}

function DealCalculations({
  salePrice,
  tradeInValue,
  downPayment,
  financingTerm,
  interestRate,
  dealType,
}: DealCalculationsProps): JSX.Element {
  const calculations = useMemo(() => {
    const netSalePrice = salePrice - tradeInValue;
    const amountToFinance = Math.max(0, netSalePrice - downPayment);

    // Simple monthly payment calculation (amortization formula)
    let monthlyPayment = 0;
    if (dealType !== 'CASH' && amountToFinance > 0 && financingTerm > 0) {
      if (interestRate === 0) {
        monthlyPayment = amountToFinance / financingTerm;
      } else {
        const monthlyRate = interestRate / 100 / 12;
        monthlyPayment =
          (amountToFinance * (monthlyRate * Math.pow(1 + monthlyRate, financingTerm))) /
          (Math.pow(1 + monthlyRate, financingTerm) - 1);
      }
    }

    const totalInterest = monthlyPayment * financingTerm - amountToFinance;
    const totalCost = dealType === 'CASH' ? netSalePrice : netSalePrice + totalInterest;

    return {
      netSalePrice,
      amountToFinance,
      monthlyPayment,
      totalInterest: Math.max(0, totalInterest),
      totalCost,
    };
  }, [salePrice, tradeInValue, downPayment, financingTerm, interestRate, dealType]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="h-5 w-5" />
          Deal Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Sale Price</span>
          <span className="font-medium">{formatCurrency(salePrice)}</span>
        </div>
        {tradeInValue > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Trade-In Value</span>
            <span className="font-medium text-success">-{formatCurrency(tradeInValue)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm border-t border-border pt-2">
          <span className="text-muted-foreground">Net Sale Price</span>
          <span className="font-medium">{formatCurrency(calculations.netSalePrice)}</span>
        </div>
        {downPayment > 0 && dealType !== 'CASH' && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Down Payment</span>
            <span className="font-medium text-success">-{formatCurrency(downPayment)}</span>
          </div>
        )}
        {dealType !== 'CASH' && (
          <>
            <div className="flex justify-between text-sm border-t border-border pt-2">
              <span className="text-muted-foreground">Amount Financed</span>
              <span className="font-medium">{formatCurrency(calculations.amountToFinance)}</span>
            </div>
            {calculations.totalInterest > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Interest</span>
                <span className="font-medium text-warning">
                  +{formatCurrency(calculations.totalInterest)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm bg-primary/5 -mx-4 px-4 py-3 rounded-lg">
              <span className="font-medium text-foreground">Monthly Payment</span>
              <span className="font-bold text-primary text-lg">
                {formatCurrency(calculations.monthlyPayment)}/mo
              </span>
            </div>
          </>
        )}
        <div className="flex justify-between text-sm border-t border-border pt-3 mt-3">
          <span className="font-medium text-foreground">
            Total {dealType === 'CASH' ? 'Due' : 'Cost'}
          </span>
          <span className="font-bold text-foreground">
            {formatCurrency(calculations.totalCost)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// eslint-disable-next-line complexity
export function DealWorksheet({
  customer,
  vehicle,
  initialData,
  onSubmit,
  onBack,
  onCancel,
  isLoading = false,
  mode = 'create',
}: DealWorksheetProps): JSX.Element {
  const { data: usersData } = useUsers();

  const salespersonOptions = useMemo(() => {
    return (usersData?.users ?? [])
      .filter((u) => u.role === 'SALESPERSON' || u.role === 'MANAGER')
      .map((u) => ({
        id: u.id,
        name: `${u.first_name} ${u.last_name}`.trim() || u.email,
      }));
  }, [usersData]);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<WorksheetFormData>({
    resolver: zodResolver(worksheetSchema),
    defaultValues: {
      type: 'FINANCE',
      status: 'PENDING',
      salePrice: vehicle.list_price,
      tradeInValue: 0,
      tradeInVehicle: '',
      downPayment: 0,
      financingTerm: 60,
      interestRate: 5.9,
      salespersonId: '',
      notes: '',
      ...initialData,
    },
  });

  const watchedValues = watch();
  const dealType = watchedValues.type;

  return (
    <div className="space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 text-sm">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-success text-success-foreground font-medium">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span className="text-muted-foreground">Customer & Vehicle</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-medium">
          2
        </span>
        <span className="font-medium text-foreground">Deal Worksheet</span>
      </div>

      {/* Customer/Vehicle summary */}
      <DealSummaryHeader customer={customer} vehicle={vehicle} />

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Deal Type & Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5" />
                  Deal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Deal Type" error={errors.type?.message} required>
                    <FormSelect
                      {...register('type')}
                      error={!!errors.type}
                      options={[
                        { value: 'CASH', label: 'Cash' },
                        { value: 'FINANCE', label: 'Finance' },
                        { value: 'LEASE', label: 'Lease' },
                      ]}
                    />
                  </FormField>
                  <FormField label="Status" error={errors.status?.message} required>
                    <FormSelect
                      {...register('status')}
                      error={!!errors.status}
                      options={[
                        { value: 'PENDING', label: 'Pending' },
                        { value: 'IN_PROGRESS', label: 'In Progress' },
                        { value: 'APPROVED', label: 'Approved' },
                        { value: 'COMPLETED', label: 'Completed' },
                        { value: 'CANCELLED', label: 'Cancelled' },
                      ]}
                    />
                  </FormField>
                </div>
                <FormField label="Salesperson" error={errors.salespersonId?.message}>
                  <FormSelect
                    {...register('salespersonId')}
                    error={!!errors.salespersonId}
                    options={[
                      { value: '', label: 'Select salesperson (optional)' },
                      ...salespersonOptions.map((s) => ({ value: s.id, label: s.name })),
                    ]}
                  />
                </FormField>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-5 w-5" />
                  Pricing
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField label="Sale Price" error={errors.salePrice?.message} required>
                    <FormInput
                      type="number"
                      step="0.01"
                      {...register('salePrice')}
                      error={!!errors.salePrice}
                    />
                  </FormField>
                  <FormField label="Trade-In Value" error={errors.tradeInValue?.message}>
                    <FormInput
                      type="number"
                      step="0.01"
                      {...register('tradeInValue')}
                      error={!!errors.tradeInValue}
                      placeholder="0"
                    />
                  </FormField>
                  <FormField label="Down Payment" error={errors.downPayment?.message}>
                    <FormInput
                      type="number"
                      step="0.01"
                      {...register('downPayment')}
                      error={!!errors.downPayment}
                      placeholder="0"
                    />
                  </FormField>
                </div>

                <FormField
                  label="Trade-In Vehicle (Year Make Model)"
                  error={errors.tradeInVehicle?.message}
                >
                  <FormInput
                    {...register('tradeInVehicle')}
                    error={!!errors.tradeInVehicle}
                    placeholder="e.g., 2019 Honda Accord"
                  />
                </FormField>
              </CardContent>
            </Card>

            {/* Financing Details (conditional) */}
            {(dealType === 'FINANCE' || dealType === 'LEASE') && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Calculator className="h-5 w-5" />
                    Financing Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Term (months)" error={errors.financingTerm?.message}>
                      <FormSelect
                        {...register('financingTerm')}
                        error={!!errors.financingTerm}
                        options={[
                          { value: '12', label: '12 months' },
                          { value: '24', label: '24 months' },
                          { value: '36', label: '36 months' },
                          { value: '48', label: '48 months' },
                          { value: '60', label: '60 months' },
                          { value: '72', label: '72 months' },
                          { value: '84', label: '84 months' },
                        ]}
                      />
                    </FormField>
                    <FormField label="Interest Rate (%)" error={errors.interestRate?.message}>
                      <FormInput
                        type="number"
                        step="0.01"
                        {...register('interestRate')}
                        error={!!errors.interestRate}
                        placeholder="5.9"
                      />
                    </FormField>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FileText className="h-5 w-5" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <textarea
                  {...register('notes')}
                  rows={4}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  placeholder="Additional notes about the deal..."
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Deal Calculations */}
          <div className="lg:col-span-1">
            <div className="sticky top-4">
              <DealCalculations
                salePrice={watchedValues.salePrice || 0}
                tradeInValue={watchedValues.tradeInValue || 0}
                downPayment={watchedValues.downPayment || 0}
                financingTerm={watchedValues.financingTerm || 60}
                interestRate={watchedValues.interestRate || 0}
                dealType={dealType}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3 pt-6 mt-6 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            icon={<ChevronLeft className="h-4 w-4" />}
            disabled={isLoading}
          >
            Back
          </Button>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : mode === 'create' ? (
                'Create Deal'
              ) : (
                'Update Deal'
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
