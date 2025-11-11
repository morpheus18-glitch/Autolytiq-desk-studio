import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/mobile/money-input";
import { SuggestedAmounts } from "@/components/mobile/suggested-amounts";
import { useQuickQuoteStore } from "@/stores/quick-quote-store";

export function DownPaymentStep() {
  const { targetPayment, downPayment, setDownPayment, nextStep, previousStep } = useQuickQuoteStore();

  const handleNext = () => {
    // Down payment can be 0 or null (customer decides)
    nextStep();
  };

  const commonAmounts = [0, 1000, 2500, 5000];

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
        <h1 className="text-xl font-semibold">Down Payment</h1>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-8">
        {/* Summary */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Target: ${targetPayment?.toLocaleString()}/mo
          </p>
        </div>

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-center">
            How much down?
          </h2>

          {/* Money Input */}
          <MoneyInput
            label="Down Payment"
            value={downPayment}
            onChange={setDownPayment}
            placeholder="0"
            testId="input-down-payment"
            className="max-w-sm mx-auto"
          />

          {/* Suggested Amounts */}
          <SuggestedAmounts
            amounts={commonAmounts}
            onSelect={setDownPayment}
            selectedAmount={downPayment}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button
          size="lg"
          className="w-full min-h-[56px] text-lg"
          onClick={handleNext}
          data-testid="button-next"
        >
          Next
        </Button>
      </div>
    </div>
  );
}