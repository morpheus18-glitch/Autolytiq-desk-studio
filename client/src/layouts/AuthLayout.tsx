/**
 * Auth Layout - Obsidian Velocity Design
 *
 * Premium split-screen authentication layout with animated
 * automotive-inspired visuals and glassmorphism effects.
 */

import { type ReactNode, type JSX } from 'react';
import { ThemeToggle } from '@design-system';
import { AutolytiqLogo } from '@/assets/icons/autolytiq';
import { Zap, Shield, TrendingUp } from 'lucide-react';

interface AuthLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

/**
 * Animated speedometer/gauge component
 */
function AnimatedGauge(): JSX.Element {
  return (
    <div className="relative h-48 w-48">
      {/* Outer ring */}
      <div className="absolute inset-0 rounded-full border-4 border-white/10" />

      {/* Gradient arc */}
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(217 91% 60%)" />
            <stop offset="50%" stopColor="hsl(38 92% 50%)" />
            <stop offset="100%" stopColor="hsl(0 84% 60%)" />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="url(#gaugeGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray="207"
          strokeDashoffset="60"
          className="drop-shadow-[0_0_12px_rgba(59,130,246,0.5)]"
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-4xl font-bold text-white">247</span>
        <span className="text-xs uppercase tracking-wider text-white/60">Deals/Month</span>
      </div>

      {/* Glowing indicator needle */}
      <div
        className="absolute left-1/2 top-1/2 h-16 w-1 origin-bottom -translate-x-1/2 -translate-y-full rounded-full bg-gradient-to-t from-primary to-primary/50"
        style={{
          transform: 'translateX(-50%) translateY(-50%) rotate(45deg)',
          transformOrigin: 'bottom center',
        }}
      >
        <div className="absolute -left-1 -top-1 h-3 w-3 rounded-full bg-primary shadow-[0_0_12px_4px_rgba(59,130,246,0.6)]" />
      </div>
    </div>
  );
}

/**
 * Floating stat card component
 */
interface FloatingStatProps {
  icon: JSX.Element;
  value: string;
  label: string;
  delay: string;
  position: string;
}

function FloatingStat({ icon, value, label, delay, position }: FloatingStatProps): JSX.Element {
  return (
    <div
      className={`absolute ${position} animate-velocity-float opacity-0 animate-velocity-up`}
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-xl">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 text-primary">
          {icon}
        </div>
        <div>
          <div className="font-mono text-lg font-bold text-white">{value}</div>
          <div className="text-xs text-white/60">{label}</div>
        </div>
      </div>
    </div>
  );
}

/**
 * Animated background with aurora effect
 */
function AnimatedBackground(): JSX.Element {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-obsidian-dark" />

      {/* Aurora blobs */}
      <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-primary/20 blur-[120px] animate-aurora" />
      <div
        className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-accent/15 blur-[100px] animate-aurora"
        style={{ animationDelay: '-5s' }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-info/10 blur-[80px] animate-aurora"
        style={{ animationDelay: '-10s' }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Noise overlay */}
      <div className="grain-overlay absolute inset-0" />

      {/* Road lines animation */}
      <div className="velocity-lines opacity-30" />
    </div>
  );
}

/**
 * Left panel with branding and visuals
 */
function BrandingPanel(): JSX.Element {
  return (
    <div className="relative hidden h-full flex-col justify-between overflow-hidden p-12 lg:flex">
      <AnimatedBackground />

      {/* Content */}
      <div className="relative z-10">
        {/* Logo */}
        <div
          className="flex items-center gap-3 opacity-0 animate-velocity-right"
          style={{ animationDelay: '100ms' }}
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-xl">
            <AutolytiqLogo size={24} className="text-white" />
          </div>
          <span className="font-display text-2xl font-bold text-white">Autolytiq</span>
        </div>
      </div>

      {/* Center visual */}
      <div className="relative z-10 flex flex-1 items-center justify-center">
        <div className="relative">
          {/* Main gauge */}
          <div className="opacity-0 animate-velocity-up" style={{ animationDelay: '300ms' }}>
            <AnimatedGauge />
          </div>

          {/* Floating stats */}
          <FloatingStat
            icon={<TrendingUp className="h-5 w-5" />}
            value="+34%"
            label="Revenue Growth"
            delay="500ms"
            position="-left-32 top-0"
          />
          <FloatingStat
            icon={<Zap className="h-5 w-5" />}
            value="2.4s"
            label="Avg. Response"
            delay="600ms"
            position="-right-36 top-8"
          />
          <FloatingStat
            icon={<Shield className="h-5 w-5" />}
            value="99.9%"
            label="Uptime"
            delay="700ms"
            position="-left-28 bottom-4"
          />
        </div>
      </div>

      {/* Bottom quote */}
      <div
        className="relative z-10 max-w-md opacity-0 animate-velocity-up"
        style={{ animationDelay: '800ms' }}
      >
        <blockquote className="border-l-2 border-primary/50 pl-4">
          <p className="text-lg italic text-white/80">
            "Autolytiq transformed how we operate. Our sales team closes 40% more deals."
          </p>
          <footer className="mt-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent" />
            <div>
              <div className="font-medium text-white">Michael Chen</div>
              <div className="text-sm text-white/60">GM, Premier Auto Group</div>
            </div>
          </footer>
        </blockquote>
      </div>
    </div>
  );
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps): JSX.Element {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - Branding (hidden on mobile) */}
      <div className="hidden w-1/2 lg:block">
        <BrandingPanel />
      </div>

      {/* Right panel - Form */}
      <div className="relative flex w-full flex-col bg-background lg:w-1/2">
        {/* Theme toggle */}
        <div className="absolute right-6 top-6 z-10">
          <ThemeToggle />
        </div>

        {/* Mobile logo (visible only on mobile) */}
        <div className="flex items-center justify-center gap-3 pt-12 lg:hidden opacity-0 animate-velocity-up">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/25">
            <AutolytiqLogo size={28} className="text-primary-foreground" />
          </div>
        </div>
        <div
          className="text-center lg:hidden opacity-0 animate-velocity-up"
          style={{ animationDelay: '100ms' }}
        >
          <h1 className="mt-4 font-display text-3xl font-bold text-foreground">Autolytiq</h1>
          <p className="text-muted-foreground">Dealership Management Studio</p>
        </div>

        {/* Form container */}
        <div className="flex flex-1 items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            {/* Card */}
            <div
              className="card-obsidian opacity-0 animate-velocity-up"
              style={{ animationDelay: '200ms' }}
            >
              {/* Header */}
              <div className="mb-8 text-center">
                <h2 className="font-display text-3xl font-bold tracking-tight text-foreground">
                  {title}
                </h2>
                {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
              </div>

              {children}
            </div>

            {/* Footer */}
            <p
              className="mt-8 text-center text-sm text-muted-foreground opacity-0 animate-velocity-up"
              style={{ animationDelay: '400ms' }}
            >
              &copy; {new Date().getFullYear()} Autolytiq. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
