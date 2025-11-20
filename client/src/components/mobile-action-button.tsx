import { useState } from 'react';
import { MoreVertical, History, Printer, FileText } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export function MobileActionButton() {
  const [isOpen, setIsOpen] = useState(false);

  const actions = [
    {
      id: 'history',
      label: 'History',
      icon: History,
      onClick: () => {
        console.log('History clicked');
        setIsOpen(false);
      },
    },
    {
      id: 'print',
      label: 'Print',
      icon: Printer,
      onClick: () => {
        console.log('Print clicked');
        setIsOpen(false);
      },
    },
    {
      id: 'export',
      label: 'Export',
      icon: FileText,
      onClick: () => {
        console.log('Export clicked');
        setIsOpen(false);
      },
    },
  ];

  return (
    <>
      {/* Floating Action Button (Custom Touch Target - No size override) */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed bottom-36 right-4 z-50 flex items-center justify-center h-14 w-14 rounded-full bg-secondary text-secondary-foreground shadow-lg hover-elevate active-elevate-2 touch-manipulation safe-area-inset-bottom"
        data-testid="button-mobile-actions"
      >
        <MoreVertical className="w-6 h-6" />
      </button>

      {/* Action Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="h-auto p-0">
          {/* Handle */}
          <div className="flex justify-center pt-4 pb-2">
            <div className="w-16 h-2 rounded-full bg-muted" />
          </div>

          {/* Header */}
          <SheetHeader className="px-6 pb-4">
            <SheetTitle className="text-left">Actions</SheetTitle>
          </SheetHeader>

          {/* Actions List */}
          <div className="px-6 pb-6 space-y-2">
            {actions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.id}
                  onClick={action.onClick}
                  className="w-full flex items-center gap-4 p-4 rounded-lg hover-elevate active-elevate-2 touch-manipulation min-h-14"
                  data-testid={`button-${action.id}`}
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 flex-shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-base font-medium text-left">{action.label}</span>
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
