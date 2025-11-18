import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface DriveOffBreakdownProps {
  firstPayment: number;
  cashDown: number;
  acquisitionFee?: number;
  docFee?: number;
  upfrontFees: number;
  upfrontTax: number;
  securityDeposit?: number;
  otherCharges?: number;
  total: number;
  className?: string;
}

function DriveOffLineItem({
  label,
  amount,
  highlight = false,
}: {
  label: string;
  amount: number;
  highlight?: boolean;
}) {
  if (amount === 0) return null;

  return (
    <div className={cn(
      "flex items-center justify-between",
      highlight && "font-semibold"
    )}>
      <span className={cn(
        "text-sm",
        highlight ? "text-neutral-900" : "text-muted-foreground"
      )}>
        {label}
      </span>
      <span className={cn(
        "text-sm tabular-nums",
        highlight ? "text-neutral-900" : "text-neutral-700"
      )}>
        ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
}

export function DriveOffBreakdown({
  firstPayment,
  cashDown,
  acquisitionFee = 0,
  docFee = 0,
  upfrontFees,
  upfrontTax,
  securityDeposit = 0,
  otherCharges = 0,
  total,
  className,
}: DriveOffBreakdownProps) {
  return (
    <Card className={cn("p-6", className)}>
      <h3 className="text-lg font-semibold mb-4">Due at Signing</h3>
      <div className="space-y-2.5">
        <DriveOffLineItem label="First Payment" amount={firstPayment} />
        <DriveOffLineItem label="Cash Down" amount={cashDown} />
        {acquisitionFee > 0 && (
          <DriveOffLineItem label="Acquisition Fee" amount={acquisitionFee} />
        )}
        {docFee > 0 && (
          <DriveOffLineItem label="Doc Fee" amount={docFee} />
        )}
        {upfrontFees > 0 && (
          <DriveOffLineItem label="Upfront Fees" amount={upfrontFees} />
        )}
        {upfrontTax > 0 && (
          <DriveOffLineItem label="Upfront Tax" amount={upfrontTax} />
        )}
        {securityDeposit > 0 && (
          <DriveOffLineItem label="Security Deposit" amount={securityDeposit} />
        )}
        {otherCharges > 0 && (
          <DriveOffLineItem label="Other Charges" amount={otherCharges} />
        )}

        <Separator className="my-3" />

        <div className="flex items-center justify-between text-xl font-bold">
          <span>Total</span>
          <span className="text-blue-900 tabular-nums">
            ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>
    </Card>
  );
}

// Compact inline version for smaller spaces
export function DriveOffBreakdownCompact({
  total,
  firstPayment,
  cashDown,
  upfrontFees,
  className,
}: {
  total: number;
  firstPayment: number;
  cashDown: number;
  upfrontFees: number;
  className?: string;
}) {
  return (
    <div className={cn("bg-neutral-50 p-4 rounded-lg", className)}>
      <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
        Due at Signing
      </div>
      <div className="text-2xl font-bold text-neutral-900 tabular-nums mb-2">
        ${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>1st: ${Math.round(firstPayment)}</span>
        {cashDown > 0 && <span>Down: ${Math.round(cashDown)}</span>}
        {upfrontFees > 0 && <span>Fees: ${Math.round(upfrontFees)}</span>}
      </div>
    </div>
  );
}
