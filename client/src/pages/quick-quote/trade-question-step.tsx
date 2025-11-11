import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuickQuoteStore } from "@/stores/quick-quote-store";

export function TradeQuestionStep() {
  const { targetPayment, downPayment, setHasTrade, nextStep, previousStep } = useQuickQuoteStore();

  const handleAnswer = (hasTrade: boolean) => {
    setHasTrade(hasTrade);
    nextStep();
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
        <h1 className="text-xl font-semibold">Trade-In</h1>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-8">
        {/* Summary */}
        <div className="text-center space-y-1">
          <p className="text-sm text-muted-foreground">
            Target: ${targetPayment?.toLocaleString()}/mo
          </p>
          <p className="text-sm text-muted-foreground">
            Down: ${downPayment?.toLocaleString() || '0'}
          </p>
        </div>

        <div className="space-y-6 max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-center">
            Do they have a trade?
          </h2>

          <div className="space-y-4">
            <Button
              size="lg"
              variant="outline"
              className="w-full min-h-[72px] text-lg"
              onClick={() => handleAnswer(true)}
              data-testid="button-yes-trade"
            >
              Yes, they have a trade
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="w-full min-h-[72px] text-lg"
              onClick={() => handleAnswer(false)}
              data-testid="button-no-trade"
            >
              No trade
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}