import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  sectionName?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

interface ErrorInfo {
  componentStack: string;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service in production
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReset = () => {
    const { onReset } = this.props;
    
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
    
    if (onReset) {
      onReset();
    } else {
      // Default: reload the page
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDevelopment = import.meta.env.DEV;
      const { sectionName = 'This section' } = this.props;

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card className="max-w-md w-full bg-card/50 backdrop-blur-sm border-destructive/20">
            <div className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-foreground">
                    {sectionName} encountered an error
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    We're sorry, but something went wrong. Please try refreshing the page
                    or contact support if the problem persists.
                  </p>
                  
                  {isDevelopment && this.state.error && (
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-mono text-destructive">
                        {this.state.error.toString()}
                      </p>
                      {this.state.error.stack && (
                        <pre className="text-xs overflow-x-auto p-2 bg-muted rounded">
                          {this.state.error.stack}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={this.handleReset}
                  variant="default"
                  size="sm"
                  className="gap-2"
                  data-testid="button-error-retry"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
                <Button
                  onClick={() => window.history.back()}
                  variant="outline"
                  size="sm"
                  data-testid="button-error-back"
                >
                  Go Back
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Section-specific error boundary with custom messaging
export function SectionErrorBoundary({ 
  children, 
  sectionName,
  onError
}: { 
  children: ReactNode; 
  sectionName: string;
  onError?: (error: Error) => void;
}) {
  return (
    <ErrorBoundary 
      sectionName={sectionName}
      onReset={() => {
        // Clear any cached data for this section
        window.location.reload();
      }}
    >
      {children}
    </ErrorBoundary>
  );
}