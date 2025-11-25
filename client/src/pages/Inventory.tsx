/**
 * Inventory Page
 *
 * Manage vehicle inventory with real API integration.
 */

import { useState, type JSX } from 'react';
import { Plus, Search, Grid, List, MoreHorizontal, Eye, Edit, Trash2, Loader2 } from 'lucide-react';
import { MainLayout } from '@/layouts';
import { PageHeader, Card, CardContent, Button } from '@design-system';
import { Modal, ConfirmDialog, useToast } from '@/components/ui';
import { VehicleForm, type VehicleFormData } from '@/components/forms/VehicleForm';
import {
  useVehicles,
  useCreateVehicle,
  useUpdateVehicle,
  useDeleteVehicle,
  useInventoryStats,
  getVehicleName,
  type Vehicle,
} from '@/hooks/useInventory';
import { cn, formatCurrency } from '@/lib/utils';

/**
 * Vehicle status type
 */
type VehicleStatus = 'AVAILABLE' | 'SOLD' | 'PENDING' | 'IN_TRANSIT' | 'SERVICE';
type VehicleCondition = 'NEW' | 'USED' | 'CERTIFIED';

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: VehicleStatus }): JSX.Element {
  const styles: Record<VehicleStatus, string> = {
    AVAILABLE: 'bg-success/10 text-success',
    PENDING: 'bg-warning/10 text-warning',
    SOLD: 'bg-muted text-muted-foreground',
    IN_TRANSIT: 'bg-info/10 text-info',
    SERVICE: 'bg-primary/10 text-primary',
  };

  const labels: Record<VehicleStatus, string> = {
    AVAILABLE: 'Available',
    PENDING: 'Pending',
    SOLD: 'Sold',
    IN_TRANSIT: 'In Transit',
    SERVICE: 'In Service',
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
    NEW: 'bg-primary/10 text-primary',
    USED: 'bg-muted text-muted-foreground',
    CERTIFIED: 'bg-accent/10 text-accent',
  };

  const labels: Record<VehicleCondition, string> = {
    NEW: 'New',
    USED: 'Used',
    CERTIFIED: 'CPO',
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
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_TRANSIT', label: 'In Transit' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'SERVICE', label: 'In Service' },
];

const conditionFilters: { value: VehicleCondition | 'all'; label: string }[] = [
  { value: 'all', label: 'All Conditions' },
  { value: 'NEW', label: 'New' },
  { value: 'USED', label: 'Used' },
  { value: 'CERTIFIED', label: 'Certified Pre-Owned' },
];

/**
 * Modal modes
 */
type ModalMode = 'create' | 'edit' | 'view' | null;

/**
 * Stats summary component
 */
interface StatsSummaryProps {
  stats: { total: number; available: number; pending: number; total_value: number } | undefined;
  fallbackTotal: number;
}

function StatsSummary({ stats, fallbackTotal }: StatsSummaryProps): JSX.Element {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Total Vehicles</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{stats?.total || fallbackTotal}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Available</p>
          <p className="mt-1 text-2xl font-bold text-success">{stats?.available || 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="mt-1 text-2xl font-bold text-warning">{stats?.pending || 0}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground">Total Value</p>
          <p className="mt-1 text-2xl font-bold text-foreground">
            {formatCurrency(stats?.total_value || 0)}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Search bar component
 */
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

function SearchBar({ value, onChange }: SearchBarProps): JSX.Element {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search vehicles..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

/**
 * Filter dropdowns component
 */
interface FilterDropdownsProps {
  statusFilter: VehicleStatus | 'all';
  conditionFilter: VehicleCondition | 'all';
  onStatusChange: (value: VehicleStatus | 'all') => void;
  onConditionChange: (value: VehicleCondition | 'all') => void;
}

function FilterDropdowns({
  statusFilter,
  conditionFilter,
  onStatusChange,
  onConditionChange,
}: FilterDropdownsProps): JSX.Element {
  return (
    <>
      <select
        value={statusFilter}
        onChange={(e) => onStatusChange(e.target.value as VehicleStatus | 'all')}
        className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {statusFilters.map((filter) => (
          <option key={filter.value} value={filter.value}>
            {filter.label}
          </option>
        ))}
      </select>

      <select
        value={conditionFilter}
        onChange={(e) => onConditionChange(e.target.value as VehicleCondition | 'all')}
        className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {conditionFilters.map((filter) => (
          <option key={filter.value} value={filter.value}>
            {filter.label}
          </option>
        ))}
      </select>
    </>
  );
}

/**
 * View toggle component
 */
interface ViewToggleProps {
  viewMode: 'grid' | 'list';
  onViewModeChange: (mode: 'grid' | 'list') => void;
}

function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps): JSX.Element {
  return (
    <div className="flex items-center gap-1 rounded-lg border border-border p-1">
      <button
        onClick={() => onViewModeChange('grid')}
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
        onClick={() => onViewModeChange('list')}
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
  );
}

/**
 * Loading state component
 */
function LoadingState({ isLoading }: { isLoading: boolean }): JSX.Element | null {
  if (!isLoading) return null;
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

/**
 * Error state component
 */
function ErrorState({ error }: { error: Error | null }): JSX.Element | null {
  if (!error) return null;
  return (
    <div className="py-12 text-center">
      <p className="text-destructive">Failed to load inventory. Please try again.</p>
      <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </div>
  );
}

/**
 * Vehicle image placeholder component
 */
function VehicleImagePlaceholder(): JSX.Element {
  return (
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
  );
}

/**
 * Vehicle grid card component
 */
interface VehicleGridCardProps {
  vehicle: Vehicle;
  onView: () => void;
}

function VehicleGridCard({ vehicle, onView }: VehicleGridCardProps): JSX.Element {
  return (
    <Card hoverable className="overflow-hidden">
      {/* Vehicle image placeholder */}
      <div className="aspect-[16/10] bg-muted flex items-center justify-center">
        {vehicle.images && vehicle.images.length > 0 ? (
          <img
            src={vehicle.images[0]}
            alt={getVehicleName(vehicle)}
            className="w-full h-full object-cover"
          />
        ) : (
          <VehicleImagePlaceholder />
        )}
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ConditionBadge condition={vehicle.condition} />
              <StatusBadge status={vehicle.status} />
            </div>
            <h3 className="mt-2 font-semibold text-foreground">{getVehicleName(vehicle)}</h3>
            <p className="text-sm text-muted-foreground">{vehicle.exterior_color}</p>
          </div>
        </div>
        <div className="mt-3 space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">VIN</span>
            <span className="text-foreground font-mono text-xs">...{vehicle.vin.slice(-6)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Mileage</span>
            <span className="text-foreground">{vehicle.mileage.toLocaleString()} mi</span>
          </div>
          {vehicle.stock_number && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Stock #</span>
              <span className="text-foreground">{vehicle.stock_number}</span>
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <p className="text-lg font-bold text-foreground">{formatCurrency(vehicle.list_price)}</p>
          <Button variant="outline" size="sm" onClick={onView}>
            View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Vehicles grid view component
 */
interface VehiclesGridProps {
  show: boolean;
  vehicles: Vehicle[];
  onView: (vehicle: Vehicle) => void;
}

function VehiclesGrid({ show, vehicles, onView }: VehiclesGridProps): JSX.Element | null {
  if (!show) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {vehicles.map((vehicle) => (
        <VehicleGridCard key={vehicle.id} vehicle={vehicle} onView={() => onView(vehicle)} />
      ))}
    </div>
  );
}

/**
 * Action menu component
 */
interface ActionMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ActionMenu({
  isOpen,
  onToggle,
  onClose,
  onView,
  onEdit,
  onDelete,
}: ActionMenuProps): JSX.Element {
  return (
    <div className="relative flex justify-end">
      <button
        onClick={onToggle}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div className="absolute right-0 top-8 z-50 w-40 rounded-lg border border-border bg-popover p-1 shadow-lg animate-fade-in">
            <button
              onClick={onView}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              <Eye className="h-4 w-4" />
              View
            </button>
            <button
              onClick={onEdit}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-foreground hover:bg-muted"
            >
              <Edit className="h-4 w-4" />
              Edit
            </button>
            <button
              onClick={onDelete}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * Table header component
 */
function VehiclesTableHeader(): JSX.Element {
  return (
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
          Stock #
        </th>
        <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Actions
        </th>
      </tr>
    </thead>
  );
}

/**
 * Table row component
 */
interface VehicleTableRowProps {
  vehicle: Vehicle;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function VehicleTableRow({
  vehicle,
  isMenuOpen,
  onMenuToggle,
  onMenuClose,
  onView,
  onEdit,
  onDelete,
}: VehicleTableRowProps): JSX.Element {
  return (
    <tr className="transition-colors hover:bg-muted/30">
      <td className="px-4 py-4">
        <div>
          <p className="font-medium text-foreground">{getVehicleName(vehicle)}</p>
          <p className="text-sm text-muted-foreground">{vehicle.exterior_color}</p>
        </div>
      </td>
      <td className="px-4 py-4 font-mono text-xs text-muted-foreground">{vehicle.vin}</td>
      <td className="px-4 py-4">
        <ConditionBadge condition={vehicle.condition} />
      </td>
      <td className="px-4 py-4">
        <StatusBadge status={vehicle.status} />
      </td>
      <td className="px-4 py-4 text-foreground">{vehicle.mileage.toLocaleString()} mi</td>
      <td className="px-4 py-4 font-medium text-foreground">
        {formatCurrency(vehicle.list_price)}
      </td>
      <td className="px-4 py-4 text-muted-foreground">{vehicle.stock_number || '-'}</td>
      <td className="px-4 py-4">
        <ActionMenu
          isOpen={isMenuOpen}
          onToggle={onMenuToggle}
          onClose={onMenuClose}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      </td>
    </tr>
  );
}

/**
 * Vehicles list table component
 */
interface VehiclesTableProps {
  show: boolean;
  vehicles: Vehicle[];
  openMenuId: string | null;
  onMenuToggle: (id: string) => void;
  onMenuClose: () => void;
  onView: (vehicle: Vehicle) => void;
  onEdit: (vehicle: Vehicle) => void;
  onDelete: (vehicle: Vehicle) => void;
}

function VehiclesTable({
  show,
  vehicles,
  openMenuId,
  onMenuToggle,
  onMenuClose,
  onView,
  onEdit,
  onDelete,
}: VehiclesTableProps): JSX.Element | null {
  if (!show) return null;
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <VehiclesTableHeader />
            <tbody className="divide-y divide-border">
              {vehicles.map((vehicle) => (
                <VehicleTableRow
                  key={vehicle.id}
                  vehicle={vehicle}
                  isMenuOpen={openMenuId === vehicle.id}
                  onMenuToggle={() => onMenuToggle(vehicle.id)}
                  onMenuClose={onMenuClose}
                  onView={() => onView(vehicle)}
                  onEdit={() => onEdit(vehicle)}
                  onDelete={() => onDelete(vehicle)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Empty state component
 */
interface EmptyStateProps {
  show: boolean;
  onClearFilters: () => void;
}

function EmptyState({ show, onClearFilters }: EmptyStateProps): JSX.Element | null {
  if (!show) return null;
  return (
    <div className="py-12 text-center">
      <p className="text-muted-foreground">No vehicles found matching your criteria.</p>
      <Button variant="outline" className="mt-4" onClick={onClearFilters}>
        Clear filters
      </Button>
    </div>
  );
}

/**
 * Pagination component
 */
interface PaginationProps {
  show: boolean;
  currentCount: number;
  total: number;
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  itemLabel: string;
}

function Pagination({
  show,
  currentCount,
  total,
  page,
  totalPages,
  onPrevious,
  onNext,
  itemLabel,
}: PaginationProps): JSX.Element | null {
  if (!show) return null;
  return (
    <div className="mt-4 flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        Showing {currentCount} of {total} {itemLabel}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={onPrevious}>
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          Page {page} of {totalPages || 1}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={onNext}>
          Next
        </Button>
      </div>
    </div>
  );
}

/**
 * Vehicle details grid component
 */
interface VehicleDetailsGridProps {
  vehicle: Vehicle;
}

function VehicleDetailsGrid({ vehicle }: VehicleDetailsGridProps): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <p className="text-sm text-muted-foreground">VIN</p>
        <p className="font-mono text-sm">{vehicle.vin}</p>
      </div>
      {vehicle.stock_number && (
        <div>
          <p className="text-sm text-muted-foreground">Stock Number</p>
          <p className="font-medium">{vehicle.stock_number}</p>
        </div>
      )}
      <div>
        <p className="text-sm text-muted-foreground">Mileage</p>
        <p className="font-medium">{vehicle.mileage.toLocaleString()} mi</p>
      </div>
      {vehicle.interior_color && (
        <div>
          <p className="text-sm text-muted-foreground">Interior Color</p>
          <p className="font-medium">{vehicle.interior_color}</p>
        </div>
      )}
      {vehicle.msrp && (
        <div>
          <p className="text-sm text-muted-foreground">MSRP</p>
          <p className="font-medium">{formatCurrency(vehicle.msrp)}</p>
        </div>
      )}
      {vehicle.invoice_price && (
        <div>
          <p className="text-sm text-muted-foreground">Invoice Price</p>
          <p className="font-medium">{formatCurrency(vehicle.invoice_price)}</p>
        </div>
      )}
    </div>
  );
}

/**
 * Vehicle features list component
 */
interface VehicleFeaturesListProps {
  features: string[];
}

function VehicleFeaturesList({ features }: VehicleFeaturesListProps): JSX.Element {
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-2">Features</p>
      <div className="flex flex-wrap gap-2">
        {features.map((feature, index) => (
          <span
            key={index}
            className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
          >
            {feature}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * View modal content component
 */
interface ViewModalContentProps {
  vehicle: Vehicle;
  onClose: () => void;
  onEdit: () => void;
}

function ViewModalContent({ vehicle, onClose, onEdit }: ViewModalContentProps): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Vehicle header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold">{getVehicleName(vehicle)}</h3>
          <p className="text-muted-foreground">{vehicle.exterior_color}</p>
          <div className="mt-2 flex items-center gap-2">
            <ConditionBadge condition={vehicle.condition} />
            <StatusBadge status={vehicle.status} />
          </div>
        </div>
        <p className="text-2xl font-bold">{formatCurrency(vehicle.list_price)}</p>
      </div>

      {/* Details */}
      <VehicleDetailsGrid vehicle={vehicle} />

      {/* Features */}
      {vehicle.features && vehicle.features.length > 0 && (
        <VehicleFeaturesList features={vehicle.features} />
      )}

      {/* Notes */}
      {vehicle.notes && (
        <div>
          <p className="text-sm text-muted-foreground">Notes</p>
          <p className="mt-1 text-foreground">{vehicle.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={onEdit}>Edit Vehicle</Button>
      </div>
    </div>
  );
}

/**
 * Convert Vehicle to form data for editing
 */
function getInitialFormData(vehicle: Vehicle): Partial<VehicleFormData> {
  return {
    vin: vehicle.vin,
    year: vehicle.year,
    make: vehicle.make,
    model: vehicle.model,
    trim: vehicle.trim,
    exteriorColor: vehicle.exterior_color,
    interiorColor: vehicle.interior_color,
    mileage: vehicle.mileage,
    condition: vehicle.condition,
    status: vehicle.status,
    stockNumber: vehicle.stock_number,
    msrp: vehicle.msrp,
    listPrice: vehicle.list_price,
    invoicePrice: vehicle.invoice_price,
    features: vehicle.features?.join(', '),
    notes: vehicle.notes,
  };
}

export function InventoryPage(): JSX.Element {
  const toast = useToast();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | 'all'>('all');
  const [conditionFilter, setConditionFilter] = useState<VehicleCondition | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(1);
  const limit = 12;

  // UI state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  // Data fetching - compute params outside
  const statusParam = statusFilter !== 'all' ? statusFilter : undefined;
  const conditionParam = conditionFilter !== 'all' ? conditionFilter : undefined;
  const searchParam = searchQuery ? searchQuery : undefined;
  const {
    data: vehiclesData,
    isLoading,
    error,
  } = useVehicles({
    page,
    limit,
    status: statusParam,
    condition: conditionParam,
    search: searchParam,
  });

  const { data: stats } = useInventoryStats();

  // Mutations
  const createVehicle = useCreateVehicle();
  const updateVehicle = useUpdateVehicle();
  const deleteVehicle = useDeleteVehicle();

  const vehicles = vehiclesData?.vehicles || [];
  const total = vehiclesData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Modal handlers
  const openCreateModal = () => {
    setSelectedVehicle(null);
    setModalMode('create');
  };
  const openEditModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setModalMode('edit');
    setOpenMenuId(null);
  };
  const openViewModal = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setModalMode('view');
    setOpenMenuId(null);
  };
  const openDeleteDialog = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);
    setDeleteConfirmOpen(true);
    setOpenMenuId(null);
  };
  const closeModal = () => {
    setModalMode(null);
    setSelectedVehicle(null);
  };

  // Form handlers
  const handleSubmit = async (data: VehicleFormData) => {
    const isEdit = modalMode === 'edit' && selectedVehicle;
    try {
      if (isEdit) {
        await updateVehicle.mutateAsync({ id: selectedVehicle.id, data });
        toast.success('Vehicle updated', 'The vehicle has been updated successfully.');
      } else {
        await createVehicle.mutateAsync(data);
        toast.success('Vehicle added', 'The new vehicle has been added successfully.');
      }
      closeModal();
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const handleConfirmDelete = async () => {
    if (!vehicleToDelete) return;
    try {
      await deleteVehicle.mutateAsync(vehicleToDelete.id);
      toast.success('Vehicle deleted', 'The vehicle has been deleted successfully.');
      setDeleteConfirmOpen(false);
      setVehicleToDelete(null);
    } catch (err) {
      toast.error('Error', err instanceof Error ? err.message : 'Failed to delete vehicle');
    }
  };

  // Filter handlers
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };
  const handleStatusFilterChange = (value: VehicleStatus | 'all') => {
    setStatusFilter(value);
    setPage(1);
  };
  const handleConditionFilterChange = (value: VehicleCondition | 'all') => {
    setConditionFilter(value);
    setPage(1);
  };
  const handleClearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setConditionFilter('all');
    setPage(1);
  };

  // Menu handlers
  const toggleMenu = (id: string) => setOpenMenuId(openMenuId === id ? null : id);
  const closeMenu = () => setOpenMenuId(null);

  // Pagination handlers
  const goToPrevPage = () => setPage((p) => Math.max(1, p - 1));
  const goToNextPage = () => setPage((p) => p + 1);

  // Delete dialog handlers
  const closeDeleteDialog = () => {
    setDeleteConfirmOpen(false);
    setVehicleToDelete(null);
  };
  const switchToEditMode = () => setModalMode('edit');

  // Computed values
  const showContent = !isLoading && !error;
  const isGridMode = viewMode === 'grid';
  const showGridView = showContent && isGridMode;
  const showListView = showContent && !isGridMode;
  const showEmptyState = showContent && vehicles.length === 0;
  const isFormModalOpen = modalMode === 'create' || modalMode === 'edit';
  const isViewModalOpen = modalMode === 'view';
  const isCreateMode = modalMode === 'create';
  const formModalTitle = isCreateMode ? 'Add New Vehicle' : 'Edit Vehicle';
  const formModalDescription = isCreateMode
    ? 'Enter the vehicle details.'
    : 'Update the vehicle information.';
  const formInitialData = selectedVehicle ? getInitialFormData(selectedVehicle) : undefined;
  const isFormLoading = createVehicle.isPending || updateVehicle.isPending;
  const deleteConfirmMessage = vehicleToDelete
    ? `Are you sure you want to delete ${getVehicleName(vehicleToDelete)}? This action cannot be undone.`
    : 'Are you sure you want to delete this vehicle? This action cannot be undone.';

  return (
    <MainLayout>
      <PageHeader
        title="Inventory"
        subtitle="Manage your vehicle inventory and track stock levels."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Inventory' }]}
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            Add Vehicle
          </Button>
        }
      />

      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        {/* Stats summary */}
        <StatsSummary stats={stats} fallbackTotal={total} />

        {/* Filters bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <SearchBar value={searchQuery} onChange={handleSearchChange} />
            <FilterDropdowns
              statusFilter={statusFilter}
              conditionFilter={conditionFilter}
              onStatusChange={handleStatusFilterChange}
              onConditionChange={handleConditionFilterChange}
            />
          </div>
          <ViewToggle viewMode={viewMode} onViewModeChange={setViewMode} />
        </div>

        <LoadingState isLoading={isLoading} />
        <ErrorState error={error} />

        {/* Inventory display - Grid View */}
        <VehiclesGrid show={showGridView} vehicles={vehicles} onView={openViewModal} />

        {/* Inventory display - List View */}
        <VehiclesTable
          show={showListView}
          vehicles={vehicles}
          openMenuId={openMenuId}
          onMenuToggle={toggleMenu}
          onMenuClose={closeMenu}
          onView={openViewModal}
          onEdit={openEditModal}
          onDelete={openDeleteDialog}
        />

        {/* Empty state */}
        <EmptyState show={showEmptyState} onClearFilters={handleClearFilters} />

        {/* Pagination */}
        <Pagination
          show={showContent}
          currentCount={vehicles.length}
          total={total}
          page={page}
          totalPages={totalPages}
          onPrevious={goToPrevPage}
          onNext={goToNextPage}
          itemLabel="vehicles"
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={closeModal}
        title={formModalTitle}
        description={formModalDescription}
        size="xl"
      >
        <VehicleForm
          initialData={formInitialData}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          isLoading={isFormLoading}
        />
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewModalOpen} onClose={closeModal} title="Vehicle Details" size="lg">
        {selectedVehicle && (
          <ViewModalContent
            vehicle={selectedVehicle}
            onClose={closeModal}
            onEdit={switchToEditMode}
          />
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
        title="Delete Vehicle"
        message={deleteConfirmMessage}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteVehicle.isPending}
      />
    </MainLayout>
  );
}
