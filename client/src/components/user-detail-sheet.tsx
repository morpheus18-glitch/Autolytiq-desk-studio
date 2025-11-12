import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Save, Shield, Mail, User as UserIcon } from 'lucide-react';

type User = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'admin' | 'finance_manager' | 'sales_manager' | 'salesperson';
  mfaEnabled: boolean;
  isActive: boolean;
};

interface UserDetailSheetProps {
  user: User | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const roleLabels: Record<string, string> = {
  admin: 'Administrator',
  finance_manager: 'Finance Manager',
  sales_manager: 'Sales Manager',
  salesperson: 'Salesperson',
};

const roleColors: Record<string, 'default' | 'secondary' | 'destructive'> = {
  admin: 'destructive',
  finance_manager: 'default',
  sales_manager: 'default',
  salesperson: 'secondary',
};

const userUpdateSchema = z.object({
  fullName: z.string().min(1, 'Full name is required'),
  email: z.string().email('Valid email is required'),
  role: z.enum(['admin', 'finance_manager', 'sales_manager', 'salesperson']),
  isActive: z.boolean(),
});

type UserUpdateData = z.infer<typeof userUpdateSchema>;

export function UserDetailSheet({ user, open, onOpenChange }: UserDetailSheetProps) {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const form = useForm<UserUpdateData>({
    resolver: zodResolver(userUpdateSchema),
    defaultValues: {
      fullName: '',
      email: '',
      role: 'salesperson',
      isActive: true,
    },
  });

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      form.reset({
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      });
    }
  }, [user, form]);

  // Determine permissions
  const isAdmin = currentUser?.role === 'admin';
  const isSalesManager = currentUser?.role === 'sales_manager';
  const canEditRole = isAdmin; // Only admins can edit roles
  const canEditStatus = isAdmin; // Only admins can activate/deactivate
  const canEditContactInfo = isAdmin || isSalesManager; // Admins and sales managers can edit contact info
  const canEdit = canEditContactInfo; // Overall edit permission

  // Update user mutation
  const updateUserMutation = useMutation({
    mutationFn: async (data: UserUpdateData) => {
      if (!user) throw new Error('No user selected');
      const res = await apiRequest('PATCH', `/api/admin/users/${user.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'User updated',
        description: 'User details have been updated successfully',
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to update user',
        description: error.message,
      });
    },
  });

  const handleSubmit = (data: UserUpdateData) => {
    // Strip fields based on permissions to prevent client tampering
    const sanitizedData: Partial<UserUpdateData> = {};
    
    if (canEditContactInfo) {
      sanitizedData.fullName = data.fullName;
      sanitizedData.email = data.email;
    }
    
    if (canEditRole) {
      sanitizedData.role = data.role;
    }
    
    if (canEditStatus) {
      sanitizedData.isActive = data.isActive;
    }
    
    updateUserMutation.mutate(sanitizedData as UserUpdateData);
  };

  if (!user) return null;

  const isSelf = currentUser?.id === user.id;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto" data-testid="sheet-user-detail">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                {user.fullName}
                {isSelf && <Badge variant="secondary">You</Badge>}
              </div>
              <div className="text-sm font-normal text-muted-foreground">@{user.username}</div>
            </div>
          </SheetTitle>
          <SheetDescription>
            {canEdit ? 'View and edit user details and permissions' : 'View user details (read-only)'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Status Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant={roleColors[user.role]}>
              {roleLabels[user.role]}
            </Badge>
            {user.mfaEnabled && (
              <Badge variant="outline" className="gap-1">
                <Shield className="w-3 h-3" />
                2FA Enabled
              </Badge>
            )}
            {user.isActive ? (
              <Badge variant="default" className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                Active
              </Badge>
            ) : (
              <Badge variant="destructive">
                Inactive
              </Badge>
            )}
          </div>

          <Separator />

          {/* Edit Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              {/* Full Name */}
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        disabled={!canEditContactInfo || updateUserMutation.isPending}
                        data-testid="input-edit-fullname"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          {...field}
                          type="email"
                          className="pl-9"
                          disabled={!canEditContactInfo || updateUserMutation.isPending}
                          data-testid="input-edit-email"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Role */}
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!canEditRole || updateUserMutation.isPending}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-role">
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="salesperson">Salesperson</SelectItem>
                        <SelectItem value="sales_manager">Sales Manager</SelectItem>
                        <SelectItem value="finance_manager">Finance Manager</SelectItem>
                        <SelectItem value="admin">Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                    {!canEditRole && (
                      <FormDescription>
                        Only administrators can change user roles
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Active Status */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">
                        Account Status
                      </FormLabel>
                      <FormDescription>
                        {field.value ? 'User can access the system' : 'User is deactivated'}
                      </FormDescription>
                      {!canEditStatus && (
                        <FormDescription className="text-xs text-muted-foreground">
                          Only administrators can change account status
                        </FormDescription>
                      )}
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        disabled={!canEditStatus || updateUserMutation.isPending}
                        data-testid="switch-edit-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {/* Submit Button */}
              {canEdit && (
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    disabled={updateUserMutation.isPending}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateUserMutation.isPending || !form.formState.isDirty}
                    className="flex-1 gap-2"
                    data-testid="button-save-user"
                  >
                    {updateUserMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </div>
              )}
            </form>
          </Form>

          {!canEdit && (
            <div className="text-sm text-muted-foreground text-center p-4 bg-muted/30 rounded-lg">
              You don't have permission to edit this user's details
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
