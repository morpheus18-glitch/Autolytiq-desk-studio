/**
 * Button Component
 *
 * Versatile button component with multiple variants, sizes, and states.
 * Accessible and follows WCAG AA guidelines.
 *
 * Usage:
 * ```tsx
 * // Primary button
 * <Button variant="primary">Create Deal</Button>
 *
 * // Secondary with icon
 * <Button variant="secondary" icon={<PlusIcon />}>
 *   Add Item
 * </Button>
 *
 * // Loading state
 * <Button loading>Saving...</Button>
 *
 * // Destructive action
 * <Button variant="destructive" size="lg">
 *   Delete Account
 * </Button>
 * ```
 */

import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode, JSX } from 'react';

/**
 * Button variant types
 */
export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'success';

/**
 * Button size types
 */
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

/**
 * Button Props
 */
export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Visual style variant
   * - primary: Main call-to-action
   * - secondary: Secondary actions
   * - outline: Low-emphasis with border
   * - ghost: Minimal, text-only
   * - destructive: Dangerous/delete actions
   * - success: Positive confirmation
   * @default 'primary'
   */
  variant?: ButtonVariant;

  /**
   * Button size
   * - sm: 32px height
   * - md: 40px height
   * - lg: 48px height
   * - icon: Square icon-only button
   * @default 'md'
   */
  size?: ButtonSize;

  /**
   * Whether button should take full width
   * @default false
   */
  fullWidth?: boolean;

  /**
   * Loading state - shows spinner and disables button
   * @default false
   */
  loading?: boolean;

  /**
   * Icon to display before text
   */
  icon?: ReactNode;

  /**
   * Icon to display after text
   */
  iconAfter?: ReactNode;

  /**
   * Custom CSS classes
   */
  className?: string;

  /**
   * Button content
   */
  children?: ReactNode;
}

/**
 * Button Component
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      loading = false,
      icon,
      iconAfter,
      className = '',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    // Base styles
    const baseStyles = `
      inline-flex items-center justify-center
      rounded-lg font-medium
      transition-all duration-200
      focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
      disabled:pointer-events-none disabled:opacity-50
    `;

    // Variant styles
    const variantStyles: Record<ButtonVariant, string> = {
      primary: `
        bg-primary text-primary-foreground
        hover:bg-primary/90
        active:bg-primary/95
        shadow-sm hover:shadow-md
      `,
      secondary: `
        bg-secondary text-secondary-foreground
        hover:bg-secondary/80
        active:bg-secondary/90
        border border-border
      `,
      outline: `
        bg-background text-foreground
        border-2 border-border
        hover:bg-muted hover:border-muted-foreground/20
        active:bg-muted/80
      `,
      ghost: `
        bg-transparent text-foreground
        hover:bg-muted
        active:bg-muted/80
      `,
      destructive: `
        bg-destructive text-destructive-foreground
        hover:bg-destructive/90
        active:bg-destructive/95
        shadow-sm hover:shadow-md
      `,
      success: `
        bg-success text-success-foreground
        hover:bg-success/90
        active:bg-success/95
        shadow-sm hover:shadow-md
      `,
    };

    // Size styles
    const sizeStyles: Record<ButtonSize, string> = {
      sm: 'h-8 px-3 text-sm gap-1.5',
      md: 'h-10 px-4 text-sm gap-2',
      lg: 'h-12 px-6 text-base gap-2.5',
      icon: 'h-10 w-10',
    };

    // Full width style
    const widthStyle = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        className={`
          ${baseStyles}
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${widthStyle}
          ${className}
        `}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <Spinner />
            {children && <span>{children}</span>}
          </>
        ) : (
          <>
            {icon && <span className="inline-flex">{icon}</span>}
            {children && <span>{children}</span>}
            {iconAfter && <span className="inline-flex">{iconAfter}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

/**
 * Spinner Component
 *
 * Loading spinner for buttons
 */
function Spinner(): JSX.Element {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * ButtonGroup
 *
 * Group multiple buttons together
 */
export interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
  /**
   * Orientation of the button group
   * @default 'horizontal'
   */
  orientation?: 'horizontal' | 'vertical';
}

export function ButtonGroup({
  children,
  className = '',
  orientation = 'horizontal',
}: ButtonGroupProps): JSX.Element {
  const orientationStyles = {
    horizontal: 'flex-row',
    vertical: 'flex-col',
  };

  return (
    <div
      className={`inline-flex ${orientationStyles[orientation]} gap-2 ${className}`}
      role="group"
    >
      {children}
    </div>
  );
}

/**
 * IconButton
 *
 * Button with only an icon (no text)
 * Automatically uses size="icon"
 */
export interface IconButtonProps extends Omit<ButtonProps, 'icon' | 'iconAfter' | 'size'> {
  /**
   * Icon to display
   */
  icon: ReactNode;

  /**
   * Accessible label for screen readers
   */
  'aria-label': string;

  /**
   * Optional size override
   * @default 'md'
   */
  size?: ButtonSize;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, size = 'icon', ...props }, ref) => {
    return (
      <Button ref={ref} size={size} {...props}>
        {icon}
      </Button>
    );
  }
);

IconButton.displayName = 'IconButton';

/**
 * LinkButton
 *
 * Button styled as a link
 */
export interface LinkButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'variant'> {
  className?: string;
  children: ReactNode;
}

export const LinkButton = forwardRef<HTMLButtonElement, LinkButtonProps>(
  ({ className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center gap-1
          text-sm font-medium text-primary
          underline-offset-4 hover:underline
          transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          disabled:pointer-events-none disabled:opacity-50
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

LinkButton.displayName = 'LinkButton';

/**
 * Button with dropdown indicator
 */
export interface DropdownButtonProps extends ButtonProps {
  /**
   * Whether the dropdown is open
   */
  open?: boolean;
}

export const DropdownButton = forwardRef<HTMLButtonElement, DropdownButtonProps>(
  ({ open = false, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        iconAfter={
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        }
        {...props}
      >
        {children}
      </Button>
    );
  }
);

DropdownButton.displayName = 'DropdownButton';

/**
 * Split Button
 *
 * Button with a primary action and a dropdown menu
 */
export interface SplitButtonProps {
  children: ReactNode;
  onClick: () => void;
  onDropdownClick: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

export function SplitButton({
  children,
  onClick,
  onDropdownClick,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className = '',
}: SplitButtonProps): JSX.Element {
  return (
    <div className={`inline-flex ${className}`}>
      <Button
        variant={variant}
        size={size}
        loading={loading}
        disabled={disabled}
        onClick={onClick}
        className="rounded-r-none border-r border-white/20"
      >
        {children}
      </Button>
      <Button
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={onDropdownClick}
        className="rounded-l-none px-2"
        aria-label="More options"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </Button>
    </div>
  );
}
