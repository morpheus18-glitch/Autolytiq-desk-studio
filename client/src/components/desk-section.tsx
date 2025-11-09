import { ReactNode, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface DeskSectionProps {
  title: string;
  summary?: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  alwaysExpanded?: boolean;
  testId?: string;
}

export function DeskSection({ 
  title, 
  summary, 
  children, 
  defaultExpanded = false,
  alwaysExpanded = false,
  testId 
}: DeskSectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded || alwaysExpanded);

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
        className={`w-full flex items-center justify-between p-4 md:p-6 text-left hover-elevate active-elevate-2 ${
          alwaysExpanded ? 'cursor-default' : 'cursor-pointer'
        } ${isExpanded ? 'border-l-4 border-l-primary' : ''}`}
        data-testid={testId ? `${testId}-header` : undefined}
        disabled={alwaysExpanded}
      >
        <div className="flex-1">
          <h2 className="text-lg md:text-xl font-semibold">{title}</h2>
          {summary && !isExpanded && (
            <p className="text-xs md:text-sm text-muted-foreground mt-1">{summary}</p>
          )}
        </div>
        {!alwaysExpanded && (
          <ChevronDown 
            className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
              isExpanded ? 'rotate-180' : ''
            }`}
          />
        )}
      </button>
      
      <div 
        className={`transition-all duration-200 ${
          isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="p-4 md:p-6 pt-0 md:pt-0 space-y-4">
          {children}
        </div>
      </div>
    </Card>
  );
}
