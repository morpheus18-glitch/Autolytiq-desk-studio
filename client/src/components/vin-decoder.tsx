import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { VINDecoder, type DecodedVehicle } from '@/lib/vin-decoder';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Car,
  Loader2,
  Check,
  X,
  Copy,
  Plus,
  Search,
  History,
  AlertCircle,
  Scan,
  ChevronDown,
  Calendar,
  Fuel,
  Cog,
  Shield,
  Factory,
  DollarSign,
  Package,
  Zap,
  Info,
  MapPin,
  Hash,
  Gauge
} from 'lucide-react';
import { useDebouncedCallback } from 'use-debounce';

interface VINDecoderProps {
  onVehicleDecoded?: (data: DecodedVehicle) => void;
  onAddToInventory?: (data: DecodedVehicle) => void;
  onCreateDeal?: (data: DecodedVehicle) => void;
  className?: string;
  autoFocus?: boolean;
}

export function VINDecoderComponent({
  onVehicleDecoded,
  onAddToInventory,
  onCreateDeal,
  className,
  autoFocus = false
}: VINDecoderProps) {
  const [vin, setVin] = useState('');
  const [isValidVin, setIsValidVin] = useState<boolean | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<DecodedVehicle | null>(null);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Get recent VINs from localStorage
  const recentVins = VINDecoder.getRecentVINs();

  // Decode mutation
  const decodeMutation = useMutation({
    mutationFn: async (vinNumber: string) => {
      return await VINDecoder.decode(vinNumber);
    },
    onSuccess: (data) => {
      setSelectedVehicle(data);
      onVehicleDecoded?.(data);
      toast({
        title: 'VIN Decoded Successfully',
        description: `${VINDecoder.getDisplayText(data)}`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to decode VIN',
        description: error.message
      });
    }
  });

  // Validate VIN on change
  const validateVin = useDebouncedCallback((value: string) => {
    if (!value) {
      setIsValidVin(null);
      return;
    }
    
    const validation = VINDecoder.validateVIN(value);
    setIsValidVin(validation.isValid);
  }, 300);

  // Handle VIN input change
  const handleVinChange = (value: string) => {
    const formatted = VINDecoder.formatVIN(value);
    setVin(formatted);
    validateVin(formatted);
  };

  // Handle paste
  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text');
    const formatted = VINDecoder.formatVIN(pasted);
    setVin(formatted);
    
    // Auto-decode on paste if valid
    const validation = VINDecoder.validateVIN(formatted);
    if (validation.isValid) {
      setIsValidVin(true);
      decodeMutation.mutate(formatted);
    } else {
      setIsValidVin(false);
    }
  };

  // Handle decode button click
  const handleDecode = () => {
    if (vin && isValidVin) {
      decodeMutation.mutate(vin);
    }
  };

  // Handle selecting from history
  const handleSelectFromHistory = (historicalVin: string, data: DecodedVehicle) => {
    setVin(historicalVin);
    setSelectedVehicle(data);
    setShowHistory(false);
    setIsValidVin(true);
    onVehicleDecoded?.(data);
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied to clipboard',
      description: `${label} copied successfully`,
    });
  };

  // Clear history
  const handleClearHistory = () => {
    VINDecoder.clearRecentVINs();
    queryClient.invalidateQueries();
    setShowHistory(false);
    toast({
      title: 'History cleared',
      description: 'VIN history has been cleared',
    });
  };

  // Quick actions
  const handleAddToInventory = () => {
    if (selectedVehicle && onAddToInventory) {
      onAddToInventory(selectedVehicle);
    } else if (selectedVehicle) {
      // Navigate to inventory page with pre-filled data
      navigate(`/inventory/new?vin=${selectedVehicle.vin}`);
    }
  };

  const handleCreateDeal = () => {
    if (selectedVehicle && onCreateDeal) {
      onCreateDeal(selectedVehicle);
    } else if (selectedVehicle) {
      // Navigate to new deal page with VIN
      navigate(`/deals/new?vin=${selectedVehicle.vin}`);
    }
  };

  const handleSearchSimilar = () => {
    if (selectedVehicle) {
      // Navigate to inventory search with filters
      const params = new URLSearchParams({
        make: selectedVehicle.make || '',
        model: selectedVehicle.model || '',
        yearMin: String((selectedVehicle.year || 2020) - 2),
        yearMax: String((selectedVehicle.year || 2025) + 2),
      });
      navigate(`/inventory?${params.toString()}`);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* VIN Input Section */}
      <Card className="backdrop-blur-md bg-card/40 border-card-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="w-5 h-5" />
            VIN Decoder
          </CardTitle>
          <CardDescription>
            Enter a 17-character VIN to decode vehicle information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={vin}
                onChange={(e) => handleVinChange(e.target.value)}
                onPaste={handlePaste}
                placeholder="Enter VIN (e.g., 1HGBH41JXMN109186)"
                className={cn(
                  'pr-10 font-mono uppercase tracking-wider text-base h-12',
                  isValidVin === false && 'border-destructive',
                  isValidVin === true && 'border-green-500'
                )}
                maxLength={17}
                autoFocus={autoFocus}
                data-testid="input-vin"
              />
              {isValidVin !== null && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isValidVin ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <X className="w-5 h-5 text-destructive" />
                  )}
                </div>
              )}
            </div>
            
            <DropdownMenu open={showHistory} onOpenChange={setShowHistory}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12"
                  data-testid="button-vin-history"
                >
                  <History className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  Recent VINs
                  {recentVins.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearHistory}
                      className="h-6 text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {recentVins.length > 0 ? (
                  <ScrollArea className="h-72">
                    {recentVins.map((item) => (
                      <DropdownMenuItem
                        key={item.vin}
                        onClick={() => handleSelectFromHistory(item.vin, item.data)}
                        className="flex flex-col items-start p-3 cursor-pointer"
                      >
                        <div className="font-mono text-sm">{item.vin}</div>
                        <div className="text-xs text-muted-foreground">
                          {VINDecoder.getDisplayText(item.data)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </ScrollArea>
                ) : (
                  <div className="p-4 text-sm text-muted-foreground text-center">
                    No recent VINs
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button
              onClick={handleDecode}
              disabled={!vin || !isValidVin || decodeMutation.isPending}
              className="h-12"
              data-testid="button-decode-vin"
            >
              {decodeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Decoding...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Decode
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12"
              disabled
              title="Barcode scanner coming soon"
              data-testid="button-scan-barcode"
            >
              <Scan className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Info className="w-3 h-3" />
            VIN should be exactly 17 characters (excluding I, O, Q)
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {decodeMutation.isPending && (
        <Card className="backdrop-blur-md bg-card/40 border-card-border">
          <CardHeader>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Decoded Vehicle Information */}
      {selectedVehicle && !decodeMutation.isPending && (
        <Card className="backdrop-blur-md bg-card/40 border-card-border animate-in fade-in slide-in-from-bottom-2 duration-300">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">
                  {VINDecoder.getDisplayText(selectedVehicle)}
                </CardTitle>
                <CardDescription className="mt-1">
                  <span className="font-mono text-sm">{selectedVehicle.vin}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 ml-2"
                    onClick={() => copyToClipboard(selectedVehicle.vin, 'VIN')}
                    data-testid="button-copy-vin"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </CardDescription>
              </div>
              
              {/* Quick Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddToInventory}
                  data-testid="button-add-to-inventory"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add to Inventory
                </Button>
                <Button
                  size="sm"
                  onClick={handleCreateDeal}
                  data-testid="button-create-deal"
                >
                  <DollarSign className="w-4 h-4 mr-1" />
                  Create Deal
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSearchSimilar}
                  data-testid="button-search-similar"
                >
                  <Search className="w-4 h-4 mr-1" />
                  Similar
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {selectedVehicle.year && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Year</div>
                    <div className="font-semibold">{selectedVehicle.year}</div>
                  </div>
                </div>
              )}
              
              {selectedVehicle.make && (
                <div className="flex items-center gap-3">
                  <Factory className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Make</div>
                    <div className="font-semibold">{selectedVehicle.make}</div>
                  </div>
                </div>
              )}
              
              {selectedVehicle.model && (
                <div className="flex items-center gap-3">
                  <Car className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Model</div>
                    <div className="font-semibold">{selectedVehicle.model}</div>
                  </div>
                </div>
              )}
              
              {selectedVehicle.trim && (
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Trim</div>
                    <div className="font-semibold">{selectedVehicle.trim}</div>
                  </div>
                </div>
              )}
              
              {selectedVehicle.bodyClass && (
                <div className="flex items-center gap-3">
                  <Car className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Body Type</div>
                    <div className="font-semibold">{selectedVehicle.bodyClass}</div>
                  </div>
                </div>
              )}
              
              {selectedVehicle.doors && (
                <div className="flex items-center gap-3">
                  <Hash className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-xs text-muted-foreground">Doors</div>
                    <div className="font-semibold">{selectedVehicle.doors}</div>
                  </div>
                </div>
              )}
            </div>
            
            <Separator />
            
            {/* Engine & Performance */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Engine & Performance
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedVehicle.engineDisplacement && (
                  <div className="flex items-center gap-3">
                    <Gauge className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Displacement</div>
                      <div className="font-semibold">{selectedVehicle.engineDisplacement}L</div>
                    </div>
                  </div>
                )}
                
                {selectedVehicle.engineCylinders && (
                  <div className="flex items-center gap-3">
                    <Cog className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Cylinders</div>
                      <div className="font-semibold">{selectedVehicle.engineCylinders} Cylinder</div>
                    </div>
                  </div>
                )}
                
                {selectedVehicle.fuelType && (
                  <div className="flex items-center gap-3">
                    <Fuel className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Fuel Type</div>
                      <div className="font-semibold">{selectedVehicle.fuelType}</div>
                    </div>
                  </div>
                )}
                
                {selectedVehicle.drivetrain && (
                  <div className="flex items-center gap-3">
                    <Car className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Drivetrain</div>
                      <div className="font-semibold">{selectedVehicle.drivetrain}</div>
                    </div>
                  </div>
                )}
                
                {selectedVehicle.transmission && (
                  <div className="flex items-center gap-3">
                    <Cog className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">Transmission</div>
                      <div className="font-semibold">{selectedVehicle.transmission}</div>
                    </div>
                  </div>
                )}
                
                {selectedVehicle.gvwr && (
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <div className="text-xs text-muted-foreground">GVWR</div>
                      <div className="font-semibold">{selectedVehicle.gvwr} lbs</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <Separator />
            
            {/* Safety Features */}
            {(selectedVehicle.airbags || selectedVehicle.abs || selectedVehicle.tpms || selectedVehicle.esc) && (
              <>
                <div>
                  <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Safety Features
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedVehicle.abs && (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="w-3 h-3" />
                        ABS
                      </Badge>
                    )}
                    {selectedVehicle.tpms && (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="w-3 h-3" />
                        TPMS
                      </Badge>
                    )}
                    {selectedVehicle.esc && (
                      <Badge variant="secondary" className="gap-1">
                        <Check className="w-3 h-3" />
                        ESC
                      </Badge>
                    )}
                    {selectedVehicle.airbags && selectedVehicle.airbags.map((airbag, idx) => (
                      <Badge key={idx} variant="secondary" className="gap-1">
                        <Shield className="w-3 h-3" />
                        {airbag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}
            
            {/* Manufacturing Info */}
            {(selectedVehicle.manufacturer || selectedVehicle.plant) && (
              <div>
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Factory className="w-4 h-4" />
                  Manufacturing
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedVehicle.manufacturer && (
                    <div className="flex items-center gap-3">
                      <Factory className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Manufacturer</div>
                        <div className="font-semibold">{selectedVehicle.manufacturer}</div>
                      </div>
                    </div>
                  )}
                  
                  {selectedVehicle.plant && (
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-xs text-muted-foreground">Plant Location</div>
                        <div className="font-semibold">{selectedVehicle.plant}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Error Display */}
            {selectedVehicle.errorCode && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-md">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                <div className="text-sm">
                  <div className="font-semibold">Error Code: {selectedVehicle.errorCode}</div>
                  {selectedVehicle.errorText && (
                    <div className="text-muted-foreground">{selectedVehicle.errorText}</div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Export as default for lazy loading
export default VINDecoderComponent;