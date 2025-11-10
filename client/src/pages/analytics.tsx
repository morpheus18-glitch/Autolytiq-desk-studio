import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { 
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, ResponsiveContainer, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, FunnelChart, Funnel, 
  LabelList, RadarChart, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, Radar
} from 'recharts';
import { 
  TrendingUp, Package, Users, DollarSign, ShoppingCart,
  Clock, Target, Activity, Zap, TrendingDown, Award,
  FileText, Car, CreditCard, BarChart3, PieChart as PieChartIcon,
  Trophy, ArrowLeft
} from 'lucide-react';
import { MetricCard } from '@/components/analytics/metric-card';
import { ChartCard } from '@/components/analytics/chart-card';
import { FilterBar, type PeriodType } from '@/components/analytics/filter-bar';
import { SalesLeaderboard } from '@/components/analytics/sales-leaderboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

// Color palette for charts
const CHART_COLORS = {
  primary: 'hsl(217, 88%, 48%)',
  secondary: 'hsl(195, 75%, 45%)',
  success: 'hsl(158, 64%, 42%)',
  warning: 'hsl(35, 88%, 52%)',
  purple: 'hsl(280, 65%, 50%)',
  accent: 'hsl(35, 85%, 95%)',
};

const COLORS_ARRAY = Object.values(CHART_COLORS);

