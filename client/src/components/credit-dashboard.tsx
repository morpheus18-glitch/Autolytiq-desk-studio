import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { 
  TrendingUp, 
  TrendingDown,
  Info,
  Target,
  ChevronRight,
  Award,
  AlertTriangle,
  CheckCircle,
  Clock,
  CreditCard,
  FileCheck,
  User,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useValueTransition } from '@/hooks/use-value-transition';
import type { CreditSimulationResult, CreditTier } from '@/lib/credit-simulator';

interface CreditDashboardProps {
  creditScore?: number;
  creditTier?: CreditTier;
  simulationResult?: CreditSimulationResult | null;
  historicalData?: Array<{ date: string; score: number; tier: string }>;
  nationalAverage?: number;
}

// Mock historical data for demo
const mockHistoricalData = [
  { date: 'Jan', score: 650, tier: 'Fair' },
  { date: 'Feb', score: 655, tier: 'Fair' },
  { date: 'Mar', score: 662, tier: 'Good' },
  { date: 'Apr', score: 670, tier: 'Good' },
  { date: 'May', score: 675, tier: 'Good' },
  { date: 'Jun', score: 680, tier: 'Good' },
];

// Credit score ranges
const SCORE_RANGES = [
  { min: 720, max: 850, tier: 'Excellent', color: '#10b981' },
  { min: 660, max: 719, tier: 'Good', color: '#3b82f6' },
  { min: 600, max: 659, tier: 'Fair', color: '#f59e0b' },
  { min: 500, max: 599, tier: 'Poor', color: '#f97316' },
  { min: 300, max: 499, tier: 'Deep Subprime', color: '#ef4444' },
];

// Factor weights for pie chart
const FACTOR_WEIGHTS = [
  { name: 'Payment History', value: 35, color: '#10b981' },
  { name: 'Credit Utilization', value: 30, color: '#3b82f6' },
  { name: 'Credit History', value: 15, color: '#f59e0b' },
  { name: 'Credit Mix', value: 10, color: '#8b5cf6' },
  { name: 'New Credit', value: 10, color: '#ec4899' },
];

// Get color for score
const getScoreColor = (score: number): string => {
  const range = SCORE_RANGES.find(r => score >= r.min && score <= r.max);
  return range?.color || '#6b7280';
};

// Get tier badge color
const getTierBadgeClass = (tier: string): string => {
  switch(tier) {
    case 'Excellent': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    case 'Good': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'Fair': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
    case 'Poor': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
    case 'Deep Subprime': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    default: return 'bg-muted';
  }
};

// Custom gauge component
function CreditScoreGauge({ score, tier }: { score: number; tier: string }) {
  const normalizedScore = ((score - 300) / 550) * 100; // Normalize to 0-100%
  const animatedScore = useValueTransition(score, { duration: 800 });
  
  return (
    <div className="relative w-full max-w-sm mx-auto">
      <svg viewBox="0 0 200 120" className="w-full">
        {/* Background arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          className="text-muted opacity-20"
        />
        
        {/* Score ranges */}
        {SCORE_RANGES.map((range, index) => {
          const startAngle = ((range.min - 300) / 550) * 180;
          const endAngle = ((range.max - 300) / 550) * 180;
          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;
          
          const x1 = 100 - 80 * Math.cos(startRad);
          const y1 = 100 - 80 * Math.sin(startRad);
          const x2 = 100 - 80 * Math.cos(endRad);
          const y2 = 100 - 80 * Math.sin(endRad);
          
          const largeArc = endAngle - startAngle > 180 ? 1 : 0;
          
          return (
            <path
              key={range.tier}
              d={`M ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2}`}
              fill="none"
              stroke={range.color}
              strokeWidth="12"
              opacity="0.3"
            />
          );
        })}
        
        {/* Active score arc */}
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={getScoreColor(score)}
          strokeWidth="12"
          strokeDasharray={`${normalizedScore * 2.51} 251`}
          className="transition-all duration-1000"
        />
        
        {/* Score indicator */}
        <circle
          cx={100 - 80 * Math.cos((normalizedScore * 1.8 * Math.PI) / 180)}
          cy={100 - 80 * Math.sin((normalizedScore * 1.8 * Math.PI) / 180)}
          r="6"
          fill={getScoreColor(score)}
          className="transition-all duration-1000"
        />
        
        {/* Score text */}
        <text
          x="100"
          y="80"
          textAnchor="middle"
          className="fill-current text-5xl font-bold"
          style={{ fontFamily: 'monospace' }}
        >
          {Math.round(animatedScore)}
        </text>
        
        <text
          x="100"
          y="95"
          textAnchor="middle"
          className="fill-muted-foreground text-sm"
        >
          {tier}
        </text>
      </svg>
      
      {/* Min/Max labels */}
      <div className="flex justify-between text-xs text-muted-foreground -mt-2">
        <span>300</span>
        <span>850</span>
      </div>
    </div>
  );
}

