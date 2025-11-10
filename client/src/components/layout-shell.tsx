import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AutoSaveIndicator } from './auto-save-indicator';

interface LayoutShellProps {
  children: ReactNode;
  header: ReactNode;
  summaryDesktop: ReactNode;
  mobileSummary?: ReactNode;
  mobileSummaryOffset?: string;
  className?: string;
}

export function LayoutShell({ 
  children, 
  header, 
  summaryDesktop, 
  mobileSummary,
  mobileSummaryOffset = '3.5rem',
  className 
}: LayoutShellProps) {
  return (
    <div 
      className="h-screen flex flex-col bg-background"
      style={{ '--mobile-summary-offset': mobileSummaryOffset } as React.CSSProperties}
    >
      {/* Header - Sticky on all devices */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="px-4 md:px-8 py-4">
          {header}
        </div>
      </header>

      {/* Main Content Area - Three Column Desktop, Single Column Mobile */}
      <main className="flex-1 overflow-hidden">
        <div className={cn(
          "h-full max-w-[1600px] mx-auto",
          "grid grid-cols-1 lg:grid-cols-[1fr_1.5fr_400px] gap-0",
          className
        )}>
          {/* Main Content - Scrollable with Dynamic Bottom Padding for Mobile */}
          <div className="overflow-y-auto lg:col-span-2">
            <div className="p-4 md:p-8 space-y-6 pb-[calc(var(--mobile-summary-offset)+env(safe-area-inset-bottom))] lg:pb-8">
              {children}
            </div>
          </div>

          {/* Payment Summary - Sticky on Desktop Only */}
          <aside className="hidden lg:block border-l bg-card">
            <div className="sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">
              <div className="p-6">
                {summaryDesktop}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile Bottom Payment Sheet - Fixed */}
      {mobileSummary && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 safe-area-inset-bottom">
          {mobileSummary}
        </div>
      )}

      {/* Auto-save indicator - Floating (Above Sheet Overlay) */}
      <div className="fixed top-20 right-4 md:right-8 z-60">
        <AutoSaveIndicator />
      </div>
    </div>
  );
}
