import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/mobile/money-input";
import { useQuickQuoteStore } from "@/stores/quick-quote-store";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function TradeDetailsStep() {
  const {
    tradeValue,
    tradePayoff,
    setTradeValue,
    setTradePayoff,
    nextStep,
    previousStep,
  } = useQuickQuoteStore();

  const handleCalculate = () => {
    if (tradeValue && tradeValue > 0) {
      nextStep();
    }
  };

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
        <h1 className="text-xl font-semibold">Trade-In Details</h1>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-8">
        <div className="space-y-6 max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-center">Trade-in value</h2>

          {/* Trade Value */}
          <div className="space-y-4">
            <MoneyInput
              label="What's the trade worth?"
              value={tradeValue}
              onChange={setTradeValue}
              placeholder="8000"
              testId="input-trade-value"
            />
            <p className="text-sm text-muted-foreground text-center">
              Your appraisal or KBB value
            </p>
          </div>

          {/* Trade Payoff */}
          <div className="space-y-4">
            <MoneyInput
              label="What do they owe on it?"
              value={tradePayoff}
              onChange={setTradePayoff}
              placeholder="0"
              testId="input-trade-payoff"
            />
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <strong>Ask the customer.</strong> Never prefill this field. 
                Could be $0 or $20,000.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button
          size="lg"
          className="w-full min-h-[56px] text-lg"
          onClick={handleCalculate}
          disabled={!tradeValue || tradeValue <= 0}
          data-testid="button-calculate"
        >
          Calculate Payment
        </Button>
      </div>
    </div>
  );
}