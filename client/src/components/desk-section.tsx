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
        className={`w-full flex items-center justify-between p-6 text-left hover-elevate active-elevate-2 touch-manipulation transition-smooth ${
          alwaysExpanded ? 'cursor-default' : 'cursor-pointer'
        }`}
        data-testid={testId ? `${testId}-header` : undefined}
        disabled={alwaysExpanded}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {Icon && (
            <div className="flex items-center justify-center flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 transition-all duration-300">
              <Icon className="w-6 h-6 text-blue-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-neutral-900 truncate">{title}</h2>
            {summary && !isExpanded && (
              <p className="text-sm text-neutral-500 mt-1 truncate">{summary}</p>
            )}
          </div>
        </div>
        {!alwaysExpanded && (
          <ChevronDown 
            className={`w-6 h-6 text-neutral-600 flex-shrink-0 transition-transform duration-300 ${
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
        <div className="p-6 pt-0 space-y-6">
          {children}
        </div>
      </div>
    </Card>
  );
}
