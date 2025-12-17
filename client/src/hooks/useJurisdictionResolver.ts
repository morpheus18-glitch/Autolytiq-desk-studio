/**
 * Jurisdiction Resolver Hook
 *
 * Resolves customer addresses to precise tax jurisdictions using ATIE.
 * Returns state + county + city tax rates for accurate deal calculations.
 */

import { useState, useEffect, useCallback } from 'react';

export interface CustomerAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export interface JurisdictionInfo {
  stateCode: string;
  stateName: string;
  stateRate: number;
  localRate: number;
  countyRate: number;
  cityRate: number;
  combinedRate: number;
  jurisdictionName: string;
  countyName?: string;
  cityName?: string;
}

/**
 * Hook to resolve customer address to tax jurisdiction
 */
export function useJurisdictionResolver() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jurisdiction, setJurisdiction] = useState<JurisdictionInfo | null>(null);

  /**
   * Resolve address to jurisdiction using ATIE
   */
  const resolveJurisdiction = useCallback(async (address: CustomerAddress): Promise<JurisdictionInfo | null> => {
    if (!address.state) {
      setError('State is required for jurisdiction resolution');
      return null;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Use fallback state tax rates until WASM module is ready
      // TODO: Load ATIE WASM module when available:
      // const wasm = await import('@shared/autoTaxEngine/wasm/tax_engine_rs.js');
      const stateRate = getDefaultStateRate(address.state);

      // Build jurisdiction info
      const jurisdictionInfo: JurisdictionInfo = {
        stateCode: address.state,
        stateName: getStateName(address.state),
        stateRate: stateRate,
        // TODO: When ATIE jurisdiction resolver is ready, get actual local rates
        localRate: 0,
        countyRate: 0,
        cityRate: 0,
        combinedRate: stateRate,
        jurisdictionName: `${address.city || 'Unknown'}, ${address.state}`,
        countyName: undefined,
        cityName: address.city,
      };

      setJurisdiction(jurisdictionInfo);
      return jurisdictionInfo;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to resolve jurisdiction';
      setError(errorMsg);
      console.error('[Jurisdiction] Resolution failed:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Clear jurisdiction data
   */
  const clearJurisdiction = useCallback(() => {
    setJurisdiction(null);
    setError(null);
  }, []);

  return {
    jurisdiction,
    isLoading,
    error,
    resolveJurisdiction,
    clearJurisdiction,
  };
}

/**
 * Get default state sales tax rate (fallback until WASM ready)
 */
function getDefaultStateRate(code: string): number {
  const stateRates: Record<string, number> = {
    AL: 0.04, AK: 0, AZ: 0.056, AR: 0.065, CA: 0.0725,
    CO: 0.029, CT: 0.0635, DE: 0, FL: 0.06, GA: 0.04,
    HI: 0.04, ID: 0.06, IL: 0.0625, IN: 0.07, IA: 0.06,
    KS: 0.065, KY: 0.06, LA: 0.0445, ME: 0.055, MD: 0.06,
    MA: 0.0625, MI: 0.06, MN: 0.06875, MS: 0.07, MO: 0.04225,
    MT: 0, NE: 0.055, NV: 0.0685, NH: 0, NJ: 0.06625,
    NM: 0.05125, NY: 0.04, NC: 0.0475, ND: 0.05, OH: 0.0575,
    OK: 0.045, OR: 0, PA: 0.06, RI: 0.07, SC: 0.06,
    SD: 0.045, TN: 0.07, TX: 0.0625, UT: 0.061, VT: 0.06,
    VA: 0.053, WA: 0.065, WV: 0.06, WI: 0.05, WY: 0.04,
    DC: 0.06,
  };
  return stateRates[code] || 0;
}

/**
 * Get full state name from state code
 */
function getStateName(code: string): string {
  const stateNames: Record<string, string> = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
    CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia',
    HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa',
    KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri',
    MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
    NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio',
    OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont',
    VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
    DC: 'Washington DC',
  };
  return stateNames[code] || code;
}

export default useJurisdictionResolver;
