import React, { Component } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[UniX Uncaught Error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-lg border border-brand-secondary/25 p-6 sm:p-8 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h1 className="text-lg sm:text-xl font-bold text-ink-primary">
              Something went wrong
            </h1>

            <p className="mt-2 text-xs sm:text-sm text-ink-secondary leading-relaxed">
              An unexpected error occurred. Please try reloading the application or navigating back to the home page.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-control text-xs font-semibold text-white bg-brand-primary hover:bg-brand-secondary active:bg-brand-primary transition-colors cursor-pointer w-full sm:w-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Reload</span>
              </button>

              <button
                type="button"
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-control text-xs font-semibold text-ink-primary hover:bg-brand-primary/5 border border-brand-secondary/25 transition-colors cursor-pointer w-full sm:w-auto"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Go to home</span>
              </button>
            </div>

            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left border-t border-brand-secondary/15 pt-4">
                <summary className="text-[11px] font-semibold text-red-600 cursor-pointer hover:underline">
                  Error Details (Dev Only)
                </summary>
                <pre className="mt-2 p-2.5 bg-brand-bg rounded-control border border-brand-secondary/20 text-[10px] text-ink-secondary font-mono overflow-x-auto whitespace-pre-wrap max-h-48 scrollbar-none">
                  {this.state.error.toString()}
                  {this.state.error.stack ? `\n\n${this.state.error.stack}` : ''}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
