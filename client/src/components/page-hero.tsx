import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface PageHeroProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHero({ icon: Icon, title, description, actions, className }: PageHeroProps) {
  return (
    <div className={cn("sticky top-0 z-40 backdrop-blur-lg bg-background/90 border-b shadow-sm", className)}>
      <div className="container mx-auto px-4 md:px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary via-primary/90 to-primary/70 shadow-lg shadow-primary/25">
              <Icon className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                {title}
              </h1>
              <p className="text-sm text-muted-foreground font-medium mt-0.5">
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
