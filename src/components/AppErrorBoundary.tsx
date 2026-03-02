import React from 'react';

type AppErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
};

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  private handleGlobalError = (event: ErrorEvent) => {
    this.setState({
      hasError: true,
      errorMessage: event.error?.message || event.message || 'Unexpected application error.',
    });
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message = typeof reason === 'string'
      ? reason
      : reason?.message || 'Unhandled async error.';

    this.setState({
      hasError: true,
      errorMessage: message,
    });
  };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'Unexpected render error.',
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App crashed:', error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
  }

  private handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full bg-background text-foreground flex items-center justify-center px-6">
          <div className="max-w-md w-full rounded-2xl border border-border bg-card/80 backdrop-blur p-6 text-center space-y-4">
            <h1 className="text-xl font-bold">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The app hit an unexpected error and recovered into safe mode.
            </p>
            {this.state.errorMessage && (
              <p className="text-xs text-destructive break-words">{this.state.errorMessage}</p>
            )}
            <button
              onClick={this.handleReload}
              className="inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
