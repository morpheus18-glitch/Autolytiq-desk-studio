/**
 * Card Component
 *
 * Versatile card component with multiple variants and interactive states.
 * Foundation for content containers throughout the application.
 *
 * Usage:
 * ```tsx
 * // Basic card
 * <Card>
 *   <CardHeader>
 *     <CardTitle>Card Title</CardTitle>
 *     <CardDescription>Card description</CardDescription>
 *   </CardHeader>
 *   <CardContent>
 *     Content goes here
 *   </CardContent>
 *   <CardFooter>
 *     <Button>Action</Button>
 *   </CardFooter>
 * </Card>
 *
 * // Elevated card with hover effect
 * <Card variant="elevated" hoverable>
 *   Content
 * </Card>
 * ```
 */

import { forwardRef } from 'react';
import type { HTMLAttributes, ReactNode, JSX } from 'react';

/**
 * Card variant types
 */
export type CardVariant = 'default' | 'outlined' | 'elevated' | 'ghost';

/**
 * Card Props
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Card style variant
   * - default: Subtle border with background
   * - outlined: Prominent border, no shadow
   * - elevated: Shadow-based, minimal border
   * - ghost: No border or background
   * @default 'default'
   */
  variant?: CardVariant;

  /**
   * Whether the card is clickable/hoverable
   * @default false
   */
  hoverable?: boolean;

  /**
   * Whether the card is currently selected/active
   * @default false
   */
  selected?: boolean;

  /**
   * Custom CSS classes
   */
  className?: string;

  /**
   * Card content
   */
  children?: ReactNode;
}

/**
 * Card Component
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      hoverable = false,
      selected = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = 'rounded-lg transition-all duration-200';

    // Variant styles
    const variantStyles: Record<CardVariant, string> = {
      default: `
        bg-card text-card-foreground
        border border-card-border
        ${hoverable ? 'hover:shadow-md' : ''}
        ${selected ? 'border-primary ring-2 ring-primary/20' : ''}
      `,
      outlined: `
        bg-card text-card-foreground
        border-2 border-border
        ${hoverable ? 'hover:border-primary/50' : ''}
        ${selected ? 'border-primary ring-2 ring-primary/20' : ''}
      `,
      elevated: `
        bg-card text-card-foreground
        border border-card-border/50
        shadow-md
        ${hoverable ? 'hover:shadow-lg hover:-translate-y-0.5' : ''}
        ${selected ? 'shadow-lg ring-2 ring-primary/20' : ''}
      `,
      ghost: `
        bg-transparent text-foreground
        ${hoverable ? 'hover:bg-muted/50' : ''}
        ${selected ? 'bg-muted' : ''}
      `,
    };

    // Cursor style
    const cursorStyle = hoverable ? 'cursor-pointer' : '';

    return (
      <div
        ref={ref}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${cursorStyle}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * CardHeader Props
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: ReactNode;
}

/**
 * CardHeader Component
 */
export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

/**
 * CardTitle Props
 */
export interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  className?: string;
  children?: ReactNode;
}

/**
 * CardTitle Component
 */
export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={`text-xl font-semibold leading-none tracking-tight text-foreground ${className}`}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

CardTitle.displayName = 'CardTitle';

/**
 * CardDescription Props
 */
export interface CardDescriptionProps extends HTMLAttributes<HTMLParagraphElement> {
  className?: string;
  children?: ReactNode;
}

/**
 * CardDescription Component
 */
export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <p ref={ref} className={`text-sm text-muted-foreground ${className}`} {...props}>
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

/**
 * CardContent Props
 */
export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: ReactNode;
}

/**
 * CardContent Component
 */
export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`p-6 pt-0 ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

/**
 * CardFooter Props
 */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  children?: ReactNode;
}

/**
 * CardFooter Component
 */
export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <div ref={ref} className={`flex items-center p-6 pt-0 ${className}`} {...props}>
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

/**
 * CardDivider
 *
 * Visual separator for card sections
 */
export interface CardDividerProps {
  className?: string;
}

export function CardDivider({ className = '' }: CardDividerProps): JSX.Element {
  return <hr className={`border-border ${className}`} />;
}

/**
 * CardSkeleton
 *
 * Loading skeleton for cards
 */
export interface CardSkeletonProps {
  variant?: CardVariant;
  showHeader?: boolean;
  showFooter?: boolean;
  lines?: number;
}

export function CardSkeleton({
  variant = 'default',
  showHeader = true,
  showFooter = false,
  lines = 3,
}: CardSkeletonProps): JSX.Element {
  return (
    <Card variant={variant}>
      {showHeader && (
        <CardHeader>
          <div className="h-6 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
        </CardHeader>
      )}
      <CardContent>
        <div className="space-y-3">
          {Array.from({ length: lines }, (_, i) => (
            <div
              key={i}
              className={`h-4 animate-pulse rounded bg-muted ${
                i === lines - 1 ? 'w-5/6' : 'w-full'
              }`}
            />
          ))}
        </div>
      </CardContent>
      {showFooter && (
        <CardFooter>
          <div className="h-10 w-24 animate-pulse rounded bg-muted" />
        </CardFooter>
      )}
    </Card>
  );
}

/**
 * CardStats
 *
 * Specialized card for displaying statistics
 */
export interface CardStatsProps {
  label: string;
  value: string | number;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
  };
  icon?: ReactNode;
  variant?: CardVariant;
  className?: string;
}

export function CardStats({
  label,
  value,
  change,
  icon,
  variant = 'default',
  className = '',
}: CardStatsProps): JSX.Element {
  const trendColors = {
    up: 'text-success',
    down: 'text-destructive',
    neutral: 'text-muted-foreground',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <Card variant={variant} className={className}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
            {change && (
              <p className={`mt-2 text-sm ${trendColors[change.trend]}`}>
                <span className="font-medium">
                  {trendIcons[change.trend]} {Math.abs(change.value)}%
                </span>
              </p>
            )}
          </div>
          {icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              {icon}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
