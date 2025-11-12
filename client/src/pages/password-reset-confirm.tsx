import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Link, useRoute, Redirect } from "wouter";
import { Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { useState } from "react";

const resetConfirmSchema = z.object({
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetConfirmData = z.infer<typeof resetConfirmSchema>;

export default function PasswordResetConfirm() {
  const { toast } = useToast();
  const [success, setSuccess] = useState(false);
  const [, params] = useRoute("/auth/password-reset/:token");
  const token = params?.token;

  const form = useForm<ResetConfirmData>({
    resolver: zodResolver(resetConfirmSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const resetMutation = useMutation({
    mutationFn: async (data: { password: string }) => {
      if (!token) throw new Error("Invalid reset token");
      const res = await apiRequest("POST", "/api/auth/reset-password", {
        token,
        newPassword: data.password,
      });
      return res.json();
    },
    onSuccess: () => {
      setSuccess(true);
      toast({
        title: "Password reset successful",
        description: "You can now log in with your new password",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Reset failed",
        description: error.message || "Invalid or expired reset token",
      });
    },
  });

  if (!token) {
    return <Redirect to="/auth/password-reset" />;
  }

  const onSubmit = (data: ResetConfirmData) => {
    resetMutation.mutate({ password: data.password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl md:text-2xl">
            <KeyRound className="w-5 h-5" />
            Set New Password
          </CardTitle>
          <CardDescription>
            Choose a strong password for your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-3 p-6 rounded-lg bg-muted">
                <CheckCircle2 className="w-12 h-12 text-green-600" />
                <p className="text-sm text-center font-medium">
                  Your password has been reset successfully
                </p>
              </div>
              <Button
                className="w-full"
                asChild
                data-testid="button-go-to-login"
              >
                <Link href="/login">
                  Go to Login
                </Link>
              </Button>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Enter new password"
                          data-testid="input-password"
                          disabled={resetMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Confirm new password"
                          data-testid="input-confirm-password"
                          disabled={resetMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
                  disabled={resetMutation.isPending}
                  data-testid="button-reset-password"
                >
                  {resetMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Reset Password
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
