/**
 * Aftermarket Products Parser
 *
 * Utility to extract and categorize aftermarket products from the JSONB field
 * for accurate tax calculations.
 */

import type { AftermarketProduct } from '../schema';

export interface ExtractedAftermarketValues {
  // Product totals (by category)
  warrantyAmount: number;
  gapInsurance: number;
  maintenanceAmount: number;
  accessoriesAmount: number; // Physical items like tint, bedliner, etc.

  // Detailed breakdown
  products: AftermarketProduct[];

  // Tax-related
  taxableTotal: number;
  nonTaxableTotal: number;

  // Category breakdown
  byCategory: {
    warranty: number;
    gap: number;
    maintenance: number;
    tire_wheel: number;
    theft: number;
    paint_protection: number;
    window_tint: number;
    bedliner: number;
    etch: number;
    custom: number;
  };
}

/**
 * Parse aftermarket products from JSONB field
 */
export function parseAftermarketProducts(
  aftermarketData: unknown
): AftermarketProduct[] {
  // Handle null, undefined, or empty
  if (!aftermarketData) {
    return [];
  }

  // Handle string (JSON)
  if (typeof aftermarketData === 'string') {
    try {
      const parsed = JSON.parse(aftermarketData);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('[parseAftermarketProducts] Invalid JSON:', error);
      return [];
    }
  }

  // Handle array
  if (Array.isArray(aftermarketData)) {
    return aftermarketData;
  }

  // Unknown format
  console.warn('[parseAftermarketProducts] Unknown format:', typeof aftermarketData);
  return [];
}

/**
 * Extract aftermarket product values for tax calculations
 */
export function extractAftermarketValues(
  aftermarketData: unknown
): ExtractedAftermarketValues {
  const products = parseAftermarketProducts(aftermarketData);

  // Initialize result
  const result: ExtractedAftermarketValues = {
    warrantyAmount: 0,
    gapInsurance: 0,
    maintenanceAmount: 0,
    accessoriesAmount: 0,
    products,
    taxableTotal: 0,
    nonTaxableTotal: 0,
    byCategory: {
      warranty: 0,
      gap: 0,
      maintenance: 0,
      tire_wheel: 0,
      theft: 0,
      paint_protection: 0,
      window_tint: 0,
      bedliner: 0,
      etch: 0,
      custom: 0,
    },
  };

  // Process each product
  for (const product of products) {
    const price = product.price || 0;

    // Update category-specific totals
    switch (product.category) {
      case 'warranty':
        result.warrantyAmount += price;
        result.byCategory.warranty += price;
        break;
      case 'gap':
        result.gapInsurance += price;
        result.byCategory.gap += price;
        break;
      case 'maintenance':
        result.maintenanceAmount += price;
        result.byCategory.maintenance += price;
        break;
      case 'tire_wheel':
        result.accessoriesAmount += price;
        result.byCategory.tire_wheel += price;
        break;
      case 'theft':
        result.accessoriesAmount += price;
        result.byCategory.theft += price;
        break;
      case 'paint_protection':
        result.accessoriesAmount += price;
        result.byCategory.paint_protection += price;
        break;
      case 'window_tint':
        result.accessoriesAmount += price;
        result.byCategory.window_tint += price;
        break;
      case 'bedliner':
        result.accessoriesAmount += price;
        result.byCategory.bedliner += price;
        break;
      case 'etch':
        result.accessoriesAmount += price;
        result.byCategory.etch += price;
        break;
      case 'custom':
        result.accessoriesAmount += price;
        result.byCategory.custom += price;
        break;
    }

    // Update taxable/non-taxable totals
    if (product.taxable) {
      result.taxableTotal += price;
    } else {
      result.nonTaxableTotal += price;
    }
  }

  return result;
}

/**
 * Get warranty products only
 */
export function getWarrantyProducts(aftermarketData: unknown): AftermarketProduct[] {
  const products = parseAftermarketProducts(aftermarketData);
  return products.filter((p) => p.category === 'warranty');
}

/**
 * Get GAP insurance products only
 */
export function getGapProducts(aftermarketData: unknown): AftermarketProduct[] {
  const products = parseAftermarketProducts(aftermarketData);
  return products.filter((p) => p.category === 'gap');
}

/**
 * Get maintenance plan products only
 */
export function getMaintenanceProducts(aftermarketData: unknown): AftermarketProduct[] {
  const products = parseAftermarketProducts(aftermarketData);
  return products.filter((p) => p.category === 'maintenance');
}

/**
 * Get physical accessories (non-F&I products)
 */
export function getAccessoryProducts(aftermarketData: unknown): AftermarketProduct[] {
  const products = parseAftermarketProducts(aftermarketData);
  const accessoryCategories = [
    'tire_wheel',
    'theft',
    'paint_protection',
    'window_tint',
    'bedliner',
    'etch',
    'custom',
  ];
  return products.filter((p) => accessoryCategories.includes(p.category));
}

/**
 * Get total price of all aftermarket products
 */
export function getAftermarketTotal(aftermarketData: unknown): number {
  const products = parseAftermarketProducts(aftermarketData);
  return products.reduce((sum, product) => sum + (product.price || 0), 0);
}

/**
 * Get taxable aftermarket product total
 */
export function getTaxableAftermarketTotal(aftermarketData: unknown): number {
  const products = parseAftermarketProducts(aftermarketData);
  return products
    .filter((p) => p.taxable)
    .reduce((sum, product) => sum + (product.price || 0), 0);
}

/**
 * Get non-taxable aftermarket product total
 */
export function getNonTaxableAftermarketTotal(aftermarketData: unknown): number {
  const products = parseAftermarketProducts(aftermarketData);
  return products
    .filter((p) => !p.taxable)
    .reduce((sum, product) => sum + (product.price || 0), 0);
}

/**
 * Format products for display
 */
export function formatAftermarketSummary(aftermarketData: unknown): string {
  const extracted = extractAftermarketValues(aftermarketData);
  const items: string[] = [];

  if (extracted.warrantyAmount > 0) {
    items.push(`Warranty: $${extracted.warrantyAmount.toFixed(2)}`);
  }
  if (extracted.gapInsurance > 0) {
    items.push(`GAP: $${extracted.gapInsurance.toFixed(2)}`);
  }
  if (extracted.maintenanceAmount > 0) {
    items.push(`Maintenance: $${extracted.maintenanceAmount.toFixed(2)}`);
  }
  if (extracted.accessoriesAmount > 0) {
    items.push(`Accessories: $${extracted.accessoriesAmount.toFixed(2)}`);
  }

  return items.length > 0 ? items.join(', ') : 'None';
}

/**
 * Validate aftermarket product structure
 */
export function validateAftermarketProduct(product: unknown): product is AftermarketProduct {
  if (!product || typeof product !== 'object') {
    return false;
  }

  const p = product as Partial<AftermarketProduct>;

  return (
    typeof p.id === 'string' &&
    typeof p.name === 'string' &&
    typeof p.category === 'string' &&
    typeof p.price === 'number' &&
    typeof p.taxable === 'boolean'
  );
}
