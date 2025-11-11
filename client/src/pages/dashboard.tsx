import { useState } from 'react';
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
  LayoutDashboard
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
        description: 'Opening deal worksheet...',
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
  
  const handleDesking = () => {
    createDealMutation.mutate();
  };
  
  return (
    <PageLayout className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-md bg-background/80 border-b">
        <div className="container mx-auto px-3 md:px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-primary" />
              <div>
                <h1 className="text-2xl md:text-3xl font-semibold text-foreground">Command Center</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Your dealership at a glance
                </p>
              </div>
            </div>
            <Button 
              size="lg"
              onClick={handleDesking}
              disabled={usersLoading || createDealMutation.isPending}
              data-testid="button-desking"
              className="gap-2 hidden md:flex"
            >
              <FileText className="w-4 h-4" />
              {usersLoading ? 'Loading...' : 'Desking'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* Dashboard Content */}
      <div className="container mx-auto px-3 md:px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Deals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deals</CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-total-deals">
                {statsLoading ? '-' : stats?.total || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All time
              </p>
            </CardContent>
          </Card>
          
          {/* In Progress */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <Clock className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-in-progress">
                {statsLoading ? '-' : stats?.inProgress || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active deals
              </p>
            </CardContent>
          </Card>
          
          {/* Approved */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-approved">
                {statsLoading ? '-' : stats?.approved || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Closed deals
              </p>
            </CardContent>
          </Card>
          
          {/* Conversion Rate */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-conversion-rate">
                {statsLoading ? '-' : `${Math.round((stats?.conversionRate || 0) * 100)}%`}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Draft to approved
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-total-revenue">
                ${statsLoading ? '-' : (stats?.totalRevenue || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                From approved deals
              </p>
            </CardContent>
          </Card>
          
          {/* Avg Deal Value */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Deal Value</CardTitle>
              <DollarSign className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-avg-deal-value">
                ${statsLoading ? '-' : Math.round(stats?.avgDealValue || 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Per approved deal
              </p>
            </CardContent>
          </Card>
          
          {/* Draft Deals */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft Deals</CardTitle>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="metric-draft">
                {statsLoading ? '-' : stats?.draft || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Need attention
              </p>
            </CardContent>
          </Card>
        </div>
        
        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="hover-elevate active-elevate-2 cursor-pointer" onClick={() => setLocation('/deals')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                View All Deals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Browse and manage all deals in your pipeline
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover-elevate active-elevate-2 cursor-pointer" onClick={() => setLocation('/inventory')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="w-5 h-5" />
                Inventory
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View and manage vehicle inventory
              </p>
            </CardContent>
          </Card>
          
          <Card className="hover-elevate active-elevate-2 cursor-pointer" onClick={() => setLocation('/customers')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
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
    </PageLayout>
  );
}
