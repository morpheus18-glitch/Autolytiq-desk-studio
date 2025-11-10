import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AIChatCompanion } from "@/components/ai-chat-companion";
import DealsList from "@/pages/deals-list";
import DealWorksheetV2 from "@/pages/deal-worksheet-v2";
import NewDeal from "@/pages/new-deal";
import Inventory from "@/pages/inventory";
import VINDecoder from "@/pages/vin-decoder";
import Analytics from "@/pages/analytics";
import CreditCenter from "@/pages/credit-center";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/inventory" />} />
      <Route path="/inventory" component={Inventory} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/vin-decoder" component={VINDecoder} />
      <Route path="/credit-center" component={CreditCenter} />
      <Route path="/deals" component={DealsList} />
      <Route path="/deals/new" component={NewDeal} />
      <Route path="/deals/:id" component={DealWorksheetV2} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
        <AIChatCompanion />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
