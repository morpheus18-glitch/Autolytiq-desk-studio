import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AIChatCompanion } from "@/components/ai-chat-companion";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ProtectedRoute } from "@/components/protected-route";
import Dashboard from "@/pages/dashboard";
import DealsList from "@/pages/deals-list";
import DealWorksheetV2 from "@/pages/deal-worksheet-v2";
import DealWorksheetTabsPage from "@/pages/deal-worksheet-tabs";
import Inventory from "@/pages/inventory";
import InventoryNew from "@/pages/inventory-new";
import Customers from "@/pages/customers";
import VINDecoder from "@/pages/vin-decoder";
import Analytics from "@/pages/analytics";
import CreditCenter from "@/pages/credit-center";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Public routes - no authentication required */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />

      {/* Protected routes - require authentication */}
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/deals">
        <ProtectedRoute>
          <DealsList />
        </ProtectedRoute>
      </Route>
      <Route path="/quick-quote">
        <Redirect to="/" />
      </Route>
      <Route path="/deals/new">
        <Redirect to="/" />
      </Route>
      <Route path="/inventory">
        <ProtectedRoute>
          <Inventory />
        </ProtectedRoute>
      </Route>
      <Route path="/inventory/new">
        <ProtectedRoute>
          <InventoryNew />
        </ProtectedRoute>
      </Route>
      <Route path="/customers">
        <ProtectedRoute>
          <Customers />
        </ProtectedRoute>
      </Route>
      <Route path="/analytics">
        <ProtectedRoute>
          <Analytics />
        </ProtectedRoute>
      </Route>
      <Route path="/vin-decoder">
        <ProtectedRoute>
          <VINDecoder />
        </ProtectedRoute>
      </Route>
      <Route path="/credit-center">
        <ProtectedRoute>
          <CreditCenter />
        </ProtectedRoute>
      </Route>
      <Route path="/deals/:id/tabs">
        <ProtectedRoute>
          <DealWorksheetTabsPage />
        </ProtectedRoute>
      </Route>
      <Route path="/deals/:id">
        <ProtectedRoute>
          <DealWorksheetV2 />
        </ProtectedRoute>
      </Route>
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
        <MobileBottomNav />
        <AIChatCompanion />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
