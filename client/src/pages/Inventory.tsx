/**
 * Inventory Page
 *
 * Manage vehicle inventory.
 */

import { useState, type JSX } from 'react';
import { Plus, Search, Grid, List, MoreHorizontal, Eye, Edit, Trash2 } from 'lucide-react';
import { MainLayout } from '@/layouts';
import { PageHeader, Card, CardContent, Button } from '@design-system';
import { cn, formatCurrency } from '@/lib/utils';
import type { VehicleStatus, VehicleCondition } from '@/types';

/**
 * Mock inventory data
 */
const mockInventory = [
  {
    id: '1',
    vin: '1HGBH41JXMN109186',
    year: 2024,
    make: 'Toyota',
    model: 'Camry',
    trim: 'XSE',
    exterior_color: 'Midnight Black',
    mileage: 15,
    condition: 'new' as VehicleCondition,
    status: 'available' as VehicleStatus,
    asking_price: 32500,
    days_in_stock: 12,
    photo: null,
  },
  {
    id: '2',
    vin: '2HGBH41JXMN109187',
    year: 2023,
    make: 'Honda',
    model: 'Accord',
    trim: 'Sport',
    exterior_color: 'Platinum White',
    mileage: 18500,
    condition: 'used' as VehicleCondition,
    status: 'available' as VehicleStatus,
    asking_price: 28900,
    days_in_stock: 21,
    photo: null,
  },
  {
    id: '3',
    vin: '3HGBH41JXMN109188',
    year: 2024,
    make: 'Ford',
    model: 'F-150',
    trim: 'Lariat',
    exterior_color: 'Oxford White',
    mileage: 45,
    condition: 'new' as VehicleCondition,
    status: 'pending' as VehicleStatus,
    asking_price: 52000,
    days_in_stock: 8,
    photo: null,
  },
  {
    id: '4',
    vin: '4HGBH41JXMN109189',
    year: 2023,
    make: 'BMW',
    model: 'X5',
    trim: 'xDrive40i',
    exterior_color: 'Alpine White',
    mileage: 12300,
    condition: 'certified' as VehicleCondition,
    status: 'sold' as VehicleStatus,
    asking_price: 68500,
    days_in_stock: 35,
    photo: null,
  },
  {
    id: '5',
    vin: '5HGBH41JXMN109190',
    year: 2024,
    make: 'Tesla',
    model: 'Model 3',
    trim: 'Long Range',
    exterior_color: 'Pearl White',
    mileage: 0,
    condition: 'new' as VehicleCondition,
    status: 'available' as VehicleStatus,
    asking_price: 47990,
    days_in_stock: 5,
    photo: null,
  },
  {
    id: '6',
    vin: '6HGBH41JXMN109191',
    year: 2023,
    make: 'Chevrolet',
    model: 'Tahoe',
    trim: 'LT',
    exterior_color: 'Shadow Gray',
    mileage: 8900,
    condition: 'used' as VehicleCondition,
    status: 'hold' as VehicleStatus,
    asking_price: 58000,
    days_in_stock: 18,
    photo: null,
  },
  {
    id: '7',
    vin: '7HGBH41JXMN109192',
    year: 2024,
    make: 'Mercedes-Benz',
    model: 'GLE',
    trim: '350 4MATIC',
    exterior_color: 'Obsidian Black',
    mileage: 25,
    condition: 'new' as VehicleCondition,
    status: 'available' as VehicleStatus,
    asking_price: 72500,
    days_in_stock: 3,
    photo: null,
  },
  {
    id: '8',
    vin: '8HGBH41JXMN109193',
    year: 2023,
    make: 'Audi',
    model: 'Q7',
    trim: 'Premium Plus',
    exterior_color: 'Glacier White',
    mileage: 15600,
    condition: 'certified' as VehicleCondition,
    status: 'available' as VehicleStatus,
    asking_price: 64900,
    days_in_stock: 28,
    photo: null,
  },
];

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: VehicleStatus }): JSX.Element {
  const styles: Record<VehicleStatus, string> = {
    available: 'bg-success/10 text-success',
    pending: 'bg-warning/10 text-warning',
    sold: 'bg-muted text-muted-foreground',
    hold: 'bg-info/10 text-info',
    in_service: 'bg-primary/10 text-primary',
  };

  const labels: Record<VehicleStatus, string> = {
    available: 'Available',
    pending: 'Pending',
    sold: 'Sold',
    hold: 'On Hold',
    in_service: 'In Service',
  };

  return (
    <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', styles[status])}>
      {labels[status]}
    </span>
  );
}

/**
 * Condition badge component
 */
function ConditionBadge({ condition }: { condition: VehicleCondition }): JSX.Element {
  const styles: Record<VehicleCondition, string> = {
    new: 'bg-primary/10 text-primary',
    used: 'bg-muted text-muted-foreground',
    certified: 'bg-accent/10 text-accent',
  };

  const labels: Record<VehicleCondition, string> = {
    new: 'New',
    used: 'Used',
    certified: 'CPO',
  };

  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', styles[condition])}>
      {labels[condition]}
    </span>
  );
}

