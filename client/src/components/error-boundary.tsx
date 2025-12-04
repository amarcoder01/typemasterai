import React, { Component, ReactNode, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw, Home, Bug, ChevronDown, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ComponentErrorInfo {
  componentStack: string;
}

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: string;
  url: string;
  userAgent: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ComponentErrorInfo) => void;
  onReset?: () => void;
  showReportButton?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ComponentErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
  copied: boolean;
}

function generateErrorReport(error: Error, errorInfo?: ComponentErrorInfo | null): ErrorReport {
  return {
    message: error.message,
    stack: error.stack,
    componentStack: errorInfo?.componentStack,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent,
  };
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;

  static defaultProps = {
    showReportButton: true,
    maxRetries: 2,
    retryDelay: 1000,
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    this.setState({ errorInfo: errorInfo as unknown as ComponentErrorInfo });
    
    this.props.onError?.(error, errorInfo as unknown as ComponentErrorInfo);
    
    if (process.env.NODE_ENV === "production") {
      this.reportError(error, errorInfo as unknown as ComponentErrorInfo);
    }
  }

  componentWillUnmount() {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  private async reportError(error: Error, errorInfo: ComponentErrorInfo) {
    const report = generateErrorReport(error, errorInfo);
    
    try {
      await fetch("/api/error-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
      });
    } catch {
    }
  }

  private handleRetry = () => {
    const { maxRetries = 2, retryDelay = 1000 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      return;
    }

    this.setState({ isRetrying: true });

    const delay = retryDelay * Math.pow(2, retryCount);

    this.retryTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        isRetrying: false,
        retryCount: retryCount + 1,
      });
      this.props.onReset?.();
    }, delay);
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    });
    this.props.onReset?.();
  };

  private handleGoHome = () => {
    window.location.href = "/";
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleCopyError = async () => {
    const { error, errorInfo } = this.state;
    if (!error) return;

    const report = generateErrorReport(error, errorInfo);
    const text = JSON.stringify(report, null, 2);

    try {
      await navigator.clipboard.writeText(text);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    } catch {
    }
  };

  render() {
    const { hasError, error, errorInfo, retryCount, isRetrying, copied } = this.state;
    const { children, fallback, maxRetries = 2, showReportButton } = this.props;

    if (!hasError) {
      return children;
    }

    if (fallback) {
      return fallback;
    }

    const canRetry = retryCount < maxRetries;
    const isDev = process.env.NODE_ENV === "development";

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-destructive/10 p-4">
                <AlertTriangle className="h-12 w-12 text-destructive" />
              </div>
            </div>
            <CardTitle className="text-2xl">Something went wrong</CardTitle>
            <CardDescription>
              We encountered an unexpected error. Don't worry, your data is safe.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {retryCount > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                Retry attempt {retryCount} of {maxRetries}
              </p>
            )}

            {isDev && error && (
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between" data-testid="button-toggle-error-details">
                    <span className="flex items-center gap-2">
                      <Bug className="h-4 w-4" />
                      Error Details
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="bg-muted/50 p-4 rounded-lg mt-2 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Error message</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={this.handleCopyError}
                        className="h-6 px-2"
                        data-testid="button-copy-error"
                      >
                        {copied ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                    <p className="text-sm font-mono text-destructive break-all">
                      {error.message}
                    </p>
                    {error.stack && (
                      <pre className="text-xs font-mono text-muted-foreground overflow-auto max-h-40 mt-2">
                        {error.stack}
                      </pre>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <div className="flex gap-3 w-full">
              {canRetry && (
                <Button
                  onClick={this.handleRetry}
                  disabled={isRetrying}
                  className="flex-1"
                  data-testid="button-retry"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Try Again
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={this.handleReload}
                className="flex-1"
                data-testid="button-reload"
              >
                Reload Page
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={this.handleGoHome}
              className="w-full"
              data-testid="button-go-home"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
}

interface AsyncErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error) => void;
}

export function AsyncErrorBoundary({ children, fallback, onError }: AsyncErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason instanceof Error 
        ? event.reason 
        : new Error(String(event.reason));
      
      console.error("Unhandled promise rejection:", error);
      setError(error);
      onError?.(error);
    };

    const handleError = (event: ErrorEvent) => {
      console.error("Unhandled error:", event.error);
      setError(event.error || new Error(event.message));
      onError?.(event.error || new Error(event.message));
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, [onError]);

  if (error) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <ErrorBoundary>
        <ErrorThrower error={error} />
      </ErrorBoundary>
    );
  }

  return <>{children}</>;
}

function ErrorThrower({ error }: { error: Error }): never {
  throw error;
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, "children">
) {
  const WithErrorBoundary = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `WithErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || "Component"
  })`;

  return WithErrorBoundary;
}
