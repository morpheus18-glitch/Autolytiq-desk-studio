import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DealsList from "@/pages/deals-list";
import DealWorksheet from "@/pages/deal-worksheet";
import NewDeal from "@/pages/new-deal";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={() => <Redirect to="/deals" />} />
      <Route path="/deals" component={DealsList} />
      <Route path="/deals/new" component={NewDeal} />
      <Route path="/deals/:id" component={DealWorksheet} />
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
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
