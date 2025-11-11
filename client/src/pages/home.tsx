import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Calculator, ArrowRight, Clock, DollarSign, FileText } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container max-w-4xl mx-auto px-4 py-8 md:py-16">
        <div className="text-center space-y-4 mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            NextGen Desking
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Mobile-first desking platform built for speed and velocity. 
            Get customers approved and into cars fast.
          </p>
        </div>

        {/* Two Main Entry Points */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          {/* Quick Quote Card */}
          <Card className="hover-elevate active-elevate-2 border-2 transition-all">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Quick Quote</CardTitle>
              </div>
              <CardDescription className="text-base">
                Payment quote in 30-45 seconds. Perfect for lot qualifying.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>30-45 second quotes</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  <span>Vehicle optional - price-based quotes</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Text quote to customer instantly</span>
                </div>
              </div>
              <Link href="/quick-quote">
                <Button 
                  className="w-full" 
                  size="lg"
                  data-testid="button-quick-quote"
                >
                  Start Quick Quote
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Full Desk Card */}
          <Card className="hover-elevate active-elevate-2 border-2 transition-all">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Calculator className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-2xl">Full Desk</CardTitle>
              </div>
              <CardDescription className="text-base">
                Complete deal structuring in 3-5 minutes. F&I products, scenarios, submit to finance.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span>3-5 minute full structure</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  <span>Multiple scenarios & F&I products</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Submit to finance when ready</span>
                </div>
              </div>
              <Link href="/deals/new">
                <Button 
                  className="w-full" 
                  size="lg"
                  variant="secondary"
                  data-testid="button-full-desk"
                >
                  Open Full Desk
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Quick Access Links */}
        <div className="flex flex-wrap gap-3 justify-center">
          <Link href="/deals">
            <Button variant="outline" size="sm" data-testid="link-deals">
              View Deals
            </Button>
          </Link>
          <Link href="/inventory">
            <Button variant="outline" size="sm" data-testid="link-inventory">
              Inventory
            </Button>
          </Link>
          <Link href="/customers">
            <Button variant="outline" size="sm" data-testid="link-customers">
              Customers
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