/**
 * Filter options
 */
const statusFilters: { value: VehicleStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Status' },
  { value: 'available', label: 'Available' },
  { value: 'pending', label: 'Pending' },
  { value: 'hold', label: 'On Hold' },
  { value: 'sold', label: 'Sold' },
];

const conditionFilters: { value: VehicleCondition | 'all'; label: string }[] = [
  { value: 'all', label: 'All Conditions' },
  { value: 'new', label: 'New' },
  { value: 'used', label: 'Used' },
  { value: 'certified', label: 'Certified Pre-Owned' },
];

export function InventoryPage(): JSX.Element {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'all'>('all');
  const [conditionFilter, setConditionFilter] = useState<VehicleCondition | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Filter inventory
  const filteredInventory = mockInventory.filter((vehicle) => {
    const matchesSearch =
      searchQuery === '' ||
      `${vehicle.year} ${vehicle.make} ${vehicle.model} ${vehicle.trim}`
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      vehicle.vin.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter;
    const matchesCondition = conditionFilter === 'all' || vehicle.condition === conditionFilter;
    return matchesSearch && matchesStatus && matchesCondition;
  });

  return (
    <MainLayout>
      <PageHeader
        title="Inventory"
        subtitle="Manage your vehicle inventory and track stock levels."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Inventory' }]}
        actions={<Button icon={<Plus className="h-4 w-4" />}>Add Vehicle</Button>}
      />

      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        {/* Stats summary */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Vehicles</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{mockInventory.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Available</p>
              <p className="mt-1 text-2xl font-bold text-success">
                {mockInventory.filter((v) => v.status === 'available').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="mt-1 text-2xl font-bold text-warning">
                {mockInventory.filter((v) => v.status === 'pending').length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="mt-1 text-2xl font-bold text-foreground">
                {formatCurrency(mockInventory.reduce((sum, v) => sum + v.asking_price, 0))}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search vehicles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as VehicleStatus | 'all')}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {statusFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>

            {/* Condition filter */}
            <select
              value={conditionFilter}
              onChange={(e) => setConditionFilter(e.target.value as VehicleCondition | 'all')}
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {conditionFilters.map((filter) => (
                <option key={filter.value} value={filter.value}>
                  {filter.label}
                </option>
              ))}
            </select>
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'grid'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Grid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'rounded-md p-1.5 transition-colors',
                viewMode === 'list'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Inventory display */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredInventory.map((vehicle) => (
              <Card key={vehicle.id} hoverable className="overflow-hidden">
                {/* Vehicle image placeholder */}
                <div className="aspect-[16/10] bg-muted flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="48"
                      height="48"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="mx-auto opacity-50"
                    >
                      <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9L18 10l-2-4H8L6 10l-2.5 1.1C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2" />
                      <circle cx="7" cy="17" r="2" />
                      <path d="M9 17h6" />
                      <circle cx="17" cy="17" r="2" />
                    </svg>
                    <p className="mt-2 text-xs">No Image</p>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <ConditionBadge condition={vehicle.condition} />
                        <StatusBadge status={vehicle.status} />
                      </div>
                      <h3 className="mt-2 font-semibold text-foreground">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      <p className="text-sm text-muted-foreground">{vehicle.trim}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Color</span>
                      <span className="text-foreground">{vehicle.exterior_color}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Mileage</span>
                      <span className="text-foreground">{vehicle.mileage.toLocaleString()} mi</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Days in Stock</span>
                      <span className="text-foreground">{vehicle.days_in_stock}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(vehicle.asking_price)}
                    </p>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Vehicle
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        VIN
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Condition
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Mileage
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Days
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredInventory.map((vehicle) => (
                      <tr key={vehicle.id} className="transition-colors hover:bg-muted/30">
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-foreground">
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {vehicle.trim} - {vehicle.exterior_color}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4 font-mono text-xs text-muted-foreground">
                          {vehicle.vin}
                        </td>
                        <td className="px-4 py-4">
                          <ConditionBadge condition={vehicle.condition} />
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={vehicle.status} />
                        </td>
                        <td className="px-4 py-4 text-foreground">
                          {vehicle.mileage.toLocaleString()} mi
                        </td>
                        <td className="px-4 py-4 font-medium text-foreground">
                          {formatCurrency(vehicle.asking_price)}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">{vehicle.days_in_stock}</td>
                        <td className="px-4 py-4">
                          <div className="relative flex justify-end">
                            <button
                              onClick={() =>
                                setOpenMenuId(openMenuId === vehicle.id ? null : vehicle.id)
                              }
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {openMenuId === vehicle.id && (
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
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {filteredInventory.length === 0 && (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No vehicles found matching your criteria.</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setConditionFilter('all');
              }}
            >
              Clear filters
            </Button>
          </div>
        )}

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {filteredInventory.length} of {mockInventory.length} vehicles
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
