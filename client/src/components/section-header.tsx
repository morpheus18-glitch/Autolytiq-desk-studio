import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

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
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
            <Icon className="w-5 h-5" />
          </div>
        )}
        <div>
          <h2 className="text-lg md:text-xl font-semibold">{title}</h2>
          {subtitle && (
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
}