export default function Analytics() {
  const { toast } = useToast();
  const [period, setPeriod] = useState<PeriodType>('month');
  const [customDateRange, setCustomDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({ from: undefined, to: undefined });
  const [teamMember, setTeamMember] = useState<string>('all');
  const [vehicleType, setVehicleType] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Build query params
  const queryParams = new URLSearchParams({
    period,
    ...(teamMember !== 'all' && { teamMember }),
    ...(vehicleType !== 'all' && { vehicleType }),
  });

  // Fetch KPIs
  const { data: kpis, isLoading: kpisLoading, refetch: refetchKpis } = useQuery({
    queryKey: ['/api/analytics/kpis', queryParams.toString()],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch Revenue Data
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['/api/analytics/revenue', queryParams.toString()],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch Deal Analytics
  const { data: dealAnalytics, isLoading: dealsLoading } = useQuery({
    queryKey: ['/api/analytics/deals', queryParams.toString()],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch Inventory Metrics
  const { data: inventoryMetrics, isLoading: inventoryLoading } = useQuery({
    queryKey: ['/api/analytics/inventory', queryParams.toString()],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch Team Performance
  const { data: teamPerformance, isLoading: teamLoading } = useQuery({
    queryKey: ['/api/analytics/team', queryParams.toString()],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Generate sparkline data for KPI cards
  const generateSparklineData = (count: number = 30) => {
    return Array.from({ length: count }, (_, i) => ({
      value: Math.random() * 100 + 50,
    }));
  };

  // Handle refresh
  const handleRefresh = () => {
    refetchKpis();
    toast({
      title: 'Data Refreshed',
      description: 'Analytics data has been updated.',
    });
  };

  // Handle export
  const handleExportAll = () => {
    toast({
      title: 'Export Started',
      description: 'Preparing analytics report for download...',
    });
    // Implement actual export logic here
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refetchKpis();
      }, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refetchKpis]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover/95 backdrop-blur-sm border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">
                {entry.dataKey.includes('revenue') || entry.dataKey.includes('profit')
                  ? formatCurrency(entry.value)
                  : entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header with Navigation */}
      <header className="sticky top-0 z-50 border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto">
          <div className="px-4 md:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <nav className="flex items-center gap-2">
                  <Link href="/inventory">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Package className="h-4 w-4" />
                      Inventory
                    </Button>
                  </Link>
                  <Link href="/deals">
                    <Button variant="ghost" size="sm" className="gap-2">
                      <FileText className="h-4 w-4" />
                      Deals
                    </Button>
                  </Link>
                  <Button variant="default" size="sm" className="gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Analytics
                  </Button>
                </nav>
              </div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-semibold">Analytics Dashboard</h1>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1600px] mx-auto">
          {/* Filter Bar */}
          <div className="px-4 md:px-6 lg:px-8 py-4 border-b bg-card/30">
            <FilterBar
            period={period}
            onPeriodChange={setPeriod}
            customDateRange={customDateRange}
            onCustomDateChange={setCustomDateRange}
            teamMember={teamMember}
            onTeamMemberChange={setTeamMember}
            vehicleType={vehicleType}
            onVehicleTypeChange={setVehicleType}
            onRefresh={handleRefresh}
            onExportAll={handleExportAll}
            loading={kpisLoading}
            teamMembers={teamPerformance?.leaderboard?.map((m: any) => ({
              id: m.id,
              name: m.name,
            })) || []}
          />
          </div>

          {/* Main Content Area */}
          <div className="px-4 md:px-6 lg:px-8 py-6 space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Revenue"
                value={kpis?.totalRevenue || 0}
                previousValue={kpis?.totalRevenue ? kpis.totalRevenue / (1 + kpis.revenueChange / 100) : 0}
                format="currency"
                changePercentage={kpis?.revenueChange || 0}
                sparklineData={generateSparklineData()}
                icon={DollarSign}
                loading={kpisLoading}
              />
              <MetricCard
                title="Deals Closed"
                value={kpis?.totalDeals || 0}
                format="number"
                changePercentage={kpis?.dealsChange || 0}
                sparklineData={generateSparklineData()}
                icon={ShoppingCart}
                loading={kpisLoading}
              />
              <MetricCard
                title="Conversion Rate"
                value={kpis?.conversionRate || 0}
                format="percentage"
                trend={kpis?.conversionRate > 70 ? 'up' : 'down'}
                sparklineData={generateSparklineData()}
                icon={Target}
                loading={kpisLoading}
              />
              <MetricCard
                title="Avg Deal Value"
                value={kpis?.avgDealValue || 0}
                format="currency"
                changePercentage={kpis?.avgDealChange || 0}
                sparklineData={generateSparklineData()}
                icon={TrendingUp}
                loading={kpisLoading}
              />
            </div>

            {/* Main Charts Tabs */}
            <Tabs defaultValue="revenue" className="space-y-4">
              <TabsList className="bg-muted/50 backdrop-blur-sm">
                <TabsTrigger value="revenue" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Revenue
                </TabsTrigger>
                <TabsTrigger value="deals" className="gap-2">
                  <PieChartIcon className="h-4 w-4" />
                  Deals
                </TabsTrigger>
                <TabsTrigger value="inventory" className="gap-2">
                  <Package className="h-4 w-4" />
                  Inventory
                </TabsTrigger>
                <TabsTrigger value="team" className="gap-2">
                  <Users className="h-4 w-4" />
                  Team
                </TabsTrigger>
              </TabsList>

              {/* Revenue Tab */}
              <TabsContent value="revenue" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Revenue Trend Chart */}
                  <ChartCard
                    title="Revenue Trend"
                    description="Daily revenue and profit margins"
                    loading={revenueLoading}
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={revenueData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={CHART_COLORS.success} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(date) => format(new Date(date), 'MMM d')}
                          className="text-xs"
                        />
                        <YAxis 
                          tickFormatter={(value) => `$${value / 1000}k`}
                          className="text-xs"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                          type="monotone"
                          dataKey="revenue"
                          name="Revenue"
                          stroke={CHART_COLORS.primary}
                          fill="url(#colorRevenue)"
                          strokeWidth={2}
                        />
                        <Area
                          type="monotone"
                          dataKey="profit"
                          name="Profit"
                          stroke={CHART_COLORS.success}
                          fill="url(#colorProfit)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* Finance vs Cash Split */}
                  <ChartCard
                    title="Payment Methods"
                    description="Finance vs cash deals distribution"
                    loading={revenueLoading}
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={revenueData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(date) => format(new Date(date), 'MMM d')}
                          className="text-xs"
                        />
                        <YAxis 
                          tickFormatter={(value) => `$${value / 1000}k`}
                          className="text-xs"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="financeRevenue" name="Finance" fill={CHART_COLORS.primary} />
                        <Bar dataKey="cashRevenue" name="Cash" fill={CHART_COLORS.secondary} />
                        <Legend />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                {/* Secondary Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    title="Total Profit"
                    value={kpis?.totalProfit || 0}
                    format="currency"
                    changePercentage={kpis?.profitChange || 0}
                    icon={TrendingUp}
                    loading={kpisLoading}
                  />
                  <MetricCard
                    title="Profit Margin"
                    value={kpis?.grossProfitMargin || 0}
                    format="percentage"
                    trend={kpis?.grossProfitMargin > 12 ? 'up' : 'down'}
                    icon={Activity}
                    loading={kpisLoading}
                  />
                  <MetricCard
                    title="Finance Rate"
                    value={kpis?.financeRate || 0}
                    format="percentage"
                    icon={CreditCard}
                    loading={kpisLoading}
                  />
                  <MetricCard
                    title="Avg Finance APR"
                    value={kpis?.avgFinanceAPR || 0}
                    format="percentage"
                    icon={FileText}
                    loading={kpisLoading}
                  />
                </div>
              </TabsContent>

              {/* Deals Tab */}
              <TabsContent value="deals" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Deal Pipeline Funnel */}
                  <ChartCard
                    title="Sales Pipeline"
                    description="Deal progression through stages"
                    loading={dealsLoading}
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <FunnelChart>
                        <Tooltip content={<CustomTooltip />} />
                        <Funnel
                          dataKey="value"
                          data={[
                            { name: 'Leads', value: dealAnalytics?.pipeline?.leads || 0, fill: CHART_COLORS.primary },
                            { name: 'Qualified', value: dealAnalytics?.pipeline?.qualified || 0, fill: CHART_COLORS.secondary },
                            { name: 'Proposals', value: dealAnalytics?.pipeline?.proposals || 0, fill: CHART_COLORS.warning },
                            { name: 'Negotiations', value: dealAnalytics?.pipeline?.negotiations || 0, fill: CHART_COLORS.purple },
                            { name: 'Closed', value: dealAnalytics?.pipeline?.closed || 0, fill: CHART_COLORS.success },
                          ]}
                          isAnimationActive
                        >
                          <LabelList position="center" fill="#fff" />
                        </Funnel>
                      </FunnelChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* Vehicle Type Distribution */}
                  <ChartCard
                    title="Vehicle Types"
                    description="New vs used vs certified distribution"
                    loading={dealsLoading}
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'New', value: dealAnalytics?.vehicleTypes?.new || 0 },
                            { name: 'Used', value: dealAnalytics?.vehicleTypes?.used || 0 },
                            { name: 'Certified', value: dealAnalytics?.vehicleTypes?.certified || 0 },
                          ]}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {COLORS_ARRAY.map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* Payment Distribution */}
                  <ChartCard
                    title="Payment Distribution"
                    description="Monthly payment ranges"
                    loading={dealsLoading}
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={dealAnalytics?.paymentDistribution || []}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="range" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" fill={CHART_COLORS.primary} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* Credit Score Distribution */}
                  <ChartCard
                    title="Credit Score Distribution"
                    description="Customer credit score ranges"
                    loading={dealsLoading}
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={dealAnalytics?.creditDistribution || []}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="range" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" fill={CHART_COLORS.secondary} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                {/* Deal Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    title="Lease Rate"
                    value={kpis?.leaseRate || 0}
                    format="percentage"
                    icon={Car}
                    loading={kpisLoading}
                  />
                  <MetricCard
                    title="Trade-In Rate"
                    value={kpis?.tradeInRate || 0}
                    format="percentage"
                    icon={Package}
                    loading={kpisLoading}
                  />
                  <MetricCard
                    title="F&I Attachment"
                    value={kpis?.fiAttachmentRate || 0}
                    format="percentage"
                    trend={kpis?.fiAttachmentRate > 60 ? 'up' : 'down'}
                    icon={FileText}
                    loading={kpisLoading}
                  />
                  <MetricCard
                    title="Avg Credit Score"
                    value={kpis?.avgCreditScore || 0}
                    format="number"
                    icon={CreditCard}
                    loading={kpisLoading}
                  />
                </div>
              </TabsContent>

              {/* Inventory Tab */}
              <TabsContent value="inventory" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Inventory Age Distribution */}
                  <ChartCard
                    title="Inventory Age"
                    description="Days on lot distribution"
                    loading={inventoryLoading}
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={inventoryMetrics?.ageDistribution || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ range, percentage }) => `${range}: ${percentage}%`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {COLORS_ARRAY.map((color, index) => (
                            <Cell key={`cell-${index}`} fill={color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartCard>

                  {/* Make Popularity */}
                  <ChartCard
                    title="Popular Makes"
                    description="Inventory by manufacturer"
                    loading={inventoryLoading}
                  >
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart 
                        data={inventoryMetrics?.makePopularity?.slice(0, 8) || []}
                        layout="horizontal"
                      >
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="make" className="text-xs" />
                        <YAxis className="text-xs" />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="count" fill={CHART_COLORS.primary}>
                          {inventoryMetrics?.makePopularity?.slice(0, 8).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS_ARRAY[index % COLORS_ARRAY.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                {/* Hot and Cold Inventory */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <ChartCard
                    title="Hot Inventory"
                    description="Fast-moving vehicles"
                    loading={inventoryLoading}
                  >
                    <div className="space-y-2">
                      {inventoryMetrics?.hotInventory?.map((item: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20"
                        >
                          <div>
                            <p className="font-medium">{item.make} {item.model}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.count} units • {item.avgDaysOnLot} days avg
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-green-600 dark:text-green-400">
                              {(item.turnoverRate * 100).toFixed(0)}%
                            </p>
                            <p className="text-xs text-muted-foreground">Turnover</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ChartCard>

                  <ChartCard
                    title="Cold Inventory"
                    description="Slow-moving vehicles"
                    loading={inventoryLoading}
                  >
                    <div className="space-y-2">
                      {inventoryMetrics?.coldInventory?.map((item: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                        >
                          <div>
                            <p className="font-medium">{item.make} {item.model}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.count} units • {item.avgDaysOnLot} days avg
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-red-600 dark:text-red-400">
                              {(item.turnoverRate * 100).toFixed(0)}%
                            </p>
                            <p className="text-xs text-muted-foreground">Turnover</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ChartCard>
                </div>

                {/* Inventory Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    title="Total Units"
                    value={inventoryMetrics?.totalUnits || 0}
                    format="number"
                    icon={Package}
                    loading={inventoryLoading}
                  />
                  <MetricCard
                    title="Avg Days on Lot"
                    value={inventoryMetrics?.avgDaysOnLot || 0}
                    format="number"
                    icon={Clock}
                    loading={inventoryLoading}
                  />
                  <MetricCard
                    title="Turnover Rate"
                    value={(inventoryMetrics?.avgTurnoverRate || 0) * 100}
                    format="percentage"
                    trend={inventoryMetrics?.avgTurnoverRate > 0.5 ? 'up' : 'down'}
                    icon={Activity}
                    loading={inventoryLoading}
                  />
                  <MetricCard
                    title="Utilization"
                    value={inventoryMetrics?.currentUtilization || 0}
                    format="percentage"
                    icon={Zap}
                    loading={inventoryLoading}
                  />
                </div>
              </TabsContent>

              {/* Team Tab */}
              <TabsContent value="team" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Sales Leaderboard */}
                  <div className="lg:col-span-2">
                    <ChartCard
                      title="Sales Leaderboard"
                      description="Top performers by revenue"
                      loading={teamLoading}
                    >
                      <SalesLeaderboard
                        data={teamPerformance?.leaderboard || []}
                        loading={teamLoading}
                      />
                    </ChartCard>
                  </div>

                  {/* Team Activity Metrics */}
                  <ChartCard
                    title="Team Activity"
                    description="Combined team metrics"
                    loading={teamLoading}
                  >
                    <ResponsiveContainer width="100%" height={400}>
                      <RadarChart data={[
                        { metric: 'Calls', value: teamPerformance?.activities?.calls?.reduce((sum: number, m: any) => sum + m.count, 0) || 0, fullMark: 500 },
                        { metric: 'Emails', value: teamPerformance?.activities?.emails?.reduce((sum: number, m: any) => sum + m.count, 0) || 0, fullMark: 300 },
                        { metric: 'Appointments', value: teamPerformance?.activities?.appointments?.reduce((sum: number, m: any) => sum + m.count, 0) || 0, fullMark: 150 },
                        { metric: 'Test Drives', value: teamPerformance?.activities?.testDrives?.reduce((sum: number, m: any) => sum + m.count, 0) || 0, fullMark: 100 },
                      ]}>
                        <PolarGrid className="stroke-muted" />
                        <PolarAngleAxis dataKey="metric" className="text-xs" />
                        <PolarRadiusAxis className="text-xs" />
                        <Radar
                          name="Team Activity"
                          dataKey="value"
                          stroke={CHART_COLORS.primary}
                          fill={CHART_COLORS.primary}
                          fillOpacity={0.3}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </ChartCard>
                </div>

                {/* Team KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <MetricCard
                    title="Avg Response Time"
                    value={`${teamPerformance?.teamAvgResponseTime || 0}m`}
                    trend={teamPerformance?.teamAvgResponseTime < 30 ? 'up' : 'down'}
                    icon={Clock}
                    loading={teamLoading}
                  />
                  <MetricCard
                    title="Team Satisfaction"
                    value={teamPerformance?.teamAvgSatisfaction || 0}
                    format="number"
                    trend="up"
                    icon={Award}
                    loading={teamLoading}
                  />
                  <MetricCard
                    title="Top Performer"
                    value={teamPerformance?.topPerformer?.name || '-'}
                    icon={Trophy}
                    loading={teamLoading}
                  />
                  <MetricCard
                    title="Most Improved"
                    value={teamPerformance?.mostImproved?.name || '-'}
                    icon={TrendingUp}
                    loading={teamLoading}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}