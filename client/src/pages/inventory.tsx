import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Vehicle, User as UserType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageLayout } from "@/components/page-layout";
import {
  Search,
  Filter,
  X,
  Car,
  Fuel,
  Calendar,
  Gauge,
  DollarSign,
  ChevronRight,
  MapPin,
  Cog,
  Zap,
  Droplets,
  Wind,
  Battery,
  ArrowUpDown,
  SlidersHorizontal,
  Package,
  AlertCircle,
  RefreshCw,
  Hash,
  Scan,
  CreditCard,
  Eye,
  EyeOff,
  Smartphone,
  FileText,
  Plus
} from "lucide-react";
import { useDebouncedCallback } from "use-debounce";
import { calculatePricingSummary, formatCurrency, formatPercent, getProfitColorClass } from "@/lib/pricing-utils";

// Types
interface InventoryFilters {
  query?: string;
  condition?: string[];
  priceMin?: number;
  priceMax?: number;
  yearMin?: number;
  yearMax?: number;
  make?: string[];
  model?: string[];
  fuelType?: string[];
  drivetrain?: string[];
  transmission?: string[];
  status?: string;
  sortBy?: string;
}

interface InventoryResponse {
  vehicles: Vehicle[];
  total: number;
  pages: number;
}

// Vehicle Card Component
function VehicleCard({ vehicle, onViewDetails, onStartDeal, onQuickQuote }: {
  vehicle: Vehicle;
  onViewDetails: () => void;
  onStartDeal: () => void;
  onQuickQuote: () => void;
}) {
  const [showInternalMetrics, setShowInternalMetrics] = useState(false);
  
  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(price));
  };
  
  // Calculate pricing summary
  const pricing = calculatePricingSummary(
    vehicle.internetPrice || vehicle.price,
    vehicle.invoicePrice
  );

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'new': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'certified': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'used': return 'bg-amber-500/10 text-amber-600 border-amber-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500/10 text-green-600';
      case 'hold': return 'bg-amber-500/10 text-amber-600';
      case 'sold': return 'bg-red-500/10 text-red-600';
      case 'in_transit': return 'bg-blue-500/10 text-blue-600';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const stockDisplay = vehicle.stockNumber.substring(0, 8).toUpperCase();
  const images = (vehicle.images as string[]) || [];
  const primaryImage = images[0] || '/api/placeholder/400/300';

  return (
    <Card 
      className="group overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
      data-testid={`card-vehicle-${vehicle.id}`}
    >
      <div className="aspect-[4/3] relative overflow-hidden bg-gradient-to-b from-muted/20 to-muted/40">
        <img
          src={primaryImage}
          alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
          <Badge 
            className={cn("font-semibold", getConditionColor(vehicle.condition))}
            data-testid={`badge-condition-${vehicle.id}`}
          >
            {vehicle.condition.toUpperCase()}
          </Badge>
          <Badge 
            className={cn("font-semibold", getStatusColor(vehicle.status))}
            data-testid={`badge-status-${vehicle.id}`}
          >
            {vehicle.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="space-y-1.5">
            <p className="text-white text-sm font-semibold flex items-center gap-1.5">
              <Package className="w-4 h-4" />
              Stock: {stockDisplay}
            </p>
            {vehicle.vin && (
              <p className="text-white/80 text-xs font-mono flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5" />
                {vehicle.vin.substring(0, 11)}...
              </p>
            )}
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-4">
        <div>
          <h3 className="font-bold text-xl text-neutral-900 leading-tight" data-testid={`text-vehicle-title-${vehicle.id}`}>
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h3>
          {vehicle.trim && (
            <p className="text-base text-neutral-600 mt-1">{vehicle.trim}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline gap-3">
            {vehicle.msrp && Number(vehicle.msrp) > Number(vehicle.price) && (
              <span className="text-lg text-neutral-400 line-through font-mono">
                {formatPrice(vehicle.msrp)}
              </span>
            )}
            <span className="text-2xl font-bold font-mono tabular-nums text-blue-600" data-testid={`text-price-${vehicle.id}`}>
              {formatPrice(vehicle.internetPrice || vehicle.price)}
            </span>
          </div>

          {pricing.hasCost && (
            <div className="space-y-1.5">
              <button
                onClick={() => setShowInternalMetrics(!showInternalMetrics)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors group"
                data-testid={`button-toggle-metrics-${vehicle.id}`}
              >
                {showInternalMetrics ? (
                  <EyeOff className="w-3.5 h-3.5" />
                ) : (
                  <Eye className="w-3.5 h-3.5" />
                )}
                <span className="font-medium">Internal Metrics</span>
              </button>

              {showInternalMetrics && (
                <div 
                  className="grid grid-cols-3 gap-2 p-2.5 rounded-md bg-muted/30 border border-border/50"
                  data-testid={`section-internal-metrics-${vehicle.id}`}
                >
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Cost</p>
                    <p className="text-sm font-mono font-semibold text-amber-600" data-testid={`text-cost-${vehicle.id}`}>
                      {formatCurrency(pricing.cost!)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Profit</p>
                    <p className={cn("text-sm font-mono font-semibold", getProfitColorClass(pricing.marginPercent))} data-testid={`text-profit-${vehicle.id}`}>
                      {formatCurrency(pricing.grossProfit!)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground font-medium">Margin</p>
                    <p className={cn("text-sm font-mono font-semibold", getProfitColorClass(pricing.marginPercent))} data-testid={`text-margin-${vehicle.id}`}>
                      {formatPercent(pricing.marginPercent!)}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {vehicle.mpgCity && vehicle.mpgHighway && (
            <Badge variant="secondary" className="gap-1">
              <Fuel className="w-3 h-3" />
              {vehicle.mpgCity}/{vehicle.mpgHighway} MPG
            </Badge>
          )}
          {vehicle.mileage && (
            <Badge variant="secondary" className="gap-1">
              <Gauge className="w-3 h-3" />
              {vehicle.mileage.toLocaleString()} mi
            </Badge>
          )}
          {vehicle.transmission && (
            <Badge variant="secondary" className="gap-1">
              <Cog className="w-3 h-3" />
              {vehicle.transmission}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="col-span-2"
            onClick={onViewDetails}
            data-testid={`button-view-details-${vehicle.id}`}
          >
            View Details
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={onQuickQuote}
            disabled={vehicle.status !== 'available'}
            data-testid={`button-quick-quote-${vehicle.id}`}
          >
            <Zap className="w-4 h-4" />
            Quick Quote
          </Button>
          <Button
            size="sm"
            className="gap-1"
            onClick={onStartDeal}
            disabled={vehicle.status !== 'available'}
            data-testid={`button-start-deal-${vehicle.id}`}
          >
            <Plus className="w-4 h-4" />
            Full Desk
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Vehicle Card Skeleton
function VehicleCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full" />
      <CardContent className="p-4 space-y-3">
        <div className="space-y-2">
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-8 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 flex-1" />
        </div>
      </CardContent>
    </Card>
  );
}

// Filter Sidebar Component
function FilterSidebar({ 
  filters, 
  onFiltersChange,
  vehicleCount,
  onClearAll 
}: {
  filters: InventoryFilters;
  onFiltersChange: (filters: InventoryFilters) => void;
  vehicleCount: number;
  onClearAll: () => void;
}) {
  const handleConditionChange = (condition: string, checked: boolean) => {
    const current = filters.condition || [];
    const updated = checked 
      ? [...current, condition]
      : current.filter(c => c !== condition);
    onFiltersChange({ ...filters, condition: updated.length > 0 ? updated : undefined });
  };

  const handleMakeChange = (make: string, checked: boolean) => {
    const current = filters.make || [];
    const updated = checked 
      ? [...current, make]
      : current.filter(m => m !== make);
    onFiltersChange({ 
      ...filters, 
      make: updated.length > 0 ? updated : undefined,
      model: undefined // Reset model when make changes
    });
  };

  const handleFuelTypeChange = (fuelType: string, checked: boolean) => {
    const current = filters.fuelType || [];
    const updated = checked 
      ? [...current, fuelType]
      : current.filter(f => f !== fuelType);
    onFiltersChange({ ...filters, fuelType: updated.length > 0 ? updated : undefined });
  };

  const handleDrivetrainChange = (drivetrain: string, checked: boolean) => {
    const current = filters.drivetrain || [];
    const updated = checked 
      ? [...current, drivetrain]
      : current.filter(d => d !== drivetrain);
    onFiltersChange({ ...filters, drivetrain: updated.length > 0 ? updated : undefined });
  };

  const handleTransmissionChange = (transmission: string, checked: boolean) => {
    const current = filters.transmission || [];
    const updated = checked 
      ? [...current, transmission]
      : current.filter(t => t !== transmission);
    onFiltersChange({ ...filters, transmission: updated.length > 0 ? updated : undefined });
  };

  const appliedFiltersCount = Object.values(filters).filter(v => v !== undefined && v !== '').length;

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Filters</h2>
          {appliedFiltersCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="text-xs"
              data-testid="button-clear-filters"
            >
              Clear All ({appliedFiltersCount})
            </Button>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {vehicleCount} {vehicleCount === 1 ? 'vehicle' : 'vehicles'} found
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4">
          <Accordion type="multiple" defaultValue={["condition", "price", "year"]} className="space-y-4">
            {/* Condition Filter */}
            <AccordionItem value="condition">
              <AccordionTrigger className="text-sm font-medium">
                Condition
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-2">
                {['new', 'certified', 'used'].map((condition) => (
                  <div key={condition} className="flex items-center space-x-2">
                    <Checkbox
                      id={`condition-${condition}`}
                      checked={filters.condition?.includes(condition) || false}
                      onCheckedChange={(checked) => handleConditionChange(condition, !!checked)}
                      data-testid={`checkbox-condition-${condition}`}
                    />
                    <label
                      htmlFor={`condition-${condition}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 capitalize"
                    >
                      {condition}
                    </label>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>

            {/* Price Range Filter */}
            <AccordionItem value="price">
              <AccordionTrigger className="text-sm font-medium">
                Price Range
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>${filters.priceMin || 0}</span>
                    <span>${filters.priceMax || 100000}</span>
                  </div>
                  <Slider
                    value={[filters.priceMin || 0, filters.priceMax || 100000]}
                    min={0}
                    max={100000}
                    step={1000}
                    onValueChange={([min, max]) => {
                      onFiltersChange({
                        ...filters,
                        priceMin: min > 0 ? min : undefined,
                        priceMax: max < 100000 ? max : undefined
                      });
                    }}
                    className="w-full"
                    data-testid="slider-price-range"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Year Range Filter */}
            <AccordionItem value="year">
              <AccordionTrigger className="text-sm font-medium">
                Year
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{filters.yearMin || 2015}</span>
                    <span>{filters.yearMax || 2025}</span>
                  </div>
                  <Slider
                    value={[filters.yearMin || 2015, filters.yearMax || 2025]}
                    min={2015}
                    max={2025}
                    step={1}
                    onValueChange={([min, max]) => {
                      onFiltersChange({
                        ...filters,
                        yearMin: min > 2015 ? min : undefined,
                        yearMax: max < 2025 ? max : undefined
                      });
                    }}
                    className="w-full"
                    data-testid="slider-year-range"
                  />
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Make Filter */}
            <AccordionItem value="make">
              <AccordionTrigger className="text-sm font-medium">
                Make
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-2">
                {['Toyota', 'Honda', 'Ford', 'Chevrolet', 'Nissan', 'BMW', 'Mercedes-Benz', 'Audi'].map((make) => (
                  <div key={make} className="flex items-center space-x-2">
                    <Checkbox
                      id={`make-${make}`}
                      checked={filters.make?.includes(make) || false}
                      onCheckedChange={(checked) => handleMakeChange(make, !!checked)}
                      data-testid={`checkbox-make-${make}`}
                    />
                    <label
                      htmlFor={`make-${make}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {make}
                    </label>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>

            {/* Fuel Type Filter */}
            <AccordionItem value="fuel">
              <AccordionTrigger className="text-sm font-medium">
                Fuel Type
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-2">
                {[
                  { value: 'Gasoline', label: 'Gas', icon: Fuel },
                  { value: 'Hybrid', label: 'Hybrid', icon: Zap },
                  { value: 'Electric', label: 'Electric', icon: Battery },
                  { value: 'Diesel', label: 'Diesel', icon: Droplets }
                ].map(({ value, label, icon: Icon }) => (
                  <div key={value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`fuel-${value}`}
                      checked={filters.fuelType?.includes(value) || false}
                      onCheckedChange={(checked) => handleFuelTypeChange(value, !!checked)}
                      data-testid={`checkbox-fuel-${value}`}
                    />
                    <label
                      htmlFor={`fuel-${value}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1"
                    >
                      <Icon className="w-3 h-3" />
                      {label}
                    </label>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>

            {/* Drivetrain Filter */}
            <AccordionItem value="drivetrain">
              <AccordionTrigger className="text-sm font-medium">
                Drivetrain
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-2">
                {['FWD', 'RWD', 'AWD', '4WD'].map((drivetrain) => (
                  <div key={drivetrain} className="flex items-center space-x-2">
                    <Checkbox
                      id={`drivetrain-${drivetrain}`}
                      checked={filters.drivetrain?.includes(drivetrain) || false}
                      onCheckedChange={(checked) => handleDrivetrainChange(drivetrain, !!checked)}
                      data-testid={`checkbox-drivetrain-${drivetrain}`}
                    />
                    <label
                      htmlFor={`drivetrain-${drivetrain}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {drivetrain}
                    </label>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>

            {/* Transmission Filter */}
            <AccordionItem value="transmission">
              <AccordionTrigger className="text-sm font-medium">
                Transmission
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-2">
                {['Automatic', 'Manual', 'CVT'].map((transmission) => (
                  <div key={transmission} className="flex items-center space-x-2">
                    <Checkbox
                      id={`transmission-${transmission}`}
                      checked={filters.transmission?.includes(transmission) || false}
                      onCheckedChange={(checked) => handleTransmissionChange(transmission, !!checked)}
                      data-testid={`checkbox-transmission-${transmission}`}
                    />
                    <label
                      htmlFor={`transmission-${transmission}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {transmission}
                    </label>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </ScrollArea>
    </div>
  );
}

// Vehicle Quick View Modal
function VehicleQuickView({ 
  vehicle, 
  open, 
  onClose,
  onStartDeal 
}: {
  vehicle: Vehicle | null;
  open: boolean;
  onClose: () => void;
  onStartDeal: (vehicle: Vehicle) => void;
}) {
  const [showInternalMetrics, setShowInternalMetrics] = useState(false);
  
  // Reset internal metrics when modal opens or vehicle changes
  useEffect(() => {
    setShowInternalMetrics(false);
  }, [open, vehicle?.id]);
  
  if (!vehicle) return null;

  const formatPrice = (price: string | number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Number(price));
  };

  const images = (vehicle.images as string[]) || [];
  const features = (vehicle.features as any[]) || [];
  
  // Calculate pricing summary
  const pricing = calculatePricingSummary(
    vehicle.internetPrice || vehicle.price,
    vehicle.invoicePrice
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {vehicle.year} {vehicle.make} {vehicle.model} {vehicle.trim || ''}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Image Gallery */}
          <div className="space-y-4">
            <div className="aspect-[4/3] rounded-lg overflow-hidden bg-muted">
              <img
                src={images[0] || '/api/placeholder/600/450'}
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                className="w-full h-full object-cover"
              />
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.slice(1, 5).map((img, idx) => (
                  <div key={idx} className="aspect-square rounded overflow-hidden bg-muted">
                    <img
                      src={img}
                      alt={`View ${idx + 2}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vehicle Details */}
          <div className="space-y-6">
            {/* Pricing */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Pricing</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {vehicle.msrp && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MSRP</span>
                    <span className="line-through">{formatPrice(vehicle.msrp)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold">
                  <span>Internet Price</span>
                  <span className="text-primary font-mono" data-testid={`text-modal-price-${vehicle.id}`}>
                    {formatPrice(vehicle.internetPrice || vehicle.price)}
                  </span>
                </div>

                {pricing.hasCost && (
                  <div className="pt-2 border-t">
                    <button
                      onClick={() => setShowInternalMetrics(!showInternalMetrics)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-full group"
                      data-testid={`button-modal-toggle-metrics-${vehicle.id}`}
                    >
                      {showInternalMetrics ? (
                        <EyeOff className="w-3.5 h-3.5" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                      <span className="font-medium">Internal Metrics</span>
                    </button>

                    {showInternalMetrics && (
                      <div 
                        className="mt-3 space-y-2"
                        data-testid={`section-modal-internal-metrics-${vehicle.id}`}
                      >
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Dealer Cost</span>
                          <span className="text-sm font-mono font-semibold text-amber-600" data-testid={`text-modal-cost-${vehicle.id}`}>
                            {formatCurrency(pricing.cost!)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Gross Profit</span>
                          <span className={cn("text-sm font-mono font-semibold", getProfitColorClass(pricing.marginPercent))} data-testid={`text-modal-profit-${vehicle.id}`}>
                            {formatCurrency(pricing.grossProfit!)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-muted-foreground">Margin</span>
                          <span className={cn("text-sm font-mono font-semibold", getProfitColorClass(pricing.marginPercent))} data-testid={`text-modal-margin-${vehicle.id}`}>
                            {formatPercent(pricing.marginPercent!)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Specifications */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Specifications</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Stock #</span>
                    <p className="font-medium">{vehicle.stockNumber.substring(0, 8).toUpperCase()}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">VIN</span>
                    <p className="font-medium font-mono text-xs">{vehicle.vin}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Condition</span>
                    <p className="font-medium capitalize">{vehicle.condition}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Mileage</span>
                    <p className="font-medium">{vehicle.mileage?.toLocaleString()} mi</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Exterior</span>
                    <p className="font-medium">{vehicle.exteriorColor || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Interior</span>
                    <p className="font-medium">{vehicle.interiorColor || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Engine</span>
                    <p className="font-medium">{vehicle.engineType || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Transmission</span>
                    <p className="font-medium">{vehicle.transmission}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Drivetrain</span>
                    <p className="font-medium">{vehicle.drivetrain}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Fuel Type</span>
                    <p className="font-medium">{vehicle.fuelType}</p>
                  </div>
                  {vehicle.mpgCity && vehicle.mpgHighway && (
                    <>
                      <div>
                        <span className="text-muted-foreground">City MPG</span>
                        <p className="font-medium">{vehicle.mpgCity}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Highway MPG</span>
                        <p className="font-medium">{vehicle.mpgHighway}</p>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Features */}
            {features.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Features</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {features.slice(0, 8).map((feature: any, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                        <span>{typeof feature === 'string' ? feature : feature.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => onStartDeal(vehicle)}
              disabled={vehicle.status !== 'available'}
              data-testid={`button-modal-start-deal-${vehicle.id}`}
            >
              Start Deal
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Main Inventory Page Component
export default function InventoryPage() {
  const isMobile = useIsMobile();
  const [location, setLocation] = useLocation();
  const searchParams = useSearch();
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);

  // Parse filters from URL
  const [filters, setFilters] = useState<InventoryFilters>(() => {
    const params = new URLSearchParams(searchParams);
    const initialFilters: InventoryFilters = {};
    
    if (params.get('q')) initialFilters.query = params.get('q')!;
    if (params.get('condition')) initialFilters.condition = params.get('condition')!.split(',');
    if (params.get('priceMin')) initialFilters.priceMin = Number(params.get('priceMin'));
    if (params.get('priceMax')) initialFilters.priceMax = Number(params.get('priceMax'));
    if (params.get('yearMin')) initialFilters.yearMin = Number(params.get('yearMin'));
    if (params.get('yearMax')) initialFilters.yearMax = Number(params.get('yearMax'));
    if (params.get('make')) initialFilters.make = params.get('make')!.split(',');
    if (params.get('model')) initialFilters.model = params.get('model')!.split(',');
    if (params.get('fuelType')) initialFilters.fuelType = params.get('fuelType')!.split(',');
    if (params.get('drivetrain')) initialFilters.drivetrain = params.get('drivetrain')!.split(',');
    if (params.get('transmission')) initialFilters.transmission = params.get('transmission')!.split(',');
    if (params.get('sortBy')) initialFilters.sortBy = params.get('sortBy')!;
    
    return initialFilters;
  });

  // Build query string for API
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    
    params.set('page', String(page));
    params.set('pageSize', '12');
    params.set('status', 'available');
    
    if (filters.query) params.set('query', filters.query);
    if (filters.condition?.length === 1) params.set('condition', filters.condition[0]);
    if (filters.priceMin) params.set('priceMin', String(filters.priceMin));
    if (filters.priceMax) params.set('priceMax', String(filters.priceMax));
    if (filters.yearMin) params.set('yearMin', String(filters.yearMin));
    if (filters.yearMax) params.set('yearMax', String(filters.yearMax));
    if (filters.make?.length === 1) params.set('make', filters.make[0]);
    if (filters.model?.length === 1) params.set('model', filters.model[0]);
    
    return params.toString();
  }, [page, filters]);

  // Fetch inventory data
  const { data, isLoading, error, refetch } = useQuery<InventoryResponse>({
    queryKey: ['/api/inventory', buildQueryString()],
    queryFn: async () => {
      const response = await fetch(`/api/inventory/search?${buildQueryString()}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch inventory');
      const vehicles = await response.json();
      return {
        vehicles,
        total: vehicles.length,
        pages: Math.ceil(vehicles.length / 12)
      };
    },
    staleTime: 30000,
  });
  
  // Get toast for notifications
  const { toast } = useToast();
  
  // Get users for salesperson
  const { data: users } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
  });
  
  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: async (vehicleId: string) => {
      const salesperson = users?.find(u => u.role === 'salesperson') || users?.[0];
      if (!salesperson) {
        throw new Error('No users available');
      }
      
      const response = await apiRequest('POST', '/api/deals', {
        salespersonId: salesperson.id,
        vehicleId,
      });
      return await response.json();
    },
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      toast({
        title: 'Deal created',
        description: 'Opening deal worksheet...',
      });
      setLocation(`/deals/${deal.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create deal',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });

  // Update URL when filters change
  const updateURL = useCallback((newFilters: InventoryFilters) => {
    const params = new URLSearchParams();
    
    if (newFilters.query) params.set('q', newFilters.query);
    if (newFilters.condition?.length) params.set('condition', newFilters.condition.join(','));
    if (newFilters.priceMin) params.set('priceMin', String(newFilters.priceMin));
    if (newFilters.priceMax) params.set('priceMax', String(newFilters.priceMax));
    if (newFilters.yearMin) params.set('yearMin', String(newFilters.yearMin));
    if (newFilters.yearMax) params.set('yearMax', String(newFilters.yearMax));
    if (newFilters.make?.length) params.set('make', newFilters.make.join(','));
    if (newFilters.model?.length) params.set('model', newFilters.model.join(','));
    if (newFilters.fuelType?.length) params.set('fuelType', newFilters.fuelType.join(','));
    if (newFilters.drivetrain?.length) params.set('drivetrain', newFilters.drivetrain.join(','));
    if (newFilters.transmission?.length) params.set('transmission', newFilters.transmission.join(','));
    if (newFilters.sortBy) params.set('sortBy', newFilters.sortBy);
    
    const queryString = params.toString();
    setLocation(`/inventory${queryString ? `?${queryString}` : ''}`);
  }, [setLocation]);

  // Debounced search
  const debouncedSearch = useDebouncedCallback((value: string) => {
    const newFilters = { ...filters, query: value || undefined };
    setFilters(newFilters);
    updateURL(newFilters);
    setPage(1);
  }, 500);

  const handleFiltersChange = (newFilters: InventoryFilters) => {
    setFilters(newFilters);
    updateURL(newFilters);
    setPage(1);
  };

  const handleClearFilters = () => {
    setFilters({});
    updateURL({});
    setPage(1);
  };

  const handleViewDetails = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setQuickViewOpen(true);
  };

  const handleStartDeal = (vehicle: Vehicle) => {
    createDealMutation.mutate(vehicle.id);
  };
  
  const handleQuickQuote = (vehicle: Vehicle) => {
    const price = vehicle.internetPrice || vehicle.price;
    setLocation(`/quick-quote?vehiclePrice=${price}&vehicleId=${vehicle.id}`);
  };

  const handleSortChange = (sortBy: string) => {
    const newFilters = { ...filters, sortBy };
    setFilters(newFilters);
    updateURL(newFilters);
  };

  // Sort vehicles based on sortBy filter
  const sortedVehicles = useMemo(() => {
    if (!data?.vehicles) return [];
    
    const vehicles = [...data.vehicles];
    
    switch (filters.sortBy) {
      case 'price_asc':
        return vehicles.sort((a, b) => Number(a.price) - Number(b.price));
      case 'price_desc':
        return vehicles.sort((a, b) => Number(b.price) - Number(a.price));
      case 'year_desc':
        return vehicles.sort((a, b) => b.year - a.year);
      case 'year_asc':
        return vehicles.sort((a, b) => a.year - b.year);
      case 'mileage_asc':
        return vehicles.sort((a, b) => (a.mileage || 0) - (b.mileage || 0));
      case 'mpg_desc':
        return vehicles.sort((a, b) => {
          const mpgA = ((a.mpgCity || 0) + (a.mpgHighway || 0)) / 2;
          const mpgB = ((b.mpgCity || 0) + (b.mpgHighway || 0)) / 2;
          return mpgB - mpgA;
        });
      default:
        return vehicles;
    }
  }, [data?.vehicles, filters.sortBy]);

  // Active filter chips
  const activeFilterChips = useMemo(() => {
    const chips: { label: string; value: string; onRemove: () => void }[] = [];
    
    if (filters.condition?.length) {
      filters.condition.forEach(c => {
        chips.push({
          label: `Condition: ${c}`,
          value: c,
          onRemove: () => handleFiltersChange({
            ...filters,
            condition: filters.condition?.filter(cond => cond !== c)
          })
        });
      });
    }
    
    if (filters.priceMin || filters.priceMax) {
      chips.push({
        label: `Price: $${filters.priceMin || 0} - $${filters.priceMax || '100k+'}`,
        value: 'price',
        onRemove: () => handleFiltersChange({
          ...filters,
          priceMin: undefined,
          priceMax: undefined
        })
      });
    }
    
    if (filters.yearMin || filters.yearMax) {
      chips.push({
        label: `Year: ${filters.yearMin || 2015} - ${filters.yearMax || 2025}`,
        value: 'year',
        onRemove: () => handleFiltersChange({
          ...filters,
          yearMin: undefined,
          yearMax: undefined
        })
      });
    }
    
    if (filters.make?.length) {
      filters.make.forEach(m => {
        chips.push({
          label: `Make: ${m}`,
          value: m,
          onRemove: () => handleFiltersChange({
            ...filters,
            make: filters.make?.filter(make => make !== m)
          })
        });
      });
    }
    
    if (filters.fuelType?.length) {
      filters.fuelType.forEach(f => {
        chips.push({
          label: `Fuel: ${f}`,
          value: f,
          onRemove: () => handleFiltersChange({
            ...filters,
            fuelType: filters.fuelType?.filter(fuel => fuel !== f)
          })
        });
      });
    }
    
    if (filters.drivetrain?.length) {
      filters.drivetrain.forEach(d => {
        chips.push({
          label: `Drivetrain: ${d}`,
          value: d,
          onRemove: () => handleFiltersChange({
            ...filters,
            drivetrain: filters.drivetrain?.filter(drive => drive !== d)
          })
        });
      });
    }
    
    if (filters.transmission?.length) {
      filters.transmission.forEach(t => {
        chips.push({
          label: `Trans: ${t}`,
          value: t,
          onRemove: () => handleFiltersChange({
            ...filters,
            transmission: filters.transmission?.filter(trans => trans !== t)
          })
        });
      });
    }
    
    return chips;
  }, [filters]);

  return (
    <PageLayout className="min-h-screen bg-background max-w-full overflow-x-clip">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl md:text-3xl font-semibold">Vehicle Inventory</h1>
              <div className="flex items-center gap-2">
                <Button
                  size="lg"
                  onClick={() => setLocation('/')}
                  data-testid="button-start-desking"
                  className="hidden md:flex"
                >
                  <FileText className="w-5 h-5 mr-2" />
                  Start Desking
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation('/credit')}
                  data-testid="button-credit-center"
                  className="hidden md:flex"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Credit Center
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation('/vin-decoder')}
                  data-testid="button-vin-decoder"
                  className="hidden md:flex"
                >
                  <Scan className="w-4 h-4 mr-2" />
                  VIN Decoder
                </Button>
                <Select value={filters.sortBy || ''} onValueChange={handleSortChange}>
                  <SelectTrigger className="w-[180px]" data-testid="select-sort">
                    <ArrowUpDown className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="featured">Featured</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
                    <SelectItem value="year_desc">Year: Newest First</SelectItem>
                    <SelectItem value="year_asc">Year: Oldest First</SelectItem>
                    <SelectItem value="mileage_asc">Mileage: Low to High</SelectItem>
                    <SelectItem value="mpg_desc">MPG: Best First</SelectItem>
                  </SelectContent>
                </Select>
                {isMobile && (
                  <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="icon" data-testid="button-mobile-filters">
                        <Filter className="w-4 h-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[80%] p-0">
                      <FilterSidebar
                        filters={filters}
                        onFiltersChange={handleFiltersChange}
                        vehicleCount={data?.total || 0}
                        onClearAll={handleClearFilters}
                      />
                    </SheetContent>
                  </Sheet>
                )}
              </div>
            </div>
            
            {/* Search Bar */}
            <div className="relative max-w-md w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by make, model, or keyword..."
                className="pl-9"
                defaultValue={filters.query}
                onChange={(e) => debouncedSearch(e.target.value)}
                data-testid="input-search"
              />
            </div>
            
            {/* Active Filters */}
            {activeFilterChips.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {activeFilterChips.map((chip, idx) => (
                  <Badge
                    key={`${chip.value}-${idx}`}
                    variant="secondary"
                    className="gap-1 pr-1"
                    data-testid={`chip-filter-${chip.value}`}
                  >
                    {chip.label}
                    <button
                      onClick={chip.onRemove}
                      className="ml-1 hover:bg-muted rounded p-0.5"
                      data-testid={`button-remove-filter-${chip.value}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-3 md:px-4 py-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Desktop Sidebar */}
          {!isMobile && (
            <aside className="w-72 flex-shrink-0">
              <Card className="sticky top-24 h-[calc(100vh-120px)] overflow-hidden">
                <FilterSidebar
                  filters={filters}
                  onFiltersChange={handleFiltersChange}
                  vehicleCount={data?.total || 0}
                  onClearAll={handleClearFilters}
                />
              </Card>
            </aside>
          )}

          {/* Vehicle Grid */}
          <div className="flex-1 min-w-0 overflow-hidden">
            {error ? (
              <Card className="p-12">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <AlertCircle className="w-12 h-12 text-destructive" />
                  <h3 className="text-lg font-semibold">Failed to load inventory</h3>
                  <p className="text-sm text-muted-foreground">
                    There was an error loading the vehicle inventory. Please try again.
                  </p>
                  <Button onClick={() => refetch()} data-testid="button-retry">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              </Card>
            ) : isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <VehicleCardSkeleton key={i} />
                ))}
              </div>
            ) : sortedVehicles.length === 0 ? (
              <Card className="p-12">
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <Car className="w-12 h-12 text-muted-foreground" />
                  <h3 className="text-lg font-semibold">No vehicles found</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    {activeFilterChips.length > 0
                      ? "No vehicles match your current filters. Try adjusting your search criteria."
                      : "No vehicles are currently available in inventory."}
                  </p>
                  {activeFilterChips.length > 0 && (
                    <Button
                      variant="outline"
                      onClick={handleClearFilters}
                      data-testid="button-clear-filters-empty"
                    >
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <>
                {/* Responsive Grid - All Viewports */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sortedVehicles.map((vehicle) => (
                    <VehicleCard
                      key={vehicle.id}
                      vehicle={vehicle}
                      onViewDetails={() => handleViewDetails(vehicle)}
                      onStartDeal={() => handleStartDeal(vehicle)}
                      onQuickQuote={() => handleQuickQuote(vehicle)}
                    />
                  ))}
                </div>
                
                {/* Pagination */}
                {data && data.pages > 1 && (
                  <div className="flex justify-center mt-8 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      data-testid="button-prev-page"
                    >
                      Previous
                    </Button>
                    <div className="flex items-center px-4">
                      <span className="text-sm">
                        Page {page} of {data.pages}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setPage(p => Math.min(data.pages, p + 1))}
                      disabled={page === data.pages}
                      data-testid="button-next-page"
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick View Modal */}
      <VehicleQuickView
        vehicle={selectedVehicle}
        open={quickViewOpen}
        onClose={() => {
          setQuickViewOpen(false);
          setSelectedVehicle(null);
        }}
        onStartDeal={handleStartDeal}
      />
    </PageLayout>
  );
}