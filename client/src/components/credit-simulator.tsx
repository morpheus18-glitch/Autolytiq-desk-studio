import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Clock, 
  FileCheck,
  AlertTriangle,
  ChevronRight,
  Info,
  DollarSign,
  Sparkles,
  Target,
  Calculator,
  User
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useValueTransition } from '@/hooks/use-value-transition';
import type { 
  CreditSimulationInput, 
  CreditSimulationResult,
  CreditFactors,
  CreditRecommendation 
} from '@/lib/credit-simulator';

// Color scale for credit scores
const getScoreColor = (score: number): string => {
  if (score >= 720) return 'text-green-600 dark:text-green-400';
  if (score >= 660) return 'text-blue-600 dark:text-blue-400';
  if (score >= 600) return 'text-yellow-600 dark:text-yellow-400';
  if (score >= 500) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
};

const getScoreBgColor = (score: number): string => {
  if (score >= 720) return 'bg-green-500/10';
  if (score >= 660) return 'bg-blue-500/10';
  if (score >= 600) return 'bg-yellow-500/10';
  if (score >= 500) return 'bg-orange-500/10';
  return 'bg-red-500/10';
};

const getScoreGradient = (score: number): string => {
  if (score >= 720) return 'from-green-600 to-green-400';
  if (score >= 660) return 'from-blue-600 to-blue-400';
  if (score >= 600) return 'from-yellow-600 to-yellow-400';
  if (score >= 500) return 'from-orange-600 to-orange-400';
  return 'from-red-600 to-red-400';
};

interface ScenarioButtonProps {
  title: string;
  description: string;
  impact: string;
  icon: React.ReactNode;
  onClick: () => void;
  isActive?: boolean;
}

function ScenarioButton({ title, description, impact, icon, onClick, isActive }: ScenarioButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg border transition-all text-left hover-elevate ${
        isActive 
          ? 'border-primary bg-primary/5' 
          : 'border-border bg-card/50'
      }`}
      data-testid={`scenario-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start gap-3">
        <div className={`p-2 rounded-md ${isActive ? 'bg-primary/10' : 'bg-muted/50'}`}>
          {icon}
        </div>
        <div className="flex-1 space-y-1">
          <p className="font-medium text-sm">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
          <p className="text-xs font-medium text-primary">{impact}</p>
        </div>
      </div>
    </button>
  );
}

