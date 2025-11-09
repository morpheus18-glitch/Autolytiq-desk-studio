import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AutoSaveIndicator } from './auto-save-indicator';

interface LayoutShellProps {
  children: ReactNode;
  header: ReactNode;
  summary: ReactNode;
  className?: string;
}

export function LayoutShell({ children, header, summary, className }: LayoutShellProps) {
  return (
    <div className="h-screen flex flex-col bg-background">
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
          {/* Main Content - Scrollable with Bottom Padding for Mobile Payment Bar */}
          <div className="overflow-y-auto lg:col-span-2">
            <div className="p-4 md:p-8 space-y-6 pb-32 lg:pb-8">
              {children}
            </div>
          </div>

          {/* Payment Summary - Sticky on Desktop, Fixed Bottom on Mobile */}
          <aside className="hidden lg:block border-l bg-card">
            <div className="sticky top-[73px] h-[calc(100vh-73px)] overflow-y-auto">
              <div className="p-6">
                {summary}
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile Bottom Payment Bar - Fixed */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="p-4">
          {summary}
        </div>
      </div>

      {/* Auto-save indicator - Floating */}
      <div className="fixed top-20 right-4 md:right-8 z-50">
        <AutoSaveIndicator />
      </div>
    </div>
  );
}
