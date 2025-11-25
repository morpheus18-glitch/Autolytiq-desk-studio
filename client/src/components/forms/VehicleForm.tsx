/**
 * Vehicle Form Component
 *
 * Form for creating and editing vehicles with validation.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, FormInput, FormSelect, FormField } from '@design-system';

const vehicleSchema = z.object({
  vin: z.string().length(17, 'VIN must be exactly 17 characters'),
  year: z.coerce
    .number()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  make: z.string().min(1, 'Make is required'),
  model: z.string().min(1, 'Model is required'),
  trim: z.string().optional(),
  exteriorColor: z.string().min(1, 'Exterior color is required'),
  interiorColor: z.string().optional(),
  mileage: z.coerce.number().min(0, 'Mileage must be positive'),
  condition: z.enum(['NEW', 'USED', 'CERTIFIED']),
  status: z.enum(['AVAILABLE', 'SOLD', 'PENDING', 'IN_TRANSIT', 'SERVICE']),
  stockNumber: z.string().optional(),
  msrp: z.coerce.number().min(0).optional(),
  listPrice: z.coerce.number().min(0, 'List price is required'),
  invoicePrice: z.coerce.number().min(0).optional(),
  features: z.string().optional(),
  notes: z.string().optional(),
});

export type VehicleFormData = z.infer<typeof vehicleSchema>;

interface VehicleFormProps {
  initialData?: Partial<VehicleFormData>;
  onSubmit: (data: VehicleFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const currentYear = new Date().getFullYear();
const yearOptions = Array.from({ length: 30 }, (_, i) => ({
  value: String(currentYear + 1 - i),
  label: String(currentYear + 1 - i),
}));

export function VehicleForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: VehicleFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vin: '',
      year: currentYear,
      make: '',
      model: '',
      trim: '',
      exteriorColor: '',
      interiorColor: '',
      mileage: 0,
      condition: 'NEW',
      status: 'AVAILABLE',
      stockNumber: '',
      msrp: 0,
      listPrice: 0,
      invoicePrice: 0,
      features: '',
      notes: '',
      ...initialData,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* VIN and Stock Number */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="VIN" error={errors.vin?.message} required>
          <FormInput
            {...register('vin')}
            error={!!errors.vin}
            placeholder="1HGCM82633A123456"
            maxLength={17}
          />
        </FormField>
        <FormField label="Stock Number" error={errors.stockNumber?.message}>
          <FormInput
            {...register('stockNumber')}
            error={!!errors.stockNumber}
            placeholder="STK-001"
          />
        </FormField>
      </div>

      {/* Year, Make, Model, Trim */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <FormField label="Year" error={errors.year?.message} required>
          <FormSelect {...register('year')} error={!!errors.year} options={yearOptions} />
        </FormField>
        <FormField label="Make" error={errors.make?.message} required>
          <FormInput {...register('make')} error={!!errors.make} placeholder="Toyota" />
        </FormField>
        <FormField label="Model" error={errors.model?.message} required>
          <FormInput {...register('model')} error={!!errors.model} placeholder="Camry" />
        </FormField>
        <FormField label="Trim" error={errors.trim?.message}>
          <FormInput {...register('trim')} error={!!errors.trim} placeholder="XLE" />
        </FormField>
      </div>

      {/* Colors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Exterior Color" error={errors.exteriorColor?.message} required>
          <FormInput
            {...register('exteriorColor')}
            error={!!errors.exteriorColor}
            placeholder="Midnight Blue"
          />
        </FormField>
        <FormField label="Interior Color" error={errors.interiorColor?.message}>
          <FormInput
            {...register('interiorColor')}
            error={!!errors.interiorColor}
            placeholder="Black Leather"
          />
        </FormField>
      </div>

      {/* Mileage, Condition, Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="Mileage" error={errors.mileage?.message} required>
          <FormInput
            type="number"
            {...register('mileage')}
            error={!!errors.mileage}
            placeholder="15000"
          />
        </FormField>
        <FormField label="Condition" error={errors.condition?.message} required>
          <FormSelect
            {...register('condition')}
            error={!!errors.condition}
            options={[
              { value: 'NEW', label: 'New' },
              { value: 'USED', label: 'Used' },
              { value: 'CERTIFIED', label: 'Certified Pre-Owned' },
            ]}
          />
        </FormField>
        <FormField label="Status" error={errors.status?.message} required>
          <FormSelect
            {...register('status')}
            error={!!errors.status}
            options={[
              { value: 'AVAILABLE', label: 'Available' },
              { value: 'SOLD', label: 'Sold' },
              { value: 'PENDING', label: 'Pending Sale' },
              { value: 'IN_TRANSIT', label: 'In Transit' },
              { value: 'SERVICE', label: 'In Service' },
            ]}
          />
        </FormField>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="MSRP" error={errors.msrp?.message}>
          <FormInput
            type="number"
            step="0.01"
            {...register('msrp')}
            error={!!errors.msrp}
            placeholder="35000"
          />
        </FormField>
        <FormField label="List Price" error={errors.listPrice?.message} required>
          <FormInput
            type="number"
            step="0.01"
            {...register('listPrice')}
            error={!!errors.listPrice}
            placeholder="32000"
          />
        </FormField>
        <FormField label="Invoice Price" error={errors.invoicePrice?.message}>
          <FormInput
            type="number"
            step="0.01"
            {...register('invoicePrice')}
            error={!!errors.invoicePrice}
            placeholder="30000"
          />
        </FormField>
      </div>

      {/* Features */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">
          Features (comma-separated)
        </label>
        <textarea
          {...register('features')}
          rows={2}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Sunroof, Navigation, Leather Seats, Backup Camera..."
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Notes</label>
        <textarea
          {...register('notes')}
          rows={3}
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Additional notes about the vehicle..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : initialData?.vin ? 'Update Vehicle' : 'Add Vehicle'}
        </Button>
      </div>
    </form>
  );
}
