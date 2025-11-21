/**
 * VEHICLE FORMATTERS
 * Formatting utilities for vehicle display
 */

import type { Vehicle, VehicleStatusType } from '../types/vehicle.types';

/**
 * Format vehicle name (year make model trim)
 */
export function formatVehicleName(vehicle: Partial<Vehicle>): string {
  const parts = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim].filter(Boolean);
  return parts.join(' ');
}

/**
 * Format vehicle short name (make model)
 */
export function formatVehicleShortName(vehicle: Partial<Vehicle>): string {
  return `${vehicle.make} ${vehicle.model}`;
}

/**
 * Format VIN for display (with spacing)
 */
export function formatVIN(vin: string): string {
  if (!vin || vin.length !== 17) return vin;
  // Format as: XXX XXXX XX XXXXXX
  return `${vin.substring(0, 3)} ${vin.substring(3, 7)} ${vin.substring(7, 9)} ${vin.substring(9)}`;
}

/**
 * Format stock number for display
 */
export function formatStockNumber(stockNumber: string): string {
  return stockNumber.toUpperCase();
}

/**
 * Format mileage with commas
 */
export function formatMileage(mileage: number): string {
  return mileage.toLocaleString('en-US');
}

/**
 * Format mileage with unit
 */
export function formatMileageWithUnit(mileage: number): string {
  return `${formatMileage(mileage)} mi`;
}

/**
 * Format price as currency
 */
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Format status for display
 */
export function formatStatus(status: VehicleStatusType): string {
  const statusMap: Record<VehicleStatusType, string> = {
    available: 'Available',
    reserved: 'Reserved',
    'in-deal': 'In Deal',
    sold: 'Sold',
    service: 'In Service',
    wholesale: 'Wholesale',
    unavailable: 'Unavailable',
  };
  return statusMap[status] || status;
}

/**
 * Get status color for UI
 */
export function getStatusColor(status: VehicleStatusType): string {
  const colorMap: Record<VehicleStatusType, string> = {
    available: 'green',
    reserved: 'yellow',
    'in-deal': 'blue',
    sold: 'gray',
    service: 'orange',
    wholesale: 'purple',
    unavailable: 'red',
  };
  return colorMap[status] || 'gray';
}

/**
 * Format transmission for display
 */
export function formatTransmission(transmission: string): string {
  const transmissionMap: Record<string, string> = {
    automatic: 'Automatic',
    manual: 'Manual',
    cvt: 'CVT',
    'dual-clutch': 'Dual Clutch',
    other: 'Other',
  };
  return transmissionMap[transmission] || transmission;
}

/**
 * Format drivetrain for display
 */
export function formatDrivetrain(drivetrain: string): string {
  const drivetrainMap: Record<string, string> = {
    fwd: 'FWD',
    rwd: 'RWD',
    awd: 'AWD',
    '4wd': '4WD',
  };
  return drivetrainMap[drivetrain] || drivetrain;
}

/**
 * Format fuel type for display
 */
export function formatFuelType(fuelType: string): string {
  const fuelTypeMap: Record<string, string> = {
    gasoline: 'Gasoline',
    diesel: 'Diesel',
    hybrid: 'Hybrid',
    'plug-in-hybrid': 'Plug-In Hybrid',
    electric: 'Electric',
    'flex-fuel': 'Flex Fuel',
    other: 'Other',
  };
  return fuelTypeMap[fuelType] || fuelType;
}

/**
 * Format body style for display
 */
export function formatBodyStyle(bodyStyle: string): string {
  const bodyStyleMap: Record<string, string> = {
    sedan: 'Sedan',
    suv: 'SUV',
    truck: 'Truck',
    coupe: 'Coupe',
    convertible: 'Convertible',
    van: 'Van',
    wagon: 'Wagon',
    hatchback: 'Hatchback',
    other: 'Other',
  };
  return bodyStyleMap[bodyStyle] || bodyStyle;
}

/**
 * Format vehicle type for display
 */
export function formatVehicleType(type: string): string {
  const typeMap: Record<string, string> = {
    new: 'New',
    used: 'Used',
    certified: 'Certified Pre-Owned',
  };
  return typeMap[type] || type;
}

/**
 * Format condition for display
 */
export function formatCondition(condition: string): string {
  const conditionMap: Record<string, string> = {
    excellent: 'Excellent',
    good: 'Good',
    fair: 'Fair',
    poor: 'Poor',
  };
  return conditionMap[condition] || condition;
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(dateObj);
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(dateObj);
}

/**
 * Calculate days in inventory
 */
export function calculateDaysInInventory(createdAt: string | Date): number {
  const created = typeof createdAt === 'string' ? new Date(createdAt) : createdAt;
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Format days in inventory
 */
export function formatDaysInInventory(createdAt: string | Date): string {
  const days = calculateDaysInInventory(createdAt);
  if (days === 0) return 'Today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

/**
 * Get age category
 */
export function getAgeCategory(createdAt: string | Date): 'new' | 'fresh' | 'aging' | 'old' {
  const days = calculateDaysInInventory(createdAt);
  if (days <= 7) return 'new';
  if (days <= 30) return 'fresh';
  if (days <= 90) return 'aging';
  return 'old';
}

/**
 * Format profit margin
 */
export function formatProfitMargin(cost: number, askingPrice: number): string {
  const profit = askingPrice - cost;
  const margin = (profit / askingPrice) * 100;
  return `${margin.toFixed(1)}%`;
}

/**
 * Calculate and format potential profit
 */
export function formatPotentialProfit(cost: number, askingPrice: number): string {
  const profit = askingPrice - cost;
  return formatPrice(profit);
}

/**
 * Get primary photo URL
 */
export function getPrimaryPhotoUrl(vehicle: Vehicle): string | null {
  if (!vehicle.photos || vehicle.photos.length === 0) return null;

  const primary = vehicle.photos.find((p) => p.isPrimary);
  if (primary) return primary.url;

  return vehicle.photos[0]?.url || null;
}

/**
 * Get photo count
 */
export function getPhotoCount(vehicle: Vehicle): number {
  return vehicle.photos?.length || 0;
}

/**
 * Format features as comma-separated list
 */
export function formatFeaturesList(features: string[]): string {
  if (!features || features.length === 0) return 'No features listed';
  return features.join(', ');
}

/**
 * Format location for display
 */
export function formatLocation(location: string): string {
  return location
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Create vehicle summary text
 */
export function createVehicleSummary(vehicle: Vehicle): string {
  const parts = [
    formatVehicleName(vehicle),
    formatMileageWithUnit(vehicle.mileage),
    formatTransmission(vehicle.transmission),
    formatDrivetrain(vehicle.drivetrain),
    vehicle.exteriorColor,
  ];
  return parts.join(' • ');
}

/**
 * Create short vehicle description
 */
export function createShortDescription(vehicle: Vehicle): string {
  return `${formatVehicleType(vehicle.type)} ${formatVehicleName(vehicle)} with ${formatMileageWithUnit(vehicle.mileage)}`;
}
