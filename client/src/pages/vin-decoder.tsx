import { useState } from 'react';
import { useLocation } from 'wouter';
import { VINDecoderComponent } from '@/components/vin-decoder';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DecodedVehicle } from '@/lib/vin-decoder';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Car, Package, DollarSign, Info } from 'lucide-react';
import { PageHeader } from '@/components/core/page-header';
import { PageContent } from '@/components/core/page-content';
import { cn } from '@/lib/utils';
import {
  gridLayouts,
  premiumCardClasses,
} from '@/lib/design-tokens';

export default function VINDecoderPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [decodedVehicle, setDecodedVehicle] = useState<DecodedVehicle | null>(null);

  const handleVehicleDecoded = (data: DecodedVehicle) => {
    setDecodedVehicle(data);
  };

  const handleAddToInventory = (data: DecodedVehicle) => {
    // Navigate to inventory creation with pre-filled VIN data
    const params = new URLSearchParams({
      vin: data.vin,
      year: String(data.year || ''),
      make: data.make || '',
      model: data.model || '',
      trim: data.trim || '',
      engine: data.engineDisplacement || '',
      fuel: data.fuelType || '',
      transmission: data.transmission || '',
      drivetrain: data.drivetrain || '',
    });
    
    navigate(`/inventory/new?${params.toString()}`);
    
    toast({
      title: 'Creating inventory entry',
      description: 'Redirecting to inventory creation with VIN data...',
    });
  };

  const handleCreateDeal = (data: DecodedVehicle) => {
    // Navigate to deal creation with VIN
    const params = new URLSearchParams({
      vin: data.vin,
      vehicleInfo: JSON.stringify({
        year: data.year,
        make: data.make,
        model: data.model,
        trim: data.trim,
      })
    });
    
    navigate(`/deals/new?${params.toString()}`);
    
    toast({
      title: 'Creating new deal',
      description: 'Redirecting to deal creation with vehicle data...',
    });
  };

  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="VIN Decoder"
        subtitle="Decode vehicle identification numbers using NHTSA database"
        icon={<Car />}
        actions={
          <Button
            variant="ghost"
            onClick={() => navigate('/inventory')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inventory
          </Button>
        }
      />

      <PageContent className="container mx-auto max-w-6xl">

        {/* Main VIN Decoder Component */}
        <VINDecoderComponent
          onVehicleDecoded={handleVehicleDecoded}
          onAddToInventory={handleAddToInventory}
          onCreateDeal={handleCreateDeal}
          autoFocus
        />

        {/* Info Cards */}
        <div className={cn("mt-8", gridLayouts.threeCol)}>
          <Card className={cn(premiumCardClasses, "backdrop-blur-md bg-card/40")}>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Info className="w-4 h-4" />
                What is a VIN?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">
                A Vehicle Identification Number (VIN) is a unique 17-character code that serves as a vehicle's fingerprint.
                It contains information about the manufacturer, model year, production plant, and more.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className={cn(premiumCardClasses, "backdrop-blur-md bg-card/40")}>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="w-4 h-4" />
                Data Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">
                We use the official NHTSA (National Highway Traffic Safety Administration) database to decode VINs.
                This ensures accurate, up-to-date vehicle information directly from manufacturers.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className={cn(premiumCardClasses, "backdrop-blur-md bg-card/40")}>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">
                After decoding a VIN, you can instantly add the vehicle to inventory, create a new deal, 
                or search for similar vehicles in your existing stock.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* Statistics (if we want to show decoder usage) */}
        {decodedVehicle && (
          <Card className={cn(premiumCardClasses, "mt-8 backdrop-blur-md bg-card/40")}>
            <CardHeader>
              <CardTitle className="text-base">Recent Decode</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={cn(gridLayouts.fourCol, "text-sm")}>
                <div>
                  <div className="text-muted-foreground text-xs">VIN</div>
                  <div className="font-mono font-semibold">{decodedVehicle.vin}</div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Vehicle</div>
                  <div className="font-semibold">
                    {decodedVehicle.year} {decodedVehicle.make} {decodedVehicle.model}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Engine</div>
                  <div className="font-semibold">
                    {decodedVehicle.engineDisplacement ? `${decodedVehicle.engineDisplacement}L` : 'N/A'} 
                    {decodedVehicle.engineCylinders ? ` ${decodedVehicle.engineCylinders}-Cyl` : ''}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground text-xs">Decoded At</div>
                  <div className="font-semibold">
                    {new Date(decodedVehicle.decodedAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </PageContent>
    </div>
  );
}