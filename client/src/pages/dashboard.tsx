import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/page-layout';
import { PageHeader } from '@/components/core/page-header';
import { PageContent } from '@/components/core/page-content';
import { LoadingState } from '@/components/core/loading-state';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  premiumCardClasses,
  gridLayouts,
  cardSpacing,
  statusColors,
  financialColors,
  metricIconContainerClasses,
  getMetricIconClasses,
} from '@/lib/design-tokens';
import { cn } from '@/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  CheckCircle,
  Clock,
  Users,
  Car,
  LayoutDashboard,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Target
} from 'lucide-react';
import type { User as UserType } from '@shared/schema';

type DealStats = {
  total: number;
  draft: number;
  inProgress: number;
  approved: number;
  cancelled: number;
  totalRevenue: number;
  avgDealValue: number;
  conversionRate: number;
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Get users for salesperson
  const { data: users, isLoading: usersLoading } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
  });
  
  // Get deal statistics
  const { data: stats, isLoading: statsLoading } = useQuery<DealStats>({
    queryKey: ['/api/deals/stats'],
  });
  
  // Create deal mutation
  const createDealMutation = useMutation({
    mutationFn: async () => {
      const salesperson = users?.find(u => u.role === 'salesperson') || users?.[0];
      if (!salesperson) {
        throw new Error('No users available');
      }
      
      const response = await apiRequest('POST', '/api/deals', {
        salespersonId: salesperson.id,
      });
      return await response.json();
    },
    onSuccess: (deal) => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals/stats'] });
      toast({
        title: 'Deal created',
        description: 'Opening Deal Studio...',
      });
      setLocation(`/deals/${deal.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create deal',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
  
  const handleStartDeal = () => {
    createDealMutation.mutate();
  };
  
  return (
    <PageLayout className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <PageHeader
        title="Dashboard"
        subtitle="Your dealership at a glance"
        icon={<LayoutDashboard />}
        actions={
          <Button
            size="lg"
            onClick={handleStartDeal}
            disabled={createDealMutation.isPending}
            data-testid="button-start-deal"
            className="gap-2 shadow-lg shadow-primary/20"
          >
            <Zap className="w-4 h-4" />
            {createDealMutation.isPending ? 'Creating...' : 'Start Deal'}
          </Button>
        }
      />

      <PageContent>
        {statsLoading && <LoadingState message="Loading dashboard metrics..." />}

        {!statsLoading && (
          <>
            {/* LEADER METRIC - Revenue Hero */}
            <Card className={cn("mb-6 border-l-4 border-l-emerald-500 shadow-lg bg-gradient-to-r from-emerald-50 to-white dark:from-emerald-950/20 dark:to-card rounded-lg")}>
              <CardContent className={cardSpacing.standard}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">
                  Total Gross
                </p>
                <div className="text-4xl md:text-5xl font-black tabular-nums text-emerald-900 dark:text-emerald-100" data-testid="metric-total-revenue-hero">
                  ${(stats?.totalRevenue || 0).toLocaleString()}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-emerald-600">
                    <ArrowUpRight className="w-4 h-4" />
                    12%
                  </span>
                  <span className="text-sm text-muted-foreground">vs last month</span>
                </div>
              </div>
              <div className="hidden md:flex items-center justify-center w-16 h-16 rounded-xl bg-emerald-500/20">
                <DollarSign className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

            {/* PRIMARY METRICS - Command Center Style */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {/* Total Deals - Blue */}
              <Card className="border-l-4 border-l-blue-500 shadow-md rounded-lg">
                <CardContent className={cardSpacing.compact}>
                  <div className="flex items-start justify-between mb-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="text-xs font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                      DEALS
                    </span>
                  </div>
                  <div className="text-3xl font-black tabular-nums" data-testid="metric-total-deals">
                    {stats?.total || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    Total all time
                  </p>
                </CardContent>
              </Card>

              {/* In Progress - Orange/Amber */}
              <Card className="border-l-4 border-l-amber-500 shadow-md rounded-lg">
                <CardContent className={cardSpacing.compact}>
                  <div className="flex items-start justify-between mb-2">
                    <Clock className="w-5 h-5 text-amber-600" />
                    <span className="text-xs font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 rounded">
                      ACTIVE
                    </span>
                  </div>
                  <div className="text-3xl font-black tabular-nums" data-testid="metric-in-progress">
                    {stats?.inProgress || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    In progress
                  </p>
                </CardContent>
              </Card>

              {/* Approved - Green */}
              <Card className="border-l-4 border-l-green-500 shadow-md rounded-lg">
                <CardContent className={cardSpacing.compact}>
                  <div className="flex items-start justify-between mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-xs font-bold text-green-600 bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">
                      WON
                    </span>
                  </div>
                  <div className="text-3xl font-black tabular-nums" data-testid="metric-approved">
                    {stats?.approved || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    Approved deals
                  </p>
                </CardContent>
              </Card>

              {/* Conversion Rate - Purple */}
              <Card className="border-l-4 border-l-purple-500 shadow-md rounded-lg">
                <CardContent className={cardSpacing.compact}>
                  <div className="flex items-start justify-between mb-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    <span className="inline-flex items-center gap-0.5 text-xs font-bold text-green-600">
                      <ArrowUpRight className="w-3 h-3" />
                      5%
                    </span>
                  </div>
                  <div className="text-3xl font-black tabular-nums" data-testid="metric-conversion-rate">
                    {`${Math.round((stats?.conversionRate || 0) * 100)}%`}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 font-medium">
                    Conversion rate
                  </p>
                </CardContent>
              </Card>
            </div>
        
            {/* Secondary Metrics - Tighter layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {/* Avg Deal Value */}
              <Card className="border-l-4 border-l-neutral-400 shadow-md rounded-lg">
                <CardContent className={cardSpacing.compact}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">
                        Avg Deal Value
                      </p>
                      <div className="text-2xl font-black tabular-nums" data-testid="metric-avg-deal-value">
                        ${Math.round(stats?.avgDealValue || 0).toLocaleString()}
                      </div>
                    </div>
                    <DollarSign className="w-6 h-6 text-neutral-400" />
                  </div>
                </CardContent>
              </Card>

              {/* Draft Deals - Needs Attention */}
              <Card className="border-l-4 border-l-red-500 shadow-md rounded-lg">
                <CardContent className={cardSpacing.compact}>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-red-600 uppercase tracking-wide mb-1">
                        Needs Attention
                      </p>
                      <div className="text-2xl font-black tabular-nums" data-testid="metric-draft">
                        {stats?.draft || 0}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Draft deals waiting
                      </p>
                    </div>
                    <FileText className="w-6 h-6 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
        
            {/* Quick Actions */}
            <div>
              <h2 className="text-lg font-bold mb-4 text-foreground">Quick Actions</h2>
              <div className={gridLayouts.threeCol}>
                <Card className={cn(premiumCardClasses, "cursor-pointer group")} onClick={() => setLocation('/deals')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-base group-hover:text-primary transition-colors">
                      <div className={cn(metricIconContainerClasses, "bg-primary/10 group-hover:bg-primary/20 transition-colors")}>
                        <FileText className="w-5 h-5 text-primary" />
                      </div>
                      View All Deals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Browse and manage all deals in your pipeline
                    </p>
                  </CardContent>
                </Card>

                <Card className={cn(premiumCardClasses, "cursor-pointer group")} onClick={() => setLocation('/inventory')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-base group-hover:text-primary transition-colors">
                      <div className={cn(metricIconContainerClasses, "bg-primary/10 group-hover:bg-primary/20 transition-colors")}>
                        <Car className="w-5 h-5 text-primary" />
                      </div>
                      Inventory
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      View and manage vehicle inventory
                    </p>
                  </CardContent>
                </Card>

                <Card className={cn(premiumCardClasses, "cursor-pointer group")} onClick={() => setLocation('/customers')}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-base group-hover:text-primary transition-colors">
                      <div className={cn(metricIconContainerClasses, "bg-primary/10 group-hover:bg-primary/20 transition-colors")}>
                        <Users className="w-5 h-5 text-primary" />
                      </div>
                      Customers
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Manage customer relationships and history
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </PageContent>
    </PageLayout>
  );
}
