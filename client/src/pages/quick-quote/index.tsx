import { useQuickQuoteStore } from "@/stores/quick-quote-store";
import { VehicleStep } from "./vehicle-step";
import { BudgetStep } from "./budget-step";
import { DownPaymentStep } from "./down-payment-step";
import { TradeQuestionStep } from "./trade-question-step";
import { TradeDetailsStep } from "./trade-details-step";
import { ResultStep } from "./result-step";

export default function QuickQuote() {
  const currentStep = useQuickQuoteStore((state) => state.currentStep);

  return (
    <div className="h-screen flex flex-col bg-background">
      {currentStep === "vehicle" && <VehicleStep />}
      {currentStep === "budget" && <BudgetStep />}
      {currentStep === "down-payment" && <DownPaymentStep />}
      {currentStep === "trade-question" && <TradeQuestionStep />}
      {currentStep === "trade-details" && <TradeDetailsStep />}
      {currentStep === "result" && <ResultStep />}
    </div>
  );
}