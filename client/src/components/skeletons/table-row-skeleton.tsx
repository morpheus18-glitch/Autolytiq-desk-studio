import { TableRow, TableCell } from '@/components/ui/table';
import { PremiumSkeleton } from './premium-skeleton';

export function TableRowSkeleton() {
  return (
    <TableRow>
      {/* Deal # */}
      <TableCell>
        <PremiumSkeleton variant="text" className="w-20" />
      </TableCell>
      
      {/* Customer */}
      <TableCell>
        <div className="space-y-2">
          <PremiumSkeleton variant="text" className="w-32" />
          <PremiumSkeleton variant="text" className="w-24 h-3" />
        </div>
      </TableCell>
      
      {/* Vehicle */}
      <TableCell>
        <div className="space-y-2">
          <PremiumSkeleton variant="text" className="w-40" />
          <PremiumSkeleton variant="text" className="w-24 h-3" />
        </div>
      </TableCell>
      
      {/* Salesperson */}
      <TableCell>
        <PremiumSkeleton variant="text" className="w-28" />
      </TableCell>
      
      {/* Status */}
      <TableCell>
        <PremiumSkeleton className="h-6 w-24 rounded-full" />
      </TableCell>
      
      {/* Created */}
      <TableCell>
        <PremiumSkeleton variant="text" className="w-20" />
      </TableCell>
      
      {/* Actions */}
      <TableCell className="text-right">
        <PremiumSkeleton className="h-9 w-20 ml-auto" />
      </TableCell>
    </TableRow>
  );
}
