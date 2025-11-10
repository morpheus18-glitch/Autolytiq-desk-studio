import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Car, Plus, Pencil, Trash2, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useScenarioForm } from '@/contexts/scenario-form-context';
import { insertTradeVehicleSchema, type TradeVehicle } from '@shared/schema';
import Decimal from 'decimal.js';

interface TradeGarageSheetProps {
  dealId: string;
  trigger?: React.ReactNode;
}

const tradeFormSchema = insertTradeVehicleSchema.extend({
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1),
  mileage: z.coerce.number().min(0),
  allowance: z.coerce.number().min(0),
  payoff: z.coerce.number().min(0).default(0),
}).omit({ dealId: true });

type TradeFormData = z.infer<typeof tradeFormSchema>;

export function TradeGarageSheet({ dealId, trigger }: TradeGarageSheetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const { toast } = useToast();
  const { scenario, updateMultipleFields } = useScenarioForm();

  const { data: trades = [], isLoading } = useQuery<TradeVehicle[]>({
    queryKey: ['/api/deals', dealId, 'trades'],
    enabled: isOpen,
  });

  const selectedTrade = useMemo(
    () => trades.find((t) => t.id === selectedTradeId),
    [trades, selectedTradeId]
  );

  const form = useForm<TradeFormData>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      year: new Date().getFullYear(),
      make: '',
      model: '',
      trim: '',
      mileage: 0,
      vin: '',
      condition: 'good',
      allowance: 0,
      payoff: 0,
    },
  });

  useMemo(() => {
    if (selectedTrade) {
      form.reset({
        year: selectedTrade.year,
        make: selectedTrade.make,
        model: selectedTrade.model,
        trim: selectedTrade.trim || '',
        mileage: selectedTrade.mileage,
        vin: selectedTrade.vin || '',
        condition: selectedTrade.condition || 'good',
        allowance: parseFloat(selectedTrade.allowance),
        payoff: parseFloat(selectedTrade.payoff),
      });
    } else {
      form.reset({
        year: new Date().getFullYear(),
        make: '',
        model: '',
        trim: '',
        mileage: 0,
        vin: '',
        condition: 'good',
        allowance: 0,
        payoff: 0,
      });
    }
  }, [selectedTrade, form]);

  const createMutation = useMutation({
    mutationFn: (data: TradeFormData) =>
      apiRequest(`/api/deals/${dealId}/trades`, 'POST', { ...data, dealId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
      toast({
        title: 'Trade vehicle added',
        description: 'Trade vehicle has been successfully added to the deal.',
      });
      form.reset();
      setSelectedTradeId(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add trade vehicle',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TradeFormData> }) =>
      apiRequest(`/api/deals/${dealId}/trades/${id}`, 'PATCH', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
      toast({
        title: 'Trade vehicle updated',
        description: 'Trade vehicle has been successfully updated.',
      });
      setSelectedTradeId(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update trade vehicle',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/deals/${dealId}/trades/${id}`, 'DELETE'),
    onSuccess: (_, deletedTradeId) => {
      if (scenario.tradeVehicleId === deletedTradeId) {
        updateMultipleFields({
          tradeVehicleId: null,
          tradeAllowance: '0',
          tradePayoff: '0',
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId, 'trades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/deals', dealId] });
      toast({
        title: 'Trade vehicle deleted',
        description: 'Trade vehicle has been successfully removed.',
      });
      setDeleteConfirmId(null);
      if (selectedTradeId === deleteConfirmId) {
        setSelectedTradeId(null);
      }
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete trade vehicle',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (data: TradeFormData) => {
    if (selectedTradeId) {
      updateMutation.mutate({ id: selectedTradeId, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleApplyToScenario = (trade: TradeVehicle) => {
    updateMultipleFields({
      tradeVehicleId: trade.id,
      tradeAllowance: trade.allowance,
      tradePayoff: trade.payoff,
    });
    toast({
      title: 'Trade applied to scenario',
      description: `${trade.year} ${trade.make} ${trade.model} is now linked to this scenario.`,
    });
  };

  const calculateEquity = (allowance: string, payoff: string) => {
    return new Decimal(allowance).minus(new Decimal(payoff));
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(num);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" data-testid="button-trade-garage">
              <Car className="w-4 h-4 mr-2" />
              Manage Trades
            </Button>
          )}
        </SheetTrigger>

        <SheetContent
          side="bottom"
          className="h-[85vh] overflow-hidden flex flex-col p-0 md:w-[640px] md:left-1/2 md:-translate-x-1/2"
        >
          <div className="flex justify-center pt-4 pb-2">
            <div className="w-16 h-2 rounded-full bg-muted" />
          </div>

          <SheetHeader className="px-6 pb-4">
            <SheetTitle className="text-left">Trade Garage</SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-6">
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <div className="text-sm text-muted-foreground">Loading trades...</div>
              </div>
            )}

            {!isLoading && trades.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <Car className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No Trade Vehicles</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Add a trade-in vehicle to this deal using the form below.
                </p>
              </div>
            )}

            {trades.map((trade) => {
              const equity = calculateEquity(trade.allowance, trade.payoff);
              const hasPositiveEquity = equity.greaterThan(0);
              const hasNegativeEquity = equity.lessThan(0);
              const isApplied = scenario.tradeVehicleId === trade.id;

              return (
                <div
                  key={trade.id}
                  className={cn(
                    'p-4 rounded-lg border hover-elevate transition-all duration-300',
                    isApplied && 'border-primary bg-primary/5'
                  )}
                  data-testid={`card-trade-${trade.id}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium">
                          {trade.year} {trade.make} {trade.model}
                        </h4>
                        {isApplied && (
                          <Badge variant="default" className="text-xs">
                            Applied
                          </Badge>
                        )}
                      </div>
                      {trade.trim && (
                        <p className="text-sm text-muted-foreground">{trade.trim}</p>
                      )}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {trade.vin && (
                          <span className="font-mono">{trade.vin}</span>
                        )}
                        <span>{trade.mileage.toLocaleString()} mi</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedTradeId(trade.id)}
                        data-testid={`button-edit-trade-${trade.id}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirmId(trade.id)}
                        data-testid={`button-delete-trade-${trade.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Allowance</div>
                      <div className="font-mono tabular-nums">{formatCurrency(trade.allowance)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Payoff</div>
                      <div className="font-mono tabular-nums">{formatCurrency(trade.payoff)}</div>
                    </div>
                  </div>

                  <div
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border transition-all duration-300',
                      hasPositiveEquity && 'bg-green-500/10 border-green-500/20',
                      hasNegativeEquity && 'bg-red-500/10 border-red-500/20',
                      !hasPositiveEquity && !hasNegativeEquity && 'bg-muted/50'
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      {hasPositiveEquity && (
                        <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />
                      )}
                      {hasNegativeEquity && (
                        <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                      )}
                      <span className="font-medium">
                        {hasPositiveEquity
                          ? 'Positive Equity'
                          : hasNegativeEquity
                          ? 'Negative Equity'
                          : 'Zero Equity'}
                      </span>
                    </div>
                    <div
                      className={cn(
                        'text-lg font-mono font-bold tabular-nums transition-all duration-300',
                        hasPositiveEquity && 'text-green-600 dark:text-green-400',
                        hasNegativeEquity && 'text-red-600 dark:text-red-400',
                        !hasPositiveEquity && !hasNegativeEquity && 'text-muted-foreground'
                      )}
                      data-testid={`text-equity-${trade.id}`}
                    >
                      {formatCurrency(Math.abs(equity.toNumber()))}
                    </div>
                  </div>

                  {!isApplied && (
                    <Button
                      variant="outline"
                      className="w-full mt-4"
                      onClick={() => handleApplyToScenario(trade)}
                      data-testid={`button-apply-trade-${trade.id}`}
                    >
                      Apply to Scenario
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          <Separator />

          <div className="p-6 bg-muted/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium">
                {selectedTradeId ? 'Edit Trade Vehicle' : 'Add Trade Vehicle'}
              </h3>
              {selectedTradeId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTradeId(null)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
              )}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="year"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Year</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            className="h-9"
                            data-testid="input-trade-year"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mileage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Mileage</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            className="h-9 font-mono"
                            data-testid="input-trade-mileage"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="make"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Make</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-9" data-testid="input-trade-make" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="model"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Model</FormLabel>
                        <FormControl>
                          <Input {...field} className="h-9" data-testid="input-trade-model" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="vin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">VIN (optional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value || ''}
                          className="h-9 font-mono"
                          data-testid="input-trade-vin"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="allowance"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Trade Allowance</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              className="h-9 pl-9 font-mono"
                              data-testid="input-trade-allowance-form"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="payoff"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Trade Payoff</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              className="h-9 pl-9 font-mono"
                              data-testid="input-trade-payoff-form"
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-trade"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    'Saving...'
                  ) : selectedTradeId ? (
                    'Update Trade Vehicle'
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Trade Vehicle
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={deleteConfirmId !== null} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trade Vehicle?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the trade vehicle from this deal. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && deleteMutation.mutate(deleteConfirmId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
