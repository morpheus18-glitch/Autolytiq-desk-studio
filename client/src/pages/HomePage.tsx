/**
 * Home Page (Marketing Landing Page)
 *
 * A high-quality marketing landing page for Autolytiq that showcases
 * the platform's features and drives users to sign up or log in.
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

/**
 * Feature card component
 */
interface FeatureCardProps {
  icon: JSX.Element;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps): JSX.Element {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 translate-y-[-2rem] rounded-full bg-primary/5 transition-transform duration-300 group-hover:scale-150" />
      <div className="relative">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
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
}

function Testimonial({ quote, author, role, dealership }: TestimonialProps): JSX.Element {
  return (
    <div className="rounded-2xl border border-border bg-card p-8">
      <div className="mb-4 text-2xl text-primary">&ldquo;</div>
      <blockquote className="mb-6 text-lg italic text-foreground">{quote}</blockquote>
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/60" />
        <div>
          <div className="font-semibold text-foreground">{author}</div>
          <div className="text-sm text-muted-foreground">
            {role} at {dealership}
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
}

function StatCard({ value, label }: StatCardProps): JSX.Element {
  return (
    <div className="text-center">
      <div className="text-4xl font-bold text-primary md:text-5xl">{value}</div>
      <div className="mt-2 text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

/**
 * Navigation component
 */
function Navigation(): JSX.Element {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <AutolytiqLogo size={20} className="text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">Autolytiq</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </a>
          <a
            href="#testimonials"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Testimonials
          </a>
          <a
            href="#pricing"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </a>
        </div>

        {/* CTA buttons */}
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/login"
            className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
          >
            Log in
          </Link>
          <Link
            href="/login"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get Started
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
    <section className="relative overflow-hidden pb-20 pt-32 sm:pb-32 sm:pt-40">
      {/* Background decorations */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
            </span>
            <span className="text-sm font-medium text-primary">Now with AI-powered insights</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
            The complete platform for{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              modern dealerships
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Streamline your sales, manage inventory, and close more deals with Autolytiq&apos;s
            all-in-one dealership management platform. Built for the way you work.
          </p>

          {/* CTA buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="w-full rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:bg-primary/90 hover:shadow-xl hover:shadow-primary/30 sm:w-auto"
            >
              Start free trial
            </Link>
            <a
              href="#features"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border px-8 py-4 text-base font-semibold text-foreground transition-colors hover:bg-muted sm:w-auto"
            >
              <span>See how it works</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </a>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="h-10 w-10 rounded-full border-2 border-background bg-gradient-to-br from-muted to-muted-foreground/20"
                />
              ))}
            </div>
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center gap-1 sm:justify-start">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg
                    key={i}
                    className="h-4 w-4 text-yellow-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Trusted by <span className="font-semibold text-foreground">500+</span> dealerships
              </p>
            </div>
          </div>
        </div>

        {/* Hero image/dashboard preview */}
        <div className="relative mt-16 sm:mt-24">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <div className="mx-auto flex h-7 w-96 items-center justify-center rounded-md bg-background px-3 text-xs text-muted-foreground">
                app.autolytiq.com/dashboard
              </div>
            </div>
            {/* Dashboard mockup */}
            <div className="aspect-[16/9] bg-gradient-to-br from-background to-muted p-8">
              <div className="grid h-full grid-cols-4 gap-4">
                {/* Sidebar mockup */}
                <div className="rounded-lg bg-card/50 p-4">
                  <div className="mb-6 h-8 w-24 rounded bg-muted" />
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div
                        key={i}
                        className={`h-8 rounded ${i === 1 ? 'bg-primary/20' : 'bg-muted'}`}
                      />
                    ))}
                  </div>
                </div>
                {/* Main content mockup */}
                <div className="col-span-3 space-y-4">
                  <div className="h-12 w-48 rounded bg-muted" />
                  <div className="grid grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-24 rounded-lg bg-card/50 p-4">
                        <div className="h-4 w-16 rounded bg-muted" />
                        <div className="mt-4 h-8 w-24 rounded bg-primary/20" />
                      </div>
                    ))}
                  </div>
                  <div className="h-64 rounded-lg bg-card/50 p-4">
                    <div className="h-4 w-32 rounded bg-muted" />
                    <div className="mt-4 grid grid-cols-5 gap-2">
                      {Array.from({ length: 20 }).map((_, i) => (
                        <div key={i} className="h-8 rounded bg-muted/50" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Gradient overlay at bottom */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
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
      icon: <DealIcon size={24} />,
      title: 'Deal Management',
      description:
        'Track every deal from first contact to final signature. Automated workflows keep your team aligned and deals moving forward.',
    },
    {
      icon: <InventoryIcon size={24} />,
      title: 'Inventory Control',
      description:
        'Real-time inventory tracking with VIN decoding, pricing tools, and automatic syncing across all your platforms.',
    },
    {
      icon: <CustomerIcon size={24} />,
      title: 'Customer CRM',
      description:
        'Build lasting relationships with a CRM designed for automotive. Track preferences, service history, and follow-ups.',
    },
    {
      icon: <FinanceIcon size={24} />,
      title: 'F&I Tools',
      description:
        'Streamlined financing workflows with lender integrations, payment calculators, and compliance built in.',
    },
    {
      icon: <VehicleIcon size={24} />,
      title: 'Digital Showroom',
      description:
        'Create stunning vehicle presentations with 360-degree views, feature highlights, and instant sharing.',
    },
    {
      icon: (
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      title: 'Analytics & Insights',
      description:
        'Make data-driven decisions with real-time dashboards, sales forecasting, and performance tracking.',
    },
  ];

  return (
    <section id="features" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">Features</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Everything you need to run your dealership
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One platform, unlimited possibilities. Autolytiq brings together all the tools your team
            needs.
          </p>
        </div>

        {/* Features grid */}
        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
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
    <section className="border-y border-border bg-muted/30 py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <StatCard value="500+" label="Dealerships" />
          <StatCard value="2.5M" label="Deals Closed" />
          <StatCard value="$18B" label="Sales Volume" />
          <StatCard value="99.9%" label="Uptime" />
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
    },
    {
      quote:
        "The F&I tools alone saved us 2 hours per deal. The ROI was immediate. I can't imagine going back to our old system.",
      author: 'Sarah Williams',
      role: 'F&I Director',
      dealership: 'Westside Motors',
    },
    {
      quote:
        'Finally, a DMS that was built for the modern era. The interface is intuitive, and the support team is incredibly responsive.',
      author: 'David Rodriguez',
      role: 'Owner',
      dealership: 'Rodriguez Family Auto',
    },
  ];

  return (
    <section id="testimonials" className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Testimonials
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Loved by dealerships everywhere
          </h2>
        </div>

        {/* Testimonials grid */}
        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <Testimonial key={index} {...testimonial} />
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
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-8 py-16 sm:px-16 sm:py-24">
          {/* Background decoration */}
          <div className="absolute right-0 top-0 h-64 w-64 -translate-y-1/2 translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-48 w-48 -translate-x-1/2 translate-y-1/2 rounded-full bg-white/10 blur-3xl" />

          <div className="relative mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              Ready to transform your dealership?
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/80">
              Join hundreds of dealerships already using Autolytiq to close more deals and grow
              their business.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/login"
                className="w-full rounded-xl bg-white px-8 py-4 text-base font-semibold text-primary shadow-lg transition-all hover:bg-white/90 sm:w-auto"
              >
                Start your free trial
              </Link>
              <a
                href="mailto:sales@autolytiq.com"
                className="w-full rounded-xl border-2 border-white/30 px-8 py-4 text-base font-semibold text-primary-foreground transition-colors hover:bg-white/10 sm:w-auto"
              >
                Contact sales
              </a>
            </div>
            <p className="mt-6 text-sm text-primary-foreground/60">
              No credit card required &bull; 14-day free trial &bull; Cancel anytime
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
    <footer className="border-t border-border bg-muted/30 py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <AutolytiqLogo size={16} className="text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">Autolytiq</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="hover:text-foreground">
              Pricing
            </a>
            <a href="#testimonials" className="hover:text-foreground">
              Testimonials
            </a>
            <a href="mailto:support@autolytiq.com" className="hover:text-foreground">
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
