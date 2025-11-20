import { useState } from 'react';
import { Building2, TrendingUp, Zap, Users } from 'lucide-react';
import type { HierarchyUser } from '@/lib/hierarchy-types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageLayout } from '@/components/page-layout';
import { OrgChart } from '@/components/hierarchy/org-chart';
import { TeamPerformanceDashboard } from '@/components/hierarchy/team-performance-dashboard';
import { PerformanceOptimization } from '@/components/hierarchy/performance-optimization';

export default function HierarchyPage() {
  const [selectedUser, setSelectedUser] = useState<HierarchyUser | undefined>();
  const [activeTab, setActiveTab] = useState<string>('org-chart');

  const handleSelectUser = (user: HierarchyUser) => {
    setSelectedUser(user);
    // When a user is selected, automatically switch to performance tab
    setActiveTab('performance');
  };

  return (
    <PageLayout className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-lg bg-background/90 border-b shadow-sm">
        <div className="container mx-auto px-4 md:px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-lg shadow-primary/25">
                <Building2 className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Organization Hierarchy
                </h1>
                <p className="text-sm text-muted-foreground font-medium mt-0.5">
                  Manage your team structure, view performance metrics, and optimize team efficiency
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 md:px-6 py-6 space-y-6">

      {/* Selected User Info */}
      {selectedUser && (
        <Card className="border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-lg">Selected: {selectedUser.name}</CardTitle>
                <CardDescription>
                  {selectedUser.role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} - {selectedUser.roleLevel}
                </CardDescription>
              </div>
              <button
                onClick={() => setSelectedUser(undefined)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Clear selection
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground mb-1">Deals Closed</div>
                <div className="text-2xl font-bold">{selectedUser.metrics.dealsClosed || 0}</div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Revenue</div>
                <div className="text-2xl font-bold">
                  ${((selectedUser.metrics.revenue || 0) / 1000).toFixed(0)}k
                </div>
              </div>
              <div>
                <div className="text-muted-foreground mb-1">Customer Satisfaction</div>
                <div className="text-2xl font-bold">
                  {selectedUser.metrics.customerSatisfaction?.toFixed(1) || 'N/A'}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="org-chart" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>Org Chart</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span>Team Performance</span>
          </TabsTrigger>
          <TabsTrigger value="optimization" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span>Optimization</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="org-chart" className="space-y-4">
          <OrgChart
            onSelectUser={handleSelectUser}
            selectedUserId={selectedUser?.id}
          />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <TeamPerformanceDashboard
            managerId={selectedUser?.id}
            showAllUsers={!selectedUser}
          />
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <PerformanceOptimization managerId={selectedUser?.id} />
        </TabsContent>
      </Tabs>

      {/* Quick Stats Footer */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
            <div>
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">--</div>
              <div className="text-sm text-muted-foreground">Total Team Members</div>
            </div>
            <div>
              <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">--</div>
              <div className="text-sm text-muted-foreground">Departments</div>
            </div>
            <div>
              <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">--</div>
              <div className="text-sm text-muted-foreground">Avg Performance Score</div>
            </div>
            <div>
              <Zap className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <div className="text-2xl font-bold">--</div>
              <div className="text-sm text-muted-foreground">Active Optimizations</div>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </PageLayout>
  );
}
