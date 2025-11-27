/* eslint-disable complexity */
/**
 * Deal Worksheet Component - Industry-Standard Implementation
 *
 * Professional automotive deal calculator matching Reynolds, CDK, VinSolutions standards.
 * Supports Cash, Finance, and Lease deals with comprehensive calculations.
 * Mobile-first responsive design.
 */

import { useState, useMemo, useCallback, useEffect, type JSX } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  User,
  DollarSign,
  Calculator,
  FileText,
  Mail,
  Phone,
  Loader2,
  Plus,
  Trash2,
  TrendingUp,
  ArrowLeftRight,
  Receipt,
  Shield,
  Info,
  Percent,
  Clock,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { VehicleIcon } from '@/assets/icons/autolytiq';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  FormInput,
  FormSelect,
  FormField,
} from '@design-system';
import { formatCurrency, cn } from '@/lib/utils';
import { useUsers } from '@/hooks/useUsers';
import type { Customer } from '@/hooks/useCustomers';
import { getCustomerName } from '@/hooks/useCustomers';
import type { Vehicle } from '@/hooks/useInventory';
import { getVehicleName } from '@/hooks/useInventory';
import {
  useDealCalculator,
  type DealInput,
  type DealResult,
  type DealType,
  type FeeInput,
  type FIProductInput,
  type RebateInput,
  type TradeInInput,
  getStateTaxRate,
  moneyFactorToApr,
  generatePaymentMatrix,
  type PaymentScenario,
} from '@/hooks/useDealCalculator';

// ============================================================================
// Form Schema
// ============================================================================

const worksheetSchema = z.object({
  // Basic Info
  type: z.enum(['CASH', 'FINANCE', 'LEASE'], { required_error: 'Deal type is required' }),
  status: z.enum(['PENDING', 'IN_PROGRESS', 'APPROVED', 'COMPLETED', 'CANCELLED']),
  stateCode: z.string().min(2, 'State is required'),
  salespersonId: z.string().optional(),

  // Vehicle Pricing
  msrp: z.coerce.number().min(0, 'MSRP must be positive'),
  invoice: z.coerce.number().min(0).optional(),
  salePrice: z.coerce.number().min(0, 'Sale price must be positive'),

  // Trade-In
  tradeAllowance: z.coerce.number().min(0).default(0),
  tradePayoff: z.coerce.number().min(0).default(0),
  tradeACV: z.coerce.number().min(0).optional(),
  tradeVehicle: z.string().optional(),

  // Down Payment & Rebates
  cashDown: z.coerce.number().min(0).default(0),

  // Finance Options
  apr: z.coerce.number().min(0).max(30).default(5.9),
  buyRate: z.coerce.number().min(0).max(30).optional(),
  term: z.coerce.number().min(12).max(96).default(60),

  // Lease Options
  moneyFactor: z.coerce.number().min(0).max(0.01).default(0.00125),
  residualPercent: z.coerce.number().min(20).max(90).default(55),
  annualMiles: z.coerce.number().min(5000).max(25000).default(12000),
  excessMileageRate: z.coerce.number().min(0).default(0.25),
  acquisitionFee: z.coerce.number().min(0).default(695),
  dispositionFee: z.coerce.number().min(0).default(395),
  securityDeposit: z.coerce.number().min(0).default(0),
  securityDepositWaived: z.boolean().default(true),
  acquisitionFeeCap: z.boolean().default(true),
  firstPaymentAtSigning: z.boolean().default(true),
  signAndDrive: z.boolean().default(false),

  notes: z.string().optional(),
});

export type WorksheetFormData = z.infer<typeof worksheetSchema>;

// ============================================================================
// Types
// ============================================================================

export interface DealWorksheetProps {
  customer: Customer;
  vehicle: Vehicle;
  initialData?: Partial<WorksheetFormData>;
  onSubmit: (data: WorksheetFormData & { calculationResult: DealResult }) => Promise<void>;
  onBack: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  mode?: 'create' | 'edit';
}

interface FeeItem {
  id: string;
  name: string;
  code: string;
  amount: number;
  taxable: boolean;
  capitalize: boolean;
}

interface FIProduct {
  id: string;
  name: string;
  code: string;
  price: number;
  cost: number;
  finance: boolean;
}