export function CreditDashboard({
  creditScore = 680,
  creditTier = 'Good',
  simulationResult,
  historicalData = mockHistoricalData,
  nationalAverage = 716,
}: CreditDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Calculate score change
  const previousScore = historicalData.length > 0 ? historicalData[historicalData.length - 2]?.score : null;
  const scoreChange = previousScore ? creditScore - previousScore : 0;
  
  // Get key factors (mock data if no simulation result)
  const keyFactors = simulationResult ? [
    { 
      name: 'Payment History', 
      impact: simulationResult.factors.paymentHistory.delinquencies30Days > 0 ? 'negative' : 'positive',
      description: simulationResult.factors.paymentHistory.delinquencies30Days > 0 
        ? `${simulationResult.factors.paymentHistory.delinquencies30Days} late payments`
        : 'All payments on time'
    },
    {
      name: 'Credit Utilization',
      impact: simulationResult.factors.creditUtilization.utilizationRatio > 0.30 ? 'negative' : 'positive',
      description: `${(simulationResult.factors.creditUtilization.utilizationRatio * 100).toFixed(0)}% utilization`
    },
    {
      name: 'Credit Age',
      impact: simulationResult.factors.creditHistory.averageAccountAge >= 60 ? 'positive' : 'neutral',
      description: `${Math.floor(simulationResult.factors.creditHistory.averageAccountAge / 12)} years avg age`
    },
  ] : [
    { name: 'Payment History', impact: 'positive', description: 'All payments on time' },
    { name: 'Credit Utilization', impact: 'positive', description: '25% utilization' },
    { name: 'Credit Age', impact: 'neutral', description: '4 years avg age' },
  ];
  
  return (
    <div className="space-y-6">
      {/* Main Score Card */}
      <Card className="p-6 md:p-8 bg-gradient-to-br from-card/90 via-card/50 to-background/30 backdrop-blur-xl border-border/50">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Score Gauge */}
          <div className="flex flex-col items-center justify-center">
            <CreditScoreGauge score={creditScore} tier={creditTier} />
            <div className="flex items-center gap-2 mt-4">
              {scoreChange !== 0 && (
                <>
                  {scoreChange > 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <span className={`text-sm font-medium ${scoreChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(scoreChange)} pts from last month
                  </span>
                </>
              )}
            </div>
          </div>
          
          {/* Credit Tier & Stats */}
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Credit Tier</p>
              <Badge className={`${getTierBadgeClass(creditTier)} text-base px-4 py-1.5`}>
                {creditTier}
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">National Average</p>
                <p className="text-2xl font-bold font-mono">{nationalAverage}</p>
                <p className="text-xs text-muted-foreground">
                  You're {creditScore > nationalAverage ? 'above' : 'below'} average
                </p>
              </div>
              
              <div>
                <p className="text-sm text-muted-foreground">Percentile</p>
                <p className="text-2xl font-bold font-mono">
                  {creditScore >= 720 ? '80th' :
                   creditScore >= 660 ? '60th' :
                   creditScore >= 600 ? '40th' :
                   creditScore >= 500 ? '20th' : '10th'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Better than most
                </p>
              </div>
            </div>
            
            {simulationResult?.potentialImprovement && (
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="w-4 h-4 text-primary" />
                  <p className="text-sm font-medium">Improvement Potential</p>
                </div>
                <p className="text-2xl font-bold text-primary">
                  +{simulationResult.potentialImprovement.improvementPoints} pts
                </p>
                <p className="text-xs text-muted-foreground">
                  in {simulationResult.potentialImprovement.estimatedTimeframe}
                </p>
              </div>
            )}
          </div>
          
          {/* Key Factors */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Key Factors</p>
            {keyFactors.map((factor) => (
              <div key={factor.name} className="flex items-start gap-3">
                <div className={`mt-0.5 p-1 rounded ${
                  factor.impact === 'positive' 
                    ? 'bg-green-500/10' 
                    : factor.impact === 'negative'
                    ? 'bg-red-500/10'
                    : 'bg-yellow-500/10'
                }`}>
                  {factor.impact === 'positive' ? (
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  ) : factor.impact === 'negative' ? (
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                  ) : (
                    <Minus className="w-3 h-3 text-yellow-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium">{factor.name}</p>
                  <p className="text-xs text-muted-foreground">{factor.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
      
      {/* Detailed Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="factors">Factors</TabsTrigger>
          <TabsTrigger value="education">Education</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-medium">Score Range</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="space-y-2">
                  {SCORE_RANGES.map((range) => (
                    <div key={range.tier} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: range.color }}
                      />
                      <span className="text-xs flex-1">{range.tier}</span>
                      <span className="text-xs font-mono text-muted-foreground">
                        {range.min}-{range.max}
                      </span>
                      {creditScore >= range.min && creditScore <= range.max && (
                        <Badge variant="outline" className="text-xs px-1 py-0">You</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card className="p-4">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-medium">Score Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {simulationResult?.scoreBreakdown && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Payment History</span>
                      <span className="font-mono">{Math.round(simulationResult.scoreBreakdown.paymentHistoryScore)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Utilization</span>
                      <span className="font-mono">{Math.round(simulationResult.scoreBreakdown.utilizationScore)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">History Length</span>
                      <span className="font-mono">{Math.round(simulationResult.scoreBreakdown.historyScore)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Credit Mix</span>
                      <span className="font-mono">{Math.round(simulationResult.scoreBreakdown.mixScore)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">New Credit</span>
                      <span className="font-mono">{Math.round(simulationResult.scoreBreakdown.newCreditScore)}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card className="p-4">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-2">
                <Button variant="ghost" className="w-full justify-start text-xs h-8" data-testid="button-dispute-errors">
                  <ChevronRight className="w-3 h-3 mr-2" />
                  Dispute Errors
                </Button>
                <Button variant="ghost" className="w-full justify-start text-xs h-8" data-testid="button-pay-down-cards">
                  <ChevronRight className="w-3 h-3 mr-2" />
                  Pay Down Cards
                </Button>
                <Button variant="ghost" className="w-full justify-start text-xs h-8" data-testid="button-credit-report">
                  <ChevronRight className="w-3 h-3 mr-2" />
                  Get Credit Report
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle>Credit Score Trend</CardTitle>
              <CardDescription>Your score over the last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={historicalData}>
                  <defs>
                    <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis domain={[600, 750]} className="text-xs" />
                  <RechartsTooltip />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    fill="url(#scoreGradient)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Factors Tab */}
        <TabsContent value="factors" className="space-y-4">
          <Card className="p-6">
            <CardHeader className="p-0 pb-4">
              <CardTitle>FICO Score Factors</CardTitle>
              <CardDescription>How your credit score is calculated</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={FACTOR_WEIGHTS}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(entry) => `${entry.name}: ${entry.value}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {FACTOR_WEIGHTS.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
              
              <div className="mt-6 space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Payment History (35%)</p>
                    <p className="text-xs text-muted-foreground">
                      Your track record of paying bills on time is the most important factor
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <CreditCard className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Credit Utilization (30%)</p>
                    <p className="text-xs text-muted-foreground">
                      Keep credit card balances below 30% of your limits
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <FileCheck className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Credit History (15%)</p>
                    <p className="text-xs text-muted-foreground">
                      Longer credit history generally means higher scores
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-purple-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">Credit Mix (10%)</p>
                    <p className="text-xs text-muted-foreground">
                      Having different types of credit accounts helps your score
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-pink-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">New Credit (10%)</p>
                    <p className="text-xs text-muted-foreground">
                      Opening many new accounts quickly can lower your score
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Education Tab */}
        <TabsContent value="education" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-4">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Award className="w-4 h-4" />
                  For Your Credit Tier
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-2">
                <p className="text-xs text-muted-foreground">
                  With {creditTier} credit, you can expect:
                </p>
                <ul className="space-y-1 text-xs">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-muted-foreground" />
                    <span>APR range: {creditTier === 'Excellent' ? '3-6%' :
                                    creditTier === 'Good' ? '5-9%' :
                                    creditTier === 'Fair' ? '8-13%' :
                                    creditTier === 'Poor' ? '12-18%' : '16-25%'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-muted-foreground" />
                    <span>Down payment: {creditTier === 'Excellent' ? '0-10%' :
                                        creditTier === 'Good' ? '10-15%' :
                                        creditTier === 'Fair' ? '15-20%' :
                                        creditTier === 'Poor' ? '20-30%' : '30%+'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-muted-foreground" />
                    <span>Approval odds: {creditTier === 'Excellent' ? '95%+' :
                                         creditTier === 'Good' ? '85%+' :
                                         creditTier === 'Fair' ? '70%+' :
                                         creditTier === 'Poor' ? '50%+' : '30%+'}</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="p-4">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Tips for Improvement
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-2">
                <ul className="space-y-1 text-xs">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-muted-foreground" />
                    <span>Pay all bills on time, every time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-muted-foreground" />
                    <span>Keep credit utilization below 30%</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-muted-foreground" />
                    <span>Don't close old credit cards</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-muted-foreground" />
                    <span>Limit new credit applications</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-muted-foreground" />
                    <span>Check for and dispute errors</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="p-4">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-medium">First-Time Buyer?</CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-2">
                <p className="text-xs text-muted-foreground">Special programs available:</p>
                <ul className="space-y-1 text-xs">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-muted-foreground" />
                    <span>Lower down payment requirements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-muted-foreground" />
                    <span>Flexible credit requirements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-muted-foreground" />
                    <span>Co-signer options available</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card className="p-4">
              <CardHeader className="p-0 pb-3">
                <CardTitle className="text-sm font-medium">Rebuilding Credit?</CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-2">
                <p className="text-xs text-muted-foreground">Steps to improve:</p>
                <ul className="space-y-1 text-xs">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-muted-foreground" />
                    <span>Pay down existing debts</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-muted-foreground" />
                    <span>Consider a secured credit card</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="w-3 h-3 mt-0.5 text-muted-foreground" />
                    <span>Become an authorized user</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}