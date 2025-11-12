import { z } from 'zod';

// VIN validation regex - alphanumeric excluding I, O, Q (invalid VIN characters)
const VIN_REGEX = /^[A-HJ-NPR-Z0-9]{17}$/;

// VIN check digit calculation weights
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

// Character to number mapping for check digit calculation
const VIN_CHAR_VALUES: Record<string, number> = {
  'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 6, 'G': 7, 'H': 8,
  'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'P': 7, 'R': 9,
  'S': 2, 'T': 3, 'U': 4, 'V': 5, 'W': 6, 'X': 7, 'Y': 8, 'Z': 9,
  '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9
};

// Decoded vehicle data schema
export const decodedVehicleSchema = z.object({
  vin: z.string(),
  make: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
  trim: z.string().optional(),
  bodyClass: z.string().optional(),
  bodyType: z.string().optional(),
  doors: z.number().optional(),
  drivetrain: z.string().optional(),
  engineDisplacement: z.string().optional(),
  engineCylinders: z.number().optional(),
  engineModel: z.string().optional(),
  fuelType: z.string().optional(),
  transmission: z.string().optional(),
  gvwr: z.string().optional(),
  manufacturer: z.string().optional(),
  plant: z.string().optional(),
  vehicleType: z.string().optional(),
  series: z.string().optional(),
  
  // Colors
  exteriorColor: z.string().optional(),
  interiorColor: z.string().optional(),
  
  // Safety features
  airbags: z.array(z.string()).optional(),
  abs: z.boolean().optional(),
  tpms: z.boolean().optional(),
  esc: z.boolean().optional(),
  
  // Additional info
  msrp: z.string().optional(),
  basePrice: z.string().optional(),
  suggestedVIN: z.string().optional(),
  errorCode: z.string().optional(),
  errorText: z.string().optional(),
  decodedAt: z.string()
});

export type DecodedVehicle = z.infer<typeof decodedVehicleSchema>;

// Cache for decoded VINs
const vinCache = new Map<string, DecodedVehicle>();
const MAX_CACHE_SIZE = 100;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Recent VINs history (stored in localStorage)
const RECENT_VINS_KEY = 'recentDecodedVINs';
const MAX_RECENT_VINS = 10;

export class VINDecoder {
  /**
   * Validates VIN format and check digit
   */
  static validateVIN(vin: string): { isValid: boolean; error?: string } {
    if (!vin) {
      return { isValid: false, error: 'VIN is required' };
    }

    const cleanVIN = vin.toUpperCase().trim();
    
    if (cleanVIN.length !== 17) {
      return { isValid: false, error: 'VIN must be exactly 17 characters' };
    }

    if (!VIN_REGEX.test(cleanVIN)) {
      return { isValid: false, error: 'VIN contains invalid characters (I, O, Q are not allowed)' };
    }

    // Validate check digit (9th position)
    const checkDigit = this.calculateCheckDigit(cleanVIN);
    const providedCheckDigit = cleanVIN[8];
    
    if (checkDigit !== providedCheckDigit) {
      // Some VINs might not follow the check digit rule, so we'll warn but not fail
      console.warn(`VIN check digit mismatch: expected ${checkDigit}, got ${providedCheckDigit}`);
    }

    return { isValid: true };
  }

  /**
   * Calculate the check digit for VIN validation
   */
  private static calculateCheckDigit(vin: string): string {
    let sum = 0;
    
    for (let i = 0; i < 17; i++) {
      const char = vin[i];
      const value = VIN_CHAR_VALUES[char] || 0;
      sum += value * VIN_WEIGHTS[i];
    }
    
    const remainder = sum % 11;
    return remainder === 10 ? 'X' : remainder.toString();
  }

  /**
   * Format VIN for display (uppercase, remove spaces)
   */
  static formatVIN(vin: string): string {
    return vin.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
  }

