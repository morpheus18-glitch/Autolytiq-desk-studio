/**
 * STANDARD QUERY PATTERNS
 * ========================
 *
 * This file documents standard patterns for React Query hooks.
 * Follow these patterns when creating new data fetching hooks.
 *
 * Quick Reference:
 * - useQuery for fetching data (GET requests)
 * - useMutation for creating/updating/deleting (POST/PUT/DELETE)
 * - Always use apiRequest for HTTP calls
 * - Always invalidate related queries after mutations
 * - Always show toast notifications for mutations
 */

import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import { apiRequest, queryClient } from './queryClient';
import { useToast } from '@/hooks/use-toast';

// =============================================================================
// PATTERN 1: Simple GET Request
// =============================================================================

/**
 * Example: Fetch a list of items
 *
 * @example
 * ```tsx
 * export function useDeals() {
 *   return useQuery({
 *     queryKey: ['/api/deals'],
 *     // queryFn is set globally in queryClient
 *   });
 * }
 *
 * // Usage in component:
 * const { data: deals, isLoading, error } = useDeals();
 *
 * if (isLoading) return <LoadingState />;
 * if (error) return <ErrorState message={error.message} />;
 * return <DealsList deals={deals} />;
 * ```
 */

// =============================================================================
// PATTERN 2: GET Request with Parameters
// =============================================================================

/**
 * Example: Fetch a single item by ID
 *
 * @example
 * ```tsx
 * export function useDeal(dealId: string) {
 *   return useQuery({
 *     queryKey: ['/api/deals', dealId],
 *     queryFn: async () => {
 *       return await apiRequest<Deal>('GET', `/api/deals/${dealId}`);
 *     },
 *     enabled: !!dealId, // Only run query if dealId exists
 *   });
 * }
 *
 * // Usage in component:
 * const { data: deal } = useDeal(dealId);
 * ```
 */

// =============================================================================
// PATTERN 3: POST Request (Create)
// =============================================================================

/**
 * Example: Create a new item
 *
 * @example
 * ```tsx
 * export function useCreateDeal() {
 *   const { toast } = useToast();
 *
 *   return useMutation({
 *     mutationFn: async (data: CreateDealInput) => {
 *       return await apiRequest<Deal>('POST', '/api/deals', data);
 *     },
 *     onSuccess: (newDeal) => {
 *       // Invalidate and refetch deals list
 *       queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
 *
 *       // Show success message
 *       toast({
 *         title: 'Deal created',
 *         description: `Deal #${newDeal.dealNumber} has been created.`,
 *       });
 *     },
 *     onError: (error: Error) => {
 *       toast({
 *         variant: 'destructive',
 *         title: 'Failed to create deal',
 *         description: error.message,
 *       });
 *     },
 *   });
 * }
 *
 * // Usage in component:
 * const createDeal = useCreateDeal();
 *
 * const handleSubmit = (data: CreateDealInput) => {
 *   createDeal.mutate(data);
 * };
 *
 * return (
 *   <LoadingButton
 *     onClick={() => handleSubmit(formData)}
 *     isLoading={createDeal.isPending}
 *   >
 *     Create Deal
 *   </LoadingButton>
 * );
 * ```
 */

// =============================================================================
// PATTERN 4: PUT Request (Update)
// =============================================================================

/**
 * Example: Update an existing item
 *
 * @example
 * ```tsx
 * export function useUpdateDeal() {
 *   const { toast } = useToast();
 *
 *   return useMutation({
 *     mutationFn: async ({ id, data }: { id: string; data: UpdateDealInput }) => {
 *       return await apiRequest<Deal>('PUT', `/api/deals/${id}`, data);
 *     },
 *     onSuccess: (updatedDeal, variables) => {
 *       // Invalidate specific deal
 *       queryClient.invalidateQueries({ queryKey: ['/api/deals', variables.id] });
 *
 *       // Invalidate deals list
 *       queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
 *
 *       toast({
 *         title: 'Deal updated',
 *         description: 'Your changes have been saved.',
 *       });
 *     },
 *     onError: (error: Error) => {
 *       toast({
 *         variant: 'destructive',
 *         title: 'Failed to update deal',
 *         description: error.message,
 *       });
 *     },
 *   });
 * }
 *
 * // Usage in component:
 * const updateDeal = useUpdateDeal();
 *
 * const handleSubmit = (data: UpdateDealInput) => {
 *   updateDeal.mutate({ id: dealId, data });
 * };
 * ```
 */

// =============================================================================
// PATTERN 5: DELETE Request
// =============================================================================

