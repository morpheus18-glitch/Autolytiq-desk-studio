/**
 * Customers Page
 *
 * Manage customer database and profiles.
 */

import { useState, type JSX } from 'react';
import {
  Plus,
  Search,
  Filter,
  Mail,
  Phone,
  MapPin,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
} from 'lucide-react';
import { MainLayout } from '@/layouts';
import { PageHeader, Card, CardContent, Button } from '@design-system';
import { formatDate, getInitials } from '@/lib/utils';

/**
 * Mock customers data
 */
const mockCustomers = [
  {
    id: '1',
    first_name: 'John',
    last_name: 'Smith',
    email: 'john.smith@email.com',
    phone: '(555) 123-4567',
    address: { city: 'Austin', state: 'TX' },
    source: 'Website',
    deals_count: 2,
    created_at: '2024-01-10T10:30:00Z',
  },
  {
    id: '2',
    first_name: 'Sarah',
    last_name: 'Johnson',
    email: 'sarah.j@email.com',
    phone: '(555) 234-5678',
    address: { city: 'Dallas', state: 'TX' },
    source: 'Referral',
    deals_count: 1,
    created_at: '2024-01-12T14:15:00Z',
  },
  {
    id: '3',
    first_name: 'Mike',
    last_name: 'Williams',
    email: 'mike.w@email.com',
    phone: '(555) 345-6789',
    address: { city: 'Houston', state: 'TX' },
    source: 'Walk-in',
    deals_count: 3,
    created_at: '2024-01-08T09:00:00Z',
  },
  {
    id: '4',
    first_name: 'Emily',
    last_name: 'Davis',
    email: 'emily.d@email.com',
    phone: '(555) 456-7890',
    address: { city: 'San Antonio', state: 'TX' },
    source: 'Website',
    deals_count: 1,
    created_at: '2024-01-15T16:45:00Z',
  },
  {
    id: '5',
    first_name: 'Robert',
    last_name: 'Brown',
    email: 'robert.b@email.com',
    phone: '(555) 567-8901',
    address: { city: 'Austin', state: 'TX' },
    source: 'Social Media',
    deals_count: 0,
    created_at: '2024-01-18T11:30:00Z',
  },
  {
    id: '6',
    first_name: 'Lisa',
    last_name: 'Anderson',
    email: 'lisa.a@email.com',
    phone: '(555) 678-9012',
    address: { city: 'Fort Worth', state: 'TX' },
    source: 'Referral',
    deals_count: 1,
    created_at: '2024-01-16T08:20:00Z',
  },
];

/**
 * Source filter options
 */
const sourceFilters = ['All Sources', 'Website', 'Walk-in', 'Referral', 'Social Media', 'Phone'];

export function CustomersPage(): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('All Sources');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  // View mode for switching between grid/list display
  const viewMode: 'grid' | 'list' = 'list';

  // Filter customers
  const filteredCustomers = mockCustomers.filter((customer) => {
    const matchesSearch =
      searchQuery === '' ||
      `${customer.first_name} ${customer.last_name}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSource = sourceFilter === 'All Sources' || customer.source === sourceFilter;
    return matchesSearch && matchesSource;
  });

  return (
    <MainLayout>
      <PageHeader
        title="Customers"
        subtitle="Manage your customer database and build lasting relationships."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Customers' }]}
        actions={<Button icon={<Plus className="h-4 w-4" />}>Add Customer</Button>}
      />

      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        {/* Filters bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Source filter */}
          <div className="flex items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {sourceFilters.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Customers grid/list */}
        {viewMode === 'list' ? (
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
                        Contact
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Location
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Source
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Deals
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Added
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                              {getInitials(`${customer.first_name} ${customer.last_name}`)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {customer.first_name} {customer.last_name}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              {customer.email}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Phone className="h-3.5 w-3.5" />
                              {customer.phone}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5" />
                            {customer.address.city}, {customer.address.state}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                            {customer.source}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-foreground">{customer.deals_count}</td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {formatDate(customer.created_at)}
                        </td>
                        <td className="px-4 py-4">
                          <div className="relative flex justify-end">
                            <button
                              onClick={() =>
                                setOpenMenuId(openMenuId === customer.id ? null : customer.id)
                              }
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {openMenuId === customer.id && (
                              <>
                                <div
                                  className="fixed inset-0 z-40"
                                  onClick={() => setOpenMenuId(null)}
                                />
                                <div className="absolute right-0 top-8 z-50 w-40 rounded-lg border border-border bg-popover p-1 shadow-lg animate-fade-in">
                                  <button className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted">
                                    <Eye className="h-4 w-4" />
                                    View Profile
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
              {filteredCustomers.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">
                    No customers found matching your criteria.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => {
                      setSearchQuery('');
                      setSourceFilter('All Sources');
                    }}
                  >
                    Clear filters
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredCustomers.map((customer) => (
              <Card key={customer.id} hoverable>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-medium text-primary">
                        {getInitials(`${customer.first_name} ${customer.last_name}`)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {customer.first_name} {customer.last_name}
                        </p>
                        <span className="text-xs text-muted-foreground">{customer.source}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {customer.email}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {customer.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {customer.address.city}, {customer.address.state}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <span className="text-sm text-muted-foreground">
                      {customer.deals_count} deals
                    </span>
                    <Button variant="ghost" size="sm">
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredCustomers.length} of {mockCustomers.length} customers
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
