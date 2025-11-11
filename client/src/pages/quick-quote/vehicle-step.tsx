import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useQuickQuoteStore } from "@/stores/quick-quote-store";
import type { Vehicle } from "@shared/schema";

export function VehicleStep() {
  const [searchTerm, setSearchTerm] = useState("");
  const { setVehicle, nextStep } = useQuickQuoteStore();

  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const filteredVehicles = vehicles?.filter((v) => {
    const search = searchTerm.toLowerCase();
    return (
      v.make.toLowerCase().includes(search) ||
      v.model.toLowerCase().includes(search) ||
      v.year.toString().includes(search) ||
      v.vin.toLowerCase().includes(search)
    );
  });

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setVehicle(vehicle);
    nextStep();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button variant="ghost" size="icon" data-testid="button-back">
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold">New Quote</h1>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">Pick a vehicle</h2>
          <p className="text-muted-foreground">Select from your inventory</p>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search inventory..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 min-h-[48px]"
            data-testid="input-vehicle-search"
          />
        </div>

        {/* Vehicle List */}
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-center text-muted-foreground py-8">Loading vehicles...</p>
          ) : filteredVehicles && filteredVehicles.length > 0 ? (
            filteredVehicles.map((vehicle) => (
              <Card
                key={vehicle.id}
                className="hover-elevate active-elevate-2 cursor-pointer"
                onClick={() => handleSelectVehicle(vehicle)}
                data-testid={`card-vehicle-${vehicle.id}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-24 h-24 bg-muted rounded-md flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">Photo</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-lg truncate">
                        {vehicle.year} {vehicle.make} {vehicle.model}
                      </h3>
                      {vehicle.trim && (
                        <p className="text-sm text-muted-foreground">{vehicle.trim}</p>
                      )}
                      <p className="text-2xl font-bold text-primary mt-2">
                        ${vehicle.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No vehicles found. Try a different search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}