import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import type { DealWithRelations } from '@shared/schema';

const DEAL_STATE_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted text-muted-foreground',
  IN_PROGRESS: 'bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
  APPROVED: 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400',
  CANCELLED: 'bg-destructive/10 text-destructive',
};

export default function DealsList() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  
  // Build query params for pagination and filtering
  const queryParams = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
    ...(searchQuery && { search: searchQuery }),
    ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
  });
  
  const { data, isLoading } = useQuery<{
    deals: DealWithRelations[];
    total: number;
    pages: number;
  }>({
    queryKey: [`/api/deals?${queryParams.toString()}`],
  });
  
  const deals = data?.deals || [];
  const totalPages = data?.pages || 1;
  
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">Deals</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Manage and track all automotive deals
              </p>
            </div>
            <Link href="/deals/new">
              <Button size="lg" className="gap-2" data-testid="button-create-deal">
                <Plus className="w-4 h-4" />
                Create New Deal
              </Button>
            </Link>
          </div>
          
          {/* Filters */}
          <div className="flex gap-4 mt-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by deal #, customer, or vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search-deals"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      {/* Deals Table */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto p-8">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="font-semibold">Deal #</TableHead>
                  <TableHead className="font-semibold">Customer</TableHead>
                  <TableHead className="font-semibold">Vehicle</TableHead>
                  <TableHead className="font-semibold">Salesperson</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Created</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={7}>
                        <div className="h-12 bg-muted/20 animate-pulse rounded" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : deals.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-64 text-center">
                      <div className="flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                          <Filter className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div>
                          <h3 className="text-lg font-medium">No deals found</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {searchQuery || statusFilter !== 'all'
                              ? 'Try adjusting your filters'
                              : 'Get started by creating your first deal'}
                          </p>
                        </div>
                        {!searchQuery && statusFilter === 'all' && (
                          <Link href="/deals/new">
                            <Button data-testid="button-create-first-deal">
                              <Plus className="w-4 h-4 mr-2" />
                              Create Deal
                            </Button>
                          </Link>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  deals.map((deal) => (
                    <TableRow 
                      key={deal.id} 
                      className="hover-elevate cursor-pointer"
                      data-testid={`row-deal-${deal.id}`}
                    >
                      <TableCell className="font-mono font-medium">
                        {deal.dealNumber}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {deal.customer.firstName} {deal.customer.lastName}
                          </div>
                          {deal.customer.email && (
                            <div className="text-xs text-muted-foreground">
                              {deal.customer.email}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {deal.vehicle.year} {deal.vehicle.make} {deal.vehicle.model}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            Stock #{deal.vehicle.stockNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{deal.salesperson.fullName}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="secondary" 
                          className={DEAL_STATE_COLORS[deal.dealState] || ''}
                        >
                          {deal.dealState.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(deal.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href={`/deals/${deal.id}`}>
                          <Button variant="ghost" size="sm" data-testid={`button-view-${deal.id}`}>
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
          
          {/* Pagination */}
          {!isLoading && deals.length > 0 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-muted-foreground">
                Showing page {page} of {totalPages} ({data?.total || 0} total deals)
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  data-testid="button-next-page"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
