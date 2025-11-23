import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Calendar as CalendarIcon, Filter, Download, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export type PeriodType = 'today' | 'week' | 'month' | 'quarter' | 'year' | 'custom';

interface FilterBarProps {
  period: PeriodType;
  onPeriodChange: (period: PeriodType) => void;
  customDateRange?: { from: Date | undefined; to: Date | undefined };
  onCustomDateChange?: (range: { from: Date | undefined; to: Date | undefined }) => void;
  teamMember?: string;
  onTeamMemberChange?: (member: string) => void;
  vehicleType?: string;
  onVehicleTypeChange?: (type: string) => void;
  onRefresh?: () => void;
  onExportAll?: () => void;
  loading?: boolean;
  className?: string;
  teamMembers?: Array<{ id: string; name: string }>;
}

export function FilterBar({
  period,
  onPeriodChange,
  customDateRange = { from: undefined, to: undefined },
  onCustomDateChange,
  teamMember,
  onTeamMemberChange,
  vehicleType,
  onVehicleTypeChange,
  onRefresh,
  onExportAll,
  loading = false,
  className,
  teamMembers = [],
}: FilterBarProps) {
  const [showCustomDate, setShowCustomDate] = useState(false);

  const handlePeriodChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomDate(true);
    } else {
      setShowCustomDate(false);
    }
    onPeriodChange(value as PeriodType);
  };

  return (
    <div className={cn(
      'flex flex-col md:flex-row gap-3 bg-card/50 backdrop-blur-sm rounded-lg border border-border/50',
      'p-4',
      className
    )}>
      <div className="flex flex-1 flex-col md:flex-row gap-3">
        {/* Period Selector */}
        <Select value={period} onValueChange={handlePeriodChange}>
          <SelectTrigger 
            className="w-full md:w-40"
            data-testid="select-period"
          >
            <SelectValue placeholder="Select period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Today</SelectItem>
            <SelectItem value="week">This Week</SelectItem>
            <SelectItem value="month">This Month</SelectItem>
            <SelectItem value="quarter">This Quarter</SelectItem>
            <SelectItem value="year">This Year</SelectItem>
            <SelectItem value="custom">Custom Range</SelectItem>
          </SelectContent>
        </Select>

        {/* Custom Date Range */}
        {showCustomDate && onCustomDateChange && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  'w-full md:w-64 justify-start text-left font-normal',
                  !customDateRange.from && 'text-muted-foreground'
                )}
                data-testid="button-date-range"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {customDateRange.from ? (
                  customDateRange.to ? (
                    <>
                      {format(customDateRange.from, 'LLL dd, y')} -{' '}
                      {format(customDateRange.to, 'LLL dd, y')}
                    </>
                  ) : (
                    format(customDateRange.from, 'LLL dd, y')
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                defaultMonth={customDateRange.from}
                selected={{
                  from: customDateRange.from,
                  to: customDateRange.to,
                }}
                onSelect={(range: any) => {
                  onCustomDateChange({
                    from: range?.from,
                    to: range?.to,
                  });
                }}
                numberOfMonths={2}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        )}

        {/* Team Member Filter */}
        {onTeamMemberChange && teamMembers.length > 0 && (
          <Select value={teamMember || 'all'} onValueChange={onTeamMemberChange}>
            <SelectTrigger 
              className="w-full md:w-48"
              data-testid="select-team-member"
            >
              <SelectValue placeholder="All Team Members" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Team Members</SelectItem>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Vehicle Type Filter */}
        {onVehicleTypeChange && (
          <Select value={vehicleType || 'all'} onValueChange={onVehicleTypeChange}>
            <SelectTrigger 
              className="w-full md:w-32"
              data-testid="select-vehicle-type"
            >
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="used">Used</SelectItem>
              <SelectItem value="certified">Certified</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {onRefresh && (
          <Button
            variant="outline"
            size="icon"
            onClick={onRefresh}
            disabled={loading}
            data-testid="button-refresh"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        )}
        {onExportAll && (
          <Button
            variant="outline"
            onClick={onExportAll}
            disabled={loading}
            className="gap-2"
            data-testid="button-export-all"
          >
            <Download className="h-4 w-4" />
            <span className="hidden md:inline">Export All</span>
          </Button>
        )}
      </div>
    </div>
  );
}