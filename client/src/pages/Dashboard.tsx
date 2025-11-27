/**
 * Dashboard Page
 *
 * Main overview page showing key metrics and recent activity with real API integration.
 */

import { type JSX } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Handshake,
  Car,
  Users,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { Link } from 'wouter';
import { MainLayout } from '@/layouts';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader, Card, CardHeader, CardTitle, CardContent, Button } from '@design-system';
import {
  useDashboardStats,
  useRecentDeals,
  type RecentDeal,
  type DashboardStats,
} from '@/hooks/useDashboard';
import { cn, formatCurrency, formatRelativeTime } from '@/lib/utils';

/**
 * Stats card component
 */
interface StatCardProps {
  title: string;
  value: string;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon: React.ReactNode;
  iconBg: string;
  isLoading?: boolean;
}

function StatCard({ title, value, change, icon, iconBg, isLoading }: StatCardProps): JSX.Element {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            {isLoading ? (
              <div className="mt-1.5 h-7 w-20 animate-pulse rounded bg-muted" />
            ) : (
              <p className="mt-1.5 text-xl font-semibold text-foreground">{value}</p>
            )}
            {change && !isLoading && <StatCardChange change={change} />}
          </div>
          <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', iconBg)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Stat card change indicator component
 */
interface StatCardChangeProps {
  change: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
  };
}

function StatCardChange({ change }: StatCardChangeProps): JSX.Element {
  return (
    <div className="mt-1.5 flex items-center gap-1">
      {change.trend === 'up' ? (
        <TrendingUp className="h-3 w-3 text-success" />
      ) : change.trend === 'down' ? (
        <TrendingDown className="h-3 w-3 text-destructive" />
      ) : null}
      <span
        className={cn(
          'text-xs font-medium',
          change.trend === 'up'
            ? 'text-success'
            : change.trend === 'down'
              ? 'text-destructive'
              : 'text-muted-foreground'
        )}
      >
        {change.trend === 'up' ? '+' : ''}
        {change.value}%
      </span>
      <span className="text-xs text-muted-foreground">vs last month</span>
    </div>
  );
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: string }): JSX.Element {
  const styles: Record<string, string> = {
    COMPLETED: 'bg-success/10 text-success',
    APPROVED: 'bg-info/10 text-info',
    IN_PROGRESS: 'bg-warning/10 text-warning',
    PENDING: 'bg-primary/10 text-primary',
    CANCELLED: 'bg-destructive/10 text-destructive',
  };

  const labels: Record<string, string> = {
    COMPLETED: 'Completed',
    APPROVED: 'Approved',
    IN_PROGRESS: 'In Progress',
    PENDING: 'Pending',
    CANCELLED: 'Cancelled',
  };

  return (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-xs font-medium',
        styles[status] || styles.PENDING
      )}
    >
      {labels[status] || status}
    </span>
  );
}

/**
 * Recent deal row component
 */
function RecentDealRow({ deal }: { deal: RecentDeal }): JSX.Element {
  const initials = deal.customer_name
    .split(' ')
    .map((n) => n[0])
    .join('');

  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
          {initials}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{deal.customer_name}</p>
          <p className="text-xs text-muted-foreground">{deal.vehicle_name}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-medium text-foreground">{formatCurrency(deal.amount)}</p>
        <div className="mt-0.5 flex items-center justify-end gap-2">
          <StatusBadge status={deal.status} />
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(new Date(deal.created_at))}
          </span>
        </div>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for recent deals
 */
