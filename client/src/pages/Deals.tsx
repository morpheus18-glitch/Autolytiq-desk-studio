/**
 * Deals Page
 *
 * Manage sales deals and track deal progress with real API integration.
 */

import { useState, type JSX } from 'react';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  ChevronDown,
  Eye,
  Edit,
  Trash2,
  Loader2,
} from 'lucide-react';
import { MainLayout } from '@/layouts';
import { PageHeader, Card, CardContent, Button } from '@design-system';
import { Modal, ConfirmDialog, useToast } from '@/components/ui';
import { DealForm, type DealFormData } from '@/components/forms/DealForm';
import { useDeals, useCreateDeal, useUpdateDeal, useDeleteDeal, type Deal } from '@/hooks/useDeals';
import { useCustomers, getCustomerName } from '@/hooks/useCustomers';
import { useVehicles, getVehicleName } from '@/hooks/useInventory';
import { useUsers } from '@/hooks/useUsers';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

/**
 * Deal status configuration
 */
type DealStatus = 'PENDING' | 'IN_PROGRESS' | 'APPROVED' | 'COMPLETED' | 'CANCELLED';

const dealStatuses: { value: DealStatus | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'All Deals', color: '' },
  { value: 'PENDING', label: 'Pending', color: 'bg-muted text-muted-foreground' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'bg-info/10 text-info' },
  { value: 'APPROVED', label: 'Approved', color: 'bg-warning/10 text-warning' },
  { value: 'COMPLETED', label: 'Completed', color: 'bg-success/10 text-success' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-destructive/10 text-destructive' },
];

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: string }): JSX.Element {
  const config = dealStatuses.find((s) => s.value === status) || dealStatuses[1];

  return (
    <span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', config.color)}>
      {config.label}
    </span>
  );
}

/**
 * Modal modes
 */
type ModalMode = 'create' | 'edit' | 'view' | null;

/**
 * Search bar component
 */
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

function SearchBar({ value, onChange, placeholder }: SearchBarProps): JSX.Element {
  return (
    <div className="relative w-full sm:w-80">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      />
    </div>
  );
}

/**
 * Filter buttons component
 */
interface FilterButtonsProps {
  activeFilter: DealStatus | 'all';
  onFilterChange: (filter: DealStatus | 'all') => void;
}

