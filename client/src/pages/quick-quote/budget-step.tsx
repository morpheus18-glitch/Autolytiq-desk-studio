import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MoneyInput } from "@/components/mobile/money-input";
import { SuggestedAmounts } from "@/components/mobile/suggested-amounts";
import { useQuickQuoteStore } from "@/stores/quick-quote-store";

export function BudgetStep() {
  const { vehicle, targetPayment, setTargetPayment, nextStep, previousStep } = useQuickQuoteStore();

  const handleNext = () => {
    if (targetPayment && targetPayment > 0) {
      nextStep();
    }
  };

  const commonBudgets = [300, 400, 500, 600];

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
        <h1 className="text-xl font-semibold">Budget</h1>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-8">
        {/* Vehicle Summary */}
        {vehicle && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </p>
            <p className="text-lg font-semibold">
              ${vehicle.price.toLocaleString()}
            </p>
          </div>
        )}

        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-center">
            What payment are they looking for?
          </h2>

          {/* Money Input */}
          <MoneyInput
            label="Target Monthly Payment"
            value={targetPayment}
            onChange={setTargetPayment}
            placeholder="400"
            testId="input-target-payment"
            className="max-w-sm mx-auto"
          />

          {/* Suggested Amounts */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground text-center">
              Common budgets:
            </p>
            <SuggestedAmounts
              amounts={commonBudgets}
              onSelect={setTargetPayment}
              selectedAmount={targetPayment}
              formatLabel={(amount) => `$${amount}`}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <Button
          size="lg"
          className="w-full min-h-[56px] text-lg"
          onClick={handleNext}
          disabled={!targetPayment || targetPayment <= 0}
          data-testid="button-next"
        >
          Next
        </Button>
      </div>
    </div>
  );
}