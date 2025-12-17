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
      // Load ATIE WASM module
      const wasm = await import('@shared/autoTaxEngine/wasm/tax_engine_rs.js');

      // Get state rules from ATIE
      const stateRulesJson = wasm.get_state_rules(address.state);
      const stateRules = JSON.parse(stateRulesJson);

      // Get rate info if available
      let rateInfo = null;
      try {
        const rateInfoJson = wasm.get_state_rate_info(address.state);
        rateInfo = JSON.parse(rateInfoJson);
      } catch (e) {
        console.warn('[Jurisdiction] Rate info not available, using state rules only');
      }

      // Build jurisdiction info
      const jurisdictionInfo: JurisdictionInfo = {
        stateCode: address.state,
        stateName: getStateName(address.state),
        stateRate: stateRules.state_rate || 0,
        // TODO: When ATIE jurisdiction resolver is ready, get actual local rates
        // For now, use default local rates from state rules
        localRate: 0,
        countyRate: 0,
        cityRate: 0,
        combinedRate: stateRules.state_rate || 0,
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
