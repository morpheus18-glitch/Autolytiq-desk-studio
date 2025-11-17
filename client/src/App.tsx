import { Switch, Route, Redirect, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AIChatCompanion } from "@/components/ai-chat-companion";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { ProtectedRoute } from "@/components/protected-route";
import Dashboard from "@/pages/dashboard";
import DealsList from "@/pages/deals-list";
import DealWorksheetV2 from "@/pages/deal-worksheet-v2";
import DealWorksheetTabsPage from "@/pages/deal-worksheet-tabs";
import QuickQuote from "@/pages/quick-quote";
import Inventory from "@/pages/inventory";
import InventoryNew from "@/pages/inventory-new";
import Customers from "@/pages/customers";
import Showroom from "@/pages/showroom";
import VINDecoder from "@/pages/vin-decoder";
import Analytics from "@/pages/analytics";
import CreditCenter from "@/pages/credit-center";
import Login from "@/pages/login";
import Register from "@/pages/register";
import AccountSettings from "@/pages/account-settings";
import DealershipSettings from "@/pages/dealership-settings";
import UserManagement from "@/pages/user-management";
import PasswordResetRequest from "@/pages/password-reset-request";
import PasswordResetConfirm from "@/pages/password-reset-confirm";
import Email from "@/pages/email";
import EmailSettings from "@/pages/email-settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Public routes - no authentication required */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/auth/password-reset" component={PasswordResetRequest} />
      <Route path="/auth/password-reset/:token" component={PasswordResetConfirm} />

      {/* Protected routes - require authentication */}
      <Route path="/">
        <ProtectedRoute>
          <Dashboard />
        </ProtectedRoute>
      </Route>
      <Route path="/settings/account">
        <ProtectedRoute>
          <AccountSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/settings/dealership">
        <ProtectedRoute>
          <DealershipSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/settings/users">
        <ProtectedRoute>
          <UserManagement />
        </ProtectedRoute>
      </Route>
      <Route path="/deals">
        <ProtectedRoute>
          <DealsList />
        </ProtectedRoute>
      </Route>
      <Route path="/quick-quote">
        <Redirect to="/deals/new?mode=quick" />
      </Route>
      <Route path="/deals/new">
        <ProtectedRoute>
          <DealWorksheetV2 />
        </ProtectedRoute>
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
      <Route path="/showroom">
        <ProtectedRoute>
          <Showroom />
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
      <Route path="/customers/:id/credit">
        <ProtectedRoute>
          <CreditCenter />
        </ProtectedRoute>
      </Route>
      <Route path="/email/settings">
        <ProtectedRoute>
          <EmailSettings />
        </ProtectedRoute>
      </Route>
      <Route path="/email">
        <ProtectedRoute>
          <Email />
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

function AppLayout() {
  const [location] = useLocation();
  
  // Check if on public routes (login, register, password reset)
  const isPublicRoute = location.startsWith('/login') || 
                        location.startsWith('/register') || 
                        location.startsWith('/auth/password-reset');
  
  // Show simple layout for public routes
  if (isPublicRoute) {
    return (
      <>
        <Router />
        <AIChatCompanion />
      </>
    );
  }
  
  // Show full app layout with sidebar for authenticated routes
  const sidebarStyle = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "4rem",
  };
  
  return (
    <SidebarProvider defaultOpen={true} style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden md:flex">
          <AppSidebar />
        </div>
        
        {/* Main Content Area */}
        <SidebarInset className="flex flex-col flex-1">
          {/* Desktop Header with Sidebar Toggle - Hidden on mobile */}
          <header className="hidden md:flex items-center gap-2 border-b px-4 py-3 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger data-testid="button-sidebar-toggle" className="hover-elevate active-elevate-2" />
            <div className="flex-1" />
          </header>
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </SidebarInset>
        
        {/* Mobile Bottom Navigation - Shown only on mobile */}
        <MobileBottomNav />
        
        {/* AI Chat Companion - Available everywhere */}
        <AIChatCompanion />
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <AppLayout />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
