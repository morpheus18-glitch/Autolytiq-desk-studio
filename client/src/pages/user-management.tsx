import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Users, Plus, Mail, Shield, User as UserIcon } from 'lucide-react';
import { PageLayout } from '@/components/page-layout';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type User = {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: 'admin' | 'finance_manager' | 'sales_manager' | 'salesperson';
  mfaEnabled: boolean;
  isActive: boolean;
};

type CreateUserData = {
  username: string;
  email: string;
  fullName: string;
  password: string;
  role: string;
};

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

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [formData, setFormData] = useState<CreateUserData>({
    username: '',
    email: '',
    fullName: '',
    password: '',
    role: 'salesperson',
  });

  // Fetch users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['/api/users'],
    enabled: !!currentUser,
  });

  // Create user mutation (will need backend endpoint)
  const createUserMutation = useMutation({
    mutationFn: async (data: CreateUserData) => {
      const res = await apiRequest('POST', '/api/admin/users', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      toast({
        title: 'User created',
        description: 'New user has been created successfully',
      });
      setShowCreateDialog(false);
      setFormData({
        username: '',
        email: '',
        fullName: '',
        password: '',
        role: 'salesperson',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create user',
        description: error.message,
      });
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    createUserMutation.mutate(formData);
  };

  // Check if current user is admin
  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <PageLayout
        title="User Management"
        description="Access Denied"
      >
        <Card>
          <CardContent className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">Administrator Access Required</h3>
            <p className="text-muted-foreground">
              You need administrator privileges to manage users.
            </p>
          </CardContent>
        </Card>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="User Management"
      description="Manage dealership users, roles, and permissions"
    >
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold">Users ({users.length})</h2>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="gap-2"
            data-testid="button-create-user"
          >
            <Plus className="w-4 h-4" />
            Create User
          </Button>
        </div>

        {/* Users List */}
        {isLoading ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
              <p className="text-muted-foreground">Loading users...</p>
            </CardContent>
          </Card>
        ) : users.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-muted-foreground">No users found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {users.map((user) => (
              <Card key={user.id} data-testid={`user-card-${user.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <UserIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-base">{user.fullName}</h3>
                            <Badge variant={roleColors[user.role]}>
                              {roleLabels[user.role]}
                            </Badge>
                            {user.mfaEnabled && (
                              <Badge variant="outline" className="gap-1">
                                <Shield className="w-3 h-3" />
                                2FA
                              </Badge>
                            )}
                            {user.id === currentUser?.id && (
                              <Badge variant="secondary">You</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <UserIcon className="w-3.5 h-3.5" />
                              <span className="font-mono">{user.username}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Mail className="w-3.5 h-3.5" />
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent data-testid="dialog-create-user">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to your dealership with specific role and permissions
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateUser}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name *</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Doe"
                  required
                  data-testid="input-fullname"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="johndoe"
                  required
                  data-testid="input-username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@example.com"
                  required
                  data-testid="input-email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Temporary Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Enter temporary password"
                  required
                  data-testid="input-password"
                />
                <p className="text-xs text-muted-foreground">
                  User will be prompted to change this on first login
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => setFormData({ ...formData, role: value })}
                >
                  <SelectTrigger id="role" data-testid="select-role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="salesperson">Salesperson</SelectItem>
                    <SelectItem value="sales_manager">Sales Manager</SelectItem>
                    <SelectItem value="finance_manager">Finance Manager</SelectItem>
                    <SelectItem value="admin">Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
                disabled={createUserMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createUserMutation.isPending}
                data-testid="button-submit-create-user"
              >
                {createUserMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create User'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
