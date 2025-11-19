import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  DollarSign,
  User,
  Briefcase,
  Home,
  Calculator,
  Info,
  CreditCard,
  ChevronRight,
  AlertCircle,
  Building2,
  Shield,
  Clock
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { PreQualificationInput, PreQualificationResult } from '@/lib/credit-simulator';

// Form validation schema
const preQualFormSchema = z.object({
  creditScore: z.number().min(300).max(850),
  annualIncome: z.number().min(0).max(10000000),
  monthlyDebtPayments: z.number().min(0).max(100000),
  employmentStatus: z.enum(['Employed', 'Self-Employed', 'Retired', 'Other']),
  employmentDuration: z.number().min(0).max(600),
  housingPayment: z.number().min(0).max(50000),
  downPayment: z.number().min(0).max(500000),
  requestedLoanAmount: z.number().min(0).max(1000000),
  vehiclePrice: z.number().min(0).max(1000000),
});

type PreQualFormData = z.infer<typeof preQualFormSchema>;

// Get tier color based on credit tier
const getTierColor = (tier: string): string => {
  switch(tier) {
    case 'Excellent': return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    case 'Good': return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
    case 'Fair': return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
    case 'Poor': return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20';
    case 'Deep Subprime': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    default: return 'bg-muted';
  }
};

interface LenderCardProps {
  lender: {
    name: string;
    aprRange: { min: number; max: number };
    termOptions: number[];
    specialPrograms: string[];
    requirements: string[];
  };
  isHighlighted?: boolean;
}

