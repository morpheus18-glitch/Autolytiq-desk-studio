/**
 * Home Page - Obsidian Velocity Design
 *
 * Premium marketing landing page with bold typography,
 * dramatic animations, and automotive-inspired aesthetics.
 */

import { type JSX } from 'react';
import { Link } from 'wouter';
import { ThemeToggle } from '@design-system';
import {
  AutolytiqLogo,
  VehicleIcon,
  DealIcon,
  CustomerIcon,
  InventoryIcon,
  FinanceIcon,
} from '@/assets/icons/autolytiq';
import {
  ArrowRight,
  Play,
  ChevronRight,
  Sparkles,
  Zap,
  Shield,
  TrendingUp,
  Star,
} from 'lucide-react';

/**
 * Animated background component
 */
function AnimatedHeroBackground(): JSX.Element {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Gradient mesh */}
      <div className="absolute inset-0 bg-obsidian-gradient" />

      {/* Aurora effects */}
      <div className="absolute -left-1/4 top-0 h-[800px] w-[800px] rounded-full bg-primary/10 blur-[150px] animate-aurora" />
      <div
        className="absolute -right-1/4 bottom-0 h-[600px] w-[600px] rounded-full bg-accent/8 blur-[120px] animate-aurora"
        style={{ animationDelay: '-7s' }}
      />
      <div
        className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-info/5 blur-[100px] animate-aurora"
        style={{ animationDelay: '-14s' }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground) / 0.1) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground) / 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '80px 80px',
        }}
      />

      {/* Noise texture */}
      <div className="grain-overlay absolute inset-0" />
    </div>
  );
}

/**
 * Feature card component with hover effects
 */
interface FeatureCardProps {
  icon: JSX.Element;
  title: string;
  description: string;
  delay: string;
}

function FeatureCard({ icon, title, description, delay }: FeatureCardProps): JSX.Element {
  return (
    <div
      className="group relative overflow-hidden rounded-3xl border border-border/50 bg-card/50 p-8 backdrop-blur-sm transition-all duration-500 hover:border-primary/30 hover:bg-card/80 hover:shadow-premium-lg opacity-0 animate-velocity-up"
      style={{ animationDelay: delay }}
    >
      {/* Hover glow effect */}
      <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/0 blur-3xl transition-all duration-500 group-hover:bg-primary/10" />

      {/* Icon */}
      <div className="relative mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 text-primary ring-1 ring-primary/20 transition-transform duration-300 group-hover:scale-110">
        {icon}
      </div>

      {/* Content */}
      <h3 className="mb-3 font-display text-xl font-bold text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>

      {/* Learn more link */}
      <div className="mt-6 flex items-center gap-2 text-sm font-medium text-primary opacity-0 transition-all duration-300 group-hover:opacity-100">
        <span>Learn more</span>
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </div>
    </div>
  );
}

/**
 * Testimonial component
 */
interface TestimonialProps {
  quote: string;
  author: string;
  role: string;
  dealership: string;
  avatar: string;
  delay: string;
}

function Testimonial({ quote, author, role, dealership, delay }: TestimonialProps): JSX.Element {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/50 p-8 backdrop-blur-sm opacity-0 animate-velocity-up"
      style={{ animationDelay: delay }}
    >
      {/* Stars */}
      <div className="mb-4 flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
        ))}
      </div>

      <blockquote className="mb-6 text-lg leading-relaxed text-foreground">"{quote}"</blockquote>

      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary via-accent to-info" />
        <div>
          <div className="font-display font-semibold text-foreground">{author}</div>
          <div className="text-sm text-muted-foreground">
            {role} · {dealership}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Stat card component
 */
interface StatCardProps {
  value: string;
  label: string;
  icon: JSX.Element;
  delay: string;
}

function StatCard({ value, label, icon, delay }: StatCardProps): JSX.Element {
  return (
    <div
      className="relative text-center opacity-0 animate-velocity-up"
      style={{ animationDelay: delay }}
    >
      <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div className="font-display text-5xl font-bold text-foreground">{value}</div>
      <div className="mt-2 text-muted-foreground">{label}</div>
    </div>
  );
}

/**
 * Navigation component
 */
