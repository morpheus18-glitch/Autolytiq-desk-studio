/**
 * Login Page - Obsidian Velocity Design
 *
 * Premium authentication page with sophisticated form styling
 * and smooth micro-interactions.
 */

import { useState, type JSX } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { AuthLayout } from '@/layouts';
import { useAuth } from '@/contexts/AuthContext';
import { ApiRequestError } from '@/lib/api';

/**
 * Login form schema
 */
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage(): JSX.Element {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);

    try {
      await login(data);
    } catch (err) {
      if (ApiRequestError.isApiRequestError(err)) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your account to continue">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {/* Error message */}
        {error && (
          <div className="animate-velocity-up rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-destructive" />
              {error}
            </div>
          </div>
        )}

        {/* Email field */}
        <div
          className="space-y-2 opacity-0 animate-velocity-up"
          style={{ animationDelay: '250ms' }}
        >
          <label htmlFor="email" className="block text-sm font-medium text-foreground">
            Email address
          </label>
          <input
            {...register('email')}
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            className="input-obsidian"
          />
          {errors.email && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <span className="h-1 w-1 rounded-full bg-destructive" />
              {errors.email.message}
            </p>
          )}
        </div>

        {/* Password field */}
        <div
          className="space-y-2 opacity-0 animate-velocity-up"
          style={{ animationDelay: '300ms' }}
        >
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
            </label>
            <a href="#" className="link-obsidian text-xs font-medium">
              Forgot password?
            </a>
          </div>
          <div className="relative">
            <input
              {...register('password')}
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              className="input-obsidian pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <span className="h-1 w-1 rounded-full bg-destructive" />
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Remember me */}
        <div
          className="flex items-center gap-3 opacity-0 animate-velocity-up"
          style={{ animationDelay: '350ms' }}
        >
          <input type="checkbox" id="remember" className="checkbox-obsidian" />
          <label htmlFor="remember" className="text-sm text-muted-foreground">
            Remember me for 30 days
          </label>
        </div>

        {/* Submit button */}
        <div className="opacity-0 animate-velocity-up" style={{ animationDelay: '400ms' }}>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-obsidian-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative opacity-0 animate-velocity-up" style={{ animationDelay: '450ms' }}>
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-3 text-muted-foreground">Quick access</span>
          </div>
        </div>

        {/* Demo credentials hint */}
        <div className="opacity-0 animate-velocity-up" style={{ animationDelay: '500ms' }}>
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-5">
            {/* Decorative element */}
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />

            <div className="relative">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <span className="font-display font-semibold text-foreground">Demo Account</span>
              </div>

              <div className="space-y-2 rounded-xl bg-background/50 p-3 font-mono text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Email:</span>
                  <span className="text-foreground">demo@autolytiq.com</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Password:</span>
                  <span className="text-foreground">demo123</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>
    </AuthLayout>
  );
}
