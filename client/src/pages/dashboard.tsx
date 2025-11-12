import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageLayout } from '@/components/page-layout';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  TrendingUp, 
  DollarSign, 
  FileText, 
  CheckCircle, 
  Clock,
  Users,
  Car,
  LayoutDashboard,
  Zap
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
      {/* Hero Header */}
      <div className="sticky top-0 z-40 backdrop-blur-lg bg-background/90 border-b shadow-sm">
        <div className="container mx-auto px-4 md:px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-lg shadow-primary/25">
                <LayoutDashboard className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Command Center
                </h1>
                <p className="text-sm text-muted-foreground font-medium mt-0.5">
                  Your dealership at a glance
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
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
            </div>
          </div>
        </div>
      </div>
      
      {/* Dashboard Content */}
      <div className="container mx-auto px-4 md:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
          {/* Total Deals */}
          <Card className="border-none shadow-md hover-elevate transition-all bg-gradient-to-br from-card to-card/80">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Total Deals</CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums" data-testid="metric-total-deals">
                {statsLoading ? '-' : stats?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                All time
              </p>
            </CardContent>
          </Card>
          
          {/* In Progress */}
          <Card className="border-none shadow-md hover-elevate transition-all bg-gradient-to-br from-card to-card/80">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">In Progress</CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
                <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums" data-testid="metric-in-progress">
                {statsLoading ? '-' : stats?.inProgress || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                Active deals
              </p>
            </CardContent>
          </Card>
          
          {/* Approved */}
          <Card className="border-none shadow-md hover-elevate transition-all bg-gradient-to-br from-card to-card/80">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Approved</CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-500/10">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums" data-testid="metric-approved">
                {statsLoading ? '-' : stats?.approved || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                Closed deals
              </p>
            </CardContent>
          </Card>
          
          {/* Conversion Rate */}
          <Card className="border-none shadow-md hover-elevate transition-all bg-gradient-to-br from-card to-card/80">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Conversion</CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-purple-500/10">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold tabular-nums" data-testid="metric-conversion-rate">
                {statsLoading ? '-' : `${Math.round((stats?.conversionRate || 0) * 100)}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                Draft to approved
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          {/* Revenue */}
          <Card className="border-none shadow-md hover-elevate transition-all bg-gradient-to-br from-card to-card/80">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Total Revenue</CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/10">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums" data-testid="metric-total-revenue">
                ${statsLoading ? '-' : (stats?.totalRevenue || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                From approved deals
              </p>
            </CardContent>
          </Card>
          
          {/* Avg Deal Value */}
          <Card className="border-none shadow-md hover-elevate transition-all bg-gradient-to-br from-card to-card/80">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Avg Deal Value</CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-amber-500/10">
                <DollarSign className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums" data-testid="metric-avg-deal-value">
                ${statsLoading ? '-' : Math.round(stats?.avgDealValue || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                Per approved deal
              </p>
            </CardContent>
          </Card>
          
          {/* Draft Deals */}
          <Card className="border-none shadow-md hover-elevate transition-all bg-gradient-to-br from-card to-card/80">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Draft Deals</CardTitle>
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/10">
                <FileText className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tabular-nums" data-testid="metric-draft">
                {statsLoading ? '-' : stats?.draft || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-medium">
                Need attention
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Quick Actions */}
        <div>
          <h2 className="text-lg font-bold mb-4 text-foreground">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <Card className="border-none shadow-md hover-elevate active-elevate-2 cursor-pointer transition-all group bg-gradient-to-br from-card to-card/80" onClick={() => setLocation('/deals')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-base group-hover:text-primary transition-colors">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
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
            
            <Card className="border-none shadow-md hover-elevate active-elevate-2 cursor-pointer transition-all group bg-gradient-to-br from-card to-card/80" onClick={() => setLocation('/inventory')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-base group-hover:text-primary transition-colors">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
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
            
            <Card className="border-none shadow-md hover-elevate active-elevate-2 cursor-pointer transition-all group bg-gradient-to-br from-card to-card/80" onClick={() => setLocation('/customers')}>
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-base group-hover:text-primary transition-colors">
                  <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
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
      </div>
    </PageLayout>
  );
}
