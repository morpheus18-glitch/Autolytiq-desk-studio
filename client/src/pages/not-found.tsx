import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/core/page-header";
import { PageContent } from "@/components/core/page-content";
import { premiumCardClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

export default function NotFound() {
  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title="404 - Page Not Found"
        subtitle="The page you're looking for doesn't exist"
        icon={<AlertCircle />}
      />

      <PageContent className="flex items-center justify-center">
        <Card className={cn(premiumCardClasses, "w-full max-w-md")}>
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Page Not Found</h2>
            <p className="text-sm text-muted-foreground">
              Did you forget to add the page to the router?
            </p>
          </CardContent>
        </Card>
      </PageContent>
    </div>
  );
}
