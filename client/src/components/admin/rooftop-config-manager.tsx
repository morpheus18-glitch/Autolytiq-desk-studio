/**
 * Rooftop Configuration Manager
 *
 * Admin UI for managing multi-location dealer rooftop configurations.
 * Allows configuration of tax perspectives, allowed registration states,
 * drive-out provisions, and state-specific overrides.
 */

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2,
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Star,
  CheckCircle2,
  AlertCircle,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getAllStates } from '@shared/tax-data';

interface RooftopConfig {
  id: string;
  rooftopId: string;
  name: string;
  dealerStateCode: string;
  address?: string;
  city?: string;
  zipCode?: string;
  defaultTaxPerspective: 'DEALER_STATE' | 'BUYER_STATE' | 'REGISTRATION_STATE';
  allowedRegistrationStates: string[];
  driveOutEnabled: boolean;
  driveOutStates?: string[];
  isActive: boolean;
  isPrimary: boolean;
  notes?: string;
}

export function RooftopConfigManager() {
  const queryClient = useQueryClient();
  const [selectedRooftop, setSelectedRooftop] = useState<RooftopConfig | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch rooftops
  const { data: rooftops, isLoading } = useQuery({
    queryKey: ['/api/rooftops'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create rooftop mutation
  const createMutation = useMutation({
    mutationFn: async (data: Partial<RooftopConfig>) => {
      const response = await apiRequest('POST', '/api/rooftops', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooftops'] });
      setIsDialogOpen(false);
      setSelectedRooftop(null);
    },
  });

  // Update rooftop mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RooftopConfig> }) => {
      const response = await apiRequest('PUT', `/api/rooftops/${id}`, data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooftops'] });
      setIsDialogOpen(false);
      setSelectedRooftop(null);
    },
  });

  // Delete rooftop mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('DELETE', `/api/rooftops/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooftops'] });
    },
  });

  // Set primary mutation
  const setPrimaryMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest('POST', `/api/rooftops/${id}/set-primary`);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooftops'] });
    },
  });

  const handleCreateNew = () => {
    setSelectedRooftop({
      id: '',
      rooftopId: '',
      name: '',
      dealerStateCode: '',
      defaultTaxPerspective: 'DEALER_STATE',
      allowedRegistrationStates: [],
      driveOutEnabled: false,
      driveOutStates: [],
      isActive: true,
      isPrimary: false,
    });
    setIsEditing(false);
    setIsDialogOpen(true);
  };

  const handleEdit = (rooftop: RooftopConfig) => {
    setSelectedRooftop(rooftop);
    setIsEditing(true);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this rooftop?')) {
      await deleteMutation.mutateAsync(id);
    }
  };

  const handleSave = async () => {
    if (!selectedRooftop) return;

    if (isEditing) {
      await updateMutation.mutateAsync({
        id: selectedRooftop.id,
        data: selectedRooftop,
      });
    } else {
      await createMutation.mutateAsync(selectedRooftop);
    }
  };

  const allStates = getAllStates();

  if (isLoading) {
    return <div>Loading rooftops...</div>;
  }

  const rooftopList = rooftops?.data || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rooftop Configurations</h2>
          <p className="text-muted-foreground">
            Manage multi-location dealer tax perspectives and settings
          </p>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Add Rooftop
        </Button>
      </div>

      {/* Rooftop List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rooftopList.map((rooftop: RooftopConfig) => (
          <Card key={rooftop.id} className={cn(!rooftop.isActive && 'opacity-60')}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-muted-foreground" />
                  <CardTitle className="text-lg">{rooftop.name}</CardTitle>
                </div>
                {rooftop.isPrimary && (
                  <Badge variant="default" className="gap-1">
                    <Star className="w-3 h-3" fill="currentColor" />
                    Primary
                  </Badge>
                )}
              </div>
              <CardDescription>
                {rooftop.city}, {rooftop.dealerStateCode}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Location */}
              <div className="flex items-start gap-2 text-sm">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                <div>
                  {rooftop.address && <div>{rooftop.address}</div>}
                  <div className="text-muted-foreground">
                    {rooftop.city}, {rooftop.dealerStateCode} {rooftop.zipCode}
                  </div>
                </div>
              </div>

              {/* Tax Perspective */}
              <div className="space-y-1">
                <div className="text-xs font-medium text-muted-foreground">
                  Tax Perspective
                </div>
                <Badge variant="outline">
                  {rooftop.defaultTaxPerspective.replace(/_/g, ' ')}
                </Badge>
              </div>

              {/* Allowed States */}
              {rooftop.allowedRegistrationStates.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground">
                    Allowed Registration States
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {rooftop.allowedRegistrationStates.map((state) => (
                      <Badge key={state} variant="secondary" className="text-xs">
                        {state}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Drive-Out */}
              {rooftop.driveOutEnabled && (
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Drive-out enabled</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                {!rooftop.isPrimary && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPrimaryMutation.mutate(rooftop.id)}
                  >
                    Set Primary
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(rooftop)}
                >
                  <Pencil className="w-3 h-3 mr-1" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(rooftop.id)}
                  disabled={rooftop.isPrimary}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {rooftopList.length === 0 && (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            No rooftops configured. Click "Add Rooftop" to create your first location.
          </AlertDescription>
        </Alert>
      )}

      {/* Edit/Create Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Rooftop' : 'Create New Rooftop'}
            </DialogTitle>
            <DialogDescription>
              Configure tax perspective and allowed registration states for this location.
            </DialogDescription>
          </DialogHeader>

          {selectedRooftop && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rooftop-name">Name</Label>
                  <Input
                    id="rooftop-name"
                    value={selectedRooftop.name}
                    onChange={(e) =>
                      setSelectedRooftop({ ...selectedRooftop, name: e.target.value })
                    }
                    placeholder="Main Dealership"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rooftop-id">Rooftop ID</Label>
                  <Input
                    id="rooftop-id"
                    value={selectedRooftop.rooftopId}
                    onChange={(e) =>
                      setSelectedRooftop({ ...selectedRooftop, rooftopId: e.target.value })
                    }
                    placeholder="main"
                    disabled={isEditing}
                  />
                </div>
              </div>

              {/* Location */}
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={selectedRooftop.address || ''}
                  onChange={(e) =>
                    setSelectedRooftop({ ...selectedRooftop, address: e.target.value })
                  }
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={selectedRooftop.city || ''}
                    onChange={(e) =>
                      setSelectedRooftop({ ...selectedRooftop, city: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dealer-state">State</Label>
                  <Select
                    value={selectedRooftop.dealerStateCode}
                    onValueChange={(value) =>
                      setSelectedRooftop({ ...selectedRooftop, dealerStateCode: value })
                    }
                  >
                    <SelectTrigger id="dealer-state">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allStates.map((state) => (
                        <SelectItem key={state.code} value={state.code}>
                          {state.code} - {state.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP</Label>
                  <Input
                    id="zip"
                    value={selectedRooftop.zipCode || ''}
                    onChange={(e) =>
                      setSelectedRooftop({ ...selectedRooftop, zipCode: e.target.value })
                    }
                    maxLength={5}
                  />
                </div>
              </div>

              {/* Tax Perspective */}
              <div className="space-y-2">
                <Label htmlFor="tax-perspective">Default Tax Perspective</Label>
                <Select
                  value={selectedRooftop.defaultTaxPerspective}
                  onValueChange={(value: any) =>
                    setSelectedRooftop({ ...selectedRooftop, defaultTaxPerspective: value })
                  }
                >
                  <SelectTrigger id="tax-perspective">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DEALER_STATE">Dealer State</SelectItem>
                    <SelectItem value="REGISTRATION_STATE">Registration State</SelectItem>
                    <SelectItem value="BUYER_STATE">Buyer State</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Determines which state's tax rules to apply by default
                </p>
              </div>

              {/* Switches */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="active">Active</Label>
                  <Switch
                    id="active"
                    checked={selectedRooftop.isActive}
                    onCheckedChange={(checked) =>
                      setSelectedRooftop({ ...selectedRooftop, isActive: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="primary">Primary Location</Label>
                  <Switch
                    id="primary"
                    checked={selectedRooftop.isPrimary}
                    onCheckedChange={(checked) =>
                      setSelectedRooftop({ ...selectedRooftop, isPrimary: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="drive-out">Drive-Out Enabled</Label>
                  <Switch
                    id="drive-out"
                    checked={selectedRooftop.driveOutEnabled}
                    onCheckedChange={(checked) =>
                      setSelectedRooftop({ ...selectedRooftop, driveOutEnabled: checked })
                    }
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={selectedRooftop.notes || ''}
                  onChange={(e) =>
                    setSelectedRooftop({ ...selectedRooftop, notes: e.target.value })
                  }
                  placeholder="Optional notes..."
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                !selectedRooftop?.name ||
                !selectedRooftop?.rooftopId ||
                !selectedRooftop?.dealerStateCode
              }
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : isEditing
                  ? 'Update'
                  : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
