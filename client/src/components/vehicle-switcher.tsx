import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Search, Car, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { Vehicle } from '@shared/schema';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface VehicleSwitcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentVehicleId: string;
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
  const { toast } = useToast();

  // Search vehicles
  const { data: vehicles = [], isLoading } = useQuery<Vehicle[]>({
    queryKey: ['/api/vehicles/search', searchQuery],
    enabled: open,
    queryFn: async () => {
      const query = searchQuery ? `?q=${encodeURIComponent(searchQuery)}` : '';
      const response = await fetch(`/api/vehicles/search${query}`);
      if (!response.ok) {
        throw new Error('Failed to search vehicles');
      }
      return response.json();
    },
  });

  // Update deal with new vehicle
  const updateScenarioMutation = useMutation({
    mutationFn: async (vehicle: Vehicle) => {
      // Update the deal's vehicleId
      await apiRequest('PATCH', `/api/deals/${dealId}`, {
        vehicleId: vehicle.id,
      });
      
      // Update the current scenario's vehiclePrice to match the new vehicle
      await apiRequest('PATCH', `/api/deals/${dealId}/scenarios/${scenarioId}`, {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Switch Vehicle</DialogTitle>
          <DialogDescription>
            Search and select a different vehicle for this deal
          </DialogDescription>
        </DialogHeader>

        {/* Search Input */}
        <div className="px-6 pb-4">
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
        </div>

        {/* Vehicle List */}
        <ScrollArea className="flex-1 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-muted animate-pulse mx-auto" />
                <p className="text-sm text-muted-foreground">Searching vehicles...</p>
              </div>
            </div>
          ) : vehicles.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center space-y-2">
                <Car className="w-12 h-12 text-muted-foreground mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {searchQuery ? 'No vehicles found' : 'Start typing to search'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pb-6">
              {vehicles.map((vehicle) => {
                const isCurrentVehicle = vehicle.id === currentVehicleId;
                return (
                  <Card
                    key={vehicle.id}
                    className={`p-4 cursor-pointer transition-all hover-elevate ${
                      isCurrentVehicle ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => !isCurrentVehicle && handleSelectVehicle(vehicle)}
                    data-testid={`card-vehicle-${vehicle.id}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isCurrentVehicle && (
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          )}
                          <h3 className="font-semibold text-lg">
                            {vehicle.year} {vehicle.make} {vehicle.model}
                          </h3>
                          {vehicle.trim && (
                            <Badge variant="secondary" className="text-xs">
                              {vehicle.trim}
                            </Badge>
                          )}
                          {vehicle.isNew && (
                            <Badge variant="default" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <div className="text-xs text-muted-foreground">Stock #</div>
                            <div className="font-mono font-medium">{vehicle.stockNumber}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Mileage</div>
                            <div className="font-mono">{vehicle.mileage.toLocaleString()} mi</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">Color</div>
                            <div>{vehicle.exteriorColor || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">VIN</div>
                            <div className="font-mono text-xs truncate">{vehicle.vin}</div>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <div className="text-sm text-muted-foreground mb-1">Price</div>
                        <div className="text-xl font-mono font-bold tabular-nums">
                          {formatCurrency(vehicle.price)}
                        </div>
                        {!isCurrentVehicle && (
                          <Button
                            size="sm"
                            className="mt-2"
                            disabled={updateScenarioMutation.isPending}
                            data-testid={`button-select-vehicle-${vehicle.id}`}
                          >
                            {updateScenarioMutation.isPending ? 'Selecting...' : 'Select'}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
