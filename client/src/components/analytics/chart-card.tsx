import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Maximize2, 
  Minimize2, 
  Download, 
  MoreVertical,
  FileSpreadsheet,
  FileText,
  Printer
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  error?: boolean;
  onExport?: (format: 'csv' | 'pdf' | 'print') => void;
  actions?: React.ReactNode;
  testId?: string;
}

export function ChartCard({
  title,
  description,
  children,
  className,
  loading = false,
  error = false,
  onExport,
  actions,
  testId,
}: ChartCardProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleExport = (format: 'csv' | 'pdf' | 'print') => {
    if (onExport) {
      onExport(format);
    } else {
      // Default export behavior
      switch (format) {
        case 'print':
          window.print();
          break;
        case 'csv':
          console.log('Export as CSV');
          break;
        case 'pdf':
          console.log('Export as PDF');
          break;
      }
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
    if (!isFullscreen && document.documentElement.requestFullscreen) {
      document.querySelector(`[data-testid="${testId}"]`)?.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  if (loading) {
    return (
      <Card className={cn('relative', className)}>
        <CardHeader>
          <div className="animate-pulse space-y-2">
            <div className="h-5 w-32 bg-muted rounded" />
            {description && <div className="h-3 w-48 bg-muted rounded" />}
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('relative', className)}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <p>Failed to load chart data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'relative overflow-hidden transition-all duration-200',
        'bg-card/50 backdrop-blur-sm border-border/50',
        isFullscreen && 'fixed inset-4 z-50',
        className
      )}
      data-testid={testId || `chart-card-${title.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {actions}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={toggleFullscreen}
            data-testid={`button-fullscreen-${title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          {onExport && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="h-8 w-8"
                  data-testid={`button-export-${title.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleExport('csv')}
                  className="gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExport('pdf')}
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleExport('print')}
                  className="gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      <CardContent className={cn(
        'pb-4',
        isFullscreen && 'h-[calc(100%-4rem)]'
      )}>
        {children}
      </CardContent>
    </Card>
  );
}