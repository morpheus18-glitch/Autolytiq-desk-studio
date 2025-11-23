import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, Mail, Phone, Calendar, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { Customer } from '@shared/schema';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { interactiveCardClasses, cardSpacing } from '@/lib/design-tokens';

interface KanbanCustomerCardProps {
  customer: Customer;
}

export function KanbanCustomerCard({ customer }: KanbanCustomerCardProps) {
  const [, setLocation] = useLocation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: customer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const initials = `${customer.firstName.charAt(0)}${customer.lastName.charAt(0)}`.toUpperCase();

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Card
        className={cn(interactiveCardClasses, "mb-3 cursor-move")}
        data-testid={`card-prospect-${customer.id}`}
      >
        <CardContent className={cardSpacing.compact}>
          <div className="flex items-start gap-3">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              {customer.photoUrl ? (
                <img 
                  src={customer.photoUrl} 
                  alt={`${customer.firstName} ${customer.lastName}`}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-sm font-semibold text-primary">{initials}</span>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-sm truncate">
                  {customer.firstName} {customer.lastName}
                </h4>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLocation(`/customers`);
                  }}
                  data-testid={`button-view-customer-${customer.id}`}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>

              {/* Contact Info */}
              <div className="space-y-1 mt-2">
                {customer.email && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{customer.email}</span>
                  </div>
                )}
                {customer.phone && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{customer.phone}</span>
                  </div>
                )}
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-2 mt-2">
                {customer.createdAt && (
                  <Badge variant="secondary" className="text-xs">
                    <Calendar className="h-3 w-3 mr-1" />
                    {formatDistanceToNow(new Date(customer.createdAt), { addSuffix: true })}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
