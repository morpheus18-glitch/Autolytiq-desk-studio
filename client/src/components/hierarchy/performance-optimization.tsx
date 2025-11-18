import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useHierarchyUsers } from '@/hooks/use-hierarchy';
import type { HierarchyUser } from '@/lib/hierarchy-types';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Target,
  Users,
  Zap,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OptimizationInsight {
  id: string;
  type: 'opportunity' | 'warning' | 'success';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  affectedUsers: HierarchyUser[];
  metric: string;
  currentValue: number;
  targetValue: number;
  improvement: number;
}

interface InsightCardProps {
  insight: OptimizationInsight;
  onViewDetails?: (insight: OptimizationInsight) => void;
}

const InsightCard: React.FC<InsightCardProps> = ({ insight, onViewDetails }) => {
  const getTypeIcon = () => {
    switch (insight.type) {
      case 'opportunity':
        return <TrendingUp className="h-5 w-5 text-blue-600" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-600" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    }
  };

  const getTypeColor = () => {
    switch (insight.type) {
      case 'opportunity':
        return 'border-blue-200 bg-blue-50';
      case 'warning':
        return 'border-amber-200 bg-amber-50';
      case 'success':
        return 'border-green-200 bg-green-50';
    }
  };

  const getImpactBadge = () => {
    const variants: Record<typeof insight.impact, string> = {
      high: 'bg-red-100 text-red-700 border-red-300',
      medium: 'bg-amber-100 text-amber-700 border-amber-300',
      low: 'bg-blue-100 text-blue-700 border-blue-300',
    };
    return (
      <Badge className={cn('text-xs', variants[insight.impact])}>
        {insight.impact.toUpperCase()} IMPACT
      </Badge>
    );
  };

  const progress = (insight.currentValue / insight.targetValue) * 100;

  return (
    <Card className={cn('border-2', getTypeColor())}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            {getTypeIcon()}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base mb-1">{insight.title}</CardTitle>
              <CardDescription className="text-sm">{insight.description}</CardDescription>
            </div>
          </div>
          {getImpactBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{insight.metric}</span>
            <span className="font-medium">
              {insight.currentValue.toFixed(0)} / {insight.targetValue.toFixed(0)}
            </span>
          </div>
          <Progress value={Math.min(progress, 100)} className="h-2" />
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{insight.affectedUsers.length} team member{insight.affectedUsers.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Potential: </span>
              <span className="font-semibold text-green-600">+{insight.improvement.toFixed(0)}%</span>
            </div>
            {onViewDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(insight)}
                className="h-8 text-xs"
              >
                Details
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface PerformanceOptimizationProps {
  managerId?: string;
}

export const PerformanceOptimization: React.FC<PerformanceOptimizationProps> = ({ managerId }) => {
  const { data: users, isLoading, error } = useHierarchyUsers();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load optimization insights: {error instanceof Error ? error.message : 'Unknown error'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!users || users.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No team data available for optimization analysis.</AlertDescription>
      </Alert>
    );
  }

  // Filter users if managerId is provided
  const teamUsers = managerId ? users.filter((u) => u.managerId === managerId) : users;

  // Generate insights based on user data
  const generateInsights = (): OptimizationInsight[] => {
    const insights: OptimizationInsight[] = [];

    // Low performers who could improve
    const lowPerformers = teamUsers.filter((u) => (u.metrics.dealsClosed || 0) < 5);
    if (lowPerformers.length > 0) {
      const avgDeals = teamUsers.reduce((sum, u) => sum + (u.metrics.dealsClosed || 0), 0) / teamUsers.length;
      insights.push({
        id: 'low-deals',
        type: 'opportunity',
        title: 'Deal Closure Opportunity',
        description: `${lowPerformers.length} team members are below target deal closures. Targeted coaching could improve performance.`,
        impact: 'high',
        affectedUsers: lowPerformers,
        metric: 'Deals Closed',
        currentValue: lowPerformers.reduce((sum, u) => sum + (u.metrics.dealsClosed || 0), 0),
        targetValue: lowPerformers.length * avgDeals,
        improvement: 25,
      });
    }

    // Customer satisfaction issues
    const lowSatisfaction = teamUsers.filter((u) => (u.metrics.customerSatisfaction || 0) < 4.0);
    if (lowSatisfaction.length > 0) {
      insights.push({
        id: 'low-csat',
        type: 'warning',
        title: 'Customer Satisfaction Alert',
        description: `${lowSatisfaction.length} team members have customer satisfaction scores below 4.0. Immediate attention needed.`,
        impact: 'high',
        affectedUsers: lowSatisfaction,
        metric: 'CSAT Score',
        currentValue: lowSatisfaction.reduce((sum, u) => sum + (u.metrics.customerSatisfaction || 0), 0) / lowSatisfaction.length,
        targetValue: 4.5,
        improvement: 15,
      });
    }

    // High performers
    const highPerformers = teamUsers.filter(
      (u) => (u.metrics.dealsClosed || 0) >= 10 && (u.metrics.customerSatisfaction || 0) >= 4.5
    );
    if (highPerformers.length > 0) {
      insights.push({
        id: 'high-performers',
        type: 'success',
        title: 'Top Performers Identified',
        description: `${highPerformers.length} team members are exceeding targets. Consider them for mentorship roles or advancement.`,
        impact: 'medium',
        affectedUsers: highPerformers,
        metric: 'Performance Score',
        currentValue: highPerformers.length,
        targetValue: highPerformers.length,
        improvement: 0,
      });
    }

    // Revenue opportunity
    const lowRevenue = teamUsers.filter((u) => (u.metrics.revenue || 0) < 50000);
    if (lowRevenue.length > 0) {
      const avgRevenue = teamUsers.reduce((sum, u) => sum + (u.metrics.revenue || 0), 0) / teamUsers.length;
      insights.push({
        id: 'revenue-opportunity',
        type: 'opportunity',
        title: 'Revenue Growth Potential',
        description: `${lowRevenue.length} team members are generating below-average revenue. Focus on upselling and cross-selling training.`,
        impact: 'high',
        affectedUsers: lowRevenue,
        metric: 'Revenue Generated',
        currentValue: lowRevenue.reduce((sum, u) => sum + (u.metrics.revenue || 0), 0) / 1000,
        targetValue: (lowRevenue.length * avgRevenue) / 1000,
        improvement: 30,
      });
    }

    // Balanced performers
    const balanced = teamUsers.filter(
      (u) =>
        (u.metrics.dealsClosed || 0) >= 5 &&
        (u.metrics.dealsClosed || 0) < 10 &&
        (u.metrics.customerSatisfaction || 0) >= 4.0
    );
    if (balanced.length > 0) {
      insights.push({
        id: 'balanced-team',
        type: 'success',
        title: 'Well-Balanced Team Core',
        description: `${balanced.length} team members are performing consistently across all metrics. Great foundation for growth.`,
        impact: 'low',
        affectedUsers: balanced,
        metric: 'Consistent Performers',
        currentValue: balanced.length,
        targetValue: balanced.length,
        improvement: 0,
      });
    }

    return insights.sort((a, b) => {
      const impactWeight = { high: 3, medium: 2, low: 1 };
      return impactWeight[b.impact] - impactWeight[a.impact];
    });
  };

  const insights = generateInsights();

  // Calculate overall team health score
  const calculateHealthScore = (): number => {
    const avgDeals = teamUsers.reduce((sum, u) => sum + (u.metrics.dealsClosed || 0), 0) / teamUsers.length;
    const avgSat = teamUsers.reduce((sum, u) => sum + (u.metrics.customerSatisfaction || 0), 0) / teamUsers.length;
    const avgRevenue = teamUsers.reduce((sum, u) => sum + (u.metrics.revenue || 0), 0) / teamUsers.length;

    const dealScore = Math.min((avgDeals / 10) * 100, 100);
    const satScore = (avgSat / 5) * 100;
    const revenueScore = Math.min((avgRevenue / 100000) * 100, 100);

    return (dealScore * 0.4 + satScore * 0.3 + revenueScore * 0.3);
  };

  const healthScore = calculateHealthScore();

  const getHealthColor = () => {
    if (healthScore >= 80) return 'text-green-600';
    if (healthScore >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Overall Health Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Team Performance Health Score
          </CardTitle>
          <CardDescription>
            Composite metric based on deals, satisfaction, and revenue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="flex-1">
              <div className={cn('text-5xl font-bold mb-2', getHealthColor())}>
                {healthScore.toFixed(0)}
              </div>
              <Progress value={healthScore} className="h-3" />
            </div>
            <div className="text-sm text-muted-foreground">
              <div className="space-y-1">
                <div>Deals: {((teamUsers.reduce((sum, u) => sum + (u.metrics.dealsClosed || 0), 0) / teamUsers.length)).toFixed(1)} avg</div>
                <div>CSAT: {((teamUsers.reduce((sum, u) => sum + (u.metrics.customerSatisfaction || 0), 0) / teamUsers.length)).toFixed(1)} avg</div>
                <div>Revenue: ${((teamUsers.reduce((sum, u) => sum + (u.metrics.revenue || 0), 0) / teamUsers.length / 1000)).toFixed(0)}k avg</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-1">Optimization Insights</h3>
          <p className="text-sm text-muted-foreground">
            {insights.length} actionable insight{insights.length !== 1 ? 's' : ''} identified
          </p>
        </div>

        {insights.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Insights Available</h3>
                <p className="text-sm text-muted-foreground">
                  Team performance is optimal or insufficient data to generate insights.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
