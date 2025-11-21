import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Building2, Shield } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PageLayout } from "@/components/page-layout";
import { PageHero } from "@/components/page-hero";
import { Badge } from "@/components/ui/badge";
import {
  containerPadding,
  layoutSpacing,
  premiumCardClasses,
  gridLayouts,
  formSpacing,
  primaryButtonClasses
} from "@/lib/design-tokens";
import { cn } from "@/lib/utils";

const dealershipSettingsSchema = z.object({
  name: z.string().min(1, "Dealership name is required"),
  phone: z.string().optional(),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  logoUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  primaryColor: z.string().optional(),
  defaultSalesTaxRate: z.string().optional(),
  defaultDocFee: z.string().optional(),
});

type DealershipSettingsData = z.infer<typeof dealershipSettingsSchema>;

export default function DealershipSettings() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Only admins can access this page
  if (user && user.role !== "admin") {
    return <Redirect to="/" />;
  }

  // Fetch dealership settings
  const { data: settings, isLoading } = useQuery<DealershipSettingsData>({
    queryKey: ["/api/dealership/settings"],
    enabled: !!user && user.role === "admin",
  });

  const form = useForm<DealershipSettingsData>({
    resolver: zodResolver(dealershipSettingsSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      city: "",
      state: "",
      zip: "",
      logoUrl: "",
      primaryColor: "",
      defaultSalesTaxRate: "",
      defaultDocFee: "",
    },
  });

  // Reset form when settings load
  useEffect(() => {
    if (settings) {
      form.reset({
        name: settings.name || "",
        phone: settings.phone || "",
        email: settings.email || "",
        address: settings.address || "",
        city: settings.city || "",
        state: settings.state || "",
        zip: settings.zip || "",
        logoUrl: settings.logoUrl || "",
        primaryColor: settings.primaryColor || "",
        defaultSalesTaxRate: settings.defaultSalesTaxRate || "",
        defaultDocFee: settings.defaultDocFee || "",
      });
    }
  }, [settings, form]);

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: DealershipSettingsData) => {
      const res = await apiRequest("PUT", "/api/dealership/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dealership/settings"] });
      toast({
        title: "Settings updated",
        description: "Dealership settings have been saved",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Update failed",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: DealershipSettingsData) => {
    updateMutation.mutate(data);
  };

  if (!user) return null;

  return (
    <PageLayout className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <PageHero
        icon={Building2}
        title="Dealership Settings"
        description="Configure dealership information and defaults"
        actions={
          <Badge variant="outline" className="flex items-center gap-2 px-3 py-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Administrator Only</span>
          </Badge>
        }
      />

      <div className={cn(containerPadding, layoutSpacing.section, "max-w-4xl", formSpacing.section)}>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className={formSpacing.section}>
              {/* Contact Information */}
              <Card className={premiumCardClasses}>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                  <CardDescription>Business contact details</CardDescription>
                </CardHeader>
                <CardContent className={formSpacing.fields}>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Dealership Name *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="ABC Motors"
                            data-testid="input-dealership-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className={gridLayouts.twoCol}>
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="(555) 123-4567"
                              data-testid="input-phone"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              placeholder="info@dealership.com"
                              data-testid="input-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Street Address</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="123 Main St"
                            data-testid="input-address"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="Springfield"
                              data-testid="input-city"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="IL"
                              maxLength={2}
                              data-testid="input-state"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="zip"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ZIP Code</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="62701"
                              data-testid="input-zip"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Branding */}
              <Card className={premiumCardClasses}>
                <CardHeader>
                  <CardTitle>Branding</CardTitle>
                  <CardDescription>Visual identity and colors</CardDescription>
                </CardHeader>
                <CardContent className={formSpacing.fields}>
                  <FormField
                    control={form.control}
                    name="logoUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="https://example.com/logo.png"
                            data-testid="input-logo-url"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="primaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Color</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="#0066CC"
                            data-testid="input-primary-color"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Financial Defaults */}
              <Card className={premiumCardClasses}>
                <CardHeader>
                  <CardTitle>Financial Defaults</CardTitle>
                  <CardDescription>Default values for new deals</CardDescription>
                </CardHeader>
                <CardContent className={formSpacing.fields}>
                  <div className={gridLayouts.twoCol}>
                    <FormField
                      control={form.control}
                      name="defaultSalesTaxRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Sales Tax Rate (%)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              placeholder="7.25"
                              data-testid="input-tax-rate"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="defaultDocFee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Doc Fee ($)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="number"
                              step="0.01"
                              placeholder="499.00"
                              data-testid="input-doc-fee"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Submit Button */}
              <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className={primaryButtonClasses}
                  data-testid="button-save-settings"
                >
                  {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Save Settings
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </PageLayout>
  );
}
