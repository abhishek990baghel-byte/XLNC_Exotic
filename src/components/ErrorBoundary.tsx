import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    const errorDetails = {
      message: error.message,
      name: error.name,
      stack: error.stack,
      componentStack: errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    // Structured logging capturing component stack traces
    console.error('CRITICAL: UI Render Crash Caught by ErrorBoundary:', errorDetails);

    // Persistent logging service integration
    try {
      fetch('/api/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UI_RENDER_CRASH',
          user_name: 'System',
          details: `Crash in ${window.location.pathname}: ${error.message}`,
        }),
      }).catch(() => {});
    } catch (_) {
      // Ignore reporting errors
    }
  }

  private handleReset = () => {
    console.warn('Clearing session-specific problematic state to break the error loop.');
    try {
      // Clear potentially corrupted local/session state
      sessionStorage.clear();
      localStorage.removeItem('auth_role');
      // Add any other specific items here if needed
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
    
    // Redirect to root to escape potentially broken route state
    window.location.href = '/';
  };

  private handleReload = () => {
    // Prevent infinite rapid re-render/reload loops during crash recovery
    const lastReloadKey = 'eb_last_reload';
    const lastReload = sessionStorage.getItem(lastReloadKey);
    const now = Date.now();

    if (lastReload && now - parseInt(lastReload, 10) < 3000) {
      console.warn('Rapid crash loop detected on reload. Falling back to hard reset.');
      this.handleReset();
      return;
    }

    sessionStorage.setItem(lastReloadKey, now.toString());
    window.location.reload();
  };

  private toggleDetails = () => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[80vh] bg-gray-50 flex flex-col justify-center items-center p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 max-w-xl w-full text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]"></div>
            <div className="w-16 h-16 bg-zinc-900 text-[#D4AF37] rounded-full flex items-center justify-center mx-auto mb-5 shadow-md">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-tight">System Exception Detected</h1>
            <p className="text-gray-600 mb-6 text-sm">
              An unexpected error occurred while rendering this component. The rest of the portal remains operational.
            </p>

            {this.state.error && (
              <div className="bg-zinc-900 text-zinc-100 p-4 rounded-lg text-left mb-6 text-xs font-mono border border-zinc-800 overflow-x-auto">
                <div className="font-semibold text-red-400 mb-1">
                  {this.state.error.name}: {this.state.error.message}
                </div>
                
                {this.state.errorInfo?.componentStack && (
                  <div className="mt-3 pt-3 border-t border-zinc-800">
                    <button
                      type="button"
                      onClick={this.toggleDetails}
                      className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors focus:outline-none"
                    >
                      {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {this.state.showDetails ? 'Hide Component Stack' : 'View Component Stack Trace'}
                    </button>
                    {this.state.showDetails && (
                      <pre className="mt-2 text-[10px] leading-relaxed text-zinc-400 whitespace-pre-wrap max-h-48 overflow-y-auto">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-medium text-sm rounded-lg transition-colors border border-zinc-300"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Clear State & Reset
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center px-4 py-2.5 bg-[#D4AF37] hover:bg-[#c29e30] text-black font-semibold text-sm rounded-lg transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Application
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