  /**
   * Decode VIN using NHTSA API
   */
  static async decode(vin: string): Promise<DecodedVehicle> {
    const cleanVIN = this.formatVIN(vin);
    
    // Validate VIN first
    const validation = this.validateVIN(cleanVIN);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Check cache
    const cached = this.getCached(cleanVIN);
    if (cached) {
      return cached;
    }

    try {
      // Call backend API which will proxy to NHTSA
      const response = await fetch('/api/vin/decode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ vin: cleanVIN })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to decode VIN');
      }

      const data = await response.json();
      
      // Cache the result
      this.cache(cleanVIN, data);
      
      // Add to recent history
      this.addToRecent(cleanVIN, data);
      
      return data;
    } catch (error) {
      console.error('VIN decode error:', error);
      throw error;
    }
  }

  /**
   * Get cached VIN data
   */
  private static getCached(vin: string): DecodedVehicle | null {
    const cached = vinCache.get(vin);
    
    if (cached) {
      const age = Date.now() - new Date(cached.decodedAt).getTime();
      if (age < CACHE_TTL) {
        return cached;
      }
      // Remove expired cache
      vinCache.delete(vin);
    }
    
    return null;
  }

  /**
   * Cache decoded VIN data
   */
  private static cache(vin: string, data: DecodedVehicle): void {
    // Implement LRU cache
    if (vinCache.size >= MAX_CACHE_SIZE) {
      const firstKey = vinCache.keys().next().value;
      if (firstKey) {
        vinCache.delete(firstKey);
      }
    }
    
    vinCache.set(vin, data);
  }

  /**
   * Add VIN to recent history
   */
  private static addToRecent(vin: string, data: DecodedVehicle): void {
    try {
      const stored = localStorage.getItem(RECENT_VINS_KEY);
      let recent: Array<{ vin: string; data: DecodedVehicle; timestamp: string }> = stored ? JSON.parse(stored) : [];
      
      // Remove if already exists
      recent = recent.filter(item => item.vin !== vin);
      
      // Add to beginning
      recent.unshift({
        vin,
        data,
        timestamp: new Date().toISOString()
      });
      
      // Limit size
      recent = recent.slice(0, MAX_RECENT_VINS);
      
      localStorage.setItem(RECENT_VINS_KEY, JSON.stringify(recent));
    } catch (error) {
      console.error('Failed to save to recent VINs:', error);
    }
  }

  /**
   * Get recent VINs history
   */
  static getRecentVINs(): Array<{ vin: string; data: DecodedVehicle; timestamp: string }> {
    try {
      const stored = localStorage.getItem(RECENT_VINS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get recent VINs:', error);
      return [];
    }
  }

  /**
   * Clear recent VINs history
   */
  static clearRecentVINs(): void {
    localStorage.removeItem(RECENT_VINS_KEY);
  }

  /**
   * Parse NHTSA API response to our schema
   */
  static parseNHTSAResponse(results: any[]): Partial<DecodedVehicle> {
    const getValue = (variableId: number): string | undefined => {
      const result = results.find(r => r.VariableId === variableId);
      return result?.Value && result.Value !== 'Not Applicable' ? result.Value : undefined;
    };

    const getValueByName = (name: string): string | undefined => {
      const result = results.find(r => r.Variable === name);
      return result?.Value && result.Value !== 'Not Applicable' ? result.Value : undefined;
    };

    // Parse safety features
    const airbags: string[] = [];
    const airbagLocations = [
      'Curtain', 'Front', 'Knee', 'Side', 'Driver', 'Passenger'
    ];
    
    for (const location of airbagLocations) {
      const value = getValueByName(`${location} Air Bag Locations`);
      if (value) {
        airbags.push(`${location}: ${value}`);
      }
    }

    return {
      make: getValueByName('Make'),
      model: getValueByName('Model'),
      year: getValueByName('Model Year') ? parseInt(getValueByName('Model Year')!) : undefined,
      trim: getValueByName('Trim') || getValueByName('Series'),
      bodyClass: getValueByName('Body Class'),
      bodyType: getValueByName('Body Class'),
      doors: getValueByName('Doors') ? parseInt(getValueByName('Doors')!) : undefined,
      drivetrain: getValueByName('Drive Type'),
      engineDisplacement: getValueByName('Displacement (L)'),
      engineCylinders: getValueByName('Engine Number of Cylinders') ? parseInt(getValueByName('Engine Number of Cylinders')!) : undefined,
      engineModel: getValueByName('Engine Model'),
      fuelType: getValueByName('Fuel Type - Primary'),
      transmission: getValueByName('Transmission Style'),
      gvwr: getValueByName('Gross Vehicle Weight Rating From'),
      manufacturer: getValueByName('Manufacturer Name'),
      plant: `${getValueByName('Plant City')}, ${getValueByName('Plant State')} ${getValueByName('Plant Country')}`.replace(/, undefined/g, '').replace(/undefined/g, '').trim(),
      vehicleType: getValueByName('Vehicle Type'),
      series: getValueByName('Series'),
      
      // Colors
      exteriorColor: getValueByName('Exterior Color'),
      interiorColor: getValueByName('Interior Color'),
      
      // Safety features
      airbags: airbags.length > 0 ? airbags : undefined,
      abs: getValueByName('ABS') === 'Standard',
      tpms: getValueByName('TPMS') === 'Direct' || getValueByName('TPMS') === 'Indirect',
      esc: getValueByName('Electronic Stability Control (ESC)') === 'Standard',
      
      // Pricing (NHTSA doesn't provide this, would need another API)
      msrp: getValueByName('Base Price'),
      suggestedVIN: getValueByName('Suggested VIN'),
      errorCode: getValueByName('Error Code'),
      errorText: getValueByName('Error Text'),
    };
  }

  /**
   * Create display-friendly text for decoded vehicle
   */
  static getDisplayText(data: DecodedVehicle): string {
    const parts = [];
    
    if (data.year) parts.push(data.year);
    if (data.make) parts.push(data.make);
    if (data.model) parts.push(data.model);
    if (data.trim) parts.push(data.trim);
    
    return parts.join(' ') || 'Unknown Vehicle';
  }

  /**
   * Get engine description
   */
  static getEngineDescription(data: DecodedVehicle): string {
    const parts = [];
    
    if (data.engineDisplacement) {
      parts.push(`${data.engineDisplacement}L`);
    }
    
    if (data.engineCylinders) {
      const cylinderConfig = data.engineCylinders <= 4 ? 'I' : data.engineCylinders === 6 ? 'V' : 'V';
      parts.push(`${cylinderConfig}${data.engineCylinders}`);
    }
    
    if (data.fuelType) {
      parts.push(data.fuelType);
    }
    
    return parts.join(' ') || 'Engine details not available';
  }
}