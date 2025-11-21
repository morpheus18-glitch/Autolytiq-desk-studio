/**
 * CUSTOMER FORM COMPONENT
 * Create and edit customer information
 */

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateCustomerRequestSchema } from '../types/customer.types';
import type { CreateCustomerRequest, Customer } from '../types/customer.types';
import { z } from 'zod';

interface CustomerFormProps {
  customer?: Customer;
  onSubmit: (data: CreateCustomerRequest) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function CustomerForm({
  customer,
  onSubmit,
  onCancel,
  isLoading = false,
}: CustomerFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateCustomerRequest>({
    resolver: zodResolver(CreateCustomerRequestSchema),
    defaultValues: customer
      ? {
          firstName: customer.firstName,
          lastName: customer.lastName,
          middleName: customer.middleName,
          email: customer.email,
          phone: customer.phone,
          alternatePhone: customer.alternatePhone,
          preferredContactMethod: customer.preferredContactMethod,
          address: customer.address,
          dateOfBirth: customer.dateOfBirth,
          employer: customer.employer,
          occupation: customer.occupation,
          monthlyIncome: customer.monthlyIncome,
          creditScore: customer.creditScore,
          status: customer.status,
          source: customer.source,
          notes: customer.notes,
          marketingOptIn: customer.marketingOptIn,
        }
      : {
          status: 'lead',
          preferredContactMethod: 'email',
          marketingOptIn: false,
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name *</Label>
            <Input
              id="firstName"
              {...register('firstName')}
              placeholder="John"
            />
            {errors.firstName && (
              <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input
              id="lastName"
              {...register('lastName')}
              placeholder="Doe"
            />
            {errors.lastName && (
              <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="middleName">Middle Name</Label>
            <Input
              id="middleName"
              {...register('middleName')}
              placeholder="Michael"
            />
          </div>

          <div>
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Input
              id="dateOfBirth"
              type="date"
              {...register('dateOfBirth')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              placeholder="john.doe@example.com"
            />
            {errors.email && (
              <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              type="tel"
              {...register('phone')}
              placeholder="(555) 123-4567"
            />
            {errors.phone && (
              <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="alternatePhone">Alternate Phone</Label>
            <Input
              id="alternatePhone"
              type="tel"
              {...register('alternatePhone')}
              placeholder="(555) 987-6543"
            />
          </div>

          <div>
            <Label htmlFor="preferredContactMethod">Preferred Contact Method</Label>
            <Select
              value={watch('preferredContactMethod')}
              onValueChange={(value) =>
                setValue('preferredContactMethod', value as any)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="any">Any</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Address */}
      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              {...register('address.street')}
              placeholder="123 Main St"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...register('address.city')}
                placeholder="New York"
              />
            </div>

            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                {...register('address.state')}
                placeholder="NY"
                maxLength={2}
              />
            </div>

            <div>
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input
                id="zipCode"
                {...register('address.zipCode')}
                placeholder="10001"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employment & Financial */}
      <Card>
        <CardHeader>
          <CardTitle>Employment & Financial</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="employer">Employer</Label>
            <Input
              id="employer"
              {...register('employer')}
              placeholder="Acme Corp"
            />
          </div>

          <div>
            <Label htmlFor="occupation">Occupation</Label>
            <Input
              id="occupation"
              {...register('occupation')}
              placeholder="Software Engineer"
            />
          </div>

          <div>
            <Label htmlFor="monthlyIncome">Monthly Income</Label>
            <Input
              id="monthlyIncome"
              type="number"
              step="0.01"
              {...register('monthlyIncome', { valueAsNumber: true })}
              placeholder="5000.00"
            />
          </div>

          <div>
            <Label htmlFor="creditScore">Credit Score</Label>
            <Input
              id="creditScore"
              type="number"
              {...register('creditScore', { valueAsNumber: true })}
              placeholder="720"
              min="300"
              max="850"
            />
          </div>
        </CardContent>
      </Card>

      {/* Status & Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Status & Notes</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              value={watch('status')}
              onValueChange={(value) => setValue('status', value as any)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lead">Lead</SelectItem>
                <SelectItem value="prospect">Prospect</SelectItem>
                <SelectItem value="qualified">Qualified</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Additional notes about this customer..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : customer ? 'Update Customer' : 'Create Customer'}
        </Button>
      </div>
    </form>
  );
}
