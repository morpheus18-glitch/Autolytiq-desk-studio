/**
 * TaxLocationDisplay Component
 *
 * Displays tax jurisdiction and rates based on customer address.
 * Read-only component - address is managed on the Customer card.
 */

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { MapPin, RefreshCw, AlertCircle, CheckCircle } from 'lucide-react';
import type { TaxProfile } from '@shared/types/tax-engine';
import type { Customer } from '@shared/schema';

interface TaxLocationDisplayProps {
  customer: Customer;
  taxProfile?: TaxProfile;
  isRecalculating?: boolean;
  onRecalculate?: () => void;
  showRates?: boolean;
  showRules?: boolean;
  compact?: boolean;
}

export function TaxLocationDisplay({
  customer,
  taxProfile,
  isRecalculating = false,
  onRecalculate,
  showRates = true,
  showRules = false,
  compact = false,
}: TaxLocationDisplayProps) {
  // Check if customer has valid address
  const hasValidAddress = customer.state && customer.zipCode;

  if (!hasValidAddress) {
    return (
      <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-md text-sm text-yellow-800">
        <AlertCircle className="w-4 h-4 flex-shrink-0" />
        <span>Customer address required for tax calculation</span>
      </div>
    );
  }

  if (isRecalculating) {
    return (
      <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Calculating taxes...</span>
      </div>
    );
  }

  if (compact) {
    return (
      <CompactDisplay
        customer={customer}
        taxProfile={taxProfile}
        onRecalculate={onRecalculate}
      />
    );
  }

  return (
    <div className="space-y-3">
      {/* Address */}
      <div className="flex items-start gap-2">
        <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground" />
        <div className="flex-1">
          <div className="text-sm font-medium">
            {customer.address && `${customer.address}, `}
            {customer.city}, {customer.state} {customer.zipCode}
          </div>
          {customer.county && (
            <div className="text-xs text-muted-foreground">
              {customer.county} County
            </div>
          )}
        </div>
        {onRecalculate && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRecalculate}
            disabled={isRecalculating}
            className="h-7 px-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>

      {/* Tax Profile Data */}
      {taxProfile && (
        <>
          {showRates && (
            <>
              <Separator />
              <RatesDisplay rates={taxProfile.rates} />
            </>
          )}

          {/* Tax Method Badge */}
          <div className="flex items-center gap-2">
            <TaxMethodBadge method={taxProfile.method} />
            <span className="text-xs text-muted-foreground">
              Calculated {new Date(taxProfile.calculatedAt).toLocaleDateString()}
            </span>
          </div>

          {showRules && (
            <>
              <Separator />
              <RulesDisplay rules={taxProfile.rules} />
            </>
          )}
        </>
      )}

      {/* No tax profile yet */}
      {!taxProfile && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <AlertCircle className="w-4 h-4" />
          <span>Tax rates not calculated yet</span>
          {onRecalculate && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRecalculate}
              className="ml-auto h-7"
            >
              Calculate
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact display for inline use
 */
function CompactDisplay({
  customer,
  taxProfile,
  onRecalculate,
}: {
  customer: Customer;
  taxProfile?: TaxProfile;
  onRecalculate?: () => void;
}) {
  const jurisdiction = taxProfile?.jurisdiction;

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 text-sm">
        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
        <span>
          {jurisdiction?.countyName
            ? `${jurisdiction.countyName} County, ${jurisdiction.stateCode}`
            : `${customer.state}`}
        </span>
        {taxProfile && (
          <Badge variant="secondary" className="text-xs">
            {(taxProfile.rates.combinedRate * 100).toFixed(2)}%
          </Badge>
        )}
      </div>
      {onRecalculate && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRecalculate}
          className="h-6 px-2"
        >
          <RefreshCw className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

/**
 * Tax rates breakdown
 */
function RatesDisplay({ rates }: { rates: TaxProfile['rates'] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
      <div>
        <span className="text-muted-foreground text-xs">State</span>
        <div className="font-medium">{(rates.stateRate * 100).toFixed(2)}%</div>
      </div>
      <div>
        <span className="text-muted-foreground text-xs">County</span>
        <div className="font-medium">{(rates.countyRate * 100).toFixed(2)}%</div>
      </div>
      <div>
        <span className="text-muted-foreground text-xs">City</span>
        <div className="font-medium">{(rates.cityRate * 100).toFixed(2)}%</div>
      </div>
      <div>
        <span className="text-muted-foreground text-xs">Special</span>
        <div className="font-medium">{(rates.specialRate * 100).toFixed(2)}%</div>
      </div>
      <div className="col-span-2 md:col-span-1">
        <span className="text-muted-foreground text-xs">Total</span>
        <div className="font-bold text-blue-600">
          {(rates.combinedRate * 100).toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

/**
 * Tax rules display
 */
function RulesDisplay({ rules }: { rules: TaxProfile['rules'] }) {
  return (
    <div className="space-y-2 text-xs">
      <div className="font-medium text-sm">State Rules</div>
      <div className="grid grid-cols-2 gap-2">
        <RuleItem
          label="Trade-in reduces tax base"
          value={rules.tradeInReducesTaxBase}
        />
        <RuleItem
          label="Doc fee taxable"
          value={rules.docFeeTaxable}
        />
        <RuleItem
          label="GAP taxable"
          value={rules.gapTaxable}
        />
        <RuleItem
          label="VSC taxable"
          value={rules.vscTaxable}
        />
      </div>
      {rules.docFeeCap && (
        <div className="text-muted-foreground">
          Doc fee cap: ${rules.docFeeCap}
        </div>
      )}
    </div>
  );
}

function RuleItem({ label, value }: { label: string; value: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {value ? (
        <CheckCircle className="w-3.5 h-3.5 text-green-500" />
      ) : (
        <AlertCircle className="w-3.5 h-3.5 text-muted-foreground" />
      )}
      <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
        {label}
      </span>
    </div>
  );
}

/**
 * Tax method badge
 */
function TaxMethodBadge({ method }: { method: TaxProfile['method'] }) {
  const labels: Record<string, string> = {
    'TAX_ON_PRICE': 'Tax on Price',
    'TAX_ON_PAYMENT': 'Tax on Payment',
    'TAX_ON_CAP_COST': 'Tax on Cap Cost',
    'TAX_ON_CAP_REDUCTION': 'Tax on Cap Reduction',
    'SPECIAL_TAVT': 'GA TAVT',
    'SPECIAL_HUT': 'NC HUT',
    'SPECIAL_PRIVILEGE': 'WV Privilege',
  };

  if (method === 'TAX_ON_PRICE') {
    return null; // Don't show for standard retail
  }

  return (
    <Badge variant="outline" className="text-xs">
      {labels[method] || method}
    </Badge>
  );
}
