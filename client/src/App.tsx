import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AIChatCompanion } from "@/components/ai-chat-companion";
import DealsList from "@/pages/deals-list";
import DealWorksheetV2 from "@/pages/deal-worksheet-v2";
import DealWorksheetTabsPage from "@/pages/deal-worksheet-tabs";
import Inventory from "@/pages/inventory";
import InventoryNew from "@/pages/inventory-new";
import Customers from "@/pages/customers";
import VINDecoder from "@/pages/vin-decoder";
import Analytics from "@/pages/analytics";
import CreditCenter from "@/pages/credit-center";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={DealsList} />
      <Route path="/deals">
        <Redirect to="/" />
      </Route>
      <Route path="/quick-quote">
        <Redirect to="/" />
      </Route>
      <Route path="/deals/new">
        <Redirect to="/" />
      </Route>
      <Route path="/inventory" component={Inventory} />
      <Route path="/inventory/new" component={InventoryNew} />
      <Route path="/customers" component={Customers} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/vin-decoder" component={VINDecoder} />
      <Route path="/credit-center" component={CreditCenter} />
      <Route path="/deals/:id/tabs" component={DealWorksheetTabsPage} />
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
