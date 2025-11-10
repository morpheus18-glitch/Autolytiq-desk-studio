import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, TrendingUp, Clock, DollarSign, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeamMemberPerformance {
  id: string;
  name: string;
  role: string;
  avatar?: string;
  deals: number;
  revenue: number;
  profit: number;
  avgDealValue: number;
  avgResponseTime: number;
  customerSatisfaction: number;
  conversionRate: number;
  fiAttachmentRate: number;
}

interface SalesLeaderboardProps {
  data: TeamMemberPerformance[];
  loading?: boolean;
  className?: string;
}

export function SalesLeaderboard({ data, loading = false, className }: SalesLeaderboardProps) {
  if (loading) {
    return (
      <div className={cn('space-y-3', className)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
              <div className="w-10 h-10 bg-muted-foreground/20 rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-muted-foreground/20 rounded" />
                <div className="h-3 w-24 bg-muted-foreground/20 rounded" />
              </div>
              <div className="h-6 w-20 bg-muted-foreground/20 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Trophy className="h-5 w-5 text-orange-600" />;
    return null;
  };

  const getRankBadgeClass = (index: number) => {
    if (index === 0) return 'bg-yellow-500/10 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400';
    if (index === 1) return 'bg-gray-500/10 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400';
    if (index === 2) return 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400';
    return '';
  };

  return (
    <div className={cn('space-y-3', className)}>
      {data.map((member, index) => (
        <div
          key={member.id}
          className={cn(
            'relative p-4 rounded-lg border transition-all duration-200',
            'bg-card/50 backdrop-blur-sm border-border/50',
            'hover-elevate',
            index < 3 && 'border-l-4',
            index === 0 && 'border-l-yellow-500',
            index === 1 && 'border-l-gray-400',
            index === 2 && 'border-l-orange-600'
          )}
          data-testid={`leaderboard-member-${member.id}`}
        >
          <div className="flex items-start gap-4">
            {/* Rank and Avatar */}
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={member.avatar} alt={member.name} />
                <AvatarFallback>
                  {member.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              {index < 3 && (
                <div className="absolute -top-2 -right-2">
                  {getRankIcon(index)}
                </div>
              )}
            </div>

            {/* Member Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium truncate">{member.name}</h4>
                {index < 3 && (
                  <Badge className={cn('text-xs', getRankBadgeClass(index))}>
                    #{index + 1}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mb-3">{member.role}</p>

              {/* Performance Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <DollarSign className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Revenue</span>
                  </div>
                  <p className="text-sm font-mono font-semibold tabular-nums">
                    ${(member.revenue / 1000).toFixed(0)}K
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Deals</span>
                  </div>
                  <p className="text-sm font-mono font-semibold tabular-nums">
                    {member.deals}
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Response</span>
                  </div>
                  <p className="text-sm font-mono font-semibold tabular-nums">
                    {member.avgResponseTime}m
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Rating</span>
                  </div>
                  <p className="text-sm font-mono font-semibold tabular-nums">
                    {member.customerSatisfaction.toFixed(1)}
                  </p>
                </div>
              </div>

              {/* Progress Bars */}
              <div className="mt-3 space-y-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Conversion Rate</span>
                    <span className="font-medium">{member.conversionRate.toFixed(0)}%</span>
                  </div>
                  <Progress value={member.conversionRate} className="h-1.5" />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">F&I Attachment</span>
                    <span className="font-medium">{member.fiAttachmentRate.toFixed(0)}%</span>
                  </div>
                  <Progress value={member.fiAttachmentRate} className="h-1.5" />
                </div>
              </div>
            </div>

            {/* Revenue Badge */}
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">Profit</p>
              <p className="text-lg font-mono font-bold tabular-nums text-green-600 dark:text-green-400">
                ${(member.profit / 1000).toFixed(0)}K
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                ${(member.avgProfit).toFixed(0)}/deal
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}