function Navigation(): JSX.Element {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/30 bg-background/60 backdrop-blur-2xl">
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-8">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-3 no-underline opacity-0 animate-velocity-right"
          style={{ animationDelay: '100ms' }}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
            <AutolytiqLogo size={22} className="text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold text-foreground">Autolytiq</span>
        </Link>

        {/* Desktop nav links */}
        <div
          className="hidden items-center gap-10 lg:flex opacity-0 animate-velocity-fade"
          style={{ animationDelay: '200ms' }}
        >
          <a
            href="#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#testimonials"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Testimonials
          </a>
          <a
            href="#pricing"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </a>
        </div>

        {/* CTA buttons */}
        <div
          className="flex items-center gap-4 opacity-0 animate-velocity-right"
          style={{ animationDelay: '300ms' }}
        >
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground lg:block"
          >
            Log in
          </Link>
          <Link href="/login" className="btn-obsidian-primary flex items-center gap-2 !py-3 !px-5">
            <span>Get Started</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </nav>
    </header>
  );
}

/**
 * Hero section
 */
function HeroSection(): JSX.Element {
  return (
    <section className="relative min-h-screen overflow-hidden pt-20">
      <AnimatedHeroBackground />

      <div className="relative mx-auto max-w-7xl px-6 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div
            className="mb-8 inline-flex items-center gap-3 rounded-full border border-primary/30 bg-primary/10 px-5 py-2 opacity-0 animate-velocity-up"
            style={{ animationDelay: '400ms' }}
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <span className="font-medium text-primary">Now with AI-powered insights</span>
            <Sparkles className="h-4 w-4 text-primary" />
          </div>

          {/* Headline */}
          <h1
            className="font-display text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl opacity-0 animate-velocity-up"
            style={{ animationDelay: '500ms' }}
          >
            The complete platform for{' '}
            <span className="relative">
              <span className="bg-gradient-to-r from-primary via-info to-accent bg-clip-text text-transparent">
                modern dealerships
              </span>
              {/* Underline decoration */}
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                <path
                  d="M2 10C50 4 100 2 150 6C200 10 250 8 298 4"
                  stroke="url(#underline-gradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="opacity-60"
                />
                <defs>
                  <linearGradient id="underline-gradient" x1="0" y1="0" x2="300" y2="0">
                    <stop offset="0%" stopColor="hsl(217 91% 60%)" />
                    <stop offset="50%" stopColor="hsl(199 89% 48%)" />
                    <stop offset="100%" stopColor="hsl(38 92% 50%)" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </h1>

          {/* Subheadline */}
          <p
            className="mx-auto mt-8 max-w-2xl text-xl leading-relaxed text-muted-foreground opacity-0 animate-velocity-up"
            style={{ animationDelay: '600ms' }}
          >
            Streamline your sales, manage inventory, and close more deals with Autolytiq's
            all-in-one dealership management platform. Built for the way you work.
          </p>

          {/* CTA buttons */}
          <div
            className="mt-12 flex flex-col items-center justify-center gap-5 sm:flex-row opacity-0 animate-velocity-up"
            style={{ animationDelay: '700ms' }}
          >
            <Link
              href="/login"
              className="btn-obsidian-primary flex w-full items-center justify-center gap-3 !py-4 !px-8 text-lg sm:w-auto"
            >
              <span>Start free trial</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#features"
              className="group flex w-full items-center justify-center gap-3 rounded-xl border-2 border-border bg-background/50 px-8 py-4 text-lg font-semibold text-foreground backdrop-blur-sm transition-all hover:border-primary/50 hover:bg-background sm:w-auto"
            >
              <Play className="h-5 w-5 text-primary" />
              <span>Watch demo</span>
            </a>
          </div>

          {/* Social proof */}
          <div
            className="mt-16 flex flex-col items-center gap-6 sm:flex-row sm:justify-center opacity-0 animate-velocity-up"
            style={{ animationDelay: '800ms' }}
          >
            {/* Avatars */}
            <div className="flex -space-x-3">
              {[
                'from-primary to-info',
                'from-accent to-warning',
                'from-info to-success',
                'from-success to-primary',
                'from-warning to-destructive',
              ].map((gradient, i) => (
                <div
                  key={i}
                  className={`h-12 w-12 rounded-full border-3 border-background bg-gradient-to-br ${gradient}`}
                />
              ))}
            </div>

            {/* Stats */}
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center gap-1 sm:justify-start">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-5 w-5 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-2 font-semibold text-foreground">4.9/5</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                Trusted by <span className="font-semibold text-foreground">500+</span> dealerships
              </p>
            </div>
          </div>
        </div>

        {/* Hero image/dashboard preview */}
        <div
          className="relative mt-20 opacity-0 animate-velocity-up"
          style={{ animationDelay: '900ms' }}
        >
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-border/50 bg-card/80 shadow-premium-xl backdrop-blur-sm">
            {/* Browser chrome */}
            <div className="flex items-center gap-3 border-b border-border/50 bg-muted/30 px-5 py-4">
              <div className="flex gap-2">
                <div className="h-3.5 w-3.5 rounded-full bg-destructive/80" />
                <div className="h-3.5 w-3.5 rounded-full bg-warning/80" />
                <div className="h-3.5 w-3.5 rounded-full bg-success/80" />
              </div>
              <div className="mx-auto flex h-8 w-96 items-center justify-center rounded-lg bg-background px-4 text-sm text-muted-foreground">
                <Shield className="mr-2 h-4 w-4 text-success" />
                app.autolytiq.com/dashboard
              </div>
            </div>

            {/* Dashboard mockup */}
            <div className="aspect-[16/9] bg-gradient-to-br from-background via-background to-muted/30 p-8">
              <div className="grid h-full grid-cols-4 gap-6">
                {/* Sidebar mockup */}
                <div className="rounded-2xl bg-card/60 p-5 backdrop-blur-sm border border-border/30">
                  <div className="mb-8 h-10 w-28 rounded-xl bg-gradient-to-r from-primary/20 to-primary/5" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-10 rounded-xl ${i === 1 ? 'bg-primary/20 border border-primary/30' : 'bg-muted/50'}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Main content mockup */}
                <div className="col-span-3 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-56 rounded-xl bg-muted/50" />
                    <div className="h-10 w-32 rounded-xl bg-primary/20" />
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { color: 'primary', value: '$2.4M' },
                      { color: 'success', value: '147' },
                      { color: 'info', value: '89%' },
                      { color: 'accent', value: '23' },
                    ].map((stat, i) => (
                      <div key={i} className="rounded-2xl bg-card/60 p-5 border border-border/30">
                        <div className="h-3 w-16 rounded bg-muted/50" />
                        <div className={`mt-3 h-8 w-24 rounded-lg bg-${stat.color}/20`} />
                      </div>
                    ))}
                  </div>

                  {/* Chart area */}
                  <div className="h-52 rounded-2xl bg-card/60 p-5 border border-border/30">
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-4 w-32 rounded bg-muted/50" />
                      <div className="flex gap-2">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-6 w-16 rounded-lg bg-muted/30" />
                        ))}
                      </div>
                    </div>
                    <div className="flex items-end justify-between h-32 pt-4">
                      {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 95, 80].map((h, i) => (
                        <div
                          key={i}
                          className="w-6 rounded-t-lg bg-gradient-to-t from-primary/60 to-primary/20"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gradient fade at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
        </div>
      </div>
    </section>
  );
}

