import { useState, useEffect } from 'react';
import { useLocation, useSearch } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { calculateFinancePayment } from '@/lib/calculations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/core/page-header';
import { PageContent } from '@/components/core/page-content';
import { useToast } from '@/hooks/use-toast';
import {
  DollarSign,
  TrendingDown,
  Calendar,
  Percent,
  ArrowLeft,
  Zap,
  CheckCircle2,
  FileText
} from 'lucide-react';
import type { User as UserType, Vehicle } from '@shared/schema';
import Decimal from 'decimal.js';
import {
  premiumCardClasses,
  statusColors,
  primaryButtonClasses,
  gridLayouts,
  formSpacing
} from '@/lib/design-tokens';
import { cn } from '@/lib/utils';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

const TERM_OPTIONS = [36, 48, 60, 72, 84];

const DEFAULT_VALUES = {
  vehiclePrice: 0,
  downPayment: 0,
  downPaymentPercent: 20,
  apr: 6.99,
  term: 72,
};

const quoteSchema = z.object({
  vehiclePrice: z.coerce.number().min(0, 'Vehicle price must be positive'),
  downPayment: z.coerce.number().min(0, 'Down payment must be positive'),
  downPaymentPercent: z.coerce.number().min(0).max(100),
  apr: z.coerce.number().min(0, 'APR must be positive').max(30, 'APR seems too high'),
  term: z.coerce.number(),
});

type QuoteFormData = z.infer<typeof quoteSchema>;

