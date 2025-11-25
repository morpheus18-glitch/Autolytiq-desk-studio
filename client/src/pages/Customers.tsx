/**
 * Customers Page
 *
 * Manage customer database and profiles with real API integration.
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
  Loader2,
} from 'lucide-react';
import { MainLayout } from '@/layouts';
import { PageHeader, Card, CardContent, Button } from '@design-system';
import { Modal, ConfirmDialog, useToast } from '@/components/ui';
import { CustomerForm, type CustomerFormData } from '@/components/forms/CustomerForm';
import {
  useCustomers,
  useCreateCustomer,
  useUpdateCustomer,
  useDeleteCustomer,
  getCustomerName,
  type Customer,
} from '@/hooks/useCustomers';
import { formatDate, getInitials } from '@/lib/utils';

/**
 * Source filter options
 */
const sourceFilters = [
  { value: 'all', label: 'All Sources' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'WALK_IN', label: 'Walk-In' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'OTHER', label: 'Other' },
];

const sourceLabels: Record<string, string> = {
  WEBSITE: 'Website',
  WALK_IN: 'Walk-In',
  REFERRAL: 'Referral',
  PHONE: 'Phone',
  OTHER: 'Other',
};

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
 * Source filter dropdown component
 */
interface SourceFilterProps {
  value: string;
  onChange: (value: string) => void;
}

function SourceFilter({ value, onChange }: SourceFilterProps): JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <Filter className="h-4 w-4 text-muted-foreground" />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {sourceFilters.map((source) => (
          <option key={source.value} value={source.value}>
            {source.label}
          </option>
        ))}
      </select>
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
      <p className="text-destructive">Failed to load customers. Please try again.</p>
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
              View Profile
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
function CustomersTableHeader(): JSX.Element {
  return (
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
  );
}

/**
 * Customer location cell component
 */
function CustomerLocation({ address }: { address: Customer['address'] }): JSX.Element {
  if (address?.city && address?.state) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        {address.city}, {address.state}
      </div>
    );
  }
  return <span className="text-sm text-muted-foreground">-</span>;
}

/**
 * Customer source badge component
 */
function CustomerSourceBadge({ source }: { source: string | null | undefined }): JSX.Element {
  if (source) {
    return (
      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
        {sourceLabels[source] || source}
      </span>
    );
  }
  return <span className="text-sm text-muted-foreground">-</span>;
}

/**
 * Table row component
 */