/**
 * Example: Delete an item
 *
 * @example
 * ```tsx
 * export function useDeleteDeal() {
 *   const { toast } = useToast();
 *
 *   return useMutation({
 *     mutationFn: async (dealId: string) => {
 *       return await apiRequest('DELETE', `/api/deals/${dealId}`);
 *     },
 *     onSuccess: (_, dealId) => {
 *       // Remove from cache immediately
 *       queryClient.setQueryData(['/api/deals'], (old: Deal[] = []) => {
 *         return old.filter(deal => deal.id !== dealId);
 *       });
 *
 *       // Invalidate to refetch
 *       queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
 *
 *       toast({
 *         title: 'Deal deleted',
 *         description: 'The deal has been permanently deleted.',
 *       });
 *     },
 *     onError: (error: Error) => {
 *       toast({
 *         variant: 'destructive',
 *         title: 'Failed to delete deal',
 *         description: error.message,
 *       });
 *     },
 *   });
 * }
 *
 * // Usage with confirmation:
 * const deleteDeal = useDeleteDeal();
 * const confirm = useConfirmDialog();
 *
 * const handleDelete = (dealId: string) => {
 *   confirm.open({
 *     title: 'Delete Deal',
 *     description: 'Are you sure? This action cannot be undone.',
 *     confirmVariant: 'destructive',
 *     confirmText: 'Delete',
 *     onConfirm: () => {
 *       deleteDeal.mutate(dealId, {
 *         onSuccess: () => confirm.close(),
 *       });
 *     },
 *   });
 * };
 * ```
 */

// =============================================================================
// PATTERN 6: Optimistic Updates
// =============================================================================

/**
 * Example: Optimistic update for better UX
 *
 * @example
 * ```tsx
 * export function useToggleDealState() {
 *   const { toast } = useToast();
 *
 *   return useMutation({
 *     mutationFn: async ({ id, state }: { id: string; state: DealState }) => {
 *       return await apiRequest<Deal>('PATCH', `/api/deals/${id}/state`, { state });
 *     },
 *     onMutate: async (variables) => {
 *       // Cancel outgoing refetches
 *       await queryClient.cancelQueries({ queryKey: ['/api/deals'] });
 *
 *       // Snapshot previous value
 *       const previousDeals = queryClient.getQueryData(['/api/deals']);
 *
 *       // Optimistically update cache
 *       queryClient.setQueryData(['/api/deals'], (old: Deal[] = []) => {
 *         return old.map(deal =>
 *           deal.id === variables.id
 *             ? { ...deal, dealState: variables.state }
 *             : deal
 *         );
 *       });
 *
 *       // Return context for rollback
 *       return { previousDeals };
 *     },
 *     onError: (error, variables, context) => {
 *       // Rollback on error
 *       if (context?.previousDeals) {
 *         queryClient.setQueryData(['/api/deals'], context.previousDeals);
 *       }
 *
 *       toast({
 *         variant: 'destructive',
 *         title: 'Failed to update deal state',
 *         description: error.message,
 *       });
 *     },
 *     onSettled: () => {
 *       // Always refetch after mutation
 *       queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
 *     },
 *   });
 * }
 * ```
 */

// =============================================================================
// PATTERN 7: Dependent Queries
// =============================================================================

/**
 * Example: Query that depends on another query
 *
 * @example
 * ```tsx
 * export function useDealWithScenarios(dealId: string) {
 *   // First fetch the deal
 *   const { data: deal } = useQuery({
 *     queryKey: ['/api/deals', dealId],
 *     enabled: !!dealId,
 *   });
 *
 *   // Then fetch scenarios (only when deal exists)
 *   const { data: scenarios } = useQuery({
 *     queryKey: ['/api/deals', dealId, 'scenarios'],
 *     queryFn: async () => {
 *       return await apiRequest<Scenario[]>('GET', `/api/deals/${dealId}/scenarios`);
 *     },
 *     enabled: !!deal, // Only run when deal is loaded
 *   });
 *
 *   return { deal, scenarios };
 * }
 * ```
 */

// =============================================================================
// PATTERN 8: Infinite Queries (Pagination)
// =============================================================================

/**
 * Example: Infinite scroll/load more
 *
 * @example
 * ```tsx
 * import { useInfiniteQuery } from '@tanstack/react-query';
 *
 * export function useInfiniteDeals() {
 *   return useInfiniteQuery({
 *     queryKey: ['/api/deals', 'infinite'],
 *     queryFn: async ({ pageParam = 0 }) => {
 *       return await apiRequest<{ deals: Deal[]; nextCursor: number | null }>(
 *         'GET',
 *         `/api/deals?cursor=${pageParam}`
 *       );
 *     },
 *     initialPageParam: 0,
 *     getNextPageParam: (lastPage) => lastPage.nextCursor,
 *   });
 * }
 *
 * // Usage in component:
 * const {
 *   data,
 *   fetchNextPage,
 *   hasNextPage,
 *   isFetchingNextPage,
 * } = useInfiniteDeals();
 *
 * const allDeals = data?.pages.flatMap(page => page.deals) ?? [];
 * ```
 */

// =============================================================================
// BEST PRACTICES SUMMARY
// =============================================================================

/**
 * ✅ DO:
 * - Use consistent query keys: ['/api/resource', id]
 * - Always invalidate related queries after mutations
 * - Show toast notifications for all mutations
 * - Handle loading and error states
 * - Use optimistic updates for better UX
 * - Type your API responses
 *
 * ❌ DON'T:
 * - Mix fetch/axios with apiRequest
 * - Forget to invalidate queries after mutations
 * - Skip error handling
 * - Hard-code API URLs (use `/api/` prefix)
 * - Use query client outside of hooks
 */

// Export helper for type-safe query creation
export type QueryKey = readonly unknown[];

export function createQueryKey(...parts: unknown[]): QueryKey {
  return parts;
}
