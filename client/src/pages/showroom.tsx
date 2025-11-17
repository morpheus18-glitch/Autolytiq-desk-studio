import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import type { Customer } from '@shared/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LayoutShell } from '@/components/layout-shell';
import { SectionHeader } from '@/components/section-header';
import { Users, Search, Plus, UserPlus } from 'lucide-react';
import { KanbanColumn } from '@/components/kanban-column';
import { KanbanCustomerCard } from '@/components/kanban-customer-card';

const STATUS_COLUMNS = [
  { id: 'prospect', label: 'Prospects', color: 'bg-slate-100 text-slate-800' },
  { id: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-800' },
  { id: 'active', label: 'Active', color: 'bg-yellow-100 text-yellow-800' },
  { id: 'sold', label: 'Sold', color: 'bg-green-100 text-green-800' },
  { id: 'lost', label: 'Lost', color: 'bg-red-100 text-red-800' },
  { id: 'inactive', label: 'Inactive', color: 'bg-gray-100 text-gray-800' },
];

export default function Showroom() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch all customers
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  // Update customer status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ customerId, status }: { customerId: string; status: string }) => {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update customer status');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
    },
  });

  // Filter customers by search query
  const filteredCustomers = customers.filter((customer) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.firstName.toLowerCase().includes(query) ||
      customer.lastName.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query)
    );
  });

  // Group customers by status
  const customersByStatus = STATUS_COLUMNS.reduce((acc, column) => {
    acc[column.id] = filteredCustomers.filter(
      (customer) => customer.status === column.id
    );
    return acc;
  }, {} as Record<string, Customer[]>);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCustomerId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCustomerId(null);

    if (!over) return;

    const customerId = active.id as string;
    const newStatus = over.id as string;

    // Find the customer
    const customer = customers.find((c) => c.id === customerId);
    if (!customer || customer.status === newStatus) return;

    // Update the customer's status
    updateStatusMutation.mutate({ customerId, status: newStatus });
  };

  const activeCustomer = customers.find((c) => c.id === activeCustomerId);

  const header = (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Users className="w-6 h-6" />
        <div>
          <h1 className="text-2xl font-semibold">Showroom Manager</h1>
          <p className="text-sm text-muted-foreground">
            Manage prospects and track customer journey
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Search className="w-4 h-4 mr-2" />
          Filters
        </Button>
        <Button size="sm">
          <UserPlus className="w-4 h-4 mr-2" />
          Add Prospect
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <LayoutShell header={header}>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading showroom...</p>
        </div>
      </LayoutShell>
    );
  }

  return (
    <LayoutShell header={header}>
      <div className="space-y-6">
        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {STATUS_COLUMNS.map((column) => (
              <Badge key={column.id} variant="outline" className={column.color}>
                {column.label}: {customersByStatus[column.id].length}
              </Badge>
            ))}
          </div>
        </div>

        {/* Kanban Board */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {STATUS_COLUMNS.map((column) => (
              <KanbanColumn
                key={column.id}
                id={column.id}
                title={column.label}
                count={customersByStatus[column.id].length}
                color={column.color}
                customers={customersByStatus[column.id]}
              />
            ))}
          </div>

          <DragOverlay>
            {activeCustomer ? (
              <KanbanCustomerCard customer={activeCustomer} isDragging />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </LayoutShell>
  );
}
