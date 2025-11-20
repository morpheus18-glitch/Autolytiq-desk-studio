import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Shield, Settings as SettingsIcon, Bell, Eye, QrCode } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageLayout } from "@/components/page-layout";

type UserPreferences = {
  theme?: string;
  emailNotifications?: boolean;
  dealNotifications?: boolean;
  defaultDealView?: string;
};

type MfaSetupResponse = {
  secret: string;
  qrCode: string;
};

export default function AccountSettings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [mfaToken, setMfaToken] = useState("");

  // Fetch user preferences
  const { data: preferences, isLoading: loadingPrefs } = useQuery<UserPreferences>({
    queryKey: ["/api/user/preferences"],
    enabled: !!user,
  });

  // Update preferences mutation
  const updatePrefsMutation = useMutation({
    mutationFn: async (prefs: Partial<UserPreferences>) => {
      const res = await apiRequest("PUT", "/api/user/preferences", prefs);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      toast({
        title: "Preferences updated",
        description: "Your preferences have been saved",
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

  // Setup 2FA mutation
  const setup2faMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/2fa/setup", {});
      return res.json() as Promise<MfaSetupResponse>;
    },
    onSuccess: () => {
      setShowMfaSetup(true);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Setup failed",
        description: error.message,
      });
    },
  });

  // Verify 2FA mutation
  const verify2faMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", "/api/auth/2fa/verify", { token });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      setShowMfaSetup(false);
      setMfaToken("");
      toast({
        title: "2FA enabled",
        description: "Two-factor authentication has been enabled for your account",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: error.message,
      });
    },
  });

  // Disable 2FA mutation
  const disable2faMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/2fa/disable", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "2FA disabled",
        description: "Two-factor authentication has been disabled",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Disable failed",
        description: error.message,
      });
    },
  });

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    updatePrefsMutation.mutate({ [key]: value });
  };

  if (!user) return null;

  return (
    <PageLayout className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <div className="sticky top-0 z-40 backdrop-blur-lg bg-background/90 border-b shadow-sm">
        <div className="container mx-auto px-4 md:px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-lg shadow-primary/25">
              <SettingsIcon className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                Account Settings
              </h1>
              <p className="text-sm text-muted-foreground font-medium mt-0.5">
                Manage your profile and preferences
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 md:px-6 py-6 space-y-6">

        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Profile Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-xs md:text-sm font-medium">Full Name</Label>
                <p className="text-base font-semibold">{user.fullName}</p>
              </div>
              <div>
                <Label className="text-xs md:text-sm font-medium">Username</Label>
                <p className="text-base font-semibold">{user.username}</p>
              </div>
              <div>
                <Label className="text-xs md:text-sm font-medium">Email</Label>
                <p className="text-base font-semibold">{user.email}</p>
              </div>
              <div>
                <Label className="text-xs md:text-sm font-medium">Role</Label>
                <p className="text-base font-semibold capitalize">{user.role.replace('_', ' ')}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Preferences
            </CardTitle>
            <CardDescription>Customize your experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingPrefs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm md:text-base font-medium">Email Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive email updates about deals</p>
                  </div>
                  <Switch
                    data-testid="switch-email-notifications"
                    checked={preferences?.emailNotifications ?? true}
                    onCheckedChange={(checked) => handlePreferenceChange("emailNotifications", checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm md:text-base font-medium">Deal Notifications</Label>
                    <p className="text-xs text-muted-foreground">Get notified when deals are updated</p>
                  </div>
                  <Switch
                    data-testid="switch-deal-notifications"
                    checked={preferences?.dealNotifications ?? true}
                    onCheckedChange={(checked) => handlePreferenceChange("dealNotifications", checked)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Security
            </CardTitle>
            <CardDescription>Manage your account security</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm md:text-base font-medium">Two-Factor Authentication</Label>
                <p className="text-xs text-muted-foreground">
                  {user.mfaEnabled ? "2FA is enabled for your account" : "Add an extra layer of security"}
                </p>
              </div>
              {user.mfaEnabled ? (
                <Button
                  data-testid="button-disable-2fa"
                  variant="destructive"
                  size="sm"
                  onClick={() => disable2faMutation.mutate()}
                  disabled={disable2faMutation.isPending}
                >
                  {disable2faMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Disable
                </Button>
              ) : (
                <Button
                  data-testid="button-enable-2fa"
                  variant="default"
                  size="sm"
                  onClick={() => setup2faMutation.mutate()}
                  disabled={setup2faMutation.isPending}
                >
                  {setup2faMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Enable 2FA
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2FA Setup Dialog */}
        <Dialog open={showMfaSetup} onOpenChange={setShowMfaSetup}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Set Up Two-Factor Authentication
              </DialogTitle>
              <DialogDescription>
                Scan the QR code with your authenticator app
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {setup2faMutation.data?.qrCode && (
                <div className="flex justify-center">
                  <img
                    src={setup2faMutation.data.qrCode}
                    alt="2FA QR Code"
                    className="w-48 h-48"
                    data-testid="img-qr-code"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="mfa-token">Verification Code</Label>
                <Input
                  id="mfa-token"
                  data-testid="input-mfa-token"
                  placeholder="Enter 6-digit code"
                  value={mfaToken}
                  onChange={(e) => setMfaToken(e.target.value)}
                  maxLength={6}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowMfaSetup(false);
                  setMfaToken("");
                }}
                data-testid="button-cancel-2fa"
              >
                Cancel
              </Button>
              <Button
                data-testid="button-verify-2fa"
                onClick={() => verify2faMutation.mutate(mfaToken)}
                disabled={verify2faMutation.isPending || mfaToken.length !== 6}
              >
                {verify2faMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Verify
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
}
