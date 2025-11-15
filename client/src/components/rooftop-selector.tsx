/**
 * Rooftop Selector Component
 *
 * Dropdown selector for choosing which dealership location (rooftop) to use
 * for tax calculations. Displays recommended rooftop based on registration state.
 */

import { useQuery } from '@tanstack/react-query';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Info, Star, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RooftopSelectorProps {
  value?: string; // rooftop ID
  onValueChange: (rooftopId: string) => void;
  registrationState?: string; // For recommendations
  className?: string;
  showLabel?: boolean;
  showRecommendation?: boolean;
}

export function RooftopSelector({
  value,
  onValueChange,
  registrationState,
  className,
  showLabel = true,
  showRecommendation = true,
}: RooftopSelectorProps) {
  // Fetch all rooftops
  const { data: rooftopsData, isLoading } = useQuery({
    queryKey: ['/api/rooftops'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch recommended rooftop based on registration state
  const { data: recommendedData } = useQuery({
    queryKey: [`/api/rooftops/recommended`, { registrationState }],
    enabled: showRecommendation && !!registrationState,
    staleTime: 5 * 60 * 1000,
  });

  const rooftops = rooftopsData?.data || [];
  const activeRooftops = rooftops.filter((r: any) => r.isActive);
  const recommended = recommendedData?.data;

  // Auto-select recommended rooftop if none selected
  if (!value && recommended && onValueChange) {
    setTimeout(() => onValueChange(recommended.id), 0);
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading locations...</div>;
  }

  if (activeRooftops.length === 0) {
    return (
      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          No active rooftop locations configured. Contact your administrator.
        </AlertDescription>
      </Alert>
    );
  }

  // If only one rooftop, auto-select it
  if (activeRooftops.length === 1 && !value) {
    setTimeout(() => onValueChange(activeRooftops[0].id), 0);
  }

  return (
    <div className={cn('space-y-2', className)}>
      {showLabel && (
        <Label htmlFor="rooftop-select" className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5" />
          Dealership Location
        </Label>
      )}

      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id="rooftop-select">
          <SelectValue placeholder="Select location..." />
        </SelectTrigger>
        <SelectContent>
          {activeRooftops.map((rooftop: any) => (
            <SelectItem key={rooftop.id} value={rooftop.id}>
              <div className="flex items-center gap-2">
                <span>{rooftop.name}</span>
                {rooftop.isPrimary && (
                  <Badge variant="secondary" className="text-xs gap-1">
                    <Star className="w-2.5 h-2.5" fill="currentColor" />
                    Primary
                  </Badge>
                )}
                {recommended && rooftop.id === recommended.id && (
                  <Badge variant="outline" className="text-xs gap-1 border-green-500 text-green-600">
                    <CheckCircle2 className="w-2.5 h-2.5" />
                    Recommended
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">
                  ({rooftop.dealerStateCode})
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Show recommendation info */}
      {showRecommendation && recommended && registrationState && (
        <p className="text-xs text-muted-foreground">
          {recommended.name} recommended for {registrationState} registration
        </p>
      )}
    </div>
  );
}