function FilterButtons({ activeFilter, onFilterChange }: FilterButtonsProps): JSX.Element {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
      <Filter className="h-4 w-4 text-muted-foreground" />
      {dealStatuses.slice(0, 5).map((status) => (
        <button
          key={status.value}
          onClick={() => onFilterChange(status.value)}
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
      <p className="text-destructive">Failed to load deals. Please try again.</p>
      <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </div>
  );
}

/**
 * Action menu component
 */
interface ActionMenuProps {
  dealId: string;
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
function DealsTableHeader(): JSX.Element {
  return (
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
  );
}

/**
 * Table row component
 */
interface DealTableRowProps {
  deal: Deal;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function DealTableRow({
  deal,
  isMenuOpen,
  onMenuToggle,
  onMenuClose,
  onView,
  onEdit,
  onDelete,
}: DealTableRowProps): JSX.Element {
  return (
    <tr className="transition-colors hover:bg-muted/30">
      <td className="px-4 py-4">
        <div>
          <p className="font-medium text-foreground">{deal.customer_name}</p>
          <p className="text-sm text-muted-foreground capitalize">{deal.type.toLowerCase()}</p>
        </div>
      </td>
      <td className="px-4 py-4">
        <p className="text-foreground">{deal.vehicle_name}</p>
      </td>
      <td className="px-4 py-4 text-foreground">{deal.salesperson_name || '-'}</td>
      <td className="px-4 py-4">
        <StatusBadge status={deal.status} />
      </td>
      <td className="px-4 py-4 font-medium text-foreground">{formatCurrency(deal.sale_price)}</td>
      <td className="px-4 py-4 text-muted-foreground">{formatDate(deal.updated_at)}</td>
      <td className="px-4 py-4">
        <ActionMenu
          dealId={deal.id}
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
 * Empty state component
 */
interface EmptyStateProps {
  onClearFilters: () => void;
}

function EmptyState({ onClearFilters }: EmptyStateProps): JSX.Element {
  return (
    <div className="py-12 text-center">
      <p className="text-muted-foreground">No deals found matching your criteria.</p>
      <Button variant="outline" className="mt-4" onClick={onClearFilters}>
        Clear filters
      </Button>
    </div>
  );
}

/**
 * Data table component
 */
interface DealsTableProps {
  show: boolean;
  deals: Deal[];
  openMenuId: string | null;
  onMenuToggle: (id: string) => void;
  onMenuClose: () => void;
  onView: (deal: Deal) => void;
  onEdit: (deal: Deal) => void;
  onDelete: (deal: Deal) => void;
  onClearFilters: () => void;
}

function DealsTable({
  show,
  deals,
  openMenuId,
  onMenuToggle,
  onMenuClose,
  onView,
  onEdit,
  onDelete,
  onClearFilters,
}: DealsTableProps): JSX.Element | null {
  if (!show) return null;
  const isEmpty = deals.length === 0;
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <DealsTableHeader />
            <tbody className="divide-y divide-border">
              {deals.map((deal) => (
                <DealTableRow
                  key={deal.id}
                  deal={deal}
                  isMenuOpen={openMenuId === deal.id}
                  onMenuToggle={() => onMenuToggle(deal.id)}
                  onMenuClose={onMenuClose}
                  onView={() => onView(deal)}
                  onEdit={() => onEdit(deal)}
                  onDelete={() => onDelete(deal)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {isEmpty && <EmptyState onClearFilters={onClearFilters} />}
      </CardContent>
    </Card>
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
 * View modal content component
 */
interface ViewModalContentProps {
  deal: Deal;
  onClose: () => void;
  onEdit: () => void;
}

function ViewModalContent({ deal, onClose, onEdit }: ViewModalContentProps): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Customer</p>
          <p className="font-medium">{deal.customer_name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Vehicle</p>
          <p className="font-medium">{deal.vehicle_name}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Type</p>
          <p className="font-medium capitalize">{deal.type.toLowerCase()}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Status</p>
          <StatusBadge status={deal.status} />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Sale Price</p>
          <p className="font-medium">{formatCurrency(deal.sale_price)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Salesperson</p>
          <p className="font-medium">{deal.salesperson_name || 'Not assigned'}</p>
        </div>
        {deal.trade_in_value && (
          <div>
            <p className="text-sm text-muted-foreground">Trade-In Value</p>
            <p className="font-medium">{formatCurrency(deal.trade_in_value)}</p>
          </div>
        )}
        {deal.down_payment && (
          <div>
            <p className="text-sm text-muted-foreground">Down Payment</p>
            <p className="font-medium">{formatCurrency(deal.down_payment)}</p>
          </div>
        )}
        {deal.financing_term && (
          <div>
            <p className="text-sm text-muted-foreground">Financing Term</p>
            <p className="font-medium">{deal.financing_term} months</p>
          </div>
        )}
        {deal.interest_rate && (
          <div>
            <p className="text-sm text-muted-foreground">Interest Rate</p>
            <p className="font-medium">{deal.interest_rate}%</p>
          </div>
        )}
        <div>
          <p className="text-sm text-muted-foreground">Created</p>
          <p className="font-medium">{formatDate(deal.created_at)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Last Updated</p>
          <p className="font-medium">{formatDate(deal.updated_at)}</p>
        </div>
      </div>
      {deal.notes && (
        <div>
          <p className="text-sm text-muted-foreground">Notes</p>
          <p className="mt-1 text-foreground">{deal.notes}</p>
        </div>
      )}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={onEdit}>Edit Deal</Button>
      </div>
    </div>
  );
}

/**
 * Helper to check if a user can be a salesperson
 */
function canBeSalesperson(role: string): boolean {
  return role === 'SALESPERSON' || role === 'MANAGER';
}

/**
 * Helper to extract error message
 */
function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof Error ? err.message : fallback;
}

/**
 * Helper to toggle menu - returns new state
 */
function toggleMenuState(currentId: string | null, targetId: string): string | null {
  return currentId === targetId ? null : targetId;
}

/**
 * Helper to compute modal title based on create mode
 */
function computeModalTitle(isCreateMode: boolean): string {
  return isCreateMode ? 'Create New Deal' : 'Edit Deal';
}

/**
 * Helper to compute modal description based on create mode
 */
function computeModalDescription(isCreateMode: boolean): string {
  return isCreateMode ? 'Enter the details for the new deal.' : 'Update the deal information.';
}

/**
 * Convert Deal to form data for editing
 */
function getInitialFormData(deal: Deal): Partial<DealFormData> {
  return {
    customerId: deal.customer_id,
    vehicleId: deal.vehicle_id,
    type: deal.type,
    status: deal.status,
    salePrice: deal.sale_price,
    tradeInValue: deal.trade_in_value,
    tradeInVehicle: deal.trade_in_vehicle,
    downPayment: deal.down_payment,
    financingTerm: deal.financing_term,
    interestRate: deal.interest_rate,
    salespersonId: deal.salesperson_id,
    notes: deal.notes,
  };
}

export function DealsPage(): JSX.Element {
  const toast = useToast();

  // Filter state
  const [activeFilter, setActiveFilter] = useState<DealStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // UI state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<Deal | null>(null);

  // Data fetching
  const statusParam = activeFilter === 'all' ? undefined : activeFilter;
  const searchParam = searchQuery || undefined;
  const {
    data: dealsData,
    isLoading,
    error,
  } = useDeals({ page, limit, status: statusParam, search: searchParam });

  const { data: customersData } = useCustomers({ limit: 100 });
  const { data: vehiclesData } = useVehicles({ limit: 100 });
  const { data: usersData } = useUsers();

  // Mutations
  const createDeal = useCreateDeal();
  const updateDeal = useUpdateDeal();
  const deleteDeal = useDeleteDeal();

  const deals = dealsData?.deals ?? [];
  const total = dealsData?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // Prepare options for the form
  const customerOptions = (customersData?.customers ?? []).map((c) => ({
    id: c.id,
    name: getCustomerName(c),
  }));
  const vehicleOptions = (vehiclesData?.vehicles ?? []).map((v) => ({
    id: v.id,
    name: getVehicleName(v),
  }));
  const salespersonOptions = (usersData?.users ?? [])
    .filter((u) => canBeSalesperson(u.role))
    .map((u) => ({ id: u.id, name: u.name }));

  // Modal handlers
  const openCreateModal = () => {
    setSelectedDeal(null);
    setModalMode('create');
  };
  const openEditModal = (deal: Deal) => {
    setSelectedDeal(deal);
    setModalMode('edit');
    setOpenMenuId(null);
  };
  const openViewModal = (deal: Deal) => {
    setSelectedDeal(deal);
    setModalMode('view');
    setOpenMenuId(null);
  };
  const openDeleteDialog = (deal: Deal) => {
    setDealToDelete(deal);
    setDeleteConfirmOpen(true);
    setOpenMenuId(null);
  };
  const closeModal = () => {
    setModalMode(null);
    setSelectedDeal(null);
  };

  // Form handlers
  const handleSubmit = async (data: DealFormData) => {
    const isEdit = modalMode === 'edit' && selectedDeal;
    try {
      if (isEdit) {
        await updateDeal.mutateAsync({ id: selectedDeal.id, data });
        toast.success('Deal updated', 'The deal has been updated successfully.');
      } else {
        await createDeal.mutateAsync(data);
        toast.success('Deal created', 'The new deal has been created successfully.');
      }
      closeModal();
    } catch (err) {
      toast.error('Error', getErrorMessage(err, 'An error occurred'));
    }
  };

  const handleConfirmDelete = async () => {
    if (!dealToDelete) return;
    try {
      await deleteDeal.mutateAsync(dealToDelete.id);
      toast.success('Deal deleted', 'The deal has been deleted successfully.');
      setDeleteConfirmOpen(false);
      setDealToDelete(null);
    } catch (err) {
      toast.error('Error', getErrorMessage(err, 'Failed to delete deal'));
    }
  };

  // Filter handlers
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };
  const handleFilterChange = (filter: DealStatus | 'all') => {
    setActiveFilter(filter);
    setPage(1);
  };
  const handleClearFilters = () => {
    setActiveFilter('all');
    setSearchQuery('');
    setPage(1);
  };

  // Menu handlers
  const toggleMenu = (id: string) => setOpenMenuId(toggleMenuState(openMenuId, id));
  const closeMenu = () => setOpenMenuId(null);

  // Pagination handlers
  const goToPrevPage = () => setPage((p) => Math.max(1, p - 1));
  const goToNextPage = () => setPage((p) => p + 1);
  const switchToEditMode = () => setModalMode('edit');

  // Delete dialog handlers
  const closeDeleteDialog = () => {
    setDeleteConfirmOpen(false);
    setDealToDelete(null);
  };
  const deleteConfirmMessage = `Are you sure you want to delete the deal for ${dealToDelete?.customer_name}? This action cannot be undone.`;

  // Computed values
  const showTable = !isLoading && !error;
  const isFormModalOpen = modalMode === 'create' || modalMode === 'edit';
  const isViewModalOpen = modalMode === 'view';
  const isCreateMode = modalMode === 'create';
  const modalTitle = computeModalTitle(isCreateMode);
  const modalDescription = computeModalDescription(isCreateMode);
  const formInitialData = selectedDeal ? getInitialFormData(selectedDeal) : undefined;
  const isFormLoading = createDeal.isPending || updateDeal.isPending;

  return (
    <MainLayout>
      <PageHeader
        title="Deals"
        subtitle="Manage your sales deals and track progress through the pipeline."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Deals' }]}
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={openCreateModal}>
            New Deal
          </Button>
        }
      />

      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        {/* Filters bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search deals..."
          />
          <FilterButtons activeFilter={activeFilter} onFilterChange={handleFilterChange} />
        </div>

        <LoadingState isLoading={isLoading} />
        <ErrorState error={error} />

        <DealsTable
          show={showTable}
          deals={deals}
          openMenuId={openMenuId}
          onMenuToggle={toggleMenu}
          onMenuClose={closeMenu}
          onView={openViewModal}
          onEdit={openEditModal}
          onDelete={openDeleteDialog}
          onClearFilters={handleClearFilters}
        />

        <Pagination
          show={showTable}
          currentCount={deals.length}
          total={total}
          page={page}
          totalPages={totalPages}
          onPrevious={goToPrevPage}
          onNext={goToNextPage}
          itemLabel="deals"
        />
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={closeModal}
        title={modalTitle}
        description={modalDescription}
        size="xl"
      >
        <DealForm
          initialData={formInitialData}
          onSubmit={handleSubmit}
          onCancel={closeModal}
          isLoading={isFormLoading}
          customers={customerOptions}
          vehicles={vehicleOptions}
          salespeople={salespersonOptions}
        />
      </Modal>

      {/* View Modal */}
      <Modal isOpen={isViewModalOpen} onClose={closeModal} title="Deal Details" size="lg">
        {selectedDeal && (
          <ViewModalContent deal={selectedDeal} onClose={closeModal} onEdit={switchToEditMode} />
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
        title="Delete Deal"
        message={deleteConfirmMessage}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteDeal.isPending}
      />
    </MainLayout>
  );
}
