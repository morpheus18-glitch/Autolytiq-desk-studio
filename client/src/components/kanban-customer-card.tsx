import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Customer } from '@shared/schema';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Phone, User } from 'lucide-react';
import { CustomerActionMenu } from './customer-action-menu';

interface KanbanCustomerCardProps {
  customer: Customer;
  isDragging?: boolean;
}

export function KanbanCustomerCard({ customer, isDragging = false }: KanbanCustomerCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: customer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const initials = `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase();

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative ${
        isDragging ? 'shadow-xl rotate-3' : ''
      }`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <div
            {...attributes}
            {...listeners}
            className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0"
          >
            {customer.photoUrl ? (
              <img
                src={customer.photoUrl}
                alt={`${customer.firstName} ${customer.lastName}`}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-primary">{initials}</span>
            )}
          </div>
          <div className="flex-1 min-w-0" {...attributes} {...listeners}>
            <p className="font-medium text-sm truncate">
              {customer.firstName} {customer.lastName}
            </p>
            {customer.customerNumber && (
              <p className="text-xs text-muted-foreground font-mono">
                {customer.customerNumber}
              </p>
            )}
          </div>
          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <CustomerActionMenu customer={customer} variant="compact" />
          </div>
        </div>

        <div {...attributes} {...listeners}>
          {customer.email && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Mail className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{customer.email}</span>
            </div>
          )}

          {customer.phone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Phone className="w-3 h-3 flex-shrink-0" />
              <span>{customer.phone}</span>
            </div>
          )}

          {customer.creditScore && (
            <Badge variant="outline" className="text-xs">
              Credit: {customer.creditScore}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
