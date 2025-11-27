/**
 * Deal Form Component
 *
 * Form for creating and editing deals with validation.
 * Includes VIN decoder integration for trade-in vehicle details.
 */

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, FormInput, FormSelect, FormField } from '@design-system';
import { VinDecoder, type VinDecodedData } from '@/components/VinDecoder';

const dealSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  type: z.enum(['CASH', 'FINANCE', 'LEASE'], { required_error: 'Deal type is required' }),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'APPROVED', 'COMPLETED', 'CANCELLED']),
  salePrice: z.coerce.number().min(0, 'Sale price must be positive'),
  tradeInValue: z.coerce.number().min(0).optional(),
  tradeInVehicle: z.string().optional(),
  tradeInVin: z.string().optional(),
  downPayment: z.coerce.number().min(0).optional(),
  financingTerm: z.coerce.number().min(0).max(84).optional(),
  interestRate: z.coerce.number().min(0).max(30).optional(),
  salespersonId: z.string().optional(),
  notes: z.string().optional(),
});

export type DealFormData = z.infer<typeof dealSchema>;

interface DealFormProps {
  initialData?: Partial<DealFormData>;
  onSubmit: (data: DealFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  customers: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; name: string }>;
  salespeople: Array<{ id: string; name: string }>;
}

// eslint-disable-next-line complexity
export function DealForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  customers,
  vehicles,
  salespeople,
}: DealFormProps) {
  const [showTradeInVin, setShowTradeInVin] = useState(!!initialData?.tradeInVin);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<DealFormData>({
    resolver: zodResolver(dealSchema),
    defaultValues: {
      customerId: '',
      vehicleId: '',
      type: 'CASH',
      status: 'PENDING',
      salePrice: 0,
      tradeInValue: 0,
      tradeInVin: '',
      downPayment: 0,
      financingTerm: 60,
      interestRate: 5.9,
      ...initialData,
    },
  });

  const dealType = watch('type');
  const currentTradeInVin = watch('tradeInVin');

  // Handle VIN decoder auto-fill for trade-in vehicle
  const handleTradeInVinDecode = (data: VinDecodedData) => {
    setValue('tradeInVin', data.vin);
    // Build trade-in vehicle description from decoded data
    const vehicleDesc = [data.year, data.make, data.model, data.trim].filter(Boolean).join(' ');
    setValue('tradeInVehicle', vehicleDesc);
  };

  // Handle trade-in VIN change
  const handleTradeInVinChange = (vin: string) => {
    setValue('tradeInVin', vin);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Customer and Vehicle Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Customer" error={errors.customerId?.message} required>
          <FormSelect
            {...register('customerId')}
            error={!!errors.customerId}
            options={[
              { value: '', label: 'Select a customer' },
              ...customers.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </FormField>
        <FormField label="Vehicle" error={errors.vehicleId?.message} required>
          <FormSelect
            {...register('vehicleId')}
            error={!!errors.vehicleId}
            options={[
              { value: '', label: 'Select a vehicle' },
              ...vehicles.map((v) => ({ value: v.id, label: v.name })),
            ]}
          />
        </FormField>
      </div>

      {/* Deal Type and Status */}
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

      {/* Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="Sale Price" error={errors.salePrice?.message} required>
          <FormInput
            type="number"
            step="0.01"
            {...register('salePrice')}
            error={!!errors.salePrice}
            placeholder="25000"
          />
        </FormField>
        <FormField label="Trade-In Value" error={errors.tradeInValue?.message}>
          <FormInput
            type="number"
            step="0.01"
            {...register('tradeInValue')}
            error={!!errors.tradeInValue}
            placeholder="5000"
          />
        </FormField>
        <FormField label="Down Payment" error={errors.downPayment?.message}>
          <FormInput
            type="number"
            step="0.01"
            {...register('downPayment')}
            error={!!errors.downPayment}
            placeholder="3000"
          />
        </FormField>
      </div>

      {/* Trade-In Vehicle Section */}
      <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-foreground">Trade-In Vehicle</h4>
          <button
            type="button"
            onClick={() => setShowTradeInVin(!showTradeInVin)}
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            {showTradeInVin ? 'Enter manually' : 'Have VIN? Decode it'}
          </button>
        </div>

        {showTradeInVin ? (
          <VinDecoder
            initialVin={currentTradeInVin || ''}
            onDecode={handleTradeInVinDecode}
            onVinChange={handleTradeInVinChange}
            compact
            label="Trade-In VIN"
            placeholder="Enter trade-in vehicle VIN"
          />
        ) : (
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
        )}

        {/* Show trade-in vehicle description if VIN mode but vehicle is decoded */}
        {showTradeInVin && watch('tradeInVehicle') && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Vehicle: </span>
            {watch('tradeInVehicle')}
          </div>
        )}
      </div>

      {/* Financing Details (only for FINANCE and LEASE) */}
      {(dealType === 'FINANCE' || dealType === 'LEASE') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField label="Term (months)" error={errors.financingTerm?.message}>
            <FormInput
              type="number"
              {...register('financingTerm')}
              error={!!errors.financingTerm}
              placeholder="60"
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
      )}

      {/* Salesperson */}
      <FormField label="Salesperson" error={errors.salespersonId?.message}>
        <FormSelect
          {...register('salespersonId')}
          error={!!errors.salespersonId}
          options={[
            { value: '', label: 'Select salesperson (optional)' },
            ...salespeople.map((s) => ({ value: s.id, label: s.name })),
          ]}
        />
      </FormField>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Additional notes about the deal..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : initialData ? 'Update Deal' : 'Create Deal'}
        </Button>
      </div>
    </form>
  );
}
