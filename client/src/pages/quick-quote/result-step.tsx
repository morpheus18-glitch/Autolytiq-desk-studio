import { useEffect, useState } from "react";
import { ArrowLeft, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useQuickQuoteStore } from "@/stores/quick-quote-store";
import { TextQuoteDialog } from "@/components/mobile/text-quote-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import Decimal from "decimal.js";

// Simple monthly payment calculator for Quick Quote
function calculateMonthlyPayment(principal: number, annualRate: number, months: number): number {
  if (principal <= 0 || months <= 0) return 0;
  if (annualRate === 0) return principal / months;
  
  const monthlyRate = annualRate / 12;
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  return Math.round(payment);
}

export function ResultStep() {
  const {
    vehicle,
    targetPayment,
    downPayment,
    hasTrade,
    tradeValue,
    tradePayoff,
    calculatedPayment,
    apr,
    termMonths,
    amountFinanced,
    savedQuoteId,
    setCalculatedPayment,
    setSavedQuoteId,
    previousStep,
    reset,
  } = useQuickQuoteStore();

  const [showTextDialog, setShowTextDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Always recalculate payment when dependencies change
  useEffect(() => {
    if (!vehicle) return;

    // Calculate payment
    const price = new Decimal(vehicle.price);
    const down = new Decimal(downPayment || 0);
    const tradeEquity = new Decimal(tradeValue || 0).minus(new Decimal(tradePayoff || 0));
    const financed = price.minus(down).minus(tradeEquity);

    const payment = calculateMonthlyPayment(financed.toNumber(), apr / 100, termMonths);
    setCalculatedPayment(payment, apr, termMonths, financed.toNumber());
  }, [vehicle, downPayment, tradeValue, tradePayoff, apr, termMonths, setCalculatedPayment]);

  // Save or update quote in database
  useEffect(() => {
    async function saveOrUpdateQuote() {
      if (!vehicle || !calculatedPayment) return;
      
      const quotePayload = {
        vehicle: {
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          price: vehicle.price,
        },
        targetPayment,
        downPayment,
        hasTrade,
        tradeValue,
        tradePayoff,
        calculatedPayment,
        apr,
        termMonths,
        amountFinanced,
      };
      
      setIsSaving(true);
      try {
        if (!savedQuoteId) {
          // Create new quote
          const response = await apiRequest('POST', '/api/quick-quotes', {
            vehicleId: vehicle.id,
            quotePayload,
            status: 'draft',
          });
          const data = await response.json();
          setSavedQuoteId(data.id);
        } else {
          // Update existing quote
          await apiRequest('PATCH', `/api/quick-quotes/${savedQuoteId}`, {
            quotePayload,
          });
        }
      } catch (error) {
        console.error('Failed to save/update quote:', error);
      } finally {
        setIsSaving(false);
      }
    }

    saveOrUpdateQuote();
  }, [vehicle, calculatedPayment, savedQuoteId, targetPayment, downPayment, hasTrade, tradeValue, tradePayoff, apr, termMonths, amountFinanced, setSavedQuoteId]);

  const handleSendText = async (name: string, phone: string) => {
    if (!savedQuoteId) {
      toast({
        title: "Error",
        description: "Quote not saved yet. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }

    try {
      await apiRequest('POST', `/api/quick-quotes/${savedQuoteId}/text`, { name, phone });

      toast({
        title: "Quote sent!",
        description: `Payment quote texted to ${name} at ${phone}`,
      });
    } catch (error) {
      toast({
        title: "Failed to send text",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleTakeToDesk = async () => {
    if (!savedQuoteId) {
      toast({
        title: "Error",
        description: "Quote not saved yet. Please wait a moment.",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);
    try {
      const response = await apiRequest('POST', `/api/quick-quotes/${savedQuoteId}/convert`, {});
      const data = await response.json();

      toast({
        title: "Quote converted!",
        description: "Opening full desk...",
      });

      // Navigate to deal worksheet
      setLocation(`/deals/${data.dealId}`);
      
      // Clear quote after conversion
      reset();
    } catch (error) {
      toast({
        title: "Failed to convert quote",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const variance = targetPayment && calculatedPayment 
    ? calculatedPayment - targetPayment 
    : 0;

  const varianceText = variance > 0 
    ? `$${Math.abs(variance).toFixed(0)} over target`
    : variance < 0
    ? `$${Math.abs(variance).toFixed(0)} under target`
    : "On target";

  const varianceColor = variance > 0 
    ? "text-amber-600"
    : variance < 0
    ? "text-emerald-600"
    : "text-blue-600";

  const tradeEquity = (tradeValue || 0) - (tradePayoff || 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={previousStep}
          data-testid="button-back"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold">Your Quote</h1>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {/* Payment Display */}
        <div className="text-center py-12 px-6 bg-gradient-to-b from-primary/5 to-background">
          <p className="text-lg text-muted-foreground mb-2">YOUR PAYMENT</p>
          <div className="text-7xl font-bold mb-2" data-testid="text-payment">
            ${calculatedPayment?.toFixed(0) || '0'}
          </div>
          <p className="text-2xl text-muted-foreground">/month</p>
          <p className="text-lg text-muted-foreground mt-4">
            {termMonths} months @ {apr.toFixed(1)}%
          </p>
        </div>

        {/* Variance */}
        <div className={`text-center py-4 ${varianceColor}`}>
          <p className="text-xl font-semibold">{varianceText}</p>
        </div>

        <Separator />

        {/* Breakdown */}
        <div className="p-6 space-y-4">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-muted-foreground">
                {vehicle?.year} {vehicle?.make} {vehicle?.model}
              </span>
              <span className="font-semibold">
                ${vehicle?.price.toLocaleString()}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-muted-foreground">Down payment</span>
              <span className="font-semibold">
                ${(downPayment || 0).toLocaleString()}
              </span>
            </div>

            {hasTrade && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trade value</span>
                  <span className="font-semibold">
                    ${(tradeValue || 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Trade payoff</span>
                  <span className="font-semibold">
                    -${(tradePayoff || 0).toLocaleString()}
                  </span>
                </div>
              </>
            )}

            <Separator />

            <div className="flex justify-between text-lg">
              <span className="font-semibold">Amount financed</span>
              <span className="font-bold">
                ${amountFinanced?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t space-y-3">
        <Button
          size="lg"
          className="w-full min-h-[56px] text-lg"
          onClick={() => setShowTextDialog(true)}
          disabled={!savedQuoteId || isSaving}
          data-testid="button-text-quote"
        >
          <Phone className="mr-2 h-5 w-5" />
          Text Quote
        </Button>

        <Button
          size="lg"
          variant="outline"
          className="w-full min-h-[56px] text-lg"
          onClick={handleTakeToDesk}
          disabled={!savedQuoteId || isSaving || isConverting}
          data-testid="button-take-to-desk"
        >
          {isConverting ? "Converting..." : "Take to Desk"}
        </Button>

        <Button
          size="lg"
          variant="ghost"
          className="w-full min-h-[56px] text-lg"
          onClick={reset}
          data-testid="button-start-over"
        >
          Start Over
        </Button>
      </div>

      <TextQuoteDialog
        open={showTextDialog}
        onOpenChange={setShowTextDialog}
        onSendQuote={handleSendText}
      />
    </div>
  );
}