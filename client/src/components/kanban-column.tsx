import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KanbanCustomerCard } from './kanban-customer-card';
import type { Customer } from '@shared/schema';
import { cn } from '@/lib/utils';

interface KanbanColumnProps {
  id: string;
  title: string;
  customers: Customer[];
  color?: string;
}

export function KanbanColumn({ id, title, customers, color = 'default' }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const colorClasses = {
    default: 'bg-muted/50',
    blue: 'bg-blue-500/5 border-blue-500/20',
    green: 'bg-green-500/5 border-green-500/20',
    yellow: 'bg-yellow-500/5 border-yellow-500/20',
    purple: 'bg-purple-500/5 border-purple-500/20',
    gray: 'bg-muted/30 border-muted',
  };

  return (
    <Card 
      className={cn(
        'flex flex-col h-full',
        isOver && 'ring-2 ring-primary ring-offset-2'
      )}
      data-testid={`kanban-column-${id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {customers.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent 
        ref={setNodeRef}
        className={cn(
          'flex-1 overflow-y-auto min-h-[200px] rounded-md p-2',
          colorClasses[color as keyof typeof colorClasses] || colorClasses.default
        )}
      >
        <SortableContext 
          items={customers.map(c => c.id)} 
          strategy={verticalListSortingStrategy}
        >
          {customers.map((customer) => (
            <KanbanCustomerCard key={customer.id} customer={customer} />
          ))}
        </SortableContext>
        
        {customers.length === 0 && (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            No customers
          </div>
        )}
      </CardContent>
    </Card>
  );
}
