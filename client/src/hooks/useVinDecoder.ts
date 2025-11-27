/**
 * VIN Decoder Hook
 *
 * React Query hook for decoding VINs using the NHTSA vPIC API via our backend.
 */

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

/**
 * Decoded vehicle information from NHTSA vPIC API
 */
export interface DecodedVehicleInfo {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  body_class: string;
  drive_type: string;
  engine_model: string;
  engine_cylinders: string;
  engine_displacement: string;
  fuel_type: string;
  transmission: string;
  doors: string;
  vehicle_type: string;
  plant_country: string;
  plant_city: string;
  manufacturer: string;
  error_code?: string;
  error_text?: string;
}

/**
 * Hook to decode a VIN
 *
 * @example
 * ```tsx
 * const decodeVin = useDecodeVin();
 *
 * const handleDecode = async (vin: string) => {
 *   const result = await decodeVin.mutateAsync(vin);
 *   console.log(result.make, result.model, result.year);
 * };
 * ```
 */
export function useDecodeVin() {
  return useMutation({
    mutationFn: async (vin: string): Promise<DecodedVehicleInfo> => {
      return api.post<DecodedVehicleInfo>('/v1/inventory/vehicles/decode-vin', { vin });
    },
  });
}

/**
 * Validates a VIN format (basic client-side validation)
 * Full validation happens server-side
 */
export function isValidVinFormat(vin: string): boolean {
  if (!vin || vin.length !== 17) return false;

  // VINs cannot contain I, O, or Q
  const invalidChars = /[IOQ]/i;
  if (invalidChars.test(vin)) return false;

  // VINs should only contain alphanumeric characters
  const validChars = /^[A-HJ-NPR-Z0-9]{17}$/i;
  return validChars.test(vin);
}

/**
 * Format VIN for display (adds spaces for readability)
 */
export function formatVinDisplay(vin: string): string {
  if (!vin) return '';
  // Format: WMI-VDS-VIS (3-6-8 split)
  const clean = vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/gi, '');
  if (clean.length < 17) return clean;
  return `${clean.slice(0, 3)}-${clean.slice(3, 9)}-${clean.slice(9, 17)}`;
}

/**
 * Clean VIN input (removes invalid characters and converts to uppercase)
 */
export function cleanVinInput(vin: string): string {
  return vin
    .toUpperCase()
    .replace(/[^A-HJ-NPR-Z0-9]/gi, '')
    .slice(0, 17);
}