interface CustomerTableRowProps {
  customer: Customer;
  isMenuOpen: boolean;
  onMenuToggle: () => void;
  onMenuClose: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function CustomerTableRow({
  customer,
  isMenuOpen,
  onMenuToggle,
  onMenuClose,
  onView,
  onEdit,
  onDelete,
}: CustomerTableRowProps): JSX.Element {
  const customerName = getCustomerName(customer);

  return (
    <tr className="transition-colors hover:bg-muted/30">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
            {getInitials(customerName)}
          </div>
          <div>
            <p className="font-medium text-foreground">{customerName}</p>
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
        <CustomerLocation address={customer.address} />
      </td>
      <td className="px-4 py-4">
        <CustomerSourceBadge source={customer.source} />
      </td>
      <td className="px-4 py-4 text-foreground">{customer.total_deals || 0}</td>
      <td className="px-4 py-4 text-muted-foreground">{formatDate(customer.created_at)}</td>
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
 * Empty state component
 */
interface EmptyStateProps {
  onClearFilters: () => void;
}

function EmptyState({ onClearFilters }: EmptyStateProps): JSX.Element {
  return (
    <div className="py-12 text-center">
      <p className="text-muted-foreground">No customers found matching your criteria.</p>
      <Button variant="outline" className="mt-4" onClick={onClearFilters}>
        Clear filters
      </Button>
    </div>
  );
}

/**
 * Customers list table component
 */
interface CustomersTableProps {
  customers: Customer[];
  openMenuId: string | null;
  onMenuToggle: (id: string) => void;
  onMenuClose: () => void;
  onView: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (customer: Customer) => void;
  onClearFilters: () => void;
}

function CustomersTable({
  customers,
  openMenuId,
  onMenuToggle,
  onMenuClose,
  onView,
  onEdit,
  onDelete,
  onClearFilters,
}: CustomersTableProps): JSX.Element {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <CustomersTableHeader />
            <tbody className="divide-y divide-border">
              {customers.map((customer) => (
                <CustomerTableRow
                  key={customer.id}
                  customer={customer}
                  isMenuOpen={openMenuId === customer.id}
                  onMenuToggle={() => onMenuToggle(customer.id)}
                  onMenuClose={onMenuClose}
                  onView={() => onView(customer)}
                  onEdit={() => onEdit(customer)}
                  onDelete={() => onDelete(customer)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {customers.length === 0 && <EmptyState onClearFilters={onClearFilters} />}
      </CardContent>
    </Card>
  );
}

/**
 * Customer grid card component
 */
interface CustomerGridCardProps {
  customer: Customer;
  onView: () => void;
}

function CustomerGridCard({ customer, onView }: CustomerGridCardProps): JSX.Element {
  const customerName = getCustomerName(customer);

  return (
    <Card hoverable>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-medium text-primary">
              {getInitials(customerName)}
            </div>
            <div>
              <p className="font-medium text-foreground">{customerName}</p>
              <span className="text-xs text-muted-foreground">
                {customer.source ? sourceLabels[customer.source] : 'Unknown'}
              </span>
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
          {customer.address?.city && customer.address?.state && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {customer.address.city}, {customer.address.state}
            </div>
          )}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
          <span className="text-sm text-muted-foreground">{customer.total_deals || 0} deals</span>
          <Button variant="ghost" size="sm" onClick={onView}>
            View Profile
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Customers grid view component
 */
interface CustomersGridProps {
  customers: Customer[];
  onView: (customer: Customer) => void;
}

function CustomersGrid({ customers, onView }: CustomersGridProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {customers.map((customer) => (
        <CustomerGridCard key={customer.id} customer={customer} onView={() => onView(customer)} />
      ))}
    </div>
  );
}

/**
 * Pagination component
 */
interface PaginationProps {
  currentCount: number;
  total: number;
  page: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
  itemLabel: string;
}

function Pagination({
  currentCount,
  total,
  page,
  totalPages,
  onPrevious,
  onNext,
  itemLabel,
}: PaginationProps): JSX.Element {
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
  customer: Customer;
  onClose: () => void;
  onEdit: () => void;
}

function ViewModalContent({ customer, onClose, onEdit }: ViewModalContentProps): JSX.Element {
  const customerName = getCustomerName(customer);

  return (
    <div className="space-y-6">
      {/* Customer header */}
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-medium text-primary">
          {getInitials(customerName)}
        </div>
        <div>
          <h3 className="text-lg font-semibold">{customerName}</h3>
          {customer.source && (
            <span className="text-sm text-muted-foreground">
              Source: {sourceLabels[customer.source] || customer.source}
            </span>
          )}
        </div>
      </div>

      {/* Contact info */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Email</p>
          <p className="font-medium">{customer.email}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Phone</p>
          <p className="font-medium">{customer.phone}</p>
        </div>
      </div>

      {/* Address */}
      {customer.address && (
        <div>
          <p className="text-sm text-muted-foreground">Address</p>
          <p className="font-medium">
            {customer.address.street && `${customer.address.street}, `}
            {customer.address.city && `${customer.address.city}, `}
            {customer.address.state} {customer.address.zip_code}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Total Deals</p>
          <p className="font-medium">{customer.total_deals || 0}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Total Spent</p>
          <p className="font-medium">
            {customer.total_spent ? `$${customer.total_spent.toLocaleString()}` : '$0'}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Customer Since</p>
          <p className="font-medium">{formatDate(customer.created_at)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Last Updated</p>
          <p className="font-medium">{formatDate(customer.updated_at)}</p>
        </div>
      </div>

      {/* Notes */}
      {customer.notes && (
        <div>
          <p className="text-sm text-muted-foreground">Notes</p>
          <p className="mt-1 text-foreground">{customer.notes}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={onEdit}>Edit Customer</Button>
      </div>
    </div>
  );
}

export function CustomersPage(): JSX.Element {
  const toast = useToast();

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  // UI state
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);

  // View mode for switching between grid/list display (grid mode available for future use)
  const [viewMode] = useState<'grid' | 'list'>('list');

  // Data fetching
  const {
    data: customersData,
    isLoading,
    error,
  } = useCustomers({
    page,
    limit,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
    search: searchQuery || undefined,
  });

  // Mutations
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();

  const customers = customersData?.customers || [];
  const total = customersData?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Handlers
  const handleOpenCreate = () => {
    setSelectedCustomer(null);
    setModalMode('create');
  };

  const handleOpenEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setModalMode('edit');
    setOpenMenuId(null);
  };

  const handleOpenView = (customer: Customer) => {
    setSelectedCustomer(customer);
    setModalMode('view');
    setOpenMenuId(null);
  };

  const handleOpenDelete = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteConfirmOpen(true);
    setOpenMenuId(null);
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedCustomer(null);
  };

  const handleSubmit = async (data: CustomerFormData) => {
    try {
      if (modalMode === 'edit' && selectedCustomer) {
        await updateCustomer.mutateAsync({ id: selectedCustomer.id, data });
        toast.success('Customer updated', 'The customer has been updated successfully.');
      } else {
        await createCustomer.mutateAsync(data);
        toast.success('Customer added', 'The new customer has been added successfully.');
      }
      handleCloseModal();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      toast.error('Error', message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;

    try {
      await deleteCustomer.mutateAsync(customerToDelete.id);
      toast.success('Customer deleted', 'The customer has been deleted successfully.');
      setDeleteConfirmOpen(false);
      setCustomerToDelete(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete customer';
      toast.error('Error', message);
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleSourceFilterChange = (value: string) => {
    setSourceFilter(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setSourceFilter('all');
    setPage(1);
  };

  const handleMenuToggle = (id: string) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleMenuClose = () => {
    setOpenMenuId(null);
  };

  // Convert Customer to form data for editing
  const getInitialFormData = (customer: Customer): Partial<CustomerFormData> => ({
    firstName: customer.first_name,
    lastName: customer.last_name,
    email: customer.email,
    phone: customer.phone,
    address: customer.address
      ? {
          street: customer.address.street,
          city: customer.address.city,
          state: customer.address.state,
          zipCode: customer.address.zip_code,
        }
      : undefined,
    source: customer.source,
    notes: customer.notes,
  });

  const showContent = !isLoading && !error;

  return (
    <MainLayout>
      <PageHeader
        title="Customers"
        subtitle="Manage your customer database and build lasting relationships."
        breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Customers' }]}
        actions={
          <Button icon={<Plus className="h-4 w-4" />} onClick={handleOpenCreate}>
            Add Customer
          </Button>
        }
      />

      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        {/* Filters bar */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <SearchBar
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search customers..."
          />
          <SourceFilter value={sourceFilter} onChange={handleSourceFilterChange} />
        </div>

        <LoadingState isLoading={isLoading} />
        <ErrorState error={error} />

        {/* Customers list view */}
        {showContent && viewMode === 'list' && (
          <CustomersTable
            customers={customers}
            openMenuId={openMenuId}
            onMenuToggle={handleMenuToggle}
            onMenuClose={handleMenuClose}
            onView={handleOpenView}
            onEdit={handleOpenEdit}
            onDelete={handleOpenDelete}
            onClearFilters={handleClearFilters}
          />
        )}

        {/* Grid view (if needed in future) */}
        {showContent && viewMode === 'grid' && (
          <CustomersGrid customers={customers} onView={handleOpenView} />
        )}

        {/* Pagination */}
        {showContent && (
          <Pagination
            currentCount={customers.length}
            total={total}
            page={page}
            totalPages={totalPages}
            onPrevious={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => p + 1)}
            itemLabel="customers"
          />
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalMode === 'create' || modalMode === 'edit'}
        onClose={handleCloseModal}
        title={modalMode === 'create' ? 'Add New Customer' : 'Edit Customer'}
        description={
          modalMode === 'create'
            ? 'Enter the customer details.'
            : 'Update the customer information.'
        }
        size="lg"
      >
        <CustomerForm
          initialData={selectedCustomer ? getInitialFormData(selectedCustomer) : undefined}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal}
          isLoading={createCustomer.isPending || updateCustomer.isPending}
        />
      </Modal>

      {/* View Modal */}
      <Modal
        isOpen={modalMode === 'view'}
        onClose={handleCloseModal}
        title="Customer Profile"
        size="lg"
      >
        {selectedCustomer && (
          <ViewModalContent
            customer={selectedCustomer}
            onClose={handleCloseModal}
            onEdit={() => setModalMode('edit')}
          />
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setCustomerToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        title="Delete Customer"
        message={`Are you sure you want to delete ${customerToDelete ? getCustomerName(customerToDelete) : 'this customer'}? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={deleteCustomer.isPending}
      />
    </MainLayout>
  );
}
