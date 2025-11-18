import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useHierarchyUsers } from '@/hooks/use-hierarchy';
import type { HierarchyUser, RoleLevel, UserRole } from '@/lib/hierarchy-types';
import { Users, ChevronRight, ChevronDown, Building2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrgChartNodeProps {
  user: HierarchyUser;
  subordinates: HierarchyUser[];
  allUsers: HierarchyUser[];
  onSelectUser: (user: HierarchyUser) => void;
  selectedUserId?: string;
  level: number;
}

const getRoleLevelColor = (level: RoleLevel): string => {
  const colors: Record<RoleLevel, string> = {
    ENTRY: 'bg-slate-100 text-slate-700 border-slate-300',
    JUNIOR: 'bg-blue-100 text-blue-700 border-blue-300',
    MID: 'bg-green-100 text-green-700 border-green-300',
    SENIOR: 'bg-amber-100 text-amber-700 border-amber-300',
    LEAD: 'bg-orange-100 text-orange-700 border-orange-300',
    MANAGER: 'bg-purple-100 text-purple-700 border-purple-300',
    EXECUTIVE: 'bg-red-100 text-red-700 border-red-300',
  };
  return colors[level] || 'bg-gray-100 text-gray-700 border-gray-300';
};

const formatRoleTitle = (role: UserRole): string => {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

const OrgChartNode: React.FC<OrgChartNodeProps> = ({
  user,
  subordinates,
  allUsers,
  onSelectUser,
  selectedUserId,
  level,
}) => {
  const [isExpanded, setIsExpanded] = useState(level < 2);
  const hasSubordinates = subordinates.length > 0;

  const userSubordinates = allUsers.filter((u) => u.managerId === user.id);

  return (
    <div className="relative">
      <div className="flex items-start gap-2">
        {hasSubordinates && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 mt-1"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </Button>
        )}
        {!hasSubordinates && <div className="w-6" />}

        <Card
          className={cn(
            'flex-1 cursor-pointer transition-all hover:shadow-md',
            selectedUserId === user.id && 'ring-2 ring-primary'
          )}
          onClick={() => onSelectUser(user)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{user.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatRoleTitle(user.role)}
                </div>
              </div>
              <Badge className={cn('text-xs', getRoleLevelColor(user.roleLevel))}>
                {user.roleLevel}
              </Badge>
            </div>

            {hasSubordinates && (
              <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>{subordinates.length} direct report{subordinates.length !== 1 ? 's' : ''}</span>
              </div>
            )}

            <div className="mt-2 flex gap-2 text-xs">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Deals</span>
                <span className="font-semibold">{user.metrics.dealsClosed || 0}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Revenue</span>
                <span className="font-semibold">
                  ${((user.metrics.revenue || 0) / 1000).toFixed(0)}k
                </span>
              </div>
              {user.metrics.customerSatisfaction && (
                <div className="flex flex-col">
                  <span className="text-muted-foreground">CSAT</span>
                  <span className="font-semibold">
                    {user.metrics.customerSatisfaction.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {hasSubordinates && isExpanded && (
        <div className="ml-8 mt-2 space-y-2 border-l-2 border-border pl-4">
          {userSubordinates.map((subordinate) => {
            const subSubordinates = allUsers.filter((u) => u.managerId === subordinate.id);
            return (
              <OrgChartNode
                key={subordinate.id}
                user={subordinate}
                subordinates={subSubordinates}
                allUsers={allUsers}
                onSelectUser={onSelectUser}
                selectedUserId={selectedUserId}
                level={level + 1}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

interface OrgChartProps {
  onSelectUser?: (user: HierarchyUser) => void;
  selectedUserId?: string;
}

export const OrgChart: React.FC<OrgChartProps> = ({ onSelectUser, selectedUserId }) => {
  const { data: users, isLoading, error } = useHierarchyUsers();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Chart</CardTitle>
          <CardDescription>Loading organizational structure...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load organization chart: {error instanceof Error ? error.message : 'Unknown error'}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!users || users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Organization Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Users in Hierarchy</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Add users to the hierarchy to see the organizational structure.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find root users (those without managers)
  const rootUsers = users.filter((u) => !u.managerId);

  const handleSelectUser = (user: HierarchyUser) => {
    if (onSelectUser) {
      onSelectUser(user);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Organization Chart
        </CardTitle>
        <CardDescription>
          Hierarchical view of your organization - {users.length} total member{users.length !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px] pr-4">
          <div className="space-y-3">
            {rootUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p>All users have managers assigned.</p>
                <p className="text-xs mt-1">No top-level executives found.</p>
              </div>
            ) : (
              rootUsers.map((rootUser) => {
                const subordinates = users.filter((u) => u.managerId === rootUser.id);
                return (
                  <OrgChartNode
                    key={rootUser.id}
                    user={rootUser}
                    subordinates={subordinates}
                    allUsers={users}
                    onSelectUser={handleSelectUser}
                    selectedUserId={selectedUserId}
                    level={0}
                  />
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
