import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import type { InsertVehicle, Vehicle } from "@shared/schema";
import { VehicleForm } from "@/components/forms/vehicle-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/page-layout";
import { PageHeader } from "@/components/core/page-header";
import { PageContent } from "@/components/core/page-content";
import { premiumCardClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export default function InventoryNew() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: InsertVehicle) => {
      const res = await apiRequest("POST", "/api/vehicles", data);
      return res.json();
    },
    onSuccess: (vehicle: Vehicle) => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      toast({
        title: "Vehicle Added",
        description: `${vehicle.year} ${vehicle.make} ${vehicle.model} has been added to inventory.`,
      });
      navigate("/inventory");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add vehicle to inventory",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = async (data: InsertVehicle) => {
    await createMutation.mutateAsync(data);
  };

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Add New Vehicle"
        subtitle="Enter vehicle details to add to inventory"
        icon={<Plus />}
        actions={
          <Button
            variant="ghost"
            onClick={() => navigate("/inventory")}
            data-testid="button-back-to-inventory"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inventory
          </Button>
        }
      />

      <PageContent className="container mx-auto max-w-4xl">
        <Card className={cn(premiumCardClasses)}>
          <CardHeader>
            <CardTitle>Vehicle Information</CardTitle>
            <CardDescription>
              Fill in all required fields. Invoice Price is used for internal profit calculations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VehicleForm
              onSubmit={handleSubmit}
              isLoading={createMutation.isPending}
              submitLabel="Add to Inventory"
            />
          </CardContent>
        </Card>
      </PageContent>
    </div>
  );
}
