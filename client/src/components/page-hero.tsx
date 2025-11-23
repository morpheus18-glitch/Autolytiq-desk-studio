import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import {
  stickyHeaderClasses,
  containerPadding,
  layoutSpacing,
  heroIconContainerClasses,
  pageTitleClasses,
  pageSubtitleClasses
} from '@/lib/design-tokens';

interface PageHeroProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHero({ icon: Icon, title, description, actions, className }: PageHeroProps) {
  return (
    <div className={cn(stickyHeaderClasses, className)}>
      <div className={cn(containerPadding, layoutSpacing.header)}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={cn(
              heroIconContainerClasses,
              "bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-lg shadow-primary/25"
            )}>
              <Icon className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className={pageTitleClasses}>
                {title}
              </h1>
              <p className={pageSubtitleClasses}>
                {description}
              </p>
            </div>
          </div>
          {actions && (
            <div className="hidden md:flex items-center gap-3">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
