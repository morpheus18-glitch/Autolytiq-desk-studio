import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/use-auth";
import { loginSchema, type LoginData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { Loader2, Eye, EyeOff, Car } from "lucide-react";

export default function Login() {
  const { login, isLoggingIn, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

  function onSubmit(data: LoginData) {
    login(data);
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-br from-neutral-50 via-blue-50/30 to-neutral-100 dark:from-neutral-950 dark:via-blue-950/20 dark:to-neutral-900">
      <div className="w-full max-w-md">
        {/* Brand Identity */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25 mb-4">
            <Car className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Autolytiq</h1>
          <p className="text-sm text-muted-foreground mt-1">Dealership Intelligence OS</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-bold text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        data-testid="input-username"
                        placeholder="Enter your username"
                        {...field}
                        autoComplete="username"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          data-testid="input-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          {...field}
                          autoComplete="current-password"
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          data-testid="button-toggle-password"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                data-testid="button-login"
                type="submit"
                size="lg"
                className="w-full font-semibold shadow-lg shadow-primary/25 mt-2"
                disabled={isLoggingIn}
              >
                {isLoggingIn && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign in
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="flex flex-col gap-2 w-full">
            <p className="text-sm text-muted-foreground text-center">
              <Link
                href="/auth/password-reset"
                className="text-primary hover:underline"
                data-testid="link-forgot-password"
              >
                Forgot password?
              </Link>
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:underline" data-testid="link-register">
                Sign up
              </Link>
            </p>
          </div>
        </CardFooter>
        </Card>
      </div>
    </div>
  );
}
