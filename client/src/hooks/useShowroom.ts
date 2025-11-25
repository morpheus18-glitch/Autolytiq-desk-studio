/**
 * Showroom Hooks
 *
 * React Query hooks for showroom visit CRUD operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, queryKeys } from '@/lib/api';
import type {
  Visit,
  VisitsResponse,
  VisitFilter,
  CreateVisitRequest,
  UpdateVisitRequest,
  VisitStatus,
  Timer,
  Note,
  VisitEvent,
  WorkflowConfig,
  TimerType,
  CreateNoteRequest,
  UpdateNoteRequest,
} from '@/types/showroom';

/**
 * List visits with optional filters
 */
export function useVisits(filters: VisitFilter = {}) {
  const queryParams = new URLSearchParams();

  if (filters.status) queryParams.set('status', filters.status);
  if (filters.active_only) queryParams.set('active_only', 'true');
  if (filters.date_from) queryParams.set('date_from', filters.date_from);
  if (filters.date_to) queryParams.set('date_to', filters.date_to);
  if (filters.limit) queryParams.set('limit', String(filters.limit));
  if (filters.offset) queryParams.set('offset', String(filters.offset));

  const queryString = queryParams.toString();
  const endpoint = queryString ? `/showroom/visits?${queryString}` : '/showroom/visits';

  return useQuery({
    queryKey: queryKeys.showroom.visits.list({ ...filters }),
    queryFn: () => api.get<VisitsResponse>(endpoint),
    refetchInterval: 30000, // Refetch every 30 seconds as backup to WebSocket
  });
}

/**
 * Get active visits only (shorthand)
 */
export function useActiveVisits() {
  return useVisits({ active_only: true, limit: 100 });
}

/**
 * Get single visit by ID
 */
export function useVisit(id: string) {
  return useQuery({
    queryKey: queryKeys.showroom.visits.detail(id),
    queryFn: () => api.get<Visit>(`/showroom/visits/${id}`),
    enabled: !!id,
  });
}

/**
 * Create a new visit (check-in)
 */
export function useCreateVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateVisitRequest) => api.post<Visit>('/showroom/visits', data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.all(),
      });
    },
  });
}

/**
 * Update visit details
 */
export function useUpdateVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateVisitRequest }) =>
      api.patch<Visit>(`/showroom/visits/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.detail(id),
      });
    },
  });
}

/**
 * Change visit status
 */
export function useChangeVisitStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: VisitStatus }) =>
      api.post<Visit>(`/showroom/visits/${id}/status`, { status }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.detail(id),
      });
    },
  });
}

/**
 * Attach vehicle to visit
 */
export function useAttachVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      visitId,
      vehicleId,
      stockNumber,
    }: {
      visitId: string;
      vehicleId: string;
      stockNumber?: string;
    }) =>
      api.post<Visit>(`/showroom/visits/${visitId}/vehicle`, {
        vehicle_id: vehicleId,
        stock_number: stockNumber,
      }),
    onSuccess: (_, { visitId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.detail(visitId),
      });
    },
  });
}

/**
 * Close visit (won or lost)
 */
export function useCloseVisit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'CLOSED_WON' | 'CLOSED_LOST' }) =>
      api.post<Visit>(`/showroom/visits/${id}/close`, { status }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.detail(id),
      });
    },
  });
}

/**
 * Timer hooks
 */
export function useVisitTimers(visitId: string) {
  return useQuery({
    queryKey: [...queryKeys.showroom.visits.detail(visitId), 'timers'],
    queryFn: () => api.get<Timer[]>(`/showroom/visits/${visitId}/timers`),
    enabled: !!visitId,
  });
}

export function useStartTimer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ visitId, timerType }: { visitId: string; timerType: TimerType }) =>
      api.post<Timer>(`/showroom/visits/${visitId}/timers`, {
        timer_type: timerType,
      }),
    onSuccess: (_, { visitId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.detail(visitId),
      });
    },
  });
}

export function useStopTimer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ visitId, timerId }: { visitId: string; timerId: string }) =>
      api.post<Timer>(`/showroom/visits/${visitId}/timers/${timerId}/stop`),
    onSuccess: (_, { visitId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.detail(visitId),
      });
    },
  });
}

/**
 * Note hooks
 */
export function useVisitNotes(visitId: string) {
  return useQuery({
    queryKey: [...queryKeys.showroom.visits.detail(visitId), 'notes'],
    queryFn: () => api.get<Note[]>(`/showroom/visits/${visitId}/notes`),
    enabled: !!visitId,
  });
}

export function useCreateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ visitId, data }: { visitId: string; data: CreateNoteRequest }) =>
      api.post<Note>(`/showroom/visits/${visitId}/notes`, data),
    onSuccess: (_, { visitId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.detail(visitId),
      });
    },
  });
}

export function useUpdateNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      visitId,
      noteId,
      data,
    }: {
      visitId: string;
      noteId: string;
      data: UpdateNoteRequest;
    }) => api.patch<Note>(`/showroom/visits/${visitId}/notes/${noteId}`, data),
    onSuccess: (_, { visitId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.detail(visitId),
      });
    },
  });
}

export function useDeleteNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ visitId, noteId }: { visitId: string; noteId: string }) =>
      api.delete(`/showroom/visits/${visitId}/notes/${noteId}`),
    onSuccess: (_, { visitId }) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.all(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.visits.detail(visitId),
      });
    },
  });
}

/**
 * Events (audit trail)
 */
export function useVisitEvents(visitId: string) {
  return useQuery({
    queryKey: [...queryKeys.showroom.visits.detail(visitId), 'events'],
    queryFn: () => api.get<VisitEvent[]>(`/showroom/visits/${visitId}/events`),
    enabled: !!visitId,
  });
}

/**
 * Workflow configuration
 */
export function useWorkflowConfig() {
  return useQuery({
    queryKey: queryKeys.showroom.workflowConfig(),
    queryFn: () => api.get<WorkflowConfig>('/showroom/workflow-config'),
  });
}

export function useUpdateWorkflowConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (config: Partial<WorkflowConfig>) =>
      api.put<WorkflowConfig>('/showroom/workflow-config', config),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.showroom.workflowConfig(),
      });
    },
  });
}
