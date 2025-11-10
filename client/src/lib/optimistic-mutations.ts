import { useMutation, UseMutationOptions, QueryClient } from '@tanstack/react-query';
import { nanoid } from 'nanoid';
import { queryClient } from './queryClient';

export function generateTempId(): string {
  return `temp-${nanoid(12)}`;
}

export function isOptimistic(id: string): boolean {
  return id.startsWith('temp-');
}

interface OptimisticCreateOptions<TData, TVariables> {
  queryKey: any[];
  queryClient?: QueryClient;
  updateCache: (old: any, variables: TVariables, tempId: string) => any;
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}

export function useOptimisticCreate<TData, TVariables>({
  queryKey,
  queryClient: client = queryClient,
  updateCache,
  mutationFn,
  onSuccess,
  onError,
}: OptimisticCreateOptions<TData, TVariables>) {
  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await client.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousData = client.getQueryData(queryKey);

      // Generate temporary ID
      const tempId = generateTempId();

      // Optimistically update cache
      client.setQueryData(queryKey, (old: any) => updateCache(old, variables, tempId));

      // Return context with snapshot
      return { previousData, tempId };
    },
    onError: (error: any, variables, context) => {
      // Rollback to previous state
      if (context?.previousData) {
        client.setQueryData(queryKey, context.previousData);
      }
      onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      // Invalidate to replace temp data with real server data
      client.invalidateQueries({ queryKey });
      onSuccess?.(data, variables);
    },
  });
}

interface OptimisticUpdateOptions<TData, TVariables> {
  queryKey: any[];
  queryClient?: QueryClient;
  updateCache: (old: any, variables: TVariables) => any;
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}

export function useOptimisticUpdate<TData, TVariables>({
  queryKey,
  queryClient: client = queryClient,
  updateCache,
  mutationFn,
  onSuccess,
  onError,
}: OptimisticUpdateOptions<TData, TVariables>) {
  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      await client.cancelQueries({ queryKey });
      const previousData = client.getQueryData(queryKey);
      client.setQueryData(queryKey, (old: any) => updateCache(old, variables));
      return { previousData };
    },
    onError: (error: any, variables, context) => {
      if (context?.previousData) {
        client.setQueryData(queryKey, context.previousData);
      }
      onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      client.invalidateQueries({ queryKey });
      onSuccess?.(data, variables);
    },
  });
}

interface OptimisticDeleteOptions<TData, TVariables> {
  queryKey: any[];
  queryClient?: QueryClient;
  updateCache: (old: any, variables: TVariables) => any;
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}

export function useOptimisticDelete<TData, TVariables>({
  queryKey,
  queryClient: client = queryClient,
  updateCache,
  mutationFn,
  onSuccess,
  onError,
}: OptimisticDeleteOptions<TData, TVariables>) {
  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      await client.cancelQueries({ queryKey });
      const previousData = client.getQueryData(queryKey);
      client.setQueryData(queryKey, (old: any) => updateCache(old, variables));
      return { previousData };
    },
    onError: (error: any, variables, context) => {
      if (context?.previousData) {
        client.setQueryData(queryKey, context.previousData);
      }
      onError?.(error, variables);
    },
    onSuccess: (data, variables) => {
      client.invalidateQueries({ queryKey });
      onSuccess?.(data, variables);
    },
  });
}
