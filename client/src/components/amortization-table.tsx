import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { generateAmortizationSchedule } from '@/lib/calculations';
import { format } from 'date-fns';

interface AmortizationTableProps {
  principal: number;
  apr: number;
  term: number;
}

export function AmortizationTable({ principal, apr, term }: AmortizationTableProps) {
  const schedule = useMemo(() => {
    return generateAmortizationSchedule(principal, apr, term);
  }, [principal, apr, term]);
  
  if (schedule.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Enter financing details to see the payment schedule</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="max-h-96 overflow-y-auto rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
            <TableRow>
              <TableHead className="font-semibold w-20">#</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold text-right">Payment</TableHead>
              <TableHead className="font-semibold text-right">Principal</TableHead>
              <TableHead className="font-semibold text-right">Interest</TableHead>
              <TableHead className="font-semibold text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedule.map((entry) => (
              <TableRow key={entry.paymentNumber} className="hover-elevate">
                <TableCell className="font-mono text-muted-foreground">
                  {entry.paymentNumber}
                </TableCell>
                <TableCell className="text-sm">
                  {format(entry.paymentDate, 'MMM dd, yyyy')}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  ${entry.paymentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-green-600 dark:text-green-400">
                  ${entry.principal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  ${entry.interest.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums font-semibold">
                  ${entry.remainingBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Total Paid
          </div>
          <div className="text-lg font-mono font-semibold tabular-nums">
            ${schedule.reduce((sum, entry) => sum + entry.paymentAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Total Principal
          </div>
          <div className="text-lg font-mono font-semibold tabular-nums text-green-600 dark:text-green-400">
            ${schedule.reduce((sum, entry) => sum + entry.principal, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
            Total Interest
          </div>
          <div className="text-lg font-mono font-semibold tabular-nums text-muted-foreground">
            ${schedule.reduce((sum, entry) => sum + entry.interest, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </Card>
      </div>
    </div>
  );
}
