/**
 * CUSTOMER CARD COMPONENT
 * Displays customer information in a card format
 */

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Customer } from '../types/customer.types';
import {
  getFullName,
  getInitials,
  formatPhone,
  formatEmail,
  formatCustomerStatus,
  getStatusColor,
  formatCityStateZip,
} from '../utils/formatters';
import { User, Mail, Phone, MapPin, Calendar } from 'lucide-react';

interface CustomerCardProps {
  customer: Customer;
  onClick?: () => void;
  showDetails?: boolean;
}

export function CustomerCard({ customer, onClick, showDetails = true }: CustomerCardProps) {
  const fullName = getFullName(customer);
  const initials = getInitials(customer);
  const statusColor = getStatusColor(customer.status);

  return (
    <Card
      className={onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              {customer.photoUrl && <AvatarImage src={customer.photoUrl} alt={fullName} />}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>

            <div>
              <CardTitle className="text-lg">{fullName}</CardTitle>
              {customer.customerNumber && (
                <CardDescription className="text-sm">
                  {customer.customerNumber}
                </CardDescription>
              )}
            </div>
          </div>

          <Badge variant={statusColor}>{formatCustomerStatus(customer.status)}</Badge>
        </div>
      </CardHeader>

      {showDetails && (
        <CardContent className="space-y-2">
          {customer.email && (
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{formatEmail(customer.email)}</span>
            </div>
          )}

          {customer.phone && (
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{formatPhone(customer.phone)}</span>
            </div>
          )}

          {customer.address && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{formatCityStateZip(customer.address)}</span>
            </div>
          )}

          {customer.createdAt && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>
                Customer since {new Date(customer.createdAt).toLocaleDateString()}
              </span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
