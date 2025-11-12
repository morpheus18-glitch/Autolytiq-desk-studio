import { useState } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Car, Check, Plus, ArrowLeft, Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VehicleForm } from '@/components/forms/vehicle-form';
import type { Vehicle, InsertVehicle } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface VehicleSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentVehicleId?: string;
  dealId: string;
  scenarioId: string;
}

export function VehicleSwitcher({
  open,
  onOpenChange,
  currentVehicleId,
  dealId,
  scenarioId,
}: VehicleSwitcherProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const { toast } = useToast();

  // Fetch all vehicles (empty query returns all results from backend)
  const { data: allVehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ['/api/vehicles/search', ''],
    enabled: open && !showCreateForm,
    queryFn: async () => {
      const response = await fetch('/api/vehicles/search?q=');
      if (!response.ok) {
        throw new Error('Failed to search vehicles');
      }
      return response.json();
    },
  });

  // Filter vehicles based on search query
  const vehicles = allVehicles.filter(vehicle => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      vehicle.year.toString().includes(query) ||
      vehicle.make.toLowerCase().includes(query) ||
      vehicle.model.toLowerCase().includes(query) ||
      vehicle.trim?.toLowerCase().includes(query) ||
      vehicle.vin.toLowerCase().includes(query) ||
      vehicle.stockNumber?.toLowerCase().includes(query)
    );
  });

  // Create vehicle and attach to deal
  const createAndAttachMutation = useMutation({
    mutationFn: async (data: InsertVehicle) => {
      // Create vehicle
      const createResponse = await apiRequest('POST', '/api/vehicles', data);
      const newVehicle = await createResponse.json();
      
      // Update deal with new vehicle
      await apiRequest('PATCH', `/api/deals/${dealId}`, {
        vehicleId: newVehicle.id,
      });
      
      // Update scenario with new vehicle and price
      await apiRequest('PATCH', `/api/deals/${dealId}/scenarios/${scenarioId}`, {
        vehicleId: newVehicle.id,
        vehiclePrice: newVehicle.price,
      });
      
      return newVehicle;
    },
    onSuccess: (vehicle) => {
      queryClient.invalidateQueries({ queryKey: ['/api/vehicles'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
      toast({
        title: 'Vehicle created and attached',
        description: `${vehicle.year} ${vehicle.make} ${vehicle.model} has been added to this deal`,
      });
      setShowCreateForm(false);
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create vehicle',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  // Update deal and scenario with new vehicle
  const updateScenarioMutation = useMutation({
    mutationFn: async (vehicle: Vehicle) => {
      // Update the deal's vehicleId (for overall deal reference)
      await apiRequest('PATCH', `/api/deals/${dealId}`, {
        vehicleId: vehicle.id,
      });
      
      // Update the current scenario's vehicle reference and price
      await apiRequest('PATCH', `/api/deals/${dealId}/scenarios/${scenarioId}`, {
        vehicleId: vehicle.id,
        vehiclePrice: vehicle.price,
      });
    },
    onSuccess: (_, vehicle) => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
      toast({
        title: 'Vehicle switched',
        description: `Deal updated with ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to switch vehicle. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const handleSelectVehicle = (vehicle: Vehicle) => {
    updateScenarioMutation.mutate(vehicle);
  };

  const formatCurrency = (value: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  return (
    <Sheet open={open} onOpenChange={(open) => {
      onOpenChange(open);
      if (!open) {
        setShowCreateForm(false);
        setSearchQuery('');
      }
    }}>
      <SheetContent 
        side="right"
        className="w-full sm:max-w-[600px]"
        data-testid="sheet-vehicle-switcher"
      >
        <SheetHeader>
          <SheetTitle>
            {showCreateForm ? 'Create New Vehicle' : 'Switch Vehicle'}
          </SheetTitle>
          <SheetDescription>
            {showCreateForm 
              ? 'Enter vehicle details to create and attach to this deal'
              : 'Search and select a different vehicle for this deal'
            }
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {showCreateForm ? (
            <>
              <ScrollArea className="h-[calc(100vh-12rem)]">
                <VehicleForm
                  onSubmit={async (data) => {
                    await createAndAttachMutation.mutateAsync(data);
                  }}
                  isLoading={createAndAttachMutation.isPending}
                  submitLabel="Create & Attach"
                />
              </ScrollArea>
              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => setShowCreateForm(false)}
                  disabled={createAndAttachMutation.isPending}
                  data-testid="button-cancel-create-vehicle"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to Vehicle List
                </Button>
              </div>
            </>
          ) : (
            <>
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by year, make, model, stock#, or VIN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-vehicle-search"
                />
              </div>

              {/* Create New Vehicle Button */}
              <Button 
                variant="outline" 
                className="w-full gap-2"
                onClick={() => setShowCreateForm(true)}
                data-testid="button-create-vehicle"
              >
                <Plus className="w-4 h-4" />
                Create New Vehicle
              </Button>

              {/* Vehicle List */}
              <ScrollArea className="h-[calc(100vh-20rem)]">
                {isLoading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3" />
                    <p>Loading vehicles...</p>
                  </div>
                ) : vehicles.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Car className="w-12 h-12 mx-auto mb-3" />
                    <p>{searchQuery ? 'No vehicles match your search' : 'No vehicles found'}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {vehicles.map((vehicle) => {
                      const isCurrentVehicle = vehicle.id === currentVehicleId;
                      return (
                        <Card
                          key={vehicle.id}
                          className={`cursor-pointer hover-elevate active-elevate-2 transition-all ${
                            isCurrentVehicle ? 'ring-2 ring-primary' : ''
                          }`}
                          onClick={() => !isCurrentVehicle && handleSelectVehicle(vehicle)}
                          data-testid={`card-vehicle-${vehicle.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2">
                                  {isCurrentVehicle && (
                                    <Check className="w-4 h-4 text-primary flex-shrink-0" />
                                  )}
                                  <div className="font-semibold text-base truncate">
                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                  </div>
                                  {vehicle.trim && (
                                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                                      {vehicle.trim}
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="space-y-1.5 text-sm">
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                    <span className="font-mono text-xs">STK: {vehicle.stockNumber}</span>
                                    <span>•</span>
                                    <span className="font-mono text-xs">{vehicle.mileage.toLocaleString()} mi</span>
                                  </div>
                                  {vehicle.exteriorColor && (
                                    <div className="text-muted-foreground">
                                      {vehicle.exteriorColor}
                                    </div>
                                  )}
                                  <div className="text-muted-foreground font-mono text-xs truncate">
                                    VIN: {vehicle.vin}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <div className="text-lg font-mono font-bold tabular-nums">
                                  {formatCurrency(vehicle.price)}
                                </div>
                                {isCurrentVehicle ? (
                                  <Badge variant="default" className="flex-shrink-0">
                                    Current
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