export default function QuickQuote() {
  const [, setLocation] = useLocation();
  const searchParams = useSearch();
  const { toast } = useToast();
  const [usePercentMode, setUsePercentMode] = useState(true);
  
  const { data: users } = useQuery<UserType[]>({
    queryKey: ['/api/users'],
  });
  
  // Get URL parameters for pre-population with validation
  const urlVehiclePrice = searchParams ? new URLSearchParams(searchParams).get('vehiclePrice') : null;
  const urlVehicleId = searchParams ? new URLSearchParams(searchParams).get('vehicleId') : null;
  
  // Parse vehicle price with NaN fallback
  const parsedVehiclePrice = urlVehiclePrice ? parseFloat(urlVehiclePrice) : DEFAULT_VALUES.vehiclePrice;
  const safeVehiclePrice = isNaN(parsedVehiclePrice) ? DEFAULT_VALUES.vehiclePrice : parsedVehiclePrice;
  
  // Fetch vehicle details if vehicleId is provided
  const { data: vehicle } = useQuery<Vehicle>({
    queryKey: ['/api/vehicles', urlVehicleId],
    enabled: !!urlVehicleId,
  });
  
  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      ...DEFAULT_VALUES,
      vehiclePrice: safeVehiclePrice,
    },
  });
  
  const watchedValues = form.watch();
  
  // Calculate payment in real-time
  const payment = calculateFinancePayment({
    vehiclePrice: watchedValues.vehiclePrice || 0,
    downPayment: watchedValues.downPayment || 0,
    tradeAllowance: 0,
    tradePayoff: 0,
    apr: watchedValues.apr || DEFAULT_VALUES.apr,
    term: watchedValues.term || DEFAULT_VALUES.term,
    totalTax: 0,
    totalFees: 0,
  });
  
  // Sync down payment with percentage mode
  useEffect(() => {
    if (usePercentMode && watchedValues.vehiclePrice > 0 && watchedValues.downPaymentPercent != null) {
      try {
        const calculatedDown = new Decimal(watchedValues.vehiclePrice)
          .times(watchedValues.downPaymentPercent)
          .div(100)
          .toDecimalPlaces(2)
          .toNumber();
        form.setValue('downPayment', calculatedDown);
      } catch (error) {
        console.warn('Invalid percentage value for dollar calculation');
      }
    }
  }, [watchedValues.vehiclePrice, watchedValues.downPaymentPercent, usePercentMode, form]);
  
  // Sync percentage when dollar amount changes
  useEffect(() => {
    if (!usePercentMode && watchedValues.vehiclePrice > 0 && watchedValues.downPayment != null) {
      try {
        const percent = new Decimal(watchedValues.downPayment)
          .div(watchedValues.vehiclePrice)
          .times(100)
          .toDecimalPlaces(1)
          .toNumber();
        form.setValue('downPaymentPercent', Math.min(100, Math.max(0, percent)));
      } catch (error) {
        console.warn('Invalid down payment value for percentage calculation');
      }
    }
  }, [watchedValues.downPayment, watchedValues.vehiclePrice, usePercentMode, form]);
  
  const createDealMutation = useMutation({
    mutationFn: async () => {
      const salesperson = users?.find(u => u.role === 'salesperson') || users?.[0];
      if (!salesperson) {
        throw new Error('No users available');
      }
      
      const response = await apiRequest('POST', '/api/deals', {
        salespersonId: salesperson.id,
        ...(urlVehicleId && { vehicleId: urlVehicleId }),
      });
      const deal = await response.json();
      
      // Create quick quote scenario
      const scenarioResponse = await apiRequest('POST', `/api/deals/${deal.id}/scenarios`, {
        name: 'Deal Studio - Quick Build',
        isQuickQuote: true,
        scenarioType: 'FINANCE_DEAL',
        vehiclePrice: String(watchedValues.vehiclePrice),
        downPayment: String(watchedValues.downPayment),
        apr: String(watchedValues.apr),
        term: watchedValues.term,
        totalTax: '0',
        totalFees: '0',
        tradeAllowance: '0',
        tradePayoff: '0',
      });
      
      return { deal, scenario: await scenarioResponse.json() };
    },
    onSuccess: ({ deal }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals'] });
      toast({
        title: 'Deal Studio quote saved!',
        description: 'Opening full worksheet...',
      });
      setLocation(`/deals/${deal.id}`);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to save quote',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    },
  });
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };
  
  const handleSaveQuote = () => {
    createDealMutation.mutate();
  };
  
  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="Deal Studio"
        subtitle={vehicle ? `${vehicle.year} ${vehicle.make} ${vehicle.model}` : "Quick Build - 30-second payment quotes"}
        icon={<Zap />}
        actions={
          <Button
            variant="ghost"
            onClick={() => setLocation('/')}
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        }
      />

      <PageContent className="container mx-auto max-w-4xl">
        <div className={gridLayouts.twoCol}>
          {/* Input Form */}
          <div className={formSpacing.section}>
            <Card className={premiumCardClasses}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Vehicle Details
                </CardTitle>
              </CardHeader>
              <CardContent className={formSpacing.section}>
                {/* Vehicle Price */}
                <div className={formSpacing.fieldGroup}>
                  <Label htmlFor="vehiclePrice" className="text-base font-medium">
                    Vehicle Price
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="vehiclePrice"
                      type="number"
                      placeholder="0"
                      className="pl-9 text-lg h-14"
                      data-testid="input-vehicle-price"
                      {...form.register('vehiclePrice')}
                    />
                  </div>
                  {form.formState.errors.vehiclePrice && (
                    <p className="text-sm text-destructive">{form.formState.errors.vehiclePrice.message}</p>
                  )}
                </div>

                {/* Down Payment */}
                <div className={formSpacing.fieldGroup}>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="downPayment" className="text-base font-medium">
                      Down Payment
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setUsePercentMode(!usePercentMode)}
                      className="h-7 text-xs"
                      data-testid="button-toggle-down-mode"
                    >
                      {usePercentMode ? '% Mode' : '$ Mode'}
                    </Button>
                  </div>
                  
                  {usePercentMode ? (
                    <div className="relative">
                      <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="downPaymentPercent"
                        type="number"
                        placeholder="20"
                        step="0.1"
                        className="pl-9 text-lg h-14"
                        data-testid="input-down-percent"
                        {...form.register('downPaymentPercent')}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-mono">
                        {formatCurrency(watchedValues.downPayment || 0)}
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="downPayment"
                        type="number"
                        placeholder="0"
                        className="pl-9 text-lg h-14"
                        data-testid="input-down-payment"
                        {...form.register('downPayment')}
                      />
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        {watchedValues.downPaymentPercent.toFixed(1)}%
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className={premiumCardClasses}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Finance Terms
                </CardTitle>
              </CardHeader>
              <CardContent className={formSpacing.section}>
                {/* APR */}
                <div className={formSpacing.fieldGroup}>
                  <Label htmlFor="apr" className="text-base font-medium">
                    APR (%)
                  </Label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="apr"
                      type="number"
                      step="0.01"
                      placeholder="6.99"
                      className="pl-9 text-lg h-14"
                      data-testid="input-apr"
                      {...form.register('apr')}
                    />
                  </div>
                  {form.formState.errors.apr && (
                    <p className="text-sm text-destructive">{form.formState.errors.apr.message}</p>
                  )}
                </div>


                {/* Term */}
                <div className={formSpacing.fieldGroup}>
                  <Label htmlFor="term" className="text-base font-medium">
                    Term (months)
                  </Label>
                  <Select
                    value={String(watchedValues.term)}
                    onValueChange={(value) => form.setValue('term', parseInt(value))}
                  >
                    <SelectTrigger className="h-14 text-lg" data-testid="select-term">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TERM_OPTIONS.map(term => (
                        <SelectItem key={term} value={String(term)}>
                          {term} months ({(term / 12).toFixed(1)} years)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>


          {/* Payment Summary - Sticky on Desktop */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <Card className={cn(premiumCardClasses, statusColors.info)}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text">
                    Estimated Payment
                  </CardTitle>
                  <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                    <Zap className="w-3 h-3 mr-1" />
                    Instant
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className={formSpacing.section}>
                {/* Monthly Payment - Large Display */}
                <div className="text-center py-6 px-4 bg-background/60 backdrop-blur-sm rounded-lg neon-border-subtle">
                  <p className="text-sm text-muted-foreground mb-2">Monthly Payment</p>
                  <div className="text-5xl md:text-6xl font-bold font-mono text-primary premium-glow-currency" data-testid="text-monthly-payment">
                    {formatCurrency(payment.monthlyPayment)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    per month for {watchedValues.term} months
                  </p>
                </div>
                
                {/* Financial Summary */}
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Amount Financed</span>
                    <span className="font-mono font-medium premium-glow-currency" data-testid="text-amount-financed">
                      {formatCurrency(payment.amountFinanced)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Total Interest</span>
                    <span className="font-mono font-medium" data-testid="text-total-interest">
                      {formatCurrency(payment.totalInterest || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-muted-foreground font-medium">Total Cost</span>
                    <span className="font-mono font-semibold text-lg premium-glow-currency" data-testid="text-total-cost">
                      {formatCurrency(payment.totalCost)}
                    </span>
                  </div>
                </div>


                {/* Actions */}
                <div className={cn(formSpacing.fieldGroup, "pt-4")}>
                  <Button
                    size="lg"
                    className={cn("w-full h-14 text-base", primaryButtonClasses)}
                    onClick={handleSaveQuote}
                    disabled={createDealMutation.isPending || watchedValues.vehiclePrice <= 0}
                    data-testid="button-save-quote"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    {createDealMutation.isPending ? 'Saving...' : 'Save & Continue to Full Desk'}
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full h-14 text-base"
                    onClick={() => setLocation('/')}
                    data-testid="button-start-over"
                  >
                    Start Over
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Quick Tips */}
            <Card className={cn(premiumCardClasses, "mt-4")}>
              <CardContent className={cn("pt-6", formSpacing.fieldGroup, "text-xs text-muted-foreground")}>
                <p className="flex items-start gap-2">
                  <TrendingDown className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>Larger down payments reduce monthly payments</span>
                </p>
                <p className="flex items-start gap-2">
                  <Calendar className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>Shorter terms save money on interest</span>
                </p>
                <p className="flex items-start gap-2">
                  <FileText className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>Save this quote to add customer, vehicle, and trade details</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </div>
  );
}
