import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import {
  metricIconContainerClasses,
  metricIconColors,
  sectionTitleClasses,
  responsiveText
} from '@/lib/design-tokens';

interface SectionHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionHeader({ icon: Icon, title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4 mb-6", className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className={cn(metricIconContainerClasses, metricIconColors.primary, "text-primary")}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h2 className={cn(sectionTitleClasses, responsiveText.lg)}>{title}</h2>
          {subtitle && (
            <p className={cn(responsiveText.xs, "text-muted-foreground mt-0.5")}>{subtitle}</p>
          )}
        </div>
      </div>
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
}
