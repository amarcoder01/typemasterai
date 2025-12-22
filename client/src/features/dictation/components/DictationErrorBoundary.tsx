import React, { Component, type ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'wouter';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary for Dictation Mode
 * Catches errors and provides recovery options
 */
export class DictationErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Log error to console
    console.error('Dictation Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
    
    // TODO: Send to error reporting service
    // reportError(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleClearAndRefresh = (): void => {
    // Clear session backup to prevent corrupted state
    try {
      localStorage.removeItem('dictation_session_backup');
    } catch (e) {
      console.error('Failed to clear session backup:', e);
    }
    
    // Reload the page
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="container max-w-2xl mx-auto p-6">
          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-destructive">
                <AlertCircle className="w-6 h-6" />
                Something went wrong
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                We encountered an error in Dictation Mode. Don't worry, your streak 
                and overall progress are safe.
              </p>

              {/* Error details (collapsed by default) */}
              <details className="group">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Technical details
                </summary>
                <div className="mt-2 p-3 bg-muted rounded-md overflow-auto max-h-32">
                  <code className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap">
                    {this.state.error?.message || 'Unknown error'}
                    {this.state.error?.stack && (
                      <>
                        {'\n\n'}
                        {this.state.error.stack}
                      </>
                    )}
                  </code>
                </div>
              </details>

              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  onClick={this.handleReset}
                  className="flex-1 gap-2"
                  variant="default"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>

                <Button
                  onClick={this.handleClearAndRefresh}
                  className="flex-1 gap-2"
                  variant="outline"
                >
                  <RefreshCw className="w-4 h-4" />
                  Clear & Refresh
                </Button>

                <Link href="/">
                  <Button variant="ghost" className="w-full sm:w-auto gap-2">
                    <Home className="w-4 h-4" />
                    Go Home
                  </Button>
                </Link>
              </div>

              <p className="text-xs text-muted-foreground text-center pt-2">
                If this keeps happening, please contact support.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to manually trigger error boundary
 * Useful for handling async errors
 */
export function useErrorHandler(): (error: Error) => void {
  const [, setError] = React.useState<Error | null>(null);
  
  return React.useCallback((error: Error) => {
    setError(() => {
      throw error;
    });
  }, []);
}
