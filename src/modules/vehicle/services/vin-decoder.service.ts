/**
 * VIN DECODER SERVICE
 * Validates and decodes VINs using NHTSA API
 */

import {
  InvalidVINError,
  VINDecodingError,
  type VINDecodeResult,
  type VINValidationResult,
} from '../types/vehicle.types';

/**
 * VIN Decoder Service
 * Provides VIN validation and decoding capabilities
 */
export class VINDecoderService {
  private readonly NHTSA_API_BASE = 'https://vpic.nhtsa.dot.gov/api';
  private readonly REQUEST_TIMEOUT = 10000; // 10 seconds
  private cache: Map<string, { result: VINDecodeResult; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Validate VIN format and check digit
   */
  validateVIN(vin: string): VINValidationResult {
    // VIN must be exactly 17 characters
    if (!vin || vin.length !== 17) {
      return {
        valid: false,
        error: 'VIN must be exactly 17 characters',
      };
    }

    // Convert to uppercase
    const normalizedVIN = vin.toUpperCase();

    // VIN cannot contain I, O, or Q
    if (/[IOQ]/.test(normalizedVIN)) {
      return {
        valid: false,
        error: 'VIN cannot contain the letters I, O, or Q',
      };
    }

    // VIN must be alphanumeric
    if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(normalizedVIN)) {
      return {
        valid: false,
        error: 'VIN contains invalid characters',
      };
    }

    // Validate check digit
    const checkDigitValid = this.validateCheckDigit(normalizedVIN);
    if (!checkDigitValid) {
      return {
        valid: false,
        error: 'Invalid VIN check digit (position 9)',
        checkDigitValid: false,
      };
    }

    return {
      valid: true,
      checkDigitValid: true,
    };
  }

  /**
   * Validate VIN check digit using ISO 3779 algorithm
   */
  private validateCheckDigit(vin: string): boolean {
    const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
    const transliteration: Record<string, number> = {
      A: 1,
      B: 2,
      C: 3,
      D: 4,
      E: 5,
      F: 6,
      G: 7,
      H: 8,
      J: 1,
      K: 2,
      L: 3,
      M: 4,
      N: 5,
      P: 7,
      R: 9,
      S: 2,
      T: 3,
      U: 4,
      V: 5,
      W: 6,
      X: 7,
      Y: 8,
      Z: 9,
    };

    let sum = 0;
    for (let i = 0; i < 17; i++) {
      const char = vin[i];
      const value = /\d/.test(char) ? parseInt(char, 10) : transliteration[char] || 0;
      sum += value * weights[i];
    }

    const remainder = sum % 11;
    const checkDigit = remainder === 10 ? 'X' : remainder.toString();

    return checkDigit === vin[8];
  }

  /**
   * Calculate expected check digit for a VIN
   * Useful for VIN generation or validation
   */
  calculateCheckDigit(vinWithoutCheckDigit: string): string {
    if (vinWithoutCheckDigit.length !== 16 && vinWithoutCheckDigit.length !== 17) {
      throw new InvalidVINError('VIN must be 16 or 17 characters for check digit calculation');
    }

    // If 17 characters, replace position 9 with 0 temporarily
    const vinBase =
      vinWithoutCheckDigit.length === 17
        ? vinWithoutCheckDigit.substring(0, 8) + '0' + vinWithoutCheckDigit.substring(9)
        : vinWithoutCheckDigit.substring(0, 8) + '0' + vinWithoutCheckDigit.substring(8);

    const weights = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
    const transliteration: Record<string, number> = {
      A: 1,
      B: 2,
      C: 3,
      D: 4,
      E: 5,
      F: 6,
      G: 7,
      H: 8,
      J: 1,
      K: 2,
      L: 3,
      M: 4,
      N: 5,
      P: 7,
      R: 9,
      S: 2,
      T: 3,
      U: 4,
      V: 5,
      W: 6,
      X: 7,
      Y: 8,
      Z: 9,
    };

    let sum = 0;
    for (let i = 0; i < 17; i++) {
      const char = vinBase[i];
      const value = /\d/.test(char) ? parseInt(char, 10) : transliteration[char] || 0;
      sum += value * weights[i];
    }

    const remainder = sum % 11;
    return remainder === 10 ? 'X' : remainder.toString();
  }

