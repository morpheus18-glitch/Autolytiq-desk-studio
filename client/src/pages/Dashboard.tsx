/**
 * Dashboard Page
 *
 * Main overview page showing key metrics and recent activity.
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
}

function StatCard({ title, value, change, icon, iconBg }: StatCardProps): JSX.Element {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
            {change && (
              <div className="mt-2 flex items-center gap-1">
                {change.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4 text-success" />
                ) : change.trend === 'down' ? (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                ) : null}
                <span
                  className={cn(
                    'text-sm font-medium',
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
                <span className="text-sm text-muted-foreground">vs last month</span>
              </div>
            )}
          </div>
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', iconBg)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Recent deals mock data
 */
const recentDeals = [
  {
    id: '1',
    customer: 'John Smith',
    vehicle: '2024 Toyota Camry',
    status: 'delivered',
    amount: 32500,
    date: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
  },
  {
    id: '2',
    customer: 'Sarah Johnson',
    vehicle: '2023 Honda Accord',
    status: 'financing',
    amount: 28900,
    date: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: '3',
    customer: 'Mike Williams',
    vehicle: '2024 Ford F-150',
    status: 'negotiating',
    amount: 52000,
    date: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
  {
    id: '4',
    customer: 'Emily Davis',
    vehicle: '2023 BMW X5',
    status: 'pending_delivery',
    amount: 68500,
    date: new Date(Date.now() - 48 * 60 * 60 * 1000),
  },
];

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: string }): JSX.Element {
  const styles: Record<string, string> = {
    delivered: 'bg-success/10 text-success',
    financing: 'bg-info/10 text-info',
    negotiating: 'bg-warning/10 text-warning',
    pending_delivery: 'bg-primary/10 text-primary',
    lead: 'bg-muted text-muted-foreground',
    lost: 'bg-destructive/10 text-destructive',
  };

  const labels: Record<string, string> = {
    delivered: 'Delivered',
    financing: 'Financing',
    negotiating: 'Negotiating',
    pending_delivery: 'Pending Delivery',
    lead: 'Lead',
    lost: 'Lost',
  };

  return (
    <span
      className={cn('rounded-full px-2 py-0.5 text-xs font-medium', styles[status] || styles.lead)}
    >
      {labels[status] || status}
    </span>
  );
}

export function DashboardPage(): JSX.Element {
  const { user } = useAuth();

  return (
    <MainLayout>
      <PageHeader
        title={`Good ${getGreeting()}, ${user?.name?.split(' ')[0] || 'there'}!`}
        subtitle="Here's what's happening at your dealership today."
        actions={
          <Link href="/deals">
            <Button icon={<Plus className="h-4 w-4" />}>New Deal</Button>
          </Link>
        }
        showBorder={false}
      />

      <div className="px-4 pb-8 sm:px-6 lg:px-8">
        {/* Stats grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(284500)}
            change={{ value: 12.5, trend: 'up' }}
            icon={<DollarSign className="h-6 w-6 text-success" />}
            iconBg="bg-success/10"
          />
          <StatCard
            title="Active Deals"
            value="23"
            change={{ value: 8.2, trend: 'up' }}
            icon={<Handshake className="h-6 w-6 text-primary" />}
            iconBg="bg-primary/10"
          />
          <StatCard
            title="Available Inventory"
            value="142"
            change={{ value: -3.1, trend: 'down' }}
            icon={<Car className="h-6 w-6 text-accent" />}
            iconBg="bg-accent/10"
          />
          <StatCard
            title="New Leads"
            value="18"
            change={{ value: 24.3, trend: 'up' }}
            icon={<Users className="h-6 w-6 text-info" />}
            iconBg="bg-info/10"
          />
        </div>

        {/* Recent deals and quick actions */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Recent deals */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Deals</CardTitle>
                  <Link href="/deals">
                    <Button
                      variant="ghost"
                      size="sm"
                      iconAfter={<ArrowRight className="h-4 w-4" />}
                    >
                      View all
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentDeals.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                          {deal.customer
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{deal.customer}</p>
                          <p className="text-sm text-muted-foreground">{deal.vehicle}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-foreground">{formatCurrency(deal.amount)}</p>
                        <div className="mt-1 flex items-center justify-end gap-2">
                          <StatusBadge status={deal.status} />
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(deal.date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick actions */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Link href="/deals" className="block no-underline">
                    <button className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Handshake className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Create New Deal</p>
                        <p className="text-xs text-muted-foreground">Start a new sales process</p>
                      </div>
                    </button>
                  </Link>
                  <Link href="/customers" className="block no-underline">
                    <button className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                        <Users className="h-5 w-5 text-info" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Add Customer</p>
                        <p className="text-xs text-muted-foreground">Register a new customer</p>
                      </div>
                    </button>
                  </Link>
                  <Link href="/inventory" className="block no-underline">
                    <button className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:bg-muted">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                        <Car className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">Add Vehicle</p>
                        <p className="text-xs text-muted-foreground">Add to inventory</p>
                      </div>
                    </button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Performance summary */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>This Month</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Deals Closed</span>
                      <span className="font-medium text-foreground">12 / 15</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-primary" style={{ width: '80%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Revenue Target</span>
                      <span className="font-medium text-foreground">$284.5k / $350k</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-success" style={{ width: '81%' }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Lead Conversion</span>
                      <span className="font-medium text-foreground">24%</span>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted">
                      <div className="h-2 rounded-full bg-info" style={{ width: '24%' }} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </MainLayout>
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
