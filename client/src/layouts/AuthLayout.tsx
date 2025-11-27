/**
 * Auth Layout
 *
 * Layout for authentication pages (login, register, etc.)
 * Centered card design with branding.
 */

import { type ReactNode, type JSX } from 'react';
import { ThemeToggle } from '@design-system';
import { AutolytiqLogo } from '@/assets/icons/autolytiq';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps): JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-muted">
      {/* Theme toggle in corner */}
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      {/* Main content */}
      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo and branding */}
          <div className="mb-8 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
              <AutolytiqLogo size={32} className="text-primary-foreground" />
            </div>
            <h1 className="mt-4 text-3xl font-bold text-foreground">Autolytiq</h1>
            <p className="mt-1 text-muted-foreground">Dealership Management Studio</p>
          </div>

          {/* Card */}
          <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
              {subtitle && <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>}
            </div>

            {children}
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Autolytiq. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
