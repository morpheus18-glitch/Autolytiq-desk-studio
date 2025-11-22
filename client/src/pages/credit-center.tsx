import { useState } from 'react';
import { Link } from 'wouter';
import {
  Calculator,
  Shield,
  TrendingUp,
  Target,
  CreditCard,
  FileCheck,
  ChartLine,
  GraduationCap,
  Sparkles
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PageLayout } from '@/components/page-layout';
import { PageHero } from '@/components/page-hero';
import { CreditSimulator } from '@/components/credit-simulator';
import { PreQualification } from '@/components/pre-qualification';
import { CreditDashboard } from '@/components/credit-dashboard';
import { cn } from '@/lib/utils';
import {
  containerPadding,
  layoutSpacing,
  gridLayouts,
  premiumCardClasses,
  formSpacing,
  stickyHeaderClasses,
  pageTitleClasses,
  pageSubtitleClasses,
  heroIconContainerClasses,
  primaryButtonClasses,
} from '@/lib/design-tokens';

export default function CreditCenter() {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  return (
    <PageLayout className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className={stickyHeaderClasses}>
        <div className={cn(containerPadding, layoutSpacing.header)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(heroIconContainerClasses, "bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-lg shadow-primary/25")}>
                <CreditCard className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className={pageTitleClasses}>
                  Credit Center
                </h1>
                <p className={pageSubtitleClasses}>
                  Understand, simulate, and improve your credit for better auto financing
                </p>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <Button variant="outline" asChild data-testid="button-view-deals">
                <Link href="/deals">
                  <FileCheck className="w-4 h-4 mr-2" />
                  View Deals
                </Link>
              </Button>
              <Button asChild data-testid="button-new-deal" className={primaryButtonClasses}>
                <Link href="/deals/new">
                  <Sparkles className="w-4 h-4" />
                  Start New Deal
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Cards */}
      <div className={cn(containerPadding, layoutSpacing.section)}>
        <div className={cn(gridLayouts.fourCol, "mb-6")}>
          <Card className={cn(premiumCardClasses, "p-4 bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20")}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Score</p>
                <p className="text-2xl font-bold font-mono">680</p>
                <p className="text-xs text-green-600">Good Credit</p>
              </div>
            </div>
          </Card>

          <Card className={cn(premiumCardClasses, "p-4 bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20")}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Target className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Potential</p>
                <p className="text-2xl font-bold">+45 pts</p>
                <p className="text-xs text-blue-600">In 6 months</p>
              </div>
            </div>
          </Card>

          <Card className={cn(premiumCardClasses, "p-4 bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20")}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <CreditCard className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Utilization</p>
                <p className="text-2xl font-bold">28%</p>
                <p className="text-xs text-yellow-600">Below 30% ✓</p>
              </div>
            </div>
          </Card>

          <Card className={cn(premiumCardClasses, "p-4 bg-gradient-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20")}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pre-Qualified</p>
                <p className="text-2xl font-bold">3.99%</p>
                <p className="text-xs text-purple-600">Best APR</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="dashboard" className="gap-2">
              <ChartLine className="w-4 h-4" />
              <span className="hidden sm:inline">Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </TabsTrigger>
            <TabsTrigger value="simulator" className="gap-2">
              <Calculator className="w-4 h-4" />
              <span className="hidden sm:inline">Simulator</span>
              <span className="sm:hidden">Simulate</span>
            </TabsTrigger>
            <TabsTrigger value="prequalify" className="gap-2">
              <Shield className="w-4 h-4" />
              <span className="hidden sm:inline">Pre-Qualify</span>
              <span className="sm:hidden">Qualify</span>
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6 mt-6">
            <CreditDashboard />
          </TabsContent>

          {/* Simulator Tab */}
          <TabsContent value="simulator" className="space-y-6 mt-6">
            <div className={gridLayouts.threeCol}>
              <div className="lg:col-span-2">
                <CreditSimulator />
              </div>
              
              <div className={formSpacing.fields}>
                {/* Educational Cards */}
                <Card className={cn(premiumCardClasses, "p-4")}>
                  <CardHeader className="p-0 pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      How It Works
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Our simulator uses the FICO scoring model to calculate your estimated credit score.
                    </p>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="w-12 text-center">35%</Badge>
                        <span>Payment History</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="w-12 text-center">30%</Badge>
                        <span>Credit Utilization</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="w-12 text-center">15%</Badge>
                        <span>Credit History Length</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="w-12 text-center">10%</Badge>
                        <span>Credit Mix</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant="outline" className="w-12 text-center">10%</Badge>
                        <span>New Credit</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(premiumCardClasses, "p-4")}>
                  <CardHeader className="p-0 pb-3">
                    <CardTitle className="text-sm font-medium">Quick Tips</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-2">
                    <div className="space-y-2">
                      <div className="p-2 bg-green-500/10 rounded text-xs">
                        <p className="font-medium text-green-700 dark:text-green-400">Best Practice</p>
                        <p className="text-muted-foreground">Keep utilization under 10% for maximum score</p>
                      </div>
                      <div className="p-2 bg-yellow-500/10 rounded text-xs">
                        <p className="font-medium text-yellow-700 dark:text-yellow-400">Important</p>
                        <p className="text-muted-foreground">Never miss a payment - it stays 7 years</p>
                      </div>
                      <div className="p-2 bg-blue-500/10 rounded text-xs">
                        <p className="font-medium text-blue-700 dark:text-blue-400">Pro Tip</p>
                        <p className="text-muted-foreground">Become an authorized user for instant boost</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={cn(premiumCardClasses, "p-4")}>
                  <CardHeader className="p-0 pb-3">
                    <CardTitle className="text-sm font-medium">Auto Financing Impact</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-2">
                    <p className="text-xs text-muted-foreground">
                      Your credit score directly affects your auto loan:
                    </p>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span>720+ (Excellent)</span>
                        <span className="font-mono font-medium">3-5% APR</span>
                      </div>
                      <div className="flex justify-between">
                        <span>660-719 (Good)</span>
                        <span className="font-mono font-medium">5-9% APR</span>
                      </div>
                      <div className="flex justify-between">
                        <span>600-659 (Fair)</span>
                        <span className="font-mono font-medium">8-13% APR</span>
                      </div>
                      <div className="flex justify-between">
                        <span>500-599 (Poor)</span>
                        <span className="font-mono font-medium">12-18% APR</span>
                      </div>
                      <div className="flex justify-between">
                        <span>&lt;500 (Subprime)</span>
                        <span className="font-mono font-medium">16-25% APR</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Pre-Qualify Tab */}
          <TabsContent value="prequalify" className="space-y-6 mt-6">
            <PreQualification />
          </TabsContent>
        </Tabs>

        {/* Bottom CTA Section */}
        <Card className={cn(premiumCardClasses, "mt-8 p-6 bg-gradient-to-r from-primary/10 via-primary/5 to-background border-primary/20")}>
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Ready to finance your next vehicle?</h3>
              <p className="text-sm text-muted-foreground">
                Use your credit insights to get the best rates on your auto loan
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild data-testid="button-view-inventory">
                <Link href="/inventory">
                  Browse Inventory
                </Link>
              </Button>
              <Button asChild data-testid="button-start-application">
                <Link href="/deals/new">
                  Start Application
                </Link>
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}