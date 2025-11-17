import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Customer } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KanbanCustomerCard } from './kanban-customer-card';

interface KanbanColumnProps {
  id: string;
  title: string;
  count: number;
  color: string;
  customers: Customer[];
}

export function KanbanColumn({ id, title, count, color, customers }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const customerIds = customers.map((c) => c.id);

  return (
    <Card className={`flex flex-col h-[calc(100vh-300px)] ${isOver ? 'ring-2 ring-primary' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Badge variant="outline" className={color}>
            {count}
          </Badge>
        </div>
      </CardHeader>
      <CardContent
        ref={setNodeRef}
        className="flex-1 overflow-y-auto space-y-2 p-4 pt-0"
      >
        <SortableContext items={customerIds} strategy={verticalListSortingStrategy}>
          {customers.map((customer) => (
            <KanbanCustomerCard key={customer.id} customer={customer} />
          ))}
          {customers.length === 0 && (
            <div className="flex items-center justify-center h-32 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
              No customers
            </div>
          )}
        </SortableContext>
      </CardContent>
    </Card>
  );
}
