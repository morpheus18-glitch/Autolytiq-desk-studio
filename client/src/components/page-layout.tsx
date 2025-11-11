import { useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import { isMobileNavSuppressed } from '@/lib/navigation';

type PageLayoutProps = {
  children: React.ReactNode;
  className?: string;
};

export function PageLayout({ children, className }: PageLayoutProps) {
  const [location] = useLocation();
  const navSuppressed = isMobileNavSuppressed(location);

  return (
    <div
      className={cn(
        // Mobile: 5rem (80px) bottom padding + iOS safe area for nav clearance
        // Desktop: 1.5rem (24px) bottom padding + iOS safe area for standard spacing
        !navSuppressed && 'pb-[calc(env(safe-area-inset-bottom,0px)+5rem)] md:pb-[calc(env(safe-area-inset-bottom,0px)+1.5rem)]',
        className
      )}
    >
      {children}
    </div>
  );
}