function LenderCard({ lender, isHighlighted }: LenderCardProps) {
  return (
    <Card className={`p-4 ${isHighlighted ? 'border-primary ring-2 ring-primary/20' : ''}`}>
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <h4 className="font-medium text-sm">{lender.name}</h4>
          </div>
          {isHighlighted && (
            <Badge variant="default" className="text-xs">Best Match</Badge>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">APR Range</span>
            <span className="font-mono font-medium">
              {lender.aprRange.min.toFixed(2)}% - {lender.aprRange.max.toFixed(2)}%
            </span>
          </div>
          
          <div className="flex flex-wrap gap-1">
            {lender.termOptions.map(term => (
              <Badge key={term} variant="secondary" className="text-xs">
                {term} mo
              </Badge>
            ))}
          </div>
        </div>
        
        {lender.specialPrograms.length > 0 && (
          <div className="pt-2 border-t">
            <p className="text-xs font-medium mb-1">Special Programs</p>
            <div className="flex flex-wrap gap-1">
              {lender.specialPrograms.map(program => (
                <span key={program} className="text-xs text-muted-foreground">
                  • {program}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export function PreQualification() {
  const [result, setResult] = useState<PreQualificationResult | null>(null);
  const [creditScoreValue, setCreditScoreValue] = useState(680);
  const { toast } = useToast();
  
  const form = useForm<PreQualFormData>({
    resolver: zodResolver(preQualFormSchema),
    defaultValues: {
      creditScore: 680,
      annualIncome: 75000,
      monthlyDebtPayments: 500,
      employmentStatus: 'Employed',
      employmentDuration: 36,
      housingPayment: 1500,
      downPayment: 5000,
      requestedLoanAmount: 35000,
      vehiclePrice: 40000,
    },
  });

  const preQualifyMutation = useMutation({
    mutationFn: async (data: PreQualFormData) => {
      const response = await apiRequest<PreQualificationResult>('POST', '/api/credit/prequalify', data);
      return response;
    },
    onSuccess: (data) => {
      setResult(data);
      toast({
        title: 'Pre-qualification complete',
        description: `Your pre-qualification has been processed. ${data.approved ? 'Congratulations!' : 'Review recommendations below.'}`,
      });
    },
    onError: () => {
      toast({
        title: 'Pre-qualification failed',
        description: 'There was an error processing your pre-qualification. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: PreQualFormData) => {
    preQualifyMutation.mutate(data);
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="p-6 bg-gradient-to-br from-card/90 via-card/50 to-background/30 backdrop-blur-xl border-border/50">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-primary/10">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="text-2xl font-semibold">Auto Loan Pre-Qualification</h2>
              <p className="text-sm text-muted-foreground">
                Check your loan eligibility without affecting your credit score
              </p>
            </div>
          </div>
          
          <Alert className="bg-muted/50 border-muted">
            <Info className="h-4 w-4" />
            <AlertDescription>
              This is a soft credit check that won't impact your credit score. 
              Final approval and rates are subject to full application and hard credit pull.
            </AlertDescription>
          </Alert>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2 space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Credit & Income Section */}
              <Card className="p-6">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-lg">Credit & Income Information</CardTitle>
                  <CardDescription>Your financial profile helps determine loan eligibility</CardDescription>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  {/* Credit Score Slider */}
                  <FormField
                    control={form.control}
                    name="creditScore"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estimated Credit Score</FormLabel>
                        <FormControl>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-3xl font-bold font-mono">{creditScoreValue}</span>
                              <Badge variant="outline">
                                {creditScoreValue >= 720 ? 'Excellent' :
                                 creditScoreValue >= 660 ? 'Good' :
                                 creditScoreValue >= 600 ? 'Fair' :
                                 creditScoreValue >= 500 ? 'Poor' : 'Deep Subprime'}
                              </Badge>
                            </div>
                            <Slider
                              min={300}
                              max={850}
                              step={10}
                              value={[field.value]}
                              onValueChange={(value) => {
                                field.onChange(value[0]);
                                setCreditScoreValue(value[0]);
                              }}
                              className="w-full"
                              data-testid="slider-credit-score"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>300</span>
                              <span>Poor</span>
                              <span>Fair</span>
                              <span>Good</span>
                              <span>Excellent</span>
                              <span>850</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          Don't know your score? Use 650 as an estimate
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="annualIncome"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Annual Income ($)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="pl-9"
                                placeholder="75000"
                                data-testid="input-annual-income"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="monthlyDebtPayments"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Debt Payments ($)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="pl-9"
                                placeholder="500"
                                data-testid="input-monthly-debt"
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Credit cards, loans, etc.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Employment & Housing Section */}
              <Card className="p-6">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-lg">Employment & Housing</CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="employmentStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Employment Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-employment-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Employed">Employed</SelectItem>
                              <SelectItem value="Self-Employed">Self-Employed</SelectItem>
                              <SelectItem value="Retired">Retired</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="employmentDuration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Time at Job (months)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              placeholder="36"
                              data-testid="input-employment-duration"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="housingPayment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monthly Housing Payment ($)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Home className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="pl-9"
                                placeholder="1500"
                                data-testid="input-housing-payment"
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Rent or mortgage
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Loan Details Section */}
              <Card className="p-6">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-lg">Loan Details</CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vehiclePrice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle Price ($)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="pl-9"
                                placeholder="40000"
                                data-testid="input-vehicle-price"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="downPayment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Down Payment ($)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="pl-9"
                                placeholder="5000"
                                data-testid="input-down-payment"
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            {form.watch('vehiclePrice') > 0 && form.watch('downPayment') > 0 && (
                              <span>
                                {((form.watch('downPayment') / form.watch('vehiclePrice')) * 100).toFixed(1)}% down
                              </span>
                            )}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="requestedLoanAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Requested Loan Amount ($)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                              <Input
                                type="number"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                                className="pl-9"
                                placeholder="35000"
                                data-testid="input-loan-amount"
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Vehicle price minus down payment
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              <Button 
                type="submit" 
                className="w-full" 
                size="lg"
                disabled={preQualifyMutation.isPending}
                data-testid="button-check-qualification"
              >
                {preQualifyMutation.isPending ? (
                  <>
                    <Clock className="w-4 h-4 mr-2 animate-spin" />
                    Checking Qualification...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 mr-2" />
                    Check Pre-Qualification
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          {result ? (
            <>
              {/* Approval Status */}
              <Card className={`p-6 ${result.approved ? 'border-green-500/20' : 'border-yellow-500/20'}`}>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {result.approved ? (
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    ) : (
                      <AlertCircle className="w-8 h-8 text-yellow-600" />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold">
                        {result.approved ? 'Pre-Qualified!' : 'Conditional Approval'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Approval odds: {result.approvalOdds}%
                      </p>
                    </div>
                  </div>
                  
                  <Progress value={result.approvalOdds} className="h-2" />
                  
                  <Badge className={getTierColor(result.creditTier)}>
                    {result.creditTier} Credit Tier
                  </Badge>
                </div>
              </Card>

              {/* Loan Terms */}
              <Card className="p-6">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base">Estimated Terms</CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">APR Range</span>
                      <span className="font-mono font-medium">
                        {result.estimatedAPR.min.toFixed(2)}% - {result.estimatedAPR.max.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Likely APR</span>
                      <span className="font-mono font-medium text-primary">
                        {result.estimatedAPR.likely.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Max Loan</span>
                      <span className="font-mono font-medium">
                        ${result.maxLoanAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Max Payment</span>
                      <span className="font-mono font-medium">
                        ${result.maxMonthlyPayment.toLocaleString()}/mo
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Financial Ratios */}
              <Card className="p-6">
                <CardHeader className="p-0 pb-4">
                  <CardTitle className="text-base">Financial Ratios</CardTitle>
                </CardHeader>
                <CardContent className="p-0 space-y-3">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">DTI Ratio</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {result.dtiRatio.toFixed(1)}%
                        </span>
                        {result.dtiRatio <= 35 ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : result.dtiRatio <= 45 ? (
                          <AlertCircle className="w-4 h-4 text-yellow-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={Math.min(result.dtiRatio, 100)} 
                      className="h-2"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">LTI Ratio</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium">
                          {result.ltiRatio.toFixed(1)}x
                        </span>
                        {result.ltiRatio <= 4 ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : result.ltiRatio <= 5 ? (
                          <AlertCircle className="w-4 h-4 text-yellow-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations */}
              {result.recommendations.length > 0 && (
                <Card className="p-6">
                  <CardHeader className="p-0 pb-4">
                    <CardTitle className="text-base">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 space-y-2">
                    {result.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <ChevronRight className="w-3 h-3 mt-0.5 text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">{rec}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="p-6">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <Calculator className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Complete the form to see your pre-qualification results
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Available Lenders Section */}
      {result && result.availableLenders.length > 0 && (
        <Card className="p-6">
          <CardHeader className="px-0 pt-0">
            <CardTitle>Available Lenders for Your Profile</CardTitle>
            <CardDescription>
              Based on your {result.creditTier} credit tier, these lenders may offer financing
            </CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.availableLenders.map((lender, index) => (
                <LenderCard 
                  key={lender.name} 
                  lender={lender} 
                  isHighlighted={index === 0}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}