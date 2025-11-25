/**
 * Customer Form Component
 *
 * Form for creating and editing customers with validation.
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, FormInput, FormSelect, FormField } from '@design-system';

const customerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
    })
    .optional(),
  source: z.enum(['WALK_IN', 'WEBSITE', 'REFERRAL', 'PHONE', 'OTHER']).optional(),
  notes: z.string().optional(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  initialData?: Partial<CustomerFormData>;
  onSubmit: (data: CustomerFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function CustomerForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
}: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
      },
      source: 'WALK_IN',
      notes: '',
      ...initialData,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="First Name" error={errors.firstName?.message} required>
          <FormInput {...register('firstName')} error={!!errors.firstName} placeholder="John" />
        </FormField>
        <FormField label="Last Name" error={errors.lastName?.message} required>
          <FormInput {...register('lastName')} error={!!errors.lastName} placeholder="Doe" />
        </FormField>
      </div>

      {/* Contact Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Email" error={errors.email?.message} required>
          <FormInput
            type="email"
            {...register('email')}
            error={!!errors.email}
            placeholder="john.doe@example.com"
          />
        </FormField>
        <FormField label="Phone" error={errors.phone?.message} required>
          <FormInput
            type="tel"
            {...register('phone')}
            error={!!errors.phone}
            placeholder="(555) 123-4567"
          />
        </FormField>
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-foreground">Address</h3>
        <FormField label="Street Address">
          <FormInput {...register('address.street')} placeholder="123 Main St" />
        </FormField>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2">
            <FormField label="City">
              <FormInput {...register('address.city')} placeholder="Los Angeles" />
            </FormField>
          </div>
          <FormField label="State">
            <FormInput {...register('address.state')} placeholder="CA" />
          </FormField>
          <FormField label="ZIP Code">
            <FormInput {...register('address.zipCode')} placeholder="90001" />
          </FormField>
        </div>
      </div>

      {/* Source */}
      <FormField label="Lead Source">
        <FormSelect
          {...register('source')}
          options={[
            { value: 'WALK_IN', label: 'Walk-In' },
            { value: 'WEBSITE', label: 'Website' },
            { value: 'REFERRAL', label: 'Referral' },
            { value: 'PHONE', label: 'Phone' },
            { value: 'OTHER', label: 'Other' },
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
          placeholder="Additional notes about the customer..."
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : initialData?.firstName ? 'Update Customer' : 'Add Customer'}
        </Button>
      </div>
    </form>
  );
}
