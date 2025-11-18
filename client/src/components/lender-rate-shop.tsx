import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  TrendingUp, TrendingDown, AlertCircle, Check, X, Clock,
  DollarSign, Percent, Calendar, FileText, Shield, Star,
  ChevronDown, ChevronUp, Filter, ArrowUpDown, Printer,
  Download, RefreshCw, Building2, CreditCard, Info,
  Sparkles, Zap, Trophy, Target, Lock, CheckCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LenderRateShopProps {
  dealId: string;
  scenarioId?: string;
  creditScore: number;
  cobuyerCreditScore?: number;
  vehiclePrice: number;
  downPayment: number;
  tradeValue?: number;
  tradePayoff?: number;
  term?: number;
  vehicleType?: 'new' | 'used' | 'certified';
  vehicleYear?: number;
  vehicleMileage?: number;
  monthlyIncome?: number;
  monthlyDebt?: number;
  state?: string;
  onSelectRate?: (offer: any) => void;
  onClose?: () => void;
}

const LENDER_TYPE_OPTIONS = [
  { value: 'all', label: 'All Lenders' },
  { value: 'prime', label: 'Prime Lenders' },
  { value: 'captive', label: 'Captive Finance' },
  { value: 'credit_union', label: 'Credit Unions' },
  { value: 'subprime', label: 'Subprime' },
  { value: 'bhph', label: 'Buy Here Pay Here' }
];

const TERM_OPTIONS = [24, 36, 48, 60, 72, 84];

const SORT_OPTIONS = [
  { value: 'apr', label: 'Lowest APR' },
  { value: 'payment', label: 'Lowest Payment' },
  { value: 'approval', label: 'Best Approval Odds' },
  { value: 'reserve', label: 'Max Dealer Reserve' }
];

const getApprovalColor = (likelihood: string) => {
  switch (likelihood) {
    case 'High':
      return 'text-green-600 dark:text-green-400';
    case 'Medium':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'Low':
      return 'text-red-600 dark:text-red-400';
    default:
      return 'text-muted-foreground';
  }
};

const getApprovalBadgeVariant = (likelihood: string) => {
  switch (likelihood) {
    case 'High':
      return 'default';
    case 'Medium':
      return 'secondary';
    case 'Low':
      return 'destructive';
    default:
      return 'outline';
  }
};