interface Rebate {
  id: string;
  name: string;
  type: string;
  amount: number;
  taxable: boolean;
  applyToCapCost: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'Washington DC' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

const DEFAULT_FEES: FeeItem[] = [
  { id: '1', name: 'Doc Fee', code: 'DOC_FEE', amount: 199, taxable: false, capitalize: true },
  { id: '2', name: 'Title Fee', code: 'TITLE_FEE', amount: 15, taxable: false, capitalize: false },
  {
    id: '3',
    name: 'Registration',
    code: 'REGISTRATION_FEE',
    amount: 150,
    taxable: false,
    capitalize: false,
  },
  { id: '4', name: 'Plate Fee', code: 'PLATE_FEE', amount: 25, taxable: false, capitalize: false },
];

const FI_PRODUCT_OPTIONS = [
  { value: 'EXTENDED_WARRANTY', label: 'Extended Warranty' },
  { value: 'SERVICE_CONTRACT', label: 'Service Contract' },
  { value: 'GAP_INSURANCE', label: 'GAP Insurance' },
  { value: 'TIRE_WHEEL', label: 'Tire & Wheel Protection' },
  { value: 'PAINT_PROTECTION', label: 'Paint Protection' },
  { value: 'FABRIC_PROTECTION', label: 'Fabric Protection' },
  { value: 'KEY_REPLACEMENT', label: 'Key Replacement' },
  { value: 'THEFT_PROTECTION', label: 'Theft Protection' },
  { value: 'MAINTENANCE_PLAN', label: 'Prepaid Maintenance' },
  { value: 'WINDSHIELD_PROTECTION', label: 'Windshield Protection' },
];

const REBATE_TYPES = [
  { value: 'MANUFACTURER', label: 'Manufacturer Rebate' },
  { value: 'DEALER', label: 'Dealer Cash' },
  { value: 'LOYALTY', label: 'Loyalty Bonus' },
  { value: 'CONQUEST', label: 'Conquest Bonus' },
  { value: 'MILITARY', label: 'Military Discount' },
  { value: 'COLLEGE', label: 'College Grad' },
  { value: 'OTHER', label: 'Other' },
];

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Customer/Vehicle summary header - compact and responsive
 */
function DealSummaryHeader({
  customer,
  vehicle,
}: {
  customer: Customer;
  vehicle: Vehicle;
}): JSX.Element {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
      {/* Customer Card */}
      <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
        <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
          <User className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Customer
          </p>
          <p className="font-semibold text-sm truncate">{getCustomerName(customer)}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {customer.email && (
              <span className="flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate max-w-[120px]">{customer.email}</span>
              </span>
            )}
            {customer.phone && (
              <span className="flex items-center gap-1 shrink-0">
                <Phone className="h-3 w-3" />
                {customer.phone}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Vehicle Card */}
      <div className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg">
        <div className="p-2 bg-primary/10 rounded-lg text-primary shrink-0">
          <VehicleIcon size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Vehicle
          </p>
          <p className="font-semibold text-sm truncate">{getVehicleName(vehicle)}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{vehicle.exterior_color}</span>
            <span>{vehicle.mileage.toLocaleString()} mi</span>
            <span className="font-medium text-foreground">
              {formatCurrency(vehicle.list_price)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Deal Type Selector - prominent tabs for Cash/Finance/Lease
 */
function DealTypeSelector({
  value,
  onChange,
}: {
  value: DealType;
  onChange: (type: DealType) => void;
}): JSX.Element {
  const options: { value: DealType; label: string; icon: typeof DollarSign }[] = [
    { value: 'CASH', label: 'Cash', icon: DollarSign },
    { value: 'FINANCE', label: 'Finance', icon: CreditCard },
    { value: 'LEASE', label: 'Lease', icon: Clock },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 p-1 bg-muted rounded-lg">
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              'flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all',
              isActive
                ? 'bg-background shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{opt.label}</span>
            <span className="sm:hidden">{opt.label.charAt(0)}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * Payment Display Box - Large, prominent payment display
 */
function PaymentDisplay({
  result,
  dealType,
}: {
  result: DealResult | null;
  dealType: DealType;
}): JSX.Element {
  if (!result?.is_valid) {
    return (
      <div className="bg-muted/50 rounded-xl p-6 text-center">
        <p className="text-muted-foreground text-sm">Enter deal details to calculate payment</p>
      </div>
    );
  }

  const payment = result.payment_info.payment_with_tax;
  const label = dealType === 'CASH' ? 'Total Due' : 'Monthly Payment';

  return (
    <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-4 sm:p-6 text-center border border-primary/20">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </p>
      <p className="text-3xl sm:text-4xl font-bold text-primary">
        {formatCurrency(payment)}
        {dealType !== 'CASH' && (
          <span className="text-lg font-normal text-muted-foreground">/mo</span>
        )}
      </p>
      {dealType !== 'CASH' && (
        <p className="text-xs text-muted-foreground mt-2">
          {result.payment_info.term_months} months
          {dealType === 'FINANCE' && ` @ ${result.payment_info.apr}% APR`}
          {dealType === 'LEASE' && ` @ ${(result.payment_info.money_factor ?? 0).toFixed(5)} MF`}
        </p>
      )}
    </div>
  );
}

/**
 * TILA Disclosure Box - Required federal disclosure information
 */
function TILADisclosure({ result }: { result: DealResult | null }): JSX.Element {
  if (!result?.is_valid || result.deal_type === 'CASH') return <></>;

  return (
    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 uppercase">
          Federal Truth in Lending Disclosure
        </p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="bg-white dark:bg-blue-900/30 rounded-lg p-2 border border-blue-200 dark:border-blue-700">
          <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-medium">APR</p>
          <p className="text-lg font-bold text-foreground">
            {result.payment_info.apr?.toFixed(2) ??
              (result.payment_info.equivalent_apr ?? 0).toFixed(2)}
            %
          </p>
        </div>
        <div className="bg-white dark:bg-blue-900/30 rounded-lg p-2 border border-blue-200 dark:border-blue-700">
          <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-medium">
            Finance Charge
          </p>
          <p className="text-lg font-bold text-foreground">
            {formatCurrency(result.totals.finance_charge_tila)}
          </p>
        </div>
        <div className="bg-white dark:bg-blue-900/30 rounded-lg p-2 border border-blue-200 dark:border-blue-700">
          <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-medium">
            Amount Financed
          </p>
          <p className="text-lg font-bold text-foreground">
            {formatCurrency(result.totals.amount_financed_tila)}
          </p>
        </div>
        <div className="bg-white dark:bg-blue-900/30 rounded-lg p-2 border border-blue-200 dark:border-blue-700">
          <p className="text-[10px] text-blue-600 dark:text-blue-400 uppercase font-medium">
            Total of Payments
          </p>
          <p className="text-lg font-bold text-foreground">
            {formatCurrency(result.totals.total_of_payments_tila)}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Payment Matrix - Quick comparison of different terms
 */
function PaymentMatrixDisplay({
  amountFinanced,
  apr,
  currentTerm,
  onSelectTerm,
}: {
  amountFinanced: number;
  apr: number;
  currentTerm: number;
  onSelectTerm: (term: number) => void;
}): JSX.Element {
  const matrix = useMemo(() => {
    if (amountFinanced <= 0) return null;
    return generatePaymentMatrix(amountFinanced, apr, [24, 36, 48, 60, 72, 84]);
  }, [amountFinanced, apr]);

  if (!matrix) return <></>;

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        <Calculator className="h-3 w-3" />
        Payment Options
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {matrix.scenarios.map((scenario: PaymentScenario) => (
          <button
            key={scenario.term_months}
            type="button"
            onClick={() => onSelectTerm(scenario.term_months)}
            className={cn(
              'p-2 rounded-lg border text-center transition-all',
              scenario.term_months === currentTerm
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border hover:border-primary/50'
            )}
          >
            <p className="text-[10px] text-muted-foreground">{scenario.term_months} mo</p>
            <p
              className={cn(
                'text-sm font-bold',
                scenario.term_months === currentTerm ? 'text-primary' : 'text-foreground'
              )}
            >
              {formatCurrency(scenario.payment)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Collapsible Section Header
 */
function SectionHeader({
  icon: Icon,
  title,
  badge,
  isOpen,
  onToggle,
}: {
  icon: typeof DollarSign;
  title: string;
  badge?: string;
  isOpen: boolean;
  onToggle: () => void;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full py-3 px-4 bg-muted/50 hover:bg-muted rounded-lg transition-colors"
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="font-medium text-sm">{title}</span>
        {badge && (
          <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[10px] font-medium rounded">
            {badge}
          </span>
        )}
      </div>
      <ChevronDown
        className={cn('h-4 w-4 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
      />
    </button>
  );
}

/**
 * Deal Summary Sidebar
 */
function DealSummary({
  result,
  dealType,
}: {
  result: DealResult | null;
  dealType: DealType;
}): JSX.Element {
  if (!result?.is_valid) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <Calculator className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Configure deal to see calculations</p>
      </div>
    );
  }

  const {
    price_breakdown: price,
    tax_breakdown: tax,
    payment_info: payment,
    profit_analysis: profit,
    totals,
  } = result;

  return (
    <div className="space-y-4 text-sm">
      {/* Price Summary */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Price Breakdown
        </p>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Sale Price</span>
            <span className="font-medium">{formatCurrency(price.selling_price)}</span>
          </div>
          {price.trade_allowance > 0 && (
            <div className="flex justify-between text-success">
              <span>Trade-In Allowance</span>
              <span>-{formatCurrency(price.trade_allowance)}</span>
            </div>
          )}
          {price.trade_payoff > 0 && (
            <div className="flex justify-between text-warning">
              <span>Trade Payoff</span>
              <span>+{formatCurrency(price.trade_payoff)}</span>
            </div>
          )}
          {price.total_rebates > 0 && (
            <div className="flex justify-between text-success">
              <span>Rebates</span>
              <span>-{formatCurrency(price.total_rebates)}</span>
            </div>
          )}
          {price.total_fees > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Fees</span>
              <span>+{formatCurrency(price.total_fees)}</span>
            </div>
          )}
          {price.total_fi_products > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">F&I Products</span>
              <span>+{formatCurrency(price.total_fi_products)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tax Summary */}
      <div className="pt-3 border-t border-border space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Taxes
        </p>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Tax Rate</span>
          <span className="font-medium">{(tax.combined_rate * 100).toFixed(2)}%</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Tax</span>
          <span className="font-medium">{formatCurrency(tax.total_tax)}</span>
        </div>
      </div>

      {/* Finance/Lease Specific */}
      {dealType === 'FINANCE' && (
        <div className="pt-3 border-t border-border space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Finance Details
          </p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount Financed</span>
            <span className="font-medium">{formatCurrency(totals.amount_financed)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Interest</span>
            <span className="font-medium text-warning">
              {formatCurrency(payment.total_interest ?? 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total of Payments</span>
            <span className="font-medium">{formatCurrency(payment.total_of_payments ?? 0)}</span>
          </div>
        </div>
      )}

      {dealType === 'LEASE' && (
        <div className="pt-3 border-t border-border space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Lease Details
          </p>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Gross Cap Cost</span>
            <span className="font-medium">{formatCurrency(price.gross_cap_cost ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Cap Reduction</span>
            <span className="font-medium text-success">
              -{formatCurrency(price.cap_cost_reduction ?? 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Adj. Cap Cost</span>
            <span className="font-medium">{formatCurrency(price.adjusted_cap_cost ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Residual Value</span>
            <span className="font-medium">{formatCurrency(price.residual_value ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly Deprec.</span>
            <span className="font-medium">{formatCurrency(payment.monthly_depreciation ?? 0)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly Rent</span>
            <span className="font-medium">{formatCurrency(payment.monthly_rent_charge ?? 0)}</span>
          </div>
        </div>
      )}

      {/* Totals */}
      <div className="pt-3 border-t border-border space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Due at Signing
        </p>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Cash Down</span>
          <span className="font-medium">{formatCurrency(price.cash_down)}</span>
        </div>
        {payment.first_payment > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">First Payment</span>
            <span className="font-medium">{formatCurrency(payment.first_payment)}</span>
          </div>
        )}
        {payment.security_deposit > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Security Deposit</span>
            <span className="font-medium">{formatCurrency(payment.security_deposit)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-base pt-2 border-t">
          <span>Total Drive-Off</span>
          <span className="text-primary">{formatCurrency(totals.total_drive_off)}</span>
        </div>
      </div>

      {/* Profit Analysis */}
      <div className="pt-3 border-t border-border space-y-2 bg-success/5 -mx-4 px-4 py-3 rounded-lg">
        <p className="text-xs font-semibold text-success uppercase tracking-wider flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Profit Analysis
        </p>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Front-End Gross</span>
          <span className="font-medium">{formatCurrency(profit.front_end_gross)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Back-End Gross</span>
          <span className="font-medium">{formatCurrency(profit.back_end_gross)}</span>
        </div>
        <div className="flex justify-between font-bold text-base pt-1">
          <span>Total Gross</span>
          <span className="text-success">{formatCurrency(profit.total_gross)}</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function DealWorksheet({
  customer,
  vehicle,
  initialData,
  onSubmit,
  onBack,
  onCancel,
  isLoading = false,
  mode = 'create',
}: DealWorksheetProps): JSX.Element {
  // Hooks
  const { data: usersData } = useUsers();
  const { calculateDeal, result, isLoading: isCalculating } = useDealCalculator();

  // Local State
  const [fees, setFees] = useState<FeeItem[]>(DEFAULT_FEES);
  const [fiProducts, setFIProducts] = useState<FIProduct[]>([]);
  const [rebates, setRebates] = useState<Rebate[]>([]);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['pricing', 'financing']));

  // Form
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<WorksheetFormData>({
    resolver: zodResolver(worksheetSchema),
    defaultValues: {
      type: 'FINANCE',
      status: 'PENDING',
      stateCode: 'IN',
      msrp: vehicle.list_price,
      invoice: vehicle.invoice_price,
      salePrice: vehicle.list_price,
      tradeAllowance: 0,
      tradePayoff: 0,
      cashDown: 0,
      apr: 5.9,
      term: 60,
      moneyFactor: 0.00125,
      residualPercent: 55,
      annualMiles: 12000,
      excessMileageRate: 0.25,
      acquisitionFee: 695,
      dispositionFee: 395,
      securityDeposit: 0,
      securityDepositWaived: true,
      acquisitionFeeCap: true,
      firstPaymentAtSigning: true,
      signAndDrive: false,
      ...initialData,
    },
  });

  const watchedValues = watch();
  const dealType = watchedValues.type;

  // Calculate deal when inputs change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const dealInput = buildDealInput(watchedValues, fees, fiProducts, rebates);
      calculateDeal(dealInput);
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [watchedValues, fees, fiProducts, rebates, calculateDeal]);

  // Build deal input from form data
  const buildDealInput = useCallback(
    (values: WorksheetFormData, fees: FeeItem[], fi: FIProduct[], rebates: Rebate[]): DealInput => {
      const tradeIn: TradeInInput | undefined =
        values.tradeAllowance > 0
          ? {
              gross_allowance: values.tradeAllowance,
              payoff_amount: values.tradePayoff,
              acv: values.tradeACV,
            }
          : undefined;

      const feeInputs: FeeInput[] = fees.map((f) => ({
        name: f.name,
        code: f.code as FeeInput['code'],
        amount: f.amount,
        taxable: f.taxable,
        capitalize_in_lease: f.capitalize,
      }));

      const fiInputs: FIProductInput[] = fi.map((p) => ({
        name: p.name,
        code: p.code as FIProductInput['code'],
        price: p.price,
        cost: p.cost,
        finance_with_deal: p.finance,
      }));

      const rebateInputs: RebateInput[] = rebates.map((r) => ({
        name: r.name,
        rebate_type: r.type as RebateInput['rebate_type'],
        amount: r.amount,
        taxable: r.taxable,
        apply_to_cap_cost: r.applyToCapCost,
      }));

      return {
        deal_type: values.type,
        state_code: values.stateCode,
        vehicle_msrp: values.msrp,
        vehicle_invoice: values.invoice,
        selling_price: values.salePrice,
        trade_in: tradeIn,
        rebates: rebateInputs,
        cash_down: values.cashDown,
        fi_products: fiInputs,
        fees: feeInputs,
        finance_input:
          values.type === 'FINANCE'
            ? {
                apr: values.apr,
                term_months: values.term,
                payment_frequency: 'MONTHLY',
                buy_rate: values.buyRate,
              }
            : undefined,
        lease_input:
          values.type === 'LEASE'
            ? {
                term_months: values.term,
                annual_mileage: values.annualMiles,
                excess_mileage_rate: values.excessMileageRate,
                residual_percent: values.residualPercent,
                money_factor: values.moneyFactor,
                security_deposit: values.securityDeposit,
                security_deposit_waived: values.securityDepositWaived,
                first_payment_due_at_signing: values.firstPaymentAtSigning,
                acquisition_fee: values.acquisitionFee,
                acquisition_fee_cap: values.acquisitionFeeCap,
                disposition_fee: values.dispositionFee,
                disposition_fee_waived: false,
                sign_and_drive: values.signAndDrive,
                one_pay_lease: false,
              }
            : undefined,
      };
    },
    []
  );

  // Handlers
  const toggleSection = (section: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const addFee = () => {
    setFees((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: '',
        code: 'OTHER',
        amount: 0,
        taxable: false,
        capitalize: true,
      },
    ]);
  };

  const removeFee = (id: string) => {
    setFees((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFee = (id: string, field: keyof FeeItem, value: string | number | boolean) => {
    setFees((prev) => prev.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };

  const addFIProduct = () => {
    setFIProducts((prev) => [
      ...prev,
      { id: Date.now().toString(), name: '', code: 'OTHER', price: 0, cost: 0, finance: true },
    ]);
  };

  const removeFIProduct = (id: string) => {
    setFIProducts((prev) => prev.filter((p) => p.id !== id));
  };

  const updateFIProduct = (
    id: string,
    field: keyof FIProduct,
    value: string | number | boolean
  ) => {
    setFIProducts((prev) => prev.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
  };

  const addRebate = () => {
    setRebates((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        name: '',
        type: 'MANUFACTURER',
        amount: 0,
        taxable: false,
        applyToCapCost: true,
      },
    ]);
  };

  const removeRebate = (id: string) => {
    setRebates((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRebate = (id: string, field: keyof Rebate, value: string | number | boolean) => {
    setRebates((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  // Memoized values
  const salespersonOptions = useMemo(() => {
    return (usersData?.users ?? [])
      .filter((u) => u.role === 'SALESPERSON' || u.role === 'MANAGER')
      .map((u) => ({
        id: u.id,
        name: `${u.first_name} ${u.last_name}`.trim() || u.email,
      }));
  }, [usersData]);

  const taxRate = useMemo(
    () => getStateTaxRate(watchedValues.stateCode),
    [watchedValues.stateCode]
  );

  const leaseAprEquivalent = useMemo(
    () => moneyFactorToApr(watchedValues.moneyFactor),
    [watchedValues.moneyFactor]
  );

  // Submit handler
  const onFormSubmit = async (data: WorksheetFormData) => {
    const dealInput = buildDealInput(data, fees, fiProducts, rebates);
    const calcResult = await calculateDeal(dealInput);
    await onSubmit({ ...data, calculationResult: calcResult });
  };

  return (
    <div className="space-y-4">
      {/* Progress Indicator */}
      <div className="flex items-center gap-2 text-xs sm:text-sm">
        <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-success text-success-foreground">
          <svg
            className="h-3 w-3 sm:h-4 sm:w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </span>
        <span className="text-muted-foreground hidden sm:inline">Customer & Vehicle</span>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium">
          2
        </span>
        <span className="font-medium text-foreground">Deal Worksheet</span>
      </div>

      {/* Customer/Vehicle Summary */}
      <DealSummaryHeader customer={customer} vehicle={vehicle} />

      <form onSubmit={handleSubmit(onFormSubmit)}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
          {/* Main Form Area */}
          <div className="lg:col-span-8 space-y-4">
            {/* Deal Type Selector */}
            <Card className="overflow-hidden">
              <CardContent className="p-4">
                <Controller
                  name="type"
                  control={control}
                  render={({ field }) => (
                    <DealTypeSelector
                      value={field.value}
                      onChange={(type) => {
                        field.onChange(type);
                        // Reset term for lease
                        if (type === 'LEASE') {
                          setValue('term', 36);
                        } else {
                          setValue('term', 60);
                        }
                      }}
                    />
                  )}
                />
              </CardContent>
            </Card>

            {/* Payment Display - Mobile */}
            <div className="lg:hidden">
              <PaymentDisplay result={result} dealType={dealType} />
            </div>

            {/* Pricing Section */}
            <Card>
              <SectionHeader
                icon={DollarSign}
                title="Pricing"
                isOpen={openSections.has('pricing')}
                onToggle={() => toggleSection('pricing')}
              />
              {openSections.has('pricing') && (
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <FormField label="MSRP" error={errors.msrp?.message} required>
                      <FormInput
                        type="number"
                        step="1"
                        {...register('msrp')}
                        error={!!errors.msrp}
                      />
                    </FormField>
                    <FormField label="Invoice" error={errors.invoice?.message}>
                      <FormInput
                        type="number"
                        step="1"
                        {...register('invoice')}
                        error={!!errors.invoice}
                      />
                    </FormField>
                    <FormField label="Sale Price" error={errors.salePrice?.message} required>
                      <FormInput
                        type="number"
                        step="1"
                        {...register('salePrice')}
                        error={!!errors.salePrice}
                      />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <FormField label="State" error={errors.stateCode?.message} required>
                      <FormSelect
                        {...register('stateCode')}
                        error={!!errors.stateCode}
                        options={US_STATES}
                      />
                    </FormField>
                    <FormField label="Tax Rate">
                      <div className="flex items-center h-10 px-3 bg-muted rounded-lg text-sm">
                        {(taxRate * 100).toFixed(2)}%
                      </div>
                    </FormField>
                    <FormField label="Cash Down" error={errors.cashDown?.message}>
                      <FormInput
                        type="number"
                        step="1"
                        {...register('cashDown')}
                        error={!!errors.cashDown}
                        placeholder="0"
                      />
                    </FormField>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Trade-In Section */}
            <Card>
              <SectionHeader
                icon={ArrowLeftRight}
                title="Trade-In"
                badge={
                  watchedValues.tradeAllowance > 0
                    ? formatCurrency(watchedValues.tradeAllowance)
                    : undefined
                }
                isOpen={openSections.has('trade')}
                onToggle={() => toggleSection('trade')}
              />
              {openSections.has('trade') && (
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <FormField label="Allowance" error={errors.tradeAllowance?.message}>
                      <FormInput
                        type="number"
                        step="1"
                        {...register('tradeAllowance')}
                        error={!!errors.tradeAllowance}
                        placeholder="0"
                      />
                    </FormField>
                    <FormField label="Payoff" error={errors.tradePayoff?.message}>
                      <FormInput
                        type="number"
                        step="1"
                        {...register('tradePayoff')}
                        error={!!errors.tradePayoff}
                        placeholder="0"
                      />
                    </FormField>
                    <FormField label="ACV" error={errors.tradeACV?.message}>
                      <FormInput
                        type="number"
                        step="1"
                        {...register('tradeACV')}
                        error={!!errors.tradeACV}
                        placeholder="0"
                      />
                    </FormField>
                  </div>
                  <FormField label="Trade Vehicle (Year Make Model)">
                    <FormInput
                      {...register('tradeVehicle')}
                      placeholder="e.g., 2019 Honda Accord EX"
                    />
                  </FormField>
                  {watchedValues.tradeAllowance > 0 && watchedValues.tradePayoff > 0 && (
                    <div
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg',
                        watchedValues.tradeAllowance >= watchedValues.tradePayoff
                          ? 'bg-success/10 text-success'
                          : 'bg-destructive/10 text-destructive'
                      )}
                    >
                      <span className="text-sm font-medium">Net Trade Equity</span>
                      <span className="font-bold">
                        {formatCurrency(watchedValues.tradeAllowance - watchedValues.tradePayoff)}
                      </span>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>

            {/* Finance/Lease Options */}
            {dealType !== 'CASH' && (
              <Card>
                <SectionHeader
                  icon={dealType === 'FINANCE' ? CreditCard : Clock}
                  title={dealType === 'FINANCE' ? 'Finance Terms' : 'Lease Terms'}
                  isOpen={openSections.has('financing')}
                  onToggle={() => toggleSection('financing')}
                />
                {openSections.has('financing') && (
                  <CardContent className="pt-0 space-y-4">
                    {dealType === 'FINANCE' ? (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <FormField label="APR (%)" error={errors.apr?.message}>
                            <FormInput
                              type="number"
                              step="0.1"
                              {...register('apr')}
                              error={!!errors.apr}
                            />
                          </FormField>
                          <FormField label="Buy Rate (%)" error={errors.buyRate?.message}>
                            <FormInput
                              type="number"
                              step="0.1"
                              {...register('buyRate')}
                              error={!!errors.buyRate}
                              placeholder="Optional"
                            />
                          </FormField>
                          <FormField label="Term (months)" error={errors.term?.message}>
                            <FormSelect
                              {...register('term')}
                              error={!!errors.term}
                              options={[
                                { value: '24', label: '24 mo' },
                                { value: '36', label: '36 mo' },
                                { value: '48', label: '48 mo' },
                                { value: '60', label: '60 mo' },
                                { value: '72', label: '72 mo' },
                                { value: '84', label: '84 mo' },
                              ]}
                            />
                          </FormField>
                        </div>

                        {/* Payment Matrix */}
                        {result?.totals?.amount_financed && result.totals.amount_financed > 0 && (
                          <PaymentMatrixDisplay
                            amountFinanced={result.totals.amount_financed}
                            apr={watchedValues.apr}
                            currentTerm={watchedValues.term}
                            onSelectTerm={(term) => setValue('term', term)}
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <FormField label="Term (months)" error={errors.term?.message}>
                            <FormSelect
                              {...register('term')}
                              error={!!errors.term}
                              options={[
                                { value: '24', label: '24 mo' },
                                { value: '36', label: '36 mo' },
                                { value: '39', label: '39 mo' },
                                { value: '42', label: '42 mo' },
                                { value: '48', label: '48 mo' },
                              ]}
                            />
                          </FormField>
                          <FormField label="Annual Miles" error={errors.annualMiles?.message}>
                            <FormSelect
                              {...register('annualMiles')}
                              error={!!errors.annualMiles}
                              options={[
                                { value: '7500', label: '7,500' },
                                { value: '10000', label: '10,000' },
                                { value: '12000', label: '12,000' },
                                { value: '15000', label: '15,000' },
                              ]}
                            />
                          </FormField>
                          <FormField label="Residual %" error={errors.residualPercent?.message}>
                            <FormInput
                              type="number"
                              step="1"
                              {...register('residualPercent')}
                              error={!!errors.residualPercent}
                            />
                          </FormField>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <FormField label="Money Factor" error={errors.moneyFactor?.message}>
                            <FormInput
                              type="number"
                              step="0.00001"
                              {...register('moneyFactor')}
                              error={!!errors.moneyFactor}
                            />
                          </FormField>
                          <FormField label="APR Equivalent">
                            <div className="flex items-center h-10 px-3 bg-muted rounded-lg text-sm font-medium">
                              {leaseAprEquivalent.toFixed(2)}%
                            </div>
                          </FormField>
                          <FormField label="Acquisition Fee" error={errors.acquisitionFee?.message}>
                            <FormInput
                              type="number"
                              step="1"
                              {...register('acquisitionFee')}
                              error={!!errors.acquisitionFee}
                            />
                          </FormField>
                        </div>
                        <div className="flex flex-wrap gap-4">
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              {...register('acquisitionFeeCap')}
                              className="rounded"
                            />
                            <span>Capitalize Acq Fee</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              {...register('firstPaymentAtSigning')}
                              className="rounded"
                            />
                            <span>First Payment at Signing</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              {...register('securityDepositWaived')}
                              className="rounded"
                            />
                            <span>Waive Security Deposit</span>
                          </label>
                          <label className="flex items-center gap-2 text-sm cursor-pointer">
                            <input
                              type="checkbox"
                              {...register('signAndDrive')}
                              className="rounded"
                            />
                            <span>Sign & Drive ($0 Due)</span>
                          </label>
                        </div>
                      </>
                    )}
                  </CardContent>
                )}
              </Card>
            )}

            {/* Rebates Section */}
            <Card>
              <SectionHeader
                icon={Percent}
                title="Rebates & Incentives"
                badge={rebates.length > 0 ? `${rebates.length}` : undefined}
                isOpen={openSections.has('rebates')}
                onToggle={() => toggleSection('rebates')}
              />
              {openSections.has('rebates') && (
                <CardContent className="pt-0 space-y-3">
                  {rebates.map((rebate) => (
                    <div key={rebate.id} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <FormSelect
                          value={rebate.type}
                          onChange={(e) => updateRebate(rebate.id, 'type', e.target.value)}
                          options={REBATE_TYPES}
                        />
                      </div>
                      <div className="col-span-4">
                        <FormInput
                          placeholder="Name"
                          value={rebate.name}
                          onChange={(e) => updateRebate(rebate.id, 'name', e.target.value)}
                        />
                      </div>
                      <div className="col-span-3">
                        <FormInput
                          type="number"
                          placeholder="Amount"
                          value={rebate.amount || ''}
                          onChange={(e) =>
                            updateRebate(rebate.id, 'amount', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRebate(rebate.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRebate}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Rebate
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* Fees Section */}
            <Card>
              <SectionHeader
                icon={Receipt}
                title="Fees"
                badge={formatCurrency(fees.reduce((sum, f) => sum + f.amount, 0))}
                isOpen={openSections.has('fees')}
                onToggle={() => toggleSection('fees')}
              />
              {openSections.has('fees') && (
                <CardContent className="pt-0 space-y-3">
                  {fees.map((fee) => (
                    <div key={fee.id} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5">
                        <FormInput
                          placeholder="Fee name"
                          value={fee.name}
                          onChange={(e) => updateFee(fee.id, 'name', e.target.value)}
                        />
                      </div>
                      <div className="col-span-3">
                        <FormInput
                          type="number"
                          placeholder="Amount"
                          value={fee.amount || ''}
                          onChange={(e) =>
                            updateFee(fee.id, 'amount', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="col-span-3 flex items-center gap-2">
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={fee.taxable}
                            onChange={(e) => updateFee(fee.id, 'taxable', e.target.checked)}
                            className="rounded"
                          />
                          Tax
                        </label>
                        {dealType === 'LEASE' && (
                          <label className="flex items-center gap-1 text-xs">
                            <input
                              type="checkbox"
                              checked={fee.capitalize}
                              onChange={(e) => updateFee(fee.id, 'capitalize', e.target.checked)}
                              className="rounded"
                            />
                            Cap
                          </label>
                        )}
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFee(fee.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addFee}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Fee
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* F&I Products Section */}
            <Card>
              <SectionHeader
                icon={Shield}
                title="F&I Products"
                badge={
                  fiProducts.length > 0
                    ? formatCurrency(fiProducts.reduce((sum, p) => sum + p.price, 0))
                    : undefined
                }
                isOpen={openSections.has('fi')}
                onToggle={() => toggleSection('fi')}
              />
              {openSections.has('fi') && (
                <CardContent className="pt-0 space-y-3">
                  {fiProducts.map((product) => (
                    <div key={product.id} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-4">
                        <FormSelect
                          value={product.code}
                          onChange={(e) => updateFIProduct(product.id, 'code', e.target.value)}
                          options={FI_PRODUCT_OPTIONS}
                        />
                      </div>
                      <div className="col-span-3">
                        <FormInput
                          type="number"
                          placeholder="Price"
                          value={product.price || ''}
                          onChange={(e) =>
                            updateFIProduct(product.id, 'price', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="col-span-2">
                        <FormInput
                          type="number"
                          placeholder="Cost"
                          value={product.cost || ''}
                          onChange={(e) =>
                            updateFIProduct(product.id, 'cost', parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                      <div className="col-span-2 flex items-center">
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={product.finance}
                            onChange={(e) =>
                              updateFIProduct(product.id, 'finance', e.target.checked)
                            }
                            className="rounded"
                          />
                          Finance
                        </label>
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFIProduct(product.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addFIProduct}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add F&I Product
                  </Button>
                </CardContent>
              )}
            </Card>

            {/* Additional Info Section */}
            <Card>
              <SectionHeader
                icon={FileText}
                title="Additional Info"
                isOpen={openSections.has('info')}
                onToggle={() => toggleSection('info')}
              />
              {openSections.has('info') && (
                <CardContent className="pt-0 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <FormField label="Status" error={errors.status?.message}>
                      <FormSelect
                        {...register('status')}
                        error={!!errors.status}
                        options={[
                          { value: 'PENDING', label: 'Pending' },
                          { value: 'IN_PROGRESS', label: 'In Progress' },
                          { value: 'APPROVED', label: 'Approved' },
                          { value: 'COMPLETED', label: 'Completed' },
                          { value: 'CANCELLED', label: 'Cancelled' },
                        ]}
                      />
                    </FormField>
                    <FormField label="Salesperson" error={errors.salespersonId?.message}>
                      <FormSelect
                        {...register('salespersonId')}
                        error={!!errors.salespersonId}
                        options={[
                          { value: '', label: 'Select...' },
                          ...salespersonOptions.map((s) => ({ value: s.id, label: s.name })),
                        ]}
                      />
                    </FormField>
                  </div>
                  <FormField label="Notes">
                    <textarea
                      {...register('notes')}
                      rows={3}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                      placeholder="Additional notes..."
                    />
                  </FormField>
                </CardContent>
              )}
            </Card>

            {/* TILA Disclosure */}
            {dealType !== 'CASH' && <TILADisclosure result={result} />}

            {/* Validation Errors */}
            {result && !result.is_valid && result.validation_errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  <p className="text-sm font-medium text-destructive">Validation Errors</p>
                </div>
                <ul className="list-disc list-inside text-sm text-destructive/80 space-y-1">
                  {result.validation_errors.map((error, i) => (
                    <li key={i}>{error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar - Deal Summary */}
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-4 space-y-4">
              {/* Payment Display - Desktop */}
              <div className="hidden lg:block">
                <PaymentDisplay result={result} dealType={dealType} />
              </div>

              {/* Deal Summary Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Deal Summary
                    {isCalculating && <Loader2 className="h-3 w-3 animate-spin" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DealSummary result={result} dealType={dealType} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Actions - Sticky on mobile */}
        <div className="sticky bottom-0 left-0 right-0 bg-background border-t border-border py-4 mt-6 -mx-4 px-4 sm:static sm:bg-transparent sm:border-0 sm:py-0 sm:mx-0 sm:px-0">
          <div className="flex justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              icon={<ChevronLeft className="h-4 w-4" />}
              disabled={isLoading}
            >
              <span className="hidden sm:inline">Back</span>
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading || !result?.is_valid}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : mode === 'create' ? (
                  'Create Deal'
                ) : (
                  'Update Deal'
                )}
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
