import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { DndContext, DragEndEvent, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { PageLayout } from '@/components/page-layout';
import { KanbanColumn } from '@/components/kanban-column';
import { KanbanCustomerCard } from '@/components/kanban-customer-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Plus, Search, Store, RefreshCw } from 'lucide-react';
import type { Customer } from '@shared/schema';
import { useLocation } from 'wouter';

type CustomerStatus = 'prospect' | 'qualified' | 'active' | 'sold' | 'lost' | 'inactive';

const COLUMNS = [
  { id: 'prospect', title: 'New Prospects', color: 'blue' },
  { id: 'qualified', title: 'Qualified', color: 'purple' },
  { id: 'active', title: 'Active Deal', color: 'yellow' },
  { id: 'sold', title: 'Sold', color: 'green' },
  { id: 'lost', title: 'Lost', color: 'gray' },
] as const;

export default function Showroom() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCustomer, setActiveCustomer] = useState<Customer | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Fetch all customers
  const { data: customers = [], isLoading, refetch } = useQuery<Customer[]>({
    queryKey: ['/api/customers'],
  });

  // Update customer status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ customerId, status }: { customerId: string; status: CustomerStatus }) => {
      return await apiRequest('PATCH', `/api/customers/${customerId}`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      toast({
        title: 'Status updated',
        description: 'Customer status has been updated successfully',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Update failed',
        description: error.message || 'Failed to update customer status',
        variant: 'destructive',
      });
    },
  });

  // Filter customers by search
  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(c => 
      c.firstName.toLowerCase().includes(query) ||
      c.lastName.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.phone?.includes(query)
    );
  }, [customers, searchQuery]);

  // Group customers by status
  const customersByStatus = useMemo(() => {
    const grouped: Record<CustomerStatus, Customer[]> = {
      prospect: [],
      qualified: [],
      active: [],
      sold: [],
      lost: [],
      inactive: [],
    };

    filteredCustomers.forEach(customer => {
      const status = (customer.status || 'prospect') as CustomerStatus;
      if (grouped[status]) {
        grouped[status].push(customer);
      }
    });

    return grouped;
  }, [filteredCustomers]);

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCustomer(null);

    if (!over || active.id === over.id) return;

    const customerId = active.id as string;
    
    // Get the column ID from the droppable container
    // When dropping on a card, over.id is the card's ID, but we need the column ID
    const newStatus = (over.data.current?.sortable?.containerId || over.id) as CustomerStatus;
    
    // Validate that we got a valid status (not a customer ID)
    const validStatuses: CustomerStatus[] = ['prospect', 'qualified', 'active', 'sold', 'lost', 'inactive'];
    if (!validStatuses.includes(newStatus)) {
      console.warn('Invalid status detected:', newStatus);
      return;
    }

    // Find the customer
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;

    // Only update if status changed
    if (customer.status !== newStatus) {
      updateStatusMutation.mutate({ customerId, status: newStatus });
    }
  };

  const handleDragStart = (event: any) => {
    const customer = customers.find(c => c.id === event.active.id);
    setActiveCustomer(customer || null);
  };

  const totalCustomers = filteredCustomers.length;
  const prospectCount = customersByStatus.prospect.length;
  const qualifiedCount = customersByStatus.qualified.length;
  const activeCount = customersByStatus.active.length;

  return (
    <PageLayout>
      <div className="container mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Store className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Showroom Manager</h1>
            <p className="text-muted-foreground">Manage your customer pipeline from prospect to sold</p>
          </div>
        </div>
        {/* Header Actions */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-sm">
              {totalCustomers} Total
            </Badge>
            <Badge variant="outline" className="text-sm text-blue-600 dark:text-blue-400">
              {prospectCount} Prospects
            </Badge>
            <Badge variant="outline" className="text-sm text-purple-600 dark:text-purple-400">
              {qualifiedCount} Qualified
            </Badge>
            <Badge variant="outline" className="text-sm text-yellow-600 dark:text-yellow-400">
              {activeCount} Active
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-customers"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              data-testid="button-refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              onClick={() => setLocation('/customers')}
              data-testid="button-add-customer"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-[600px]" />
            ))}
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {COLUMNS.map(column => (
                <KanbanColumn
                  key={column.id}
                  id={column.id}
                  title={column.title}
                  customers={customersByStatus[column.id as CustomerStatus] || []}
                  color={column.color}
                />
              ))}
            </div>

            <DragOverlay>
              {activeCustomer ? (
                <KanbanCustomerCard customer={activeCustomer} />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </PageLayout>
  );
}
