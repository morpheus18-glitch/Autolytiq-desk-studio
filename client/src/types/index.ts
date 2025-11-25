/**
 * Shared types
 */

export * from './auth';
export * from './showroom';
export * from './messaging';
export * from './settings';

/**
 * Pagination
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

/**
 * Common entity types
 */
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

/**
 * Deal types
 */
export interface Deal extends BaseEntity {
  customer_id: string;
  vehicle_id?: string;
  dealership_id: string;
  salesperson_id: string;
  status: DealStatus;
  type: DealType;
  sale_price?: number;
  trade_in_value?: number;
  down_payment?: number;
  finance_amount?: number;
  monthly_payment?: number;
  term_months?: number;
  apr?: number;
  notes?: string;
  closed_at?: string;
}

export type DealStatus =
  | 'lead'
  | 'contacted'
  | 'negotiating'
  | 'financing'
  | 'pending_delivery'
  | 'delivered'
  | 'lost';

export type DealType = 'cash' | 'finance' | 'lease';

/**
 * Customer types
 */
export interface Customer extends BaseEntity {
  dealership_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: Address;
  source?: string;
  notes?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

/**
 * Vehicle/Inventory types
 */
export interface Vehicle extends BaseEntity {
  dealership_id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  exterior_color?: string;
  interior_color?: string;
  mileage: number;
  condition: VehicleCondition;
  status: VehicleStatus;
  cost?: number;
  asking_price: number;
  internet_price?: number;
  photos?: string[];
  features?: string[];
  description?: string;
}

export type VehicleCondition = 'new' | 'used' | 'certified';
export type VehicleStatus = 'available' | 'pending' | 'sold' | 'hold' | 'in_service';

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  deals: {
    total: number;
    this_month: number;
    change_percentage: number;
  };
  revenue: {
    total: number;
    this_month: number;
    change_percentage: number;
  };
  inventory: {
    total: number;
    available: number;
    pending: number;
  };
  leads: {
    total: number;
    new_today: number;
    conversion_rate: number;
  };
}