  /**
   * Decode VIN using NHTSA API
   * Returns detailed vehicle information
   */
  async decodeVIN(vin: string, options?: { useCache?: boolean }): Promise<VINDecodeResult> {
    // Validate VIN first
    const validation = this.validateVIN(vin);
    if (!validation.valid) {
      throw new InvalidVINError(validation.error || 'Invalid VIN');
    }

    const normalizedVIN = vin.toUpperCase();

    // Check cache
    if (options?.useCache !== false) {
      const cached = this.getCachedResult(normalizedVIN);
      if (cached) {
        return cached;
      }
    }

    try {
      // Call NHTSA API
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

      const response = await fetch(
        `${this.NHTSA_API_BASE}/vehicles/DecodeVin/${normalizedVIN}?format=json`,
        {
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        throw new VINDecodingError(
          `NHTSA API request failed: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      // Parse NHTSA response
      const result = this.parseNHTSAResponse(normalizedVIN, data);

      // Cache result
      this.cacheResult(normalizedVIN, result);

      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new VINDecodingError('VIN decoding request timed out');
      }

      if (error instanceof VINDecodingError || error instanceof InvalidVINError) {
        throw error;
      }

      throw new VINDecodingError(
        `Failed to decode VIN: ${error.message || 'Unknown error'}`
      );
    }
  }

  /**
   * Decode multiple VINs in batch
   * NHTSA API supports batch decoding
   */
  async decodeVINBatch(vins: string[]): Promise<VINDecodeResult[]> {
    if (vins.length === 0) {
      return [];
    }

    if (vins.length > 50) {
      throw new VINDecodingError('Batch decode limited to 50 VINs at a time');
    }

    // Validate all VINs first
    const normalizedVINs: string[] = [];
    for (const vin of vins) {
      const validation = this.validateVIN(vin);
      if (!validation.valid) {
        throw new InvalidVINError(`Invalid VIN: ${vin} - ${validation.error}`);
      }
      normalizedVINs.push(vin.toUpperCase());
    }

    try {
      const vinString = normalizedVINs.join(';');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT * 2);

      const response = await fetch(
        `${this.NHTSA_API_BASE}/vehicles/DecodeVINValuesBatch/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `format=json&data=${vinString}`,
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);

      if (!response.ok) {
        throw new VINDecodingError(`NHTSA API request failed: ${response.status}`);
      }

      const data = await response.json();
      const results: VINDecodeResult[] = [];

      if (data.Results && Array.isArray(data.Results)) {
        for (const result of data.Results) {
          const decoded = this.parseBatchResult(result);
          this.cacheResult(decoded.vin, decoded);
          results.push(decoded);
        }
      }

      return results;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new VINDecodingError('Batch VIN decoding request timed out');
      }

      if (error instanceof VINDecodingError) {
        throw error;
      }

      throw new VINDecodingError(`Failed to decode VINs: ${error.message}`);
    }
  }

  /**
   * Parse NHTSA API response (DecodeVin endpoint)
   */
  private parseNHTSAResponse(vin: string, data: Record<string, unknown>): VINDecodeResult {
    const results = data.Results || [];
    const errors: string[] = [];
    const warnings: string[] = [];

    // Helper to find value by variable name
    const findValue = (variableName: string): string | undefined => {
      const item = results.find((r: Record<string, unknown>) => r.Variable === variableName);
      return item?.Value || undefined;
    };

    // Check for errors
    const errorCode = findValue('Error Code');
    const errorText = findValue('Error Text');
    if (errorCode && errorCode !== '0' && errorText) {
      errors.push(errorText);
    }

    // Extract vehicle details
    const year = findValue('Model Year');
    const make = findValue('Make');
    const model = findValue('Model');

    return {
      valid: errors.length === 0,
      vin,
      year: year ? parseInt(year, 10) : undefined,
      make: make || undefined,
      model: model || undefined,
      trim: findValue('Trim') || findValue('Series') || undefined,
      bodyStyle: findValue('Body Class') || undefined,
      engine:
        findValue('Engine Model') ||
        findValue('Displacement (L)') ||
        findValue('Engine Number of Cylinders')
          ? `${findValue('Engine Number of Cylinders')} cylinder`
          : undefined,
      transmission: findValue('Transmission Style') || undefined,
      drivetrain: findValue('Drive Type') || undefined,
      fuelType: findValue('Fuel Type - Primary') || undefined,
      manufacturerName: findValue('Manufacturer Name') || undefined,
      plantCountry: findValue('Plant Country') || undefined,
      plantCity: findValue('Plant City') || undefined,
      plantState: findValue('Plant State') || undefined,
      series: findValue('Series') || undefined,
      vehicleType: findValue('Vehicle Type') || undefined,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Parse batch decode result
   */
  private parseBatchResult(result: Record<string, unknown>): VINDecodeResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const errorCode = result.ErrorCode;
    const errorText = result.ErrorText;
    if (errorCode && errorCode !== '0' && errorText) {
      errors.push(errorText);
    }

    return {
      valid: errors.length === 0,
      vin: result.VIN || '',
      year: result.ModelYear ? parseInt(result.ModelYear, 10) : undefined,
      make: result.Make || undefined,
      model: result.Model || undefined,
      trim: result.Trim || result.Series || undefined,
      bodyStyle: result.BodyClass || undefined,
      engine: result.EngineCylinders ? `${result.EngineCylinders} cylinder` : undefined,
      transmission: result.TransmissionStyle || undefined,
      drivetrain: result.DriveType || undefined,
      fuelType: result.FuelTypePrimary || undefined,
      manufacturerName: result.Manufacturer || undefined,
      plantCountry: result.PlantCountry || undefined,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Get cached decode result
   */
  private getCachedResult(vin: string): VINDecodeResult | null {
    const cached = this.cache.get(vin);
    if (!cached) {
      return null;
    }

    // Check if cache is expired
    const now = Date.now();
    if (now - cached.timestamp > this.CACHE_TTL) {
      this.cache.delete(vin);
      return null;
    }

    return cached.result;
  }

  /**
   * Cache decode result
   */
  private cacheResult(vin: string, result: VINDecodeResult): void {
    this.cache.set(vin, {
      result,
      timestamp: Date.now(),
    });

    // Prevent cache from growing unbounded
    if (this.cache.size > 1000) {
      // Remove oldest 100 entries
      let removed = 0;
      for (const key of this.cache.keys()) {
        this.cache.delete(key);
        removed++;
        if (removed >= 100) break;
      }
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxAge: number } {
    return {
      size: this.cache.size,
      maxAge: this.CACHE_TTL,
    };
  }

  /**
   * Extract manufacturer from VIN
   * First 3 characters are World Manufacturer Identifier (WMI)
   */
  getManufacturerCode(vin: string): string {
    const validation = this.validateVIN(vin);
    if (!validation.valid) {
      throw new InvalidVINError(validation.error || 'Invalid VIN');
    }
    return vin.toUpperCase().substring(0, 3);
  }

  /**
   * Extract model year from VIN
   * Position 10 indicates model year
   */
  getModelYearFromVIN(vin: string): number | null {
    const validation = this.validateVIN(vin);
    if (!validation.valid) {
      return null;
    }

    const yearCode = vin[9].toUpperCase();
    const yearMap: Record<string, number> = {
      A: 2010,
      B: 2011,
      C: 2012,
      D: 2013,
      E: 2014,
      F: 2015,
      G: 2016,
      H: 2017,
      J: 2018,
      K: 2019,
      L: 2020,
      M: 2021,
      N: 2022,
      P: 2023,
      R: 2024,
      S: 2025,
      T: 2026,
      V: 2027,
      W: 2028,
      X: 2029,
      Y: 2030,
      1: 2001,
      2: 2002,
      3: 2003,
      4: 2004,
      5: 2005,
      6: 2006,
      7: 2007,
      8: 2008,
      9: 2009,
    };

    return yearMap[yearCode] || null;
  }
}
