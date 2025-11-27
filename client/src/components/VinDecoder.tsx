/**
 * VIN Decoder Component
 *
 * Decodes VINs using the NHTSA vPIC API and provides auto-fill capability
 * for vehicle forms.
 */

import { useState, useCallback, type JSX, type ChangeEvent } from 'react';
import { Search, Loader2, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { VehicleIcon } from '@/assets/icons/autolytiq';
import { Button, FormInput, FormField } from '@design-system';
import {
  useDecodeVin,
  isValidVinFormat,
  cleanVinInput,
  type DecodedVehicleInfo,
} from '@/hooks/useVinDecoder';
import { cn } from '@/lib/utils';

/**
 * Vehicle data that can be auto-filled from VIN decoding
 */
export interface VinDecodedData {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  bodyClass?: string;
  driveType?: string;
  engineInfo?: string;
  fuelType?: string;
  transmission?: string;
}

/**
 * Props for the VinDecoder component
 */
interface VinDecoderProps {
  /** Initial VIN value */
  initialVin?: string;
  /** Callback when VIN data is successfully decoded and user confirms auto-fill */
  onDecode?: (data: VinDecodedData) => void;
  /** Callback when VIN value changes */
  onVinChange?: (vin: string) => void;
  /** Whether the component is in a disabled state */
  disabled?: boolean;
  /** Error message from external validation */
  error?: string;
  /** Show compact version (inline with form) */
  compact?: boolean;
  /** Label for the VIN input */
  label?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Decoded info display row
 */
function InfoRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string | number | undefined;
  className?: string;
}): JSX.Element | null {
  if (!value) return null;
  return (
    <div className={cn('flex items-center justify-between py-1', className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

/**
 * VIN Decoder Component
 *
 * Provides a VIN input field with decode functionality that fetches vehicle
 * information from the NHTSA vPIC API. When decoded successfully, displays
 * the vehicle information and allows the user to auto-fill a parent form.
 */
// eslint-disable-next-line complexity
export function VinDecoder({
  initialVin = '',
  onDecode,
  onVinChange,
  disabled = false,
  error,
  compact = false,
  label = 'VIN',
  required = false,
  placeholder = '1HGCM82633A123456',
}: VinDecoderProps): JSX.Element {
  const [vin, setVin] = useState(initialVin);
  const [decodedInfo, setDecodedInfo] = useState<DecodedVehicleInfo | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const decodeVin = useDecodeVin();

  const isValidVin = isValidVinFormat(vin);
  const canDecode = isValidVin && !disabled && !decodeVin.isPending;

  // Handle VIN input change
  const handleVinChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const cleanedVin = cleanVinInput(e.target.value);
      setVin(cleanedVin);
      setDecodedInfo(null);
      onVinChange?.(cleanedVin);
    },
    [onVinChange]
  );

  // Handle decode button click
  const handleDecode = useCallback(async () => {
    if (!canDecode) return;

    try {
      const result = await decodeVin.mutateAsync(vin);
      setDecodedInfo(result);
      setShowDetails(true);
    } catch {
      // Error handled by mutation state
      setDecodedInfo(null);
    }
  }, [canDecode, vin, decodeVin]);

  // Handle auto-fill button click
  const handleAutoFill = useCallback(() => {
    if (!decodedInfo || !onDecode) return;

    // Build engine info string
    const engineParts: string[] = [];
    if (decodedInfo.engine_displacement) engineParts.push(decodedInfo.engine_displacement);
    if (decodedInfo.engine_cylinders) engineParts.push(`${decodedInfo.engine_cylinders}-cyl`);
    if (decodedInfo.engine_model) engineParts.push(decodedInfo.engine_model);

    const data: VinDecodedData = {
      vin: decodedInfo.vin,
      year: decodedInfo.year,
      make: decodedInfo.make,
      model: decodedInfo.model,
      trim: decodedInfo.trim || undefined,
      bodyClass: decodedInfo.body_class || undefined,
      driveType: decodedInfo.drive_type || undefined,
      engineInfo: engineParts.length > 0 ? engineParts.join(' ') : undefined,
      fuelType: decodedInfo.fuel_type || undefined,
      transmission: decodedInfo.transmission || undefined,
    };

    onDecode(data);
  }, [decodedInfo, onDecode]);

  // Determine status icon
  const getStatusIcon = (): JSX.Element | null => {
    if (decodeVin.isPending) {
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
    if (decodeVin.isError) {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    if (decodedInfo) {
      return <CheckCircle className="h-4 w-4 text-success" />;
    }
    return null;
  };

  // Compact layout (single row with input and decode button)
  if (compact) {
    return (
      <div className="space-y-2">
        <FormField label={label} error={error || decodeVin.error?.message} required={required}>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <FormInput
                value={vin}
                onChange={handleVinChange}
                placeholder={placeholder}
                maxLength={17}
                disabled={disabled}
                error={!!error || decodeVin.isError}
                className="pr-8 font-mono uppercase"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">{getStatusIcon()}</div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleDecode}
              disabled={!canDecode}
              className="shrink-0"
            >
              {decodeVin.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">Decode</span>
            </Button>
          </div>
        </FormField>

        {/* Decoded info summary and auto-fill */}
        {decodedInfo && decodedInfo.year > 0 && (
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <VehicleIcon size={16} className="text-muted-foreground" />
                <span className="text-sm font-medium">
                  {decodedInfo.year} {decodedInfo.make} {decodedInfo.model}
                  {decodedInfo.trim && ` ${decodedInfo.trim}`}
                </span>
              </div>
              {onDecode && (
                <Button type="button" size="sm" onClick={handleAutoFill}>
                  Auto-Fill
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Error message */}
        {decodeVin.isError && (
          <p className="text-sm text-destructive">
            Failed to decode VIN. Please check the VIN and try again.
          </p>
        )}

        {/* Warning for partial data */}
        {decodedInfo?.error_code && decodedInfo.error_code !== '0' && (
          <div className="flex items-start gap-2 text-sm text-warning">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Some vehicle information may be incomplete.</span>
          </div>
        )}
      </div>
    );
  }

  // Full layout with expandable details
  return (
    <div className="space-y-4">
      {/* VIN Input */}
      <FormField label={label} error={error || decodeVin.error?.message} required={required}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <FormInput
              value={vin}
              onChange={handleVinChange}
              placeholder={placeholder}
              maxLength={17}
              disabled={disabled}
              error={!!error || decodeVin.isError}
              className="pr-8 font-mono uppercase"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">{getStatusIcon()}</div>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleDecode}
            disabled={!canDecode}
            className="shrink-0"
          >
            {decodeVin.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span className="ml-2">Decode VIN</span>
          </Button>
        </div>
      </FormField>

      {/* VIN character count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {vin.length}/17 characters
          {vin.length === 17 && !isValidVin && ' (invalid format)'}
        </span>
        {vin.length > 0 && vin.length < 17 && <span>{17 - vin.length} more characters needed</span>}
      </div>

      {/* Decoded vehicle information card */}
      {decodedInfo && decodedInfo.year > 0 && (
        <div className="rounded-lg border border-border bg-card shadow-sm">
          {/* Header with vehicle summary */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <VehicleIcon size={20} className="text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground">
                  {decodedInfo.year} {decodedInfo.make} {decodedInfo.model}
                </h4>
                {decodedInfo.trim && (
                  <p className="text-sm text-muted-foreground">{decodedInfo.trim}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
              >
                {showDetails ? 'Hide Details' : 'Show Details'}
              </Button>
              {onDecode && (
                <Button type="button" size="sm" onClick={handleAutoFill}>
                  Auto-Fill Form
                </Button>
              )}
            </div>
          </div>

          {/* Expandable details */}
          {showDetails && (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2">
              {/* Basic Info */}
              <div className="space-y-1">
                <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Basic Information
                </h5>
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <InfoRow label="Year" value={decodedInfo.year} />
                  <InfoRow label="Make" value={decodedInfo.make} />
                  <InfoRow label="Model" value={decodedInfo.model} />
                  <InfoRow label="Trim" value={decodedInfo.trim} />
                  <InfoRow label="Body Style" value={decodedInfo.body_class} />
                  <InfoRow label="Vehicle Type" value={decodedInfo.vehicle_type} />
                  <InfoRow label="Doors" value={decodedInfo.doors} />
                </div>
              </div>

              {/* Powertrain */}
              <div className="space-y-1">
                <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Powertrain
                </h5>
                <div className="rounded-md border border-border bg-muted/20 p-3">
                  <InfoRow label="Engine" value={decodedInfo.engine_model} />
                  <InfoRow label="Cylinders" value={decodedInfo.engine_cylinders} />
                  <InfoRow label="Displacement" value={decodedInfo.engine_displacement} />
                  <InfoRow label="Fuel Type" value={decodedInfo.fuel_type} />
                  <InfoRow label="Transmission" value={decodedInfo.transmission} />
                  <InfoRow label="Drive Type" value={decodedInfo.drive_type} />
                </div>
              </div>

              {/* Manufacturing */}
              {(decodedInfo.manufacturer || decodedInfo.plant_country) && (
                <div className="space-y-1 sm:col-span-2">
                  <h5 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Manufacturing
                  </h5>
                  <div className="rounded-md border border-border bg-muted/20 p-3">
                    <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
                      <InfoRow label="Manufacturer" value={decodedInfo.manufacturer} />
                      <InfoRow label="Plant Country" value={decodedInfo.plant_country} />
                      <InfoRow label="Plant City" value={decodedInfo.plant_city} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Warning for partial data */}
          {decodedInfo.error_code && decodedInfo.error_code !== '0' && (
            <div className="flex items-start gap-2 border-t border-border bg-warning/5 p-3 text-sm text-warning">
              <Info className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Some information may be incomplete or unavailable for this VIN.
                {decodedInfo.error_text && ` (${decodedInfo.error_text})`}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {decodeVin.isError && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Failed to decode VIN</p>
            <p className="text-destructive/80">
              Please verify the VIN is correct and try again. The NHTSA database may not have
              information for all vehicles.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default VinDecoder;
