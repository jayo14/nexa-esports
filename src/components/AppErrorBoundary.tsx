import React from 'react';
import { supabase } from '@/integrations/supabase/client';

type AppErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
};

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  private lastTelemetryAt = 0;
  private telemetryClient = supabase as any;

  state: AppErrorBoundaryState = {
    hasError: false,
    errorMessage: '',
  };

  private sendTelemetry = async (payload: {
    error_type: 'render' | 'global' | 'unhandledrejection';
    message: string;
    stack?: string | null;
  }) => {
    const now = Date.now();
    if (now - this.lastTelemetryAt < 3000) return;
    this.lastTelemetryAt = now;

    try {
      await this.telemetryClient.from('app_error_logs').insert({
        error_type: payload.error_type,
        message: payload.message,
        stack: payload.stack || null,
        path: window.location.pathname,
        user_agent: navigator.userAgent,
      });
    } catch (telemetryError) {
      console.error('Telemetry insert failed:', telemetryError);
    }
  };

  private isIgnorableServiceWorkerError = (message?: string) => {
    if (!message) return false;
    const normalized = message.toLowerCase();
    return (
      normalized.includes('failed to register a serviceworker') ||
      normalized.includes('script resource is behind a redirect') ||
      normalized.includes('dev-sw.js?dev-sw')
    );
  };

  private handleGlobalError = (event: ErrorEvent) => {
    const message = event.error?.message || event.message || 'Unexpected application error.';

    if (this.isIgnorableServiceWorkerError(message)) {
      console.warn('Ignored service worker registration error:', message);
      return;
    }

    this.setState({
      hasError: true,
      errorMessage: message,
    });

    void this.sendTelemetry({
      error_type: 'global',
      message,
      stack: event.error?.stack || null,
    });
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message = typeof reason === 'string'
      ? reason
      : reason?.message || 'Unhandled async error.';

    if (this.isIgnorableServiceWorkerError(message)) {
      console.warn('Ignored service worker registration rejection:', message);
      return;
    }

    this.setState({
      hasError: true,
      errorMessage: message,
    });

    const reasonStack = typeof reason === 'object' && reason?.stack ? String(reason.stack) : null;
    void this.sendTelemetry({
      error_type: 'unhandledrejection',
      message,
      stack: reasonStack,
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

    const mergedStack = [error.stack, errorInfo.componentStack].filter(Boolean).join('\n');
    void this.sendTelemetry({
      error_type: 'render',
      message: error.message || 'Unexpected render error.',
      stack: mergedStack || null,
    });
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
