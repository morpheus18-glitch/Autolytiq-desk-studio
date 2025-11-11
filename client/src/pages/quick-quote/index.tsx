import { useState, useEffect } from "react";
import { ArrowLeft, Calculator, MessageSquare, FileText, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuickQuoteStore } from "@/stores/quick-quote-store";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Decimal from "decimal.js";
import { calculateMonthlyPayment } from "@/lib/lender-service";
import { TextQuoteDialog } from "@/components/mobile/text-quote-dialog";
import { StockNumberQuickAdd } from "@/components/stock-number-quick-add";
import type { Vehicle } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

export default function QuickQuote() {
  const {
    vehicle,
    vehiclePrice,
    downPayment,
    tradeValue,
    tradePayoff,
    apr,
    termMonths,
    calculatedPayment,
    amountFinanced,
    savedQuoteId,
    setVehicle,
    setVehiclePrice,
    setDownPayment,
    setTradeValue,
    setTradePayoff,
    setApr,
    setTermMonths,
    setCalculatedPayment,
    setSavedQuoteId,
    reset,
  } = useQuickQuoteStore();

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [showVehicleDialog, setShowVehicleDialog] = useState(false);
  const [showTextDialog, setShowTextDialog] = useState(false);
  const [vehicleSearch, setVehicleSearch] = useState("");

  const { data: vehicles } = useQuery<Vehicle[]>({
    queryKey: ["/api/inventory/search"],
    enabled: showVehicleDialog,
  });

  const filteredVehicles = vehicles?.filter((v) => {
    const search = vehicleSearch.toLowerCase();
    return (
      v.make.toLowerCase().includes(search) ||
      v.model.toLowerCase().includes(search) ||
      v.year.toString().includes(search) ||
      v.vin.toLowerCase().includes(search)
    );
  });

  // Calculate payment whenever inputs change
  useEffect(() => {
    if (!vehiclePrice || vehiclePrice <= 0) {
      setCalculatedPayment(0, 0);
      return;
    }

    const price = new Decimal(vehiclePrice);
    const down = new Decimal(downPayment || 0);
    const tradeEquity = new Decimal(tradeValue || 0).minus(new Decimal(tradePayoff || 0));
    const financed = price.minus(down).minus(tradeEquity);

    if (financed.lte(0)) {
      setCalculatedPayment(0, 0);
      return;
    }

    const payment = calculateMonthlyPayment(financed.toNumber(), apr / 100, termMonths);
    setCalculatedPayment(payment, financed.toNumber());
  }, [vehiclePrice, downPayment, tradeValue, tradePayoff, apr, termMonths, setCalculatedPayment]);

  // Auto-save or update quote (when we have a vehicle price, even if payment is 0)
  useEffect(() => {
    async function saveOrUpdateQuote() {
      if (!vehiclePrice || vehiclePrice <= 0) return;

      const quotePayload = {
        vehicle: vehicle ? {
          year: vehicle.year,
          make: vehicle.make,
          model: vehicle.model,
          price: vehiclePrice,
        } : null,
        vehiclePrice,
        downPayment,
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
          const response = await apiRequest('POST', '/api/quick-quotes', {
            vehicleId: vehicle?.id || null,
            quotePayload,
            status: 'draft',
          });
          const data = await response.json();
          setSavedQuoteId(data.id);
        } else {
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
  }, [vehiclePrice, downPayment, tradeValue, tradePayoff, apr, termMonths, amountFinanced, vehicle, savedQuoteId, setSavedQuoteId]);

  const handleSelectVehicle = (v: Vehicle) => {
    setVehicle(v);
    setVehiclePrice(parseFloat(v.price));
    setShowVehicleDialog(false);
  };

  const handleStockNumberSelect = (v: Vehicle) => {
    setVehicle(v);
    setVehiclePrice(parseFloat(v.price));
  };

  const handleClearVehicle = () => {
    setVehicle(null);
    setVehiclePrice(0);
  };

  const handleConvert = async () => {
    if (!savedQuoteId) {
      toast({
        title: "Error",
        description: "Please complete the quote first",
        variant: "destructive",
      });
      return;
    }

    setIsConverting(true);
    try {
      const response = await apiRequest('POST', `/api/quick-quotes/${savedQuoteId}/convert`, {});
      const data = await response.json();
      
      reset();
      setLocation(`/deals/${data.dealId}`);
      
      toast({
        title: "Success",
        description: "Quote converted to full desk",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to convert quote",
        variant: "destructive",
      });
    } finally {
      setIsConverting(false);
    }
  };

  const handleNewQuote = () => {
    reset();
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setLocation("/")}
          data-testid="button-back"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-semibold">Quick Quote</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleNewQuote}
          data-testid="button-new-quote"
        >
          New
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Vehicle (Optional) */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-semibold">Vehicle (Optional)</h2>
              <div className="flex gap-2">
                {vehicle && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearVehicle}
                    data-testid="button-clear-vehicle"
                  >
                    Clear
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVehicleDialog(true)}
                  data-testid="button-select-vehicle"
                >
                  <Car className="h-4 w-4 mr-2" />
                  {vehicle ? "Change" : "Browse"}
                </Button>
              </div>
            </div>
            
            {/* Stock Number Quick Add - Primary Entry Method */}
            <StockNumberQuickAdd 
              onVehicleSelect={handleStockNumberSelect}
              onClear={handleClearVehicle}
              selectedVehicle={vehicle}
              placeholder="Type stock# for quick add..."
            />
          </CardContent>
        </Card>

        {/* Vehicle Price */}
        <div className="space-y-2">
          <Label htmlFor="vehicle-price">Vehicle Price</Label>
          <Input
            id="vehicle-price"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={vehiclePrice || ""}
            onChange={(e) => setVehiclePrice(e.target.value ? parseFloat(e.target.value) : null)}
            className="text-2xl font-bold min-h-[56px]"
            data-testid="input-vehicle-price"
          />
        </div>

        {/* Down Payment */}
        <div className="space-y-2">
          <Label htmlFor="down-payment">Down Payment</Label>
          <Input
            id="down-payment"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={downPayment || ""}
            onChange={(e) => setDownPayment(e.target.value ? parseFloat(e.target.value) : null)}
            className="text-2xl font-bold min-h-[56px]"
            data-testid="input-down-payment"
          />
        </div>

        {/* Trade Value */}
        <div className="space-y-2">
          <Label htmlFor="trade-value">Trade Value</Label>
          <Input
            id="trade-value"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={tradeValue || ""}
            onChange={(e) => setTradeValue(e.target.value ? parseFloat(e.target.value) : null)}
            className="text-2xl font-bold min-h-[56px]"
            data-testid="input-trade-value"
          />
        </div>

        {/* Trade Payoff */}
        <div className="space-y-2">
          <Label htmlFor="trade-payoff">Trade Payoff</Label>
          <Input
            id="trade-payoff"
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={tradePayoff || ""}
            onChange={(e) => setTradePayoff(e.target.value ? parseFloat(e.target.value) : null)}
            className="text-2xl font-bold min-h-[56px]"
            data-testid="input-trade-payoff"
          />
        </div>

        {/* Interest Rate */}
        <div className="space-y-2">
          <Label htmlFor="apr">Interest Rate (%)</Label>
          <Input
            id="apr"
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder="0"
            value={apr}
            onChange={(e) => setApr(e.target.value ? parseFloat(e.target.value) : 0)}
            className="text-2xl font-bold min-h-[56px]"
            data-testid="input-apr"
          />
        </div>

        {/* Term */}
        <div className="space-y-2">
          <Label htmlFor="term">Term (Months)</Label>
          <Input
            id="term"
            type="number"
            inputMode="numeric"
            placeholder="60"
            value={termMonths}
            onChange={(e) => setTermMonths(e.target.value ? parseInt(e.target.value) : 60)}
            className="text-2xl font-bold min-h-[56px]"
            data-testid="input-term"
          />
        </div>

        {/* Calculated Payment */}
        {calculatedPayment !== null && calculatedPayment > 0 && (
          <Card className="bg-primary/5 border-primary">
            <CardContent className="p-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">Monthly Payment</p>
              <p className="text-5xl font-bold text-primary" data-testid="text-payment">
                ${calculatedPayment.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {apr.toFixed(1)}% APR for {termMonths} months
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Actions */}
      {calculatedPayment !== null && calculatedPayment > 0 && (
        <div className="p-4 border-t space-y-3 bg-background">
          <Button
            variant="outline"
            size="lg"
            className="w-full min-h-[56px]"
            onClick={() => setShowTextDialog(true)}
            disabled={!savedQuoteId}
            data-testid="button-text-quote"
          >
            <MessageSquare className="h-5 w-5 mr-2" />
            Text Quote
          </Button>
          <Button
            size="lg"
            className="w-full min-h-[56px]"
            onClick={handleConvert}
            disabled={isConverting || !savedQuoteId}
            data-testid="button-take-to-desk"
          >
            <FileText className="h-5 w-5 mr-2" />
            {isConverting ? "Converting..." : "Take to Desk"}
          </Button>
        </div>
      )}

      {/* Auto-save indicator */}
      {isSaving && (
        <div className="fixed bottom-20 right-4 bg-muted px-3 py-2 rounded-md text-sm">
          Saving...
        </div>
      )}

      {/* Vehicle Selection Dialog */}
      <Dialog open={showVehicleDialog} onOpenChange={setShowVehicleDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Select Vehicle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 flex-1 overflow-auto">
            <Input
              type="text"
              placeholder="Search by make, model, year, or VIN..."
              value={vehicleSearch}
              onChange={(e) => setVehicleSearch(e.target.value)}
              data-testid="input-vehicle-dialog-search"
            />
            <div className="space-y-2">
              {filteredVehicles?.map((v) => (
                <Card
                  key={v.id}
                  className="hover-elevate active-elevate-2 cursor-pointer"
                  onClick={() => handleSelectVehicle(v)}
                  data-testid={`card-vehicle-${v.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">
                          {v.year} {v.make} {v.model}
                        </h3>
                        {v.trim && <p className="text-sm text-muted-foreground">{v.trim}</p>}
                      </div>
                      <p className="text-lg font-bold">${v.price.toLocaleString()}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Text Quote Dialog */}
      <TextQuoteDialog
        open={showTextDialog}
        onOpenChange={setShowTextDialog}
        onSendQuote={async (name: string, phone: string) => {
          if (!savedQuoteId) return;
          
          try {
            await apiRequest('POST', `/api/quick-quotes/${savedQuoteId}/text`, {
              name,
              phone,
            });
            
            toast({
              title: "Success",
              description: "Quote sent successfully",
            });
          } catch (error: any) {
            toast({
              title: "Error",
              description: error.message || "Failed to send quote",
              variant: "destructive",
            });
            throw error;
          }
        }}
      />
    </div>
  );
}
