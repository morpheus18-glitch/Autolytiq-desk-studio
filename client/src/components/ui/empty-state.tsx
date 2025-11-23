import type { HTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  emptyStateClasses,
  emptyStateIconClasses,
  emptyStateTextClasses
} from '@/lib/design-tokens';

interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    testId?: string;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    testId?: string;
  };
  containerTestId?: string;
  titleTestId?: string;
  descriptionTestId?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  containerTestId = 'empty-state',
  titleTestId,
  descriptionTestId,
  className = '',
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(emptyStateClasses, className)}
      data-testid={containerTestId}
      {...props}
    >
      {/* Icon Container */}
      <div className={cn(emptyStateIconClasses, "glass")}>
        <Icon className="w-10 h-10 md:w-12 md:h-12 text-primary" strokeWidth={1.5} />
      </div>

      {/* Title */}
      <h3
        className={emptyStateTextClasses.title}
        data-testid={titleTestId || `${containerTestId}-title`}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className={emptyStateTextClasses.description}
        data-testid={descriptionTestId || `${containerTestId}-description`}
      >
        {description}
      </p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              size="lg"
              data-testid={action.testId || 'button-empty-state-primary'}
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              onClick={secondaryAction.onClick}
              variant="outline"
              size="lg"
              data-testid={secondaryAction.testId || 'button-empty-state-secondary'}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