function DealSkeleton(): JSX.Element {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-3">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        <div>
          <div className="h-3.5 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-1.5 h-3 w-32 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="text-right">
        <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
        <div className="mt-1.5 h-3 w-16 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}

/**
 * Helper to create change object from value
 */
function createChange(
  value: number | undefined
): { value: number; trend: 'up' | 'down' } | undefined {
  if (value === undefined) return undefined;
  return { value, trend: value >= 0 ? 'up' : 'down' };
}

/**
 * Dashboard stats grid component
 */
interface DashboardStatsGridProps {
  stats: DashboardStats | undefined;
  isLoading: boolean;
}

function DashboardStatsGrid({ stats, isLoading }: DashboardStatsGridProps): JSX.Element {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Revenue"
        value={formatCurrency(stats?.revenue?.total || 0)}
        change={createChange(stats?.revenue?.change)}
        icon={<DollarSign className="h-4 w-4 text-success" />}
        iconBg="bg-success/10"
        isLoading={isLoading}
      />
      <StatCard
        title="Active Deals"
        value={String(stats?.deals?.total || 0)}
        change={createChange(stats?.deals?.change)}
        icon={<Handshake className="h-4 w-4 text-primary" />}
        iconBg="bg-primary/10"
        isLoading={isLoading}
      />
      <StatCard
        title="Available Inventory"
        value={String(stats?.inventory?.available || 0)}
        change={undefined}
        icon={<Car className="h-4 w-4 text-accent" />}
        iconBg="bg-accent/10"
        isLoading={isLoading}
      />
      <StatCard
        title="New Leads"
        value={String(stats?.leads?.new || 0)}
        change={createChange(stats?.leads?.change)}
        icon={<Users className="h-4 w-4 text-info" />}
        iconBg="bg-info/10"
        isLoading={isLoading}
      />
    </div>
  );
}

/**
 * Stats error state component
 */
function StatsErrorState({ error }: { error: Error | null }): JSX.Element | null {
  if (!error) return null;
  return (
    <div className="mt-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center">
      <p className="text-sm text-destructive">Failed to load dashboard statistics.</p>
    </div>
  );
}

/**
 * Recent deals loading state
 */
function RecentDealsLoading(): JSX.Element {
  return (
    <>
      <DealSkeleton />
      <DealSkeleton />
      <DealSkeleton />
      <DealSkeleton />
    </>
  );
}

/**
 * Recent deals error state
 */
function RecentDealsError(): JSX.Element {
  return (
    <div className="py-8 text-center">
      <p className="text-muted-foreground">Failed to load recent deals.</p>
    </div>
  );
}

/**
 * Recent deals empty state
 */
function RecentDealsEmpty(): JSX.Element {
  return (
    <div className="py-8 text-center">
      <p className="text-muted-foreground">No recent deals to display.</p>
      <Link href="/deals">
        <Button variant="outline" className="mt-4">
          Create your first deal
        </Button>
      </Link>
    </div>
  );
}

/**
 * Recent deals list component
 */