export function CreditSimulator() {
  const [simulationInput, setSimulationInput] = useState<CreditSimulationInput>({
    paymentHistory: {
      onTimePayments: 24,
      totalPayments: 24,
      delinquencies30Days: 0,
      delinquencies60Days: 0,
      delinquencies90Days: 0,
      collections: 0,
      bankruptcies: 0,
    },
    creditUtilization: {
      totalBalance: 3000,
      totalLimit: 10000,
      utilizationRatio: 0.30,
    },
    creditHistory: {
      averageAccountAge: 48,
      oldestAccountAge: 84,
    },
    creditMix: {
      creditCards: 2,
      autoLoans: 0,
      mortgages: 0,
      studentLoans: 1,
      otherLoans: 0,
      totalAccounts: 3,
    },
    newCredit: {
      hardInquiries: 1,
      newAccounts: 0,
      inquiriesLast6Months: 1,
    },
  });

  const [simulationResult, setSimulationResult] = useState<CreditSimulationResult | null>(null);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  // Use animated value for score display
  const animatedScore = useValueTransition(simulationResult?.score || 650, { duration: 600 });

  // Simulate credit score mutation
  const simulateMutation = useMutation({
    mutationFn: async (input: CreditSimulationInput) => {
      const response = await apiRequest('POST', '/api/credit/simulate', input);
      return response;
    },
    onMutate: () => {
      setIsCalculating(true);
    },
    onSuccess: (data) => {
      // Store previous score for comparison
      if (simulationResult?.score && simulationResult.score !== data.score) {
        setPreviousScore(simulationResult.score);
      }
      
      // Update simulation result with new data
      setSimulationResult(data);
      
      // Force a small delay to ensure UI updates
      setTimeout(() => {
        setIsCalculating(false);
      }, 100);
    },
    onError: (error) => {
      console.error('Failed to simulate credit score:', error);
      setIsCalculating(false);
    },
  });

  // Simulate scenario mutation
  const scenarioMutation = useMutation({
    mutationFn: async (scenario: string) => {
      if (!simulationResult) return;
      const response = await apiRequest('POST', '/api/credit/scenario', {
        currentFactors: simulationResult.factors,
        scenario,
      });
      return response;
    },
    onMutate: () => {
      setIsCalculating(true);
    },
    onSuccess: (data) => {
      // Store previous score for comparison
      if (simulationResult?.score && data?.score && simulationResult.score !== data.score) {
        setPreviousScore(simulationResult.score);
      }
      
      // Update simulation result with new data
      if (data) {
        setSimulationResult(data);
      }
      
      // Force a small delay to ensure UI updates
      setTimeout(() => {
        setIsCalculating(false);
      }, 100);
    },
    onError: (error) => {
      console.error('Failed to simulate scenario:', error);
      setIsCalculating(false);
    },
  });

  // Run initial simulation on mount
  useEffect(() => {
    simulateMutation.mutate(simulationInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Update utilization ratio when balance or limit changes
  const updateUtilization = useCallback((balance: number, limit: number) => {
    const ratio = limit > 0 ? balance / limit : 0;
    setSimulationInput(prev => ({
      ...prev,
      creditUtilization: {
        ...prev.creditUtilization!,
        totalBalance: balance,
        totalLimit: limit,
        utilizationRatio: ratio,
      },
    }));
  }, []);

  // Handle scenario selection
  const handleScenario = (scenario: string) => {
    setActiveScenario(scenario);
    scenarioMutation.mutate(scenario);
  };

  // Reset to current factors
  const handleReset = () => {
    setActiveScenario(null);
    simulateMutation.mutate(simulationInput);
  };

  return (
    <div className="space-y-6">
      {/* Main Score Display */}
      <Card className="p-6 md:p-8 bg-gradient-to-br from-card/90 via-card/50 to-background/30 backdrop-blur-xl border-border/50">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Your Credit Score</p>
              <div className="flex items-baseline gap-4">
                <span 
                  key={simulationResult?.score}
                  className={`text-5xl md:text-6xl font-bold font-mono transition-colors duration-300 ${
                    isCalculating ? 'opacity-50 animate-pulse' : ''
                  } ${getScoreColor(simulationResult?.score || animatedScore)}`}
                  data-testid="credit-score-display"
                >
                  {Math.round(animatedScore)}
                </span>
                {previousScore && previousScore !== simulationResult?.score && !isCalculating && (
                  <div className="flex items-center gap-1 animate-in fade-in slide-in-from-left duration-500">
                    {(simulationResult?.score || 0) > previousScore ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                    <span className="text-sm font-medium">
                      {Math.abs((simulationResult?.score || 0) - previousScore)} pts
                    </span>
                  </div>
                )}
              </div>
              {simulationResult && (
                <div className="flex items-center gap-3">
                  <Badge 
                    key={`tier-${simulationResult.tier}`}
                    className={`${getScoreBgColor(simulationResult.score)} border-0 transition-all duration-300`}
                    data-testid="credit-tier-badge"
                  >
                    {simulationResult.tier}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    Credit Tier
                  </span>
                </div>
              )}
            </div>

            {/* Score Range Indicator */}
            <div className="space-y-2">
              <div className="relative h-3 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 to-green-600 rounded-full">
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-background border-2 border-foreground rounded-full shadow-lg transition-all duration-500"
                  style={{ 
                    left: `${((animatedScore - 300) / 550) * 100}%`,
                    transform: 'translateX(-50%) translateY(-50%)'
                  }}
                  data-testid="score-indicator"
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>300</span>
                <span>Poor</span>
                <span>Fair</span>
                <span>Good</span>
                <span>Excellent</span>
                <span>850</span>
              </div>
            </div>
          </div>

          {/* Improvement Potential */}
          {simulationResult?.potentialImprovement && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium">Improvement Potential</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-primary">
                    +{simulationResult.potentialImprovement.improvementPoints}
                  </span>
                  <span className="text-xs text-muted-foreground">points possible</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Max achievable: {simulationResult.potentialImprovement.maxPossibleScore}
                </p>
                <p className="text-xs text-muted-foreground">
                  Timeline: {simulationResult.potentialImprovement.estimatedTimeframe}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Score Breakdown */}
        {simulationResult?.scoreBreakdown && (
          <div className="mt-6 pt-6 border-t space-y-3">
            <p className="text-sm font-medium">Score Breakdown</p>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { label: 'Payment History', value: simulationResult.scoreBreakdown.paymentHistoryScore, weight: '35%', icon: <Clock className="w-3 h-3" /> },
                { label: 'Utilization', value: simulationResult.scoreBreakdown.utilizationScore, weight: '30%', icon: <CreditCard className="w-3 h-3" /> },
                { label: 'History Length', value: simulationResult.scoreBreakdown.historyScore, weight: '15%', icon: <FileCheck className="w-3 h-3" /> },
                { label: 'Credit Mix', value: simulationResult.scoreBreakdown.mixScore, weight: '10%', icon: <User className="w-3 h-3" /> },
                { label: 'New Credit', value: simulationResult.scoreBreakdown.newCreditScore, weight: '10%', icon: <Sparkles className="w-3 h-3" /> },
              ].map(({ label, value, weight, icon }) => (
                <div key={label} className="space-y-1">
                  <div className="flex items-center gap-1">
                    {icon}
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                  <p className="text-lg font-semibold font-mono">{Math.round(value)}</p>
                  <p className="text-xs text-muted-foreground">{weight}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Tabs defaultValue="factors" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="factors">Credit Factors</TabsTrigger>
          <TabsTrigger value="scenarios">What-If Scenarios</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Credit Factors Tab */}
        <TabsContent value="factors" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-6">
              {/* Payment History Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Payment History</h3>
                  <Badge variant="outline">35% Weight</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="on-time">On-Time Payments</Label>
                    <Input
                      id="on-time"
                      type="number"
                      value={simulationInput.paymentHistory?.onTimePayments || 0}
                      onChange={(e) => setSimulationInput(prev => ({
                        ...prev,
                        paymentHistory: {
                          ...prev.paymentHistory!,
                          onTimePayments: parseInt(e.target.value) || 0,
                        },
                      }))}
                      min={0}
                      data-testid="input-on-time-payments"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="total-payments">Total Payments</Label>
                    <Input
                      id="total-payments"
                      type="number"
                      value={simulationInput.paymentHistory?.totalPayments || 0}
                      onChange={(e) => setSimulationInput(prev => ({
                        ...prev,
                        paymentHistory: {
                          ...prev.paymentHistory!,
                          totalPayments: parseInt(e.target.value) || 0,
                        },
                      }))}
                      min={0}
                      data-testid="input-total-payments"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="late-30">30-Day Late Payments</Label>
                    <Input
                      id="late-30"
                      type="number"
                      value={simulationInput.paymentHistory?.delinquencies30Days || 0}
                      onChange={(e) => setSimulationInput(prev => ({
                        ...prev,
                        paymentHistory: {
                          ...prev.paymentHistory!,
                          delinquencies30Days: parseInt(e.target.value) || 0,
                        },
                      }))}
                      min={0}
                      data-testid="input-late-30"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="collections">Collections</Label>
                    <Input
                      id="collections"
                      type="number"
                      value={simulationInput.paymentHistory?.collections || 0}
                      onChange={(e) => setSimulationInput(prev => ({
                        ...prev,
                        paymentHistory: {
                          ...prev.paymentHistory!,
                          collections: parseInt(e.target.value) || 0,
                        },
                      }))}
                      min={0}
                      data-testid="input-collections"
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Credit Utilization Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Credit Utilization</h3>
                  <Badge variant="outline">30% Weight</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="balance">Total Balance ($)</Label>
                    <Input
                      id="balance"
                      type="number"
                      value={simulationInput.creditUtilization?.totalBalance || 0}
                      onChange={(e) => updateUtilization(
                        parseInt(e.target.value) || 0,
                        simulationInput.creditUtilization?.totalLimit || 0
                      )}
                      min={0}
                      data-testid="input-total-balance"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="limit">Total Credit Limit ($)</Label>
                    <Input
                      id="limit"
                      type="number"
                      value={simulationInput.creditUtilization?.totalLimit || 0}
                      onChange={(e) => updateUtilization(
                        simulationInput.creditUtilization?.totalBalance || 0,
                        parseInt(e.target.value) || 0
                      )}
                      min={0}
                      data-testid="input-credit-limit"
                    />
                  </div>
                </div>

                {/* Utilization Gauge */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Utilization Ratio</span>
                    <span className="font-mono font-medium">
                      {((simulationInput.creditUtilization?.utilizationRatio || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={(simulationInput.creditUtilization?.utilizationRatio || 0) * 100}
                    className="h-3"
                  />
                  <p className="text-xs text-muted-foreground">
                    Keep below 30% for good scores, below 10% for excellent
                  </p>
                </div>
              </div>

              <Separator />

              {/* Credit History Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">Credit History</h3>
                  <Badge variant="outline">15% Weight</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="avg-age">Average Account Age (months)</Label>
                    <Input
                      id="avg-age"
                      type="number"
                      value={simulationInput.creditHistory?.averageAccountAge || 0}
                      onChange={(e) => setSimulationInput(prev => ({
                        ...prev,
                        creditHistory: {
                          ...prev.creditHistory!,
                          averageAccountAge: parseInt(e.target.value) || 0,
                        },
                      }))}
                      min={0}
                      data-testid="input-avg-age"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="oldest">Oldest Account Age (months)</Label>
                    <Input
                      id="oldest"
                      type="number"
                      value={simulationInput.creditHistory?.oldestAccountAge || 0}
                      onChange={(e) => setSimulationInput(prev => ({
                        ...prev,
                        creditHistory: {
                          ...prev.creditHistory!,
                          oldestAccountAge: parseInt(e.target.value) || 0,
                        },
                      }))}
                      min={0}
                      data-testid="input-oldest-age"
                    />
                  </div>
                </div>
              </div>

              {/* Calculate Button */}
              <div className="flex justify-end pt-4">
                <Button 
                  onClick={() => {
                    console.log('Recalculating with input:', simulationInput);
                    simulateMutation.mutate(simulationInput);
                  }}
                  disabled={simulateMutation.isPending || isCalculating}
                  className="gap-2 min-w-[160px]"
                  data-testid="button-recalculate"
                >
                  {(simulateMutation.isPending || isCalculating) ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                      Calculating...
                    </>
                  ) : (
                    <>
                      <Calculator className="w-4 h-4" />
                      Recalculate Score
                    </>
                  )}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* What-If Scenarios Tab */}
        <TabsContent value="scenarios" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="text-base font-semibold">Scenario Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  See how different actions could impact your credit score
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ScenarioButton
                  title="Pay Off All Credit Cards"
                  description="Reduce utilization to 0%"
                  impact="+10-40 points"
                  icon={<CreditCard className="w-4 h-4" />}
                  onClick={() => handleScenario('payoff-cards')}
                  isActive={activeScenario === 'payoff-cards'}
                />
                
                <ScenarioButton
                  title="Become Authorized User"
                  description="Add aged account with good history"
                  impact="+10-30 points"
                  icon={<User className="w-4 h-4" />}
                  onClick={() => handleScenario('authorized-user')}
                  isActive={activeScenario === 'authorized-user'}
                />
                
                <ScenarioButton
                  title="Dispute Collections"
                  description="Remove all collection accounts"
                  impact="+30-80 points"
                  icon={<FileCheck className="w-4 h-4" />}
                  onClick={() => handleScenario('dispute-collections')}
                  isActive={activeScenario === 'dispute-collections'}
                />
                
                <ScenarioButton
                  title="Wait 6 Months"
                  description="Let inquiries age off"
                  impact="+5-10 points"
                  icon={<Clock className="w-4 h-4" />}
                  onClick={() => handleScenario('wait-6-months')}
                  isActive={activeScenario === 'wait-6-months'}
                />
                
                <ScenarioButton
                  title="Pay Down 50% of Cards"
                  description="Reduce utilization by half"
                  impact="+5-20 points"
                  icon={<DollarSign className="w-4 h-4" />}
                  onClick={() => handleScenario('pay-down-50')}
                  isActive={activeScenario === 'pay-down-50'}
                />
              </div>

              {activeScenario && (
                <div className="flex justify-end pt-4">
                  <Button 
                    variant="outline"
                    onClick={handleReset}
                    data-testid="button-reset-scenario"
                  >
                    Reset to Current
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          {simulationResult?.recommendations && simulationResult.recommendations.length > 0 ? (
            <div className="space-y-3">
              {simulationResult.recommendations.map((rec, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-md ${
                      rec.impact === 'High' 
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400' 
                        : rec.impact === 'Medium'
                        ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                        : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                    }`}>
                      {rec.impact === 'High' ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Info className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between">
                        <h4 className="text-sm font-semibold">{rec.title}</h4>
                        <Badge variant="secondary" className="text-xs">
                          {rec.impact} Impact
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{rec.description}</p>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {rec.estimatedScoreIncrease}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {rec.timeframe}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-8">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Calculate your credit score to see personalized recommendations
                </p>
              </div>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}