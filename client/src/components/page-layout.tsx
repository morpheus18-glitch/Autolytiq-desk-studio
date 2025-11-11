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
        // Add bottom padding for mobile nav (20 = 80px) except on pages where nav is hidden
        // Include safe-area-inset-bottom for iOS devices
        !navSuppressed && 'pb-20 md:pb-6',
        className
      )}
      style={{
        paddingBottom: !navSuppressed
          ? 'calc(env(safe-area-inset-bottom, 0px) + 5rem)' // 5rem = pb-20
          : undefined,
      }}
    >
      {children}
    </div>
  );
}
