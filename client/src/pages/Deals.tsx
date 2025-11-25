/**
 * Deals Page
 *
 * Manage sales deals and track deal progress.
 */

import { useState, type JSX } from 'react';
import { Plus, Search, Filter, MoreHorizontal, ChevronDown, Eye, Edit, Trash2 } from 'lucide-react';
import { MainLayout } from '@/layouts';
import { PageHeader, Card, CardContent, Button } from '@design-system';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import type { DealStatus } from '@/types';

/**
 * Deal status configuration
 */
const dealStatuses: { value: DealStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All Deals', color: '' },
  { value: 'lead', label: 'Lead', color: 'bg-muted text-muted-foreground' },
  { value: 'contacted', label: 'Contacted', color: 'bg-info/10 text-info' },
  { value: 'negotiating', label: 'Negotiating', color: 'bg-warning/10 text-warning' },
  { value: 'financing', label: 'Financing', color: 'bg-primary/10 text-primary' },
  { value: 'pending_delivery', label: 'Pending Delivery', color: 'bg-accent/10 text-accent' },
  { value: 'delivered', label: 'Delivered', color: 'bg-success/10 text-success' },
  { value: 'lost', label: 'Lost', color: 'bg-destructive/10 text-destructive' },
];

/**
 * Mock deals data
 */
const mockDeals = [
  {
    id: '1',
    customer: { name: 'John Smith', email: 'john.smith@email.com' },
    vehicle: { year: 2024, make: 'Toyota', model: 'Camry', trim: 'XSE' },
    salesperson: 'Mike Johnson',
    status: 'delivered' as DealStatus,
    type: 'finance',
    sale_price: 32500,
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-18T14:20:00Z',
  },
  {
    id: '2',
    customer: { name: 'Sarah Johnson', email: 'sarah.j@email.com' },
    vehicle: { year: 2023, make: 'Honda', model: 'Accord', trim: 'Sport' },
    salesperson: 'Emily Davis',
    status: 'financing' as DealStatus,
    type: 'finance',
    sale_price: 28900,
    created_at: '2024-01-16T09:15:00Z',
    updated_at: '2024-01-19T11:45:00Z',
  },
  {
    id: '3',
    customer: { name: 'Mike Williams', email: 'mike.w@email.com' },
    vehicle: { year: 2024, make: 'Ford', model: 'F-150', trim: 'Lariat' },
    salesperson: 'Mike Johnson',
    status: 'negotiating' as DealStatus,
    type: 'cash',
    sale_price: 52000,
    created_at: '2024-01-17T14:00:00Z',
    updated_at: '2024-01-19T16:30:00Z',
  },
  {
    id: '4',
    customer: { name: 'Emily Davis', email: 'emily.d@email.com' },
    vehicle: { year: 2023, make: 'BMW', model: 'X5', trim: 'xDrive40i' },
    salesperson: 'Sarah Williams',
    status: 'pending_delivery' as DealStatus,
    type: 'lease',
    sale_price: 68500,
    created_at: '2024-01-14T11:00:00Z',
    updated_at: '2024-01-19T09:00:00Z',
  },
  {
    id: '5',
    customer: { name: 'Robert Brown', email: 'robert.b@email.com' },
    vehicle: { year: 2024, make: 'Tesla', model: 'Model 3', trim: 'Long Range' },
    salesperson: 'Emily Davis',
    status: 'lead' as DealStatus,
    type: 'cash',
    sale_price: 47990,
    created_at: '2024-01-19T08:30:00Z',
    updated_at: '2024-01-19T08:30:00Z',
  },
  {
    id: '6',
    customer: { name: 'Lisa Anderson', email: 'lisa.a@email.com' },
    vehicle: { year: 2023, make: 'Chevrolet', model: 'Tahoe', trim: 'LT' },
    salesperson: 'Mike Johnson',
    status: 'contacted' as DealStatus,
    type: 'finance',
    sale_price: 58000,
    created_at: '2024-01-18T15:45:00Z',
    updated_at: '2024-01-19T10:15:00Z',
  },
];

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: DealStatus }): JSX.Element {
  const config = dealStatuses.find((s) => s.value === status) || dealStatuses[1];

  return (
    <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', config.color)}>
      {config.label}
    </span>
  );
}

export function DealsPage(): JSX.Element {
  const [activeFilter, setActiveFilter] = useState<DealStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Filter deals
  const filteredDeals = mockDeals.filter((deal) => {
    const matchesStatus = activeFilter === 'all' || deal.status === activeFilter;
    const matchesSearch =
      searchQuery === '' ||
      deal.customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${deal.vehicle.year} ${deal.vehicle.make} ${deal.vehicle.model}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <MainLayout>
      <PageHeader
        title="Deals"
        subtitle="Manage your sales deals and track progress through the pipeline."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Deals' }]}
        actions={<Button icon={<Plus className="h-4 w-4" />}>New Deal</Button>}
      />

      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        {/* Filters bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            <Filter className="h-4 w-4 text-muted-foreground" />
            {dealStatuses.slice(0, 5).map((status) => (
              <button
                key={status.value}
                onClick={() => setActiveFilter(status.value)}
                className={cn(
                  'whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                  activeFilter === status.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {status.label}
              </button>
            ))}
            <button className="flex items-center gap-1 whitespace-nowrap rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted/80">
              More
              <ChevronDown className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Deals table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Vehicle
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Salesperson
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Last Updated
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDeals.map((deal) => (
                    <tr key={deal.id} className="transition-colors hover:bg-muted/30">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-foreground">{deal.customer.name}</p>
                          <p className="text-sm text-muted-foreground">{deal.customer.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-foreground">
                          {deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}
                        </p>
                        <p className="text-sm text-muted-foreground">{deal.vehicle.trim}</p>
                      </td>
                      <td className="px-4 py-4 text-foreground">{deal.salesperson}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={deal.status} />
                      </td>
                      <td className="px-4 py-4 font-medium text-foreground">
                        {formatCurrency(deal.sale_price)}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {formatDate(deal.updated_at)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="relative flex justify-end">
                          <button
                            onClick={() => setOpenMenuId(openMenuId === deal.id ? null : deal.id)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </button>

                          {openMenuId === deal.id && (
                            <>
                              <div
                                className="fixed inset-0 z-40"
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div className="absolute right-0 top-8 z-50 w-40 rounded-lg border border-border bg-popover p-1 shadow-lg animate-fade-in">
                                <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted">
                                  <Eye className="h-4 w-4" />
                                  View
                                </button>
                                <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted">
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </button>
                                <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10">
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Empty state */}
            {filteredDeals.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-muted-foreground">No deals found matching your criteria.</p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveFilter('all')}>
                  Clear filters
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination placeholder */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredDeals.length} of {mockDeals.length} deals
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