interface RecentDealsListProps {
  deals: RecentDeal[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

function RecentDealsList({ deals, isLoading, error }: RecentDealsListProps): JSX.Element {
  if (isLoading) {
    return <RecentDealsLoading />;
  }

  if (error) {
    return <RecentDealsError />;
  }

  if (deals && deals.length > 0) {
    return (
      <>
        {deals.map((deal) => (
          <RecentDealRow key={deal.id} deal={deal} />
        ))}
      </>
    );
  }

  return <RecentDealsEmpty />;
}

/**
 * Recent deals card component
 */
interface RecentDealsCardProps {
  deals: RecentDeal[] | undefined;
  isLoading: boolean;
  error: Error | null;
}

function RecentDealsCard({ deals, isLoading, error }: RecentDealsCardProps): JSX.Element {
  return (
    <div className="lg:col-span-2">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Deals</CardTitle>
            <Link href="/deals">
              <Button variant="ghost" size="sm" iconAfter={<ArrowRight className="h-4 w-4" />}>
                View all
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <RecentDealsList deals={deals} isLoading={isLoading} error={error} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Quick action button component
 */
interface QuickActionButtonProps {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
}

function QuickActionButton({
  href,
  icon,
  iconBg,
  title,
  description,
}: QuickActionButtonProps): JSX.Element {
  return (
    <Link href={href} className="block no-underline">
      <button className="flex w-full items-center gap-2.5 rounded-lg border border-border p-2.5 text-left transition-colors hover:bg-muted">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', iconBg)}>
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </button>
    </Link>
  );
}

/**
 * Quick actions card component
 */
function QuickActionsCard(): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <QuickActionButton
            href="/deals"
            icon={<Handshake className="h-4 w-4 text-primary" />}
            iconBg="bg-primary/10"
            title="Create New Deal"
            description="Start a new sales process"
          />
          <QuickActionButton
            href="/customers"
            icon={<Users className="h-4 w-4 text-info" />}
            iconBg="bg-info/10"
            title="Add Customer"
            description="Register a new customer"
          />
          <QuickActionButton
            href="/inventory"
            icon={<Car className="h-4 w-4 text-accent" />}
            iconBg="bg-accent/10"
            title="Add Vehicle"
            description="Add to inventory"
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Progress bar component
 */
interface ProgressBarProps {
  label: string;
  value: string;
  percentage: number;
  color: string;
}

function ProgressBar({ label, value, percentage, color }: ProgressBarProps): JSX.Element {
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium text-foreground">{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-muted">
        <div
          className={cn('h-1.5 rounded-full transition-all', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Monthly progress loading state
 */
function MonthlyProgressLoading(): JSX.Element {
  return (
    <div className="space-y-4">
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
    </div>
  );
}

/**
 * Calculate progress percentage safely
 */
function calculatePercentage(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return Math.min(100, (numerator / denominator) * 100);
}

/**
 * Safe number getter
 */
function safeNum(val: number | undefined): number {
  return val ?? 0;
}

/**
 * Monthly progress content component
 */
interface MonthlyProgressContentProps {
  stats: DashboardStats;
}

function MonthlyProgressContent({ stats }: MonthlyProgressContentProps): JSX.Element {
  const completed = safeNum(stats.deals?.completed);
  const totalDeals = safeNum(stats.deals?.total);
  const pending = safeNum(stats.deals?.pending);
  const available = safeNum(stats.inventory?.available);
  const totalInventory = safeNum(stats.inventory?.total);

  const totalDealsForProgress = totalDeals + completed;

  return (
    <div className="space-y-3">
      <ProgressBar
        label="Deals Closed"
        value={`${completed} / ${totalDealsForProgress}`}
        percentage={calculatePercentage(completed, totalDealsForProgress)}
        color="bg-primary"
      />
      <ProgressBar
        label="Total Inventory"
        value={`${available} available / ${totalInventory} total`}
        percentage={calculatePercentage(available, totalInventory)}
        color="bg-success"
      />
      <ProgressBar
        label="Pending Deals"
        value={String(pending)}
        percentage={calculatePercentage(pending, totalDeals)}
        color="bg-info"
      />
    </div>
  );
}

/**
 * Monthly progress card component
 */
interface MonthlyProgressCardProps {
  stats: DashboardStats | undefined;
  isLoading: boolean;
}

function MonthlyProgressCard({ stats, isLoading }: MonthlyProgressCardProps): JSX.Element {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>This Month</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <MonthlyProgressLoading />
        ) : stats ? (
          <MonthlyProgressContent stats={stats} />
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * Get time-based greeting
 */
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function DashboardPage(): JSX.Element {
  const { user } = useAuth();

  // Fetch dashboard data
  const { data: stats, isLoading: statsLoading, error: statsError } = useDashboardStats();
  const { data: recentDeals, isLoading: dealsLoading, error: dealsError } = useRecentDeals(5);

  const greeting = `Good ${getGreeting()}, ${user?.first_name || 'there'}!`;

  return (
    <MainLayout>
      <PageHeader
        title={greeting}
        subtitle="Here's what's happening at your dealership today."
        actions={
          <Link href="/deals">
            <Button icon={<Plus className="h-4 w-4" />}>New Deal</Button>
          </Link>
        }
        showBorder={false}
      />

      <div className="px-4 pb-6 sm:px-6 lg:px-8">
        {/* Stats grid */}
        <DashboardStatsGrid stats={stats} isLoading={statsLoading} />

        {/* Error state for stats */}
        <StatsErrorState error={statsError} />

        {/* Recent deals and quick actions */}
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Recent deals */}
          <RecentDealsCard deals={recentDeals} isLoading={dealsLoading} error={dealsError} />

          {/* Quick actions and monthly progress */}
          <div>
            <QuickActionsCard />
            <MonthlyProgressCard stats={stats} isLoading={statsLoading} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
