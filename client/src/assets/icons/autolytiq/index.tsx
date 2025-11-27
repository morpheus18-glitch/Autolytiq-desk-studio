/**
 * Autolytiq Custom Icons
 *
 * Brand-specific icons for the Autolytiq dealership management platform.
 * These replace generic icons with dealership-focused designs.
 */

import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number | string;
};

/**
 * Autolytiq Vehicle Icon
 * A stylized car icon representing inventory and vehicle-related features.
 * Replaces generic lucide-react Car icon.
 */
export function VehicleIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Sport sedan silhouette */}
      <path d="M5 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0" />
      <path d="M15 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0" />
      <path d="M5 17H3v-4.5l1.5-1.5L7 8h6l3 3h3.5a2 2 0 0 1 2 2v4h-2" />
      <path d="M9 17h6" />
      <path d="M7 11h5" />
    </svg>
  );
}

/**
 * Autolytiq Logo Icon
 * The primary brand mark for Autolytiq - a stylized "A" with speedometer motif.
 */
export function AutolytiqLogo({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Speedometer-inspired A */}
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l3 3" />
      <path d="M8 18l4-12 4 12" />
      <path d="M9.5 15h5" />
    </svg>
  );
}

/**
 * Dealership Icon
 * Represents the dealership/showroom location.
 */
export function DealershipIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Building with car bay */}
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 9h6" />
      <path d="M9 12h6" />
    </svg>
  );
}

/**
 * Deal Icon
 * Represents deals, handshake, and sales transactions.
 */
export function DealIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Handshake with document */}
      <path d="M20.5 12.5L12 21l-4-4" />
      <path d="M3.5 12.5L12 21l4-4" />
      <path d="M8 3h8l2 4H6l2-4z" />
      <path d="M9 7v3" />
      <path d="M15 7v3" />
      <path d="M12 7v5" />
    </svg>
  );
}

/**
 * Customer Icon
 * Represents customers and CRM functionality.
 */
export function CustomerIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Person with car key */}
      <circle cx="12" cy="7" r="4" />
      <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
      <path d="M16 15l2 2 3-3" />
    </svg>
  );
}

/**
 * Inventory Icon
 * Represents vehicle inventory and stock management.
 */
export function InventoryIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Grid of vehicles */}
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
      <path d="M5 6h3" />
      <path d="M16 6h3" />
      <path d="M5 17h3" />
      <path d="M16 17h3" />
    </svg>
  );
}

/**
 * Finance Icon
 * Represents financing, loans, and payment calculations.
 */
export function FinanceIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Dollar with chart */}
      <path d="M12 2v20" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      <path d="M3 12h3" />
      <path d="M18 12h3" />
    </svg>
  );
}

/**
 * Trade-In Icon
 * Represents vehicle trade-ins and valuations.
 */
export function TradeInIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Two arrows exchanging */}
      <path d="M16 3h5v5" />
      <path d="M8 21H3v-5" />
      <path d="M21 3l-9 9" />
      <path d="M3 21l9-9" />
    </svg>
  );
}

/**
 * Showroom Icon
 * Represents the showroom display and vehicle presentation.
 */
export function ShowroomIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Spotlight on vehicle */}
      <path d="M12 3v4" />
      <path d="M5.5 6.5l2.5 3" />
      <path d="M18.5 6.5l-2.5 3" />
      <ellipse cx="12" cy="16" rx="7" ry="4" />
      <path d="M12 12v4" />
    </svg>
  );
}

/**
 * VIN Icon
 * Represents VIN decoding and vehicle identification.
 */
export function VinIcon({ size = 24, className, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Barcode with magnifier */}
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 9v6" />
      <path d="M10 9v6" />
      <path d="M13 9v6" />
      <path d="M16 9v6" />
      <circle cx="18" cy="18" r="3" />
      <path d="M20.5 20.5l1.5 1.5" />
    </svg>
  );
}

// Re-export all icons
export const AutolytiqIcons = {
  Vehicle: VehicleIcon,
  Logo: AutolytiqLogo,
  Dealership: DealershipIcon,
  Deal: DealIcon,
  Customer: CustomerIcon,
  Inventory: InventoryIcon,
  Finance: FinanceIcon,
  TradeIn: TradeInIcon,
  Showroom: ShowroomIcon,
  Vin: VinIcon,
};

export default AutolytiqIcons;