/**
 * Features section
 */
function FeaturesSection(): JSX.Element {
  const features = [
    {
      icon: <DealIcon size={28} />,
      title: 'Deal Management',
      description:
        'Track every deal from first contact to final signature. Automated workflows keep your team aligned and deals moving forward.',
    },
    {
      icon: <InventoryIcon size={28} />,
      title: 'Inventory Control',
      description:
        'Real-time inventory tracking with VIN decoding, pricing tools, and automatic syncing across all your platforms.',
    },
    {
      icon: <CustomerIcon size={28} />,
      title: 'Customer CRM',
      description:
        'Build lasting relationships with a CRM designed for automotive. Track preferences, service history, and follow-ups.',
    },
    {
      icon: <FinanceIcon size={28} />,
      title: 'F&I Tools',
      description:
        'Streamlined financing workflows with lender integrations, payment calculators, and compliance built in.',
    },
    {
      icon: <VehicleIcon size={28} />,
      title: 'Digital Showroom',
      description:
        'Create stunning vehicle presentations with 360-degree views, feature highlights, and instant sharing.',
    },
    {
      icon: <TrendingUp size={28} />,
      title: 'Analytics & Insights',
      description:
        'Make data-driven decisions with real-time dashboards, sales forecasting, and performance tracking.',
    },
  ];

  return (
    <section id="features" className="relative py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 opacity-0 animate-velocity-up"
            style={{ animationDelay: '100ms' }}
          >
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary">Features</span>
          </div>
          <h2
            className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl opacity-0 animate-velocity-up"
            style={{ animationDelay: '200ms' }}
          >
            Everything you need to run your dealership
          </h2>
          <p
            className="mt-6 text-lg text-muted-foreground opacity-0 animate-velocity-up"
            style={{ animationDelay: '300ms' }}
          >
            One platform, unlimited possibilities. Autolytiq brings together all the tools your team
            needs.
          </p>
        </div>

        {/* Features grid */}
        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} delay={`${400 + index * 100}ms`} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * Stats section
 */
function StatsSection(): JSX.Element {
  return (
    <section className="relative border-y border-border/50 bg-muted/20 py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-12 md:grid-cols-4">
          <StatCard
            value="500+"
            label="Dealerships"
            icon={<Shield className="h-8 w-8" />}
            delay="100ms"
          />
          <StatCard
            value="2.5M"
            label="Deals Closed"
            icon={<TrendingUp className="h-8 w-8" />}
            delay="200ms"
          />
          <StatCard
            value="$18B"
            label="Sales Volume"
            icon={<Sparkles className="h-8 w-8" />}
            delay="300ms"
          />
          <StatCard value="99.9%" label="Uptime" icon={<Zap className="h-8 w-8" />} delay="400ms" />
        </div>
      </div>
    </section>
  );
}

/**
 * Testimonials section
 */
function TestimonialsSection(): JSX.Element {
  const testimonials = [
    {
      quote:
        'Autolytiq transformed how we operate. Our sales team closes 40% more deals, and the customer experience has never been better.',
      author: 'Michael Chen',
      role: 'General Manager',
      dealership: 'Premier Auto Group',
      avatar: 'MC',
    },
    {
      quote:
        "The F&I tools alone saved us 2 hours per deal. The ROI was immediate. I can't imagine going back to our old system.",
      author: 'Sarah Williams',
      role: 'F&I Director',
      dealership: 'Westside Motors',
      avatar: 'SW',
    },
    {
      quote:
        'Finally, a DMS that was built for the modern era. The interface is intuitive, and the support team is incredibly responsive.',
      author: 'David Rodriguez',
      role: 'Owner',
      dealership: 'Rodriguez Family Auto',
      avatar: 'DR',
    },
  ];

  return (
    <section id="testimonials" className="py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <div
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 opacity-0 animate-velocity-up"
            style={{ animationDelay: '100ms' }}
          >
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Testimonials
            </span>
          </div>
          <h2
            className="font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl opacity-0 animate-velocity-up"
            style={{ animationDelay: '200ms' }}
          >
            Loved by dealerships everywhere
          </h2>
        </div>

        {/* Testimonials grid */}
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Testimonial key={index} {...testimonial} delay={`${300 + index * 100}ms`} />
          ))}
        </div>
      </div>
    </section>
  );
}

