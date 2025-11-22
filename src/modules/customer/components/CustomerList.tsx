/**
 * CUSTOMER LIST COMPONENT
 * Displays paginated list of customers with search and filters
 */

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { CustomerCard } from './CustomerCard';
import { useCustomerList } from '../hooks/useCustomerList';
import { Search, Filter } from 'lucide-react';
import type { CustomerListQuery } from '../types/customer.types';

interface CustomerListProps {
  onCustomerClick?: (customerId: string) => void;
  filters?: Partial<CustomerListQuery>;
}

export function CustomerList({ onCustomerClick, filters = {} }: CustomerListProps) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string | undefined>(filters.status);
  const [page, setPage] = useState(1);

  const query: Partial<CustomerListQuery> = {
    ...filters,
    search,
    status: status as 'lead' | 'prospect' | 'qualified' | 'active' | 'sold' | 'lost' | 'inactive' | 'archived' | undefined,
    page,
    limit: 20,
  };

  const { data, isLoading, error } = useCustomerList(query);

  if (error) {
    return (
      <Card className="p-6">
        <div className="text-center text-red-600">
          Error loading customers: {error.message}
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers by name, email, or phone..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1); // Reset to first page on search
              }}
              className="pl-10"
            />
          </div>

          <Select value={status} onValueChange={(value) => {
            setStatus(value === 'all' ? undefined : value);
            setPage(1);
          }}>
            <SelectTrigger className="w-[180px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="lead">Lead</SelectItem>
              <SelectItem value="prospect">Prospect</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Customer List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="p-6">
              <div className="flex items-start gap-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-3 w-[150px]" />
                  <Skeleton className="h-3 w-[180px]" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : data && data.customers.length > 0 ? (
        <>
          <div className="space-y-3">
            {data.customers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onClick={() => onCustomerClick?.(customer.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {(page - 1) * data.limit + 1} to{' '}
                  {Math.min(page * data.limit, data.total)} of {data.total} customers
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, data.totalPages) }, (_, i) => {
                      const pageNum = i + 1;
                      return (
                        <Button
                          key={pageNum}
                          variant={page === pageNum ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={page === data.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </>
      ) : (
        <Card className="p-12">
          <div className="text-center text-muted-foreground">
            <p className="text-lg font-medium">No customers found</p>
            <p className="text-sm mt-1">
              {search
                ? 'Try adjusting your search or filters'
                : 'Get started by adding your first customer'}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
