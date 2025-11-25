/**
 * Users Hook
 *
 * React Query hooks for user management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface User {
  id: string;
  dealership_id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'MANAGER' | 'SALESPERSON' | 'FINANCE' | 'SERVICE';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface UsersResponse {
  users: User[];
  total: number;
}

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: () => api.get<UsersResponse>('/v1/users'),
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { first_name: string; last_name: string; email: string }) =>
      api.put('/v1/users/me', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      api.post('/v1/auth/change-password', data),
  });
}