/**
 * CTA section
 */
function CTASection(): JSX.Element {
  return (
    <section className="py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-primary via-primary to-info px-8 py-20 sm:px-16 sm:py-28">
          {/* Background decorations */}
          <div className="absolute right-0 top-0 h-80 w-80 -translate-y-1/3 translate-x-1/3 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-60 w-60 -translate-x-1/3 translate-y-1/3 rounded-full bg-white/10 blur-3xl" />
          <div className="grain-overlay absolute inset-0 opacity-10" />

          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Ready to transform your dealership?
            </h2>
            <p className="mt-6 text-xl text-white/80">
              Join hundreds of dealerships already using Autolytiq to close more deals and grow
              their business.
            </p>
            <div className="mt-12 flex flex-col items-center justify-center gap-5 sm:flex-row">
              <Link
                href="/login"
                className="group flex w-full items-center justify-center gap-3 rounded-xl bg-white px-8 py-4 text-lg font-semibold text-primary shadow-xl transition-all hover:bg-white/90 hover:shadow-2xl sm:w-auto"
              >
                <span>Start your free trial</span>
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <a
                href="mailto:sales@autolytiq.com"
                className="w-full rounded-xl border-2 border-white/30 px-8 py-4 text-lg font-semibold text-white transition-all hover:border-white/50 hover:bg-white/10 sm:w-auto"
              >
                Contact sales
              </a>
            </div>
            <p className="mt-8 text-sm text-white/60">
              No credit card required · 14-day free trial · Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Footer component
 */
function Footer(): JSX.Element {
  return (
    <footer className="border-t border-border/50 bg-muted/20 py-16">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-8 md:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/25">
              <AutolytiqLogo size={18} className="text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">Autolytiq</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              Pricing
            </a>
            <a href="#testimonials" className="transition-colors hover:text-foreground">
              Testimonials
            </a>
            <a
              href="mailto:support@autolytiq.com"
              className="transition-colors hover:text-foreground"
            >
              Support
            </a>
          </div>

          {/* Copyright */}
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Autolytiq. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}

/**
 * Home Page Component
 */
export function HomePage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <HeroSection />
        <FeaturesSection />
        <StatsSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}

export default HomePage;
