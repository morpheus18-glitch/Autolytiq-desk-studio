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
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full flex items-center justify-between p-5 md:p-6 text-left hover-elevate active-elevate-2 touch-manipulation min-h-[68px] ${
          alwaysExpanded ? 'cursor-default' : 'cursor-pointer'
        } ${isExpanded ? 'border-l-4 border-l-primary' : ''}`}
        data-testid={testId ? `${testId}-header` : undefined}
        disabled={alwaysExpanded}
      >
        <div className="flex items-center gap-3 flex-1">
          {Icon && (
            <div className="flex items-center justify-center w-10 h-10 md:w-9 md:h-9 rounded-lg bg-primary/10 text-primary">
              <Icon className="w-5 h-5 md:w-4 md:h-4" />
            </div>
          )}
          <div className="flex-1">
            <h2 className="text-lg md:text-xl font-semibold">{title}</h2>
            {summary && !isExpanded && (
              <p className="text-xs md:text-sm text-muted-foreground mt-1">{summary}</p>
            )}
          </div>
        </div>
        {!alwaysExpanded && (
          <ChevronDown 
            className={`w-5 h-5 text-muted-foreground transition-all duration-300 ease-out ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>
      
      <div 
        className={`transition-all duration-300 ease-out ${
          isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="p-5 md:p-6 pt-0 md:pt-0 space-y-4">
          {children}
        </div>
      </div>
    </Card>
  );
}