export function LenderRateShop({
  dealId,
  scenarioId,
  creditScore,
  cobuyerCreditScore,
  vehiclePrice,
  downPayment,
  tradeValue = 0,
  tradePayoff = 0,
  term: initialTerm = 60,
  vehicleType = 'used',
  vehicleYear,
  vehicleMileage,
  monthlyIncome,
  monthlyDebt,
  state = 'CA',
  onSelectRate,
  onClose
}: LenderRateShopProps) {
  const { toast } = useToast();
  const [selectedTerm, setSelectedTerm] = useState(initialTerm);
  const [lenderTypeFilter, setLenderTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('apr');
  const [expandedOffers, setExpandedOffers] = useState<Set<string>>(new Set());
  const [compareMode, setCompareMode] = useState(false);
  const [compareOffers, setCompareOffers] = useState<Set<string>>(new Set());
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

  const loanAmount = vehiclePrice - downPayment - (tradeValue - tradePayoff);

  // Fetch rates from all lenders
  const { data: ratesData, isLoading, refetch } = useQuery({
    queryKey: ['/api/lenders/shop', dealId, creditScore, loanAmount, selectedTerm],
    queryFn: async () => {
      const response = await apiRequest('POST', '/api/lenders/shop', {
        dealId,
        scenarioId,
        creditScore,
        cobuyerCreditScore,
        vehiclePrice,
        requestedAmount: loanAmount,
        downPayment,
        tradeValue,
        tradePayoff,
        requestedTerm: selectedTerm,
        vehicleType,
        vehicleYear,
        vehicleMileage,
        monthlyIncome,
        monthlyDebt,
        state,
        requestType: 'soft_pull'
      });
      return await response.json();
    },
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
  });

  // Select lender mutation
  const selectLenderMutation = useMutation({
    mutationFn: async ({ approvedLenderId, userId }: { approvedLenderId: string; userId: string }) => {
      const response = await apiRequest('POST', '/api/lenders/select', { approvedLenderId, userId });
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Lender Selected',
        description: 'The rate has been locked in and saved to the deal.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
      if (onSelectRate) {
        onSelectRate(data);
      }
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to select lender. Please try again.',
        variant: 'destructive'
      });
    }
  });

  // Filter and sort offers
  const filteredAndSortedOffers = useMemo(() => {
    if (!ratesData?.offers) return [];
    
    let filtered = [...ratesData.offers];
    
    // Apply lender type filter
    if (lenderTypeFilter !== 'all') {
      filtered = filtered.filter(offer => offer.lenderType === lenderTypeFilter);
    }
    
    // Apply sorting
    switch (sortBy) {
      case 'apr':
        filtered.sort((a, b) => parseFloat(a.apr) - parseFloat(b.apr));
        break;
      case 'payment':
        filtered.sort((a, b) => parseFloat(a.monthlyPayment) - parseFloat(b.monthlyPayment));
        break;
      case 'approval':
        filtered.sort((a, b) => b.approvalScore - a.approvalScore);
        break;
      case 'reserve':
        filtered.sort((a, b) => parseFloat(b.dealerReserve) - parseFloat(a.dealerReserve));
        break;
    }
    
    return filtered;
  }, [ratesData?.offers, lenderTypeFilter, sortBy]);

  const toggleOfferExpansion = (offerId: string) => {
    setExpandedOffers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(offerId)) {
        newSet.delete(offerId);
      } else {
        newSet.add(offerId);
      }
      return newSet;
    });
  };

  const toggleCompareOffer = (offerId: string) => {
    setCompareOffers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(offerId)) {
        newSet.delete(offerId);
      } else {
        if (newSet.size >= 3) {
          toast({
            title: 'Comparison Limit',
            description: 'You can compare up to 3 offers at a time.',
            variant: 'destructive'
          });
          return prev;
        }
        newSet.add(offerId);
      }
      return newSet;
    });
  };

  const handleSelectOffer = (offer: any) => {
    // Mock user ID for now - in production, get from auth context
    const userId = 'mock-user-id';
    selectLenderMutation.mutate({ 
      approvedLenderId: offer.id, 
      userId 
    });
    setSelectedOfferId(offer.id);
  };

  const exportToPDF = () => {
    // Placeholder for PDF export
    toast({
      title: 'Export Started',
      description: 'Rate sheet is being prepared for download.',
    });
  };

  const printRateSheet = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Shopping Rates</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Contacting lenders and calculating your best options...
            </p>
          </div>
          <Progress value={65} className="w-full max-w-md mx-auto" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="backdrop-blur-sm bg-card/50">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-24 mt-2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const offers = filteredAndSortedOffers;
  const compareOffersData = offers.filter(o => compareOffers.has(o.id));

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Rate Shopping Results</h2>
          <p className="text-muted-foreground">
            {ratesData?.offerCount || 0} lenders responded • Best rate: {ratesData?.bestRate?.apr || 'N/A'}% APR
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            data-testid="button-refresh-rates"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={printRateSheet}
            data-testid="button-print-rates"
          >
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToPDF}
            data-testid="button-export-pdf"
          >
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </div>

      {/* Filters and controls */}
      <Card className="backdrop-blur-sm bg-card/50">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="term-select">Term (months)</Label>
              <Select
                value={selectedTerm.toString()}
                onValueChange={(value) => setSelectedTerm(parseInt(value))}
              >
                <SelectTrigger id="term-select" data-testid="select-term">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TERM_OPTIONS.map(term => (
                    <SelectItem key={term} value={term.toString()}>
                      {term} months
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="lender-type">Lender Type</Label>
              <Select
                value={lenderTypeFilter}
                onValueChange={setLenderTypeFilter}
              >
                <SelectTrigger id="lender-type" data-testid="select-lender-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LENDER_TYPE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="sort-by">Sort By</Label>
              <Select
                value={sortBy}
                onValueChange={setSortBy}
              >
                <SelectTrigger id="sort-by" data-testid="select-sort">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button
                variant={compareMode ? 'default' : 'outline'}
                onClick={() => {
                  setCompareMode(!compareMode);
                  if (!compareMode) setCompareOffers(new Set());
                }}
                className="w-full"
                data-testid="button-compare-mode"
              >
                {compareMode ? 'Exit Compare' : 'Compare Offers'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compare mode banner */}
      {compareMode && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Select up to 3 offers to compare side by side. {compareOffers.size}/3 selected.
            {compareOffers.size >= 2 && (
              <Button
                variant="link"
                size="sm"
                className="ml-2"
                onClick={() => {/* Open comparison dialog */}}
              >
                View Comparison
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Lender offers grid */}
      {offers.length === 0 ? (
        <Card className="backdrop-blur-sm bg-card/50">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Offers Available</h3>
            <p className="text-muted-foreground">
              No lenders responded with offers for this credit profile and loan parameters.
              Try adjusting the filters or loan terms.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => refetch()}
              data-testid="button-retry-shop"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {offers.map((offer, index) => {
            const isExpanded = expandedOffers.has(offer.id);
            const isSelected = selectedOfferId === offer.id;
            const isComparing = compareOffers.has(offer.id);
            
            return (
              <motion.div
                key={offer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card 
                  className={cn(
                    "backdrop-blur-sm bg-card/50 hover-elevate transition-all",
                    isSelected && "ring-2 ring-primary",
                    isComparing && "ring-2 ring-blue-500"
                  )}
                  data-testid={`card-lender-${offer.id}`}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                          <Building2 className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{offer.lenderName}</CardTitle>
                          <CardDescription className="text-xs">
                            {offer.programName || offer.lenderType}
                          </CardDescription>
                        </div>
                      </div>
                      {compareMode && (
                        <Checkbox
                          checked={isComparing}
                          onCheckedChange={() => toggleCompareOffer(offer.id)}
                          data-testid={`checkbox-compare-${offer.id}`}
                        />
                      )}
                    </div>
                    
                    {/* Special badges */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {offer.specialRate && (
                        <Badge variant="default" className="text-xs">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Special Rate
                        </Badge>
                      )}
                      {offer.incentives && (
                        <Badge variant="secondary" className="text-xs">
                          <Zap className="w-3 h-3 mr-1" />
                          ${offer.incentives} Incentive
                        </Badge>
                      )}
                      <Badge 
                        variant={getApprovalBadgeVariant(offer.approvalLikelihood)}
                        className="text-xs"
                      >
                        {offer.approvalLikelihood} Approval
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    {/* Main rate display */}
                    <div className="space-y-2">
                      <div className="flex items-baseline justify-between">
                        <span className="text-3xl font-bold">{offer.apr}%</span>
                        <span className="text-sm text-muted-foreground">APR</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Payment:</span>
                          <span className="ml-1 font-medium">${offer.monthlyPayment}/mo</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Term:</span>
                          <span className="ml-1 font-medium">{offer.term} mo</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Dealer metrics */}
                    <div className="p-3 rounded-lg bg-muted/50">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Buy Rate:</span>
                          <span className="ml-1 font-medium">{offer.buyRate}%</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Reserve:</span>
                          <span className="ml-1 font-medium text-green-600 dark:text-green-400">
                            ${offer.dealerReserve}
                          </span>
                        </div>
                      </div>
                      {offer.flatFee && (
                        <div className="mt-1 text-sm">
                          <span className="text-muted-foreground">Flat Fee:</span>
                          <span className="ml-1 font-medium">${offer.flatFee}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Expanded details */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-3 pt-3 border-t"
                      >
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">Finance Charge:</span>
                            <span className="ml-1">${offer.totalFinanceCharge}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total Payments:</span>
                            <span className="ml-1">${offer.totalOfPayments}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">LTV:</span>
                            <span className="ml-1">{offer.ltv}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">DTI:</span>
                            <span className="ml-1">{offer.dti}%</span>
                          </div>
                        </div>
                        
                        {offer.stipulations && offer.stipulations.length > 0 && (
                          <div>
                            <p className="text-sm font-medium mb-1">Required Stipulations:</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {offer.stipulations.map((stip: string, i: number) => (
                                <li key={i} className="flex items-start gap-1">
                                  <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                  {stip}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {offer.specialConditions && (
                          <Alert className="py-2">
                            <Info className="h-3 w-3" />
                            <AlertDescription className="text-xs">
                              {offer.specialConditions}
                            </AlertDescription>
                          </Alert>
                        )}
                      </motion.div>
                    )}
                  </CardContent>
                  
                  <CardFooter className="flex justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleOfferExpansion(offer.id)}
                      data-testid={`button-expand-${offer.id}`}
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 mr-1" />
                          Less
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 mr-1" />
                          Details
                        </>
                      )}
                    </Button>
                    
                    <Button
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSelectOffer(offer)}
                      disabled={selectLenderMutation.isPending}
                      data-testid={`button-select-${offer.id}`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Selected
                        </>
                      ) : (
                        'Select'
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
      
      {/* Comparison Dialog */}
      {compareMode && compareOffers.size >= 2 && (
        <Dialog>
          <DialogTrigger asChild>
            <Button
              className="fixed bottom-4 right-4 shadow-lg"
              size="lg"
              data-testid="button-view-comparison"
            >
              Compare {compareOffers.size} Offers
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Rate Comparison</DialogTitle>
              <DialogDescription>
                Side-by-side comparison of selected offers
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {compareOffersData.map((offer) => (
                <Card key={offer.id} className="backdrop-blur-sm bg-card/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">{offer.lenderName}</CardTitle>
                    <Badge variant={getApprovalBadgeVariant(offer.approvalLikelihood)}>
                      {offer.approvalLikelihood} Approval
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="text-2xl font-bold">{offer.apr}%</p>
                      <p className="text-sm text-muted-foreground">APR</p>
                    </div>
                    <Separator />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Payment:</span>
                        <span className="font-medium">${offer.monthlyPayment}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Buy Rate:</span>
                        <span className="font-medium">{offer.buyRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Reserve:</span>
                        <span className="font-medium text-green-600">${offer.dealerReserve}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Cost:</span>
                        <span className="font-medium">${offer.totalOfPayments}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleSelectOffer(offer)}
                      data-testid={`button-compare-select-${offer.id}`}
                    >
                      Select This Rate
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}