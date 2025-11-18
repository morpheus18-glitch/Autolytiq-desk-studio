import { ReactNode, useState } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface DeskSectionProps {
  title: string;
  icon?: LucideIcon;
  summary?: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  alwaysExpanded?: boolean;
  testId?: string;
  defaultOpen?: boolean; // Alias for defaultExpanded
}

export function DeskSection({ 
  title,
  icon: Icon,
  summary, 
  children, 
  defaultExpanded = false,
  defaultOpen = false,
  alwaysExpanded = false,
  testId 
}: DeskSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || defaultOpen || alwaysExpanded);

  const handleToggle = () => {
    if (!alwaysExpanded) {
      setIsExpanded(!isExpanded);
    }
  };

  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between p-3 md:p-4 lg:p-6 text-left hover-elevate active-elevate-2 touch-manipulation transition-smooth ${
          alwaysExpanded ? 'cursor-default' : 'cursor-pointer'
        }`}
        data-testid={testId ? `${testId}-header` : undefined}
        disabled={alwaysExpanded}
      >
        <div className="flex items-center gap-2 md:gap-3 lg:gap-4 flex-1 min-w-0">
          {Icon && (
            <div className="flex items-center justify-center flex-shrink-0 w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 rounded-full bg-blue-100 transition-all duration-300">
              <Icon className="w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-blue-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg lg:text-xl font-semibold text-neutral-900 truncate">{title}</h2>
            {summary && !isExpanded && (
              <p className="text-xs md:text-sm text-neutral-500 mt-0.5 md:mt-1 truncate">{summary}</p>
            )}
          </div>
        </div>
        {!alwaysExpanded && (
          <ChevronDown
            className={`w-4 h-4 md:w-5 md:h-5 lg:w-6 lg:h-6 text-neutral-600 flex-shrink-0 transition-transform duration-300 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>
      
      <div
        className={`transition-all duration-300 ${
          isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="p-3 md:p-4 lg:p-6 pt-0 space-y-3 md:space-y-4 lg:space-y-6">
          {children}
        </div>
      </div>
    </Card>
  );
}
