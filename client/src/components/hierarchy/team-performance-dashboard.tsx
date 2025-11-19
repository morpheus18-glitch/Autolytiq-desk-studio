import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useHierarchyUsers, useTeamPerformance } from '@/hooks/use-hierarchy';
import type { HierarchyUser, TeamPerformance } from '@/lib/hierarchy-types';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Award,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  suffix?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon, trend, suffix = '' }) => {
  const getTrendColor = () => {
    if (trend === 'up') return 'text-green-600';
    if (trend === 'down') return 'text-red-600';
    return 'text-muted-foreground';
  };

  const getTrendIcon = () => {
    if (trend === 'up') return <TrendingUp className="h-3 w-3" />;
    if (trend === 'down') return <TrendingDown className="h-3 w-3" />;
    return null;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold">
              {value}
              {suffix && <span className="text-sm font-normal text-muted-foreground ml-1">{suffix}</span>}
            </p>
            {change !== undefined && (
              <div className={cn('flex items-center gap-1 mt-1 text-xs', getTrendColor())}>
                {getTrendIcon()}
                <span>{change > 0 ? '+' : ''}{change.toFixed(1)}%</span>
              </div>
            )}
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
};

interface TeamMemberRowProps {
  user: HierarchyUser;
  rank: number;
}

const TeamMemberRow: React.FC<TeamMemberRowProps> = ({ user, rank }) => {
  const performanceScore = (
    ((user.metrics.dealsClosed || 0) * 0.3) +
    ((user.metrics.revenue || 0) / 10000) * 0.4 +
    ((user.metrics.customerSatisfaction || 0) * 10) * 0.3
  );

  const getRankBadge = () => {
    if (rank === 1) return <Badge className="bg-yellow-500 text-white">1st</Badge>;
    if (rank === 2) return <Badge className="bg-gray-400 text-white">2nd</Badge>;
    if (rank === 3) return <Badge className="bg-amber-600 text-white">3rd</Badge>;
    return <Badge variant="outline">{rank}th</Badge>;
  };

  return (
    <div className="flex items-center justify-between py-3 border-b last:border-0">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {getRankBadge()}
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate">{user.name}</div>
          <div className="text-xs text-muted-foreground">
            {user.role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div className="text-right">
          <div className="font-semibold">{user.metrics.dealsClosed || 0}</div>
          <div className="text-xs text-muted-foreground">Deals</div>
        </div>
        <div className="text-right">
          <div className="font-semibold">${((user.metrics.revenue || 0) / 1000).toFixed(0)}k</div>
          <div className="text-xs text-muted-foreground">Revenue</div>
        </div>
        <div className="text-right min-w-[60px]">
          <div className="font-semibold">{performanceScore.toFixed(1)}</div>
          <div className="text-xs text-muted-foreground">Score</div>
        </div>
      </div>
    </div>
  );
};

interface TeamPerformanceDashboardProps {
  managerId?: string;
  showAllUsers?: boolean;
}

export const TeamPerformanceDashboard: React.FC<TeamPerformanceDashboardProps> = ({
  managerId,
  showAllUsers = false,
}) => {
  const { data: users, isLoading: usersLoading } = useHierarchyUsers();
  const { data: performance, isLoading: perfLoading } = useTeamPerformance(managerId);

  const isLoading = usersLoading || perfLoading;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-4">
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!users || users.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>No team data available.</AlertDescription>
      </Alert>
    );
  }

  // Filter users based on managerId or show all
  const teamUsers = showAllUsers
    ? users
    : managerId
    ? users.filter((u) => u.managerId === managerId)
    : users;

  // Calculate team metrics
  const totalDeals = teamUsers.reduce((sum, u) => sum + (u.metrics.dealsClosed || 0), 0);
  const totalRevenue = teamUsers.reduce((sum, u) => sum + (u.metrics.revenue || 0), 0);
  const avgSatisfaction =
    teamUsers.reduce((sum, u) => sum + (u.metrics.customerSatisfaction || 0), 0) / teamUsers.length;

  // Sort users by performance score
  const rankedUsers = [...teamUsers].sort((a, b) => {
    const scoreA =
      ((a.metrics.dealsClosed || 0) * 0.3) +
      ((a.metrics.revenue || 0) / 10000) * 0.4 +
      ((a.metrics.customerSatisfaction || 0) * 10) * 0.3;
    const scoreB =
      ((b.metrics.dealsClosed || 0) * 0.3) +
      ((b.metrics.revenue || 0) / 10000) * 0.4 +
      ((b.metrics.customerSatisfaction || 0) * 10) * 0.3;
    return scoreB - scoreA;
  });

  // Calculate goal progress (example: 100 deals target)
  const dealGoal = 100;
  const dealProgress = (totalDeals / dealGoal) * 100;

  // Mock change percentages (in real app, calculate from historical data)
  const dealsChange = 12.5;
  const revenueChange = 8.3;
  const satisfactionChange = 2.1;

  return (
    <div className="space-y-6">
      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Team Size"
          value={teamUsers.length}
          icon={<Users className="h-5 w-5" />}
          trend="neutral"
        />
        <MetricCard
          title="Total Deals Closed"
          value={totalDeals}
          change={dealsChange}
          icon={<Target className="h-5 w-5" />}
          trend="up"
        />
        <MetricCard
          title="Total Revenue"
          value={`$${(totalRevenue / 1000).toFixed(0)}k`}
          change={revenueChange}
          icon={<DollarSign className="h-5 w-5" />}
          trend="up"
        />
        <MetricCard
          title="Avg. Satisfaction"
          value={avgSatisfaction.toFixed(1)}
          change={satisfactionChange}
          icon={<Award className="h-5 w-5" />}
          trend="up"
        />
      </div>

      {/* Goal Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Team Goals Progress
          </CardTitle>
          <CardDescription>Track progress towards quarterly targets</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Deals Closed</span>
              <span className="text-sm text-muted-foreground">
                {totalDeals} / {dealGoal}
              </span>
            </div>
            <Progress value={Math.min(dealProgress, 100)} className="h-2" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Revenue Target</span>
              <span className="text-sm text-muted-foreground">
                ${(totalRevenue / 1000).toFixed(0)}k / $500k
              </span>
            </div>
            <Progress value={Math.min((totalRevenue / 500000) * 100, 100)} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Team Rankings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Team Performance Rankings
          </CardTitle>
          <CardDescription>Top performers based on deals, revenue, and satisfaction</CardDescription>
        </CardHeader>
        <CardContent>
          {rankedUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No team members to display</p>
            </div>
          ) : (
            <div>
              {rankedUsers.map((user, index) => (
                <TeamMemberRow key={user.id} user={user} rank={index + 1} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Distribution */}
      {performance && (
        <Card>
          <CardHeader>
            <CardTitle>Performance Insights</CardTitle>
            <CardDescription>Team-wide performance analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">Average Performance Score</div>
                <div className="text-2xl font-bold">{performance.avgPerformanceScore.toFixed(1)}</div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Total Team Members</div>
                <div className="text-2xl font-bold">{performance.teamSize}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
