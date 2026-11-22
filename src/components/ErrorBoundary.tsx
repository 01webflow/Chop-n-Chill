import { AlertTriangle, Check, Copy, RefreshCw, RotateCcw } from 'lucide-react';
import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface AssetDiagnostic {
  tag: 'script' | 'stylesheet';
  hrefOrSrc: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  capturedAt: string | null;
  copied: boolean;
  resetCount: number;
}

function collectDeploymentSnapshot(): {
  url: string;
  baseUri: string;
  baseUrlEnv: string;
  assets: AssetDiagnostic[];
} {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { url: '', baseUri: '', baseUrlEnv: '', assets: [] };
  }
  const scripts: AssetDiagnostic[] = Array.from(document.querySelectorAll('script[src]')).map(
    (el) => ({
      tag: 'script',
      hrefOrSrc: el.getAttribute('src') || '',
    })
  );
  const styles: AssetDiagnostic[] = Array.from(
    document.querySelectorAll('link[rel="stylesheet"][href]')
  ).map((el) => ({
    tag: 'stylesheet',
    hrefOrSrc: el.getAttribute('href') || '',
  }));

  return {
    url: window.location.href,
    baseUri: document.baseURI,
    baseUrlEnv: import.meta.env?.BASE_URL || '/',
    assets: [...scripts, ...styles],
  };
}

function inferDiagnosticHint(error: Error | null): string {
  const msg = (error?.message || '').toLowerCase();
  if (
    msg.includes('failed to fetch dynamically imported module') ||
    msg.includes('loading chunk') ||
    msg.includes('importing a module script failed')
  ) {
    return 'A JavaScript chunk failed to load—typically caused by an incorrect Vite base path or missing dist/assets files on static hosting.';
  }
  if (msg.includes('unexpected token') && msg.includes('<')) {
    return 'An HTML 404 page was returned where JavaScript or JSON was expected—verify static build output (dist/) and relative "./" asset paths.';
  }
  if (msg.includes('webgl') || msg.includes('three')) {
    return '3D WebGL initialization encountered an unsupported browser context. Resetting or reloading should fall back to static venue photography.';
  }
  return 'Inspect the error message and deployment environment paths below to pinpoint the startup failure.';
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    capturedAt: null,
    copied: false,
    resetCount: 0,
  };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      capturedAt: new Date().toISOString(),
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[ErrorBoundary] Uncaught application error:', error, info);
    this.setState({ error, errorInfo: info });
  }

  private handleReset = (): void => {
    this.props.onReset?.();
    this.setState((prev) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      capturedAt: null,
      copied: false,
      resetCount: prev.resetCount + 1,
    }));
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  private buildReportText(): string {
    const snapshot = collectDeploymentSnapshot();
    return [
      "Chop 'n Chill Kasoa — Error Boundary Diagnostic Report",
      `Timestamp: ${this.state.capturedAt || new Date().toISOString()}`,
      `Error: ${this.state.error?.name || 'Error'}: ${this.state.error?.message || 'Unknown error'}`,
      `URL: ${snapshot.url}`,
      `Document BaseURI: ${snapshot.baseUri}`,
      `Vite BASE_URL: ${snapshot.baseUrlEnv}`,
      `Assets in DOM: ${snapshot.assets.map((a) => `${a.tag}=${a.hrefOrSrc}`).join(', ') || 'none'}`,
      '',
      'Stack Trace:',
      this.state.error?.stack || 'Unavailable',
      '',
      'Component Stack:',
      this.state.errorInfo?.componentStack || 'Unavailable',
    ].join('\n');
  }

  private handleCopyReport = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(this.buildReportText());
      this.setState({ copied: true });
      window.setTimeout(() => this.setState({ copied: false }), 2500);
    } catch {
      // Clipboard API unavailable in restricted contexts
    }
  };

  render() {
    if (this.state.hasError) {
      const snapshot = collectDeploymentSnapshot();
      const hint = inferDiagnosticHint(this.state.error);
      const errorTitle = this.state.error?.name || 'Application Error';
      const errorMessage =
        this.state.error?.message || 'An unexpected error interrupted initial rendering.';

      return (
        <div
          role="alert"
          aria-live="assertive"
          className="min-h-screen bg-[#101010] text-[#F8F4EC] flex items-center justify-center p-5 sm:p-8"
        >
          <div className="max-w-2xl w-full border border-[#C9A45C]/40 bg-[#161616] rounded-sm p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-sm bg-[#C9A45C]/15 border border-[#C9A45C]/40 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-[#DFC082]" />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#C9A45C] mb-1">
                  Chop &apos;n Chill Restaurant &amp; Lounge · Recovery Mode
                </p>
                <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#F8F4EC]">
                  Something went wrong loading this view
                </h1>
                <p className="text-sm text-[#C8BFA8] mt-2 leading-relaxed">{hint}</p>
              </div>
            </div>

            {/* Concise Error Summary Box */}
            <div className="rounded-sm border border-[#F8F4EC]/12 bg-[#101010] p-4 space-y-2 text-xs font-mono">
              <p className="text-[#DFC082] font-semibold break-words">
                {errorTitle}: {errorMessage}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-[#F8F4EC]/10 text-[#A9A191]">
                <p className="truncate" title={snapshot.url}>
                  <span className="text-[#9A9282]">URL:</span> {snapshot.url || 'N/A'}
                </p>
                <p className="truncate" title={snapshot.baseUrlEnv}>
                  <span className="text-[#9A9282]">BASE_URL:</span> {snapshot.baseUrlEnv || './'}
                </p>
              </div>
            </div>

            {/* Recovery Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-[0.14em] hover:bg-[#DFC082] transition-colors min-h-[44px]"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-sm border border-[#C9A45C]/45 text-xs font-semibold uppercase tracking-[0.14em] text-[#F8F4EC] hover:border-[#C9A45C] transition-colors min-h-[44px]"
              >
                <RefreshCw className="w-4 h-4 text-[#C9A45C]" />
                <span>Reload Page</span>
              </button>
              <button
                type="button"
                onClick={this.handleCopyReport}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-sm border border-[#F8F4EC]/15 text-xs font-semibold uppercase tracking-[0.12em] text-[#C8BFA8] hover:border-[#C9A45C]/45 hover:text-[#F8F4EC] transition-colors min-h-[44px]"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-4 h-4 text-[#34D399]" />
                    <span>Report Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Error Report</span>
                  </>
                )}
              </button>
              <a
                href="tel:+233554903755"
                className="inline-flex items-center px-4 py-3 rounded-sm text-xs font-semibold uppercase tracking-[0.12em] text-[#DFC082] hover:underline min-h-[44px]"
              >
                Call +233 55 490 3755
              </a>
            </div>

            {/* Expandable Diagnostic Details */}
            <details className="rounded-sm border border-[#F8F4EC]/10 bg-[#121212] p-4 text-xs text-[#C8BFA8]">
              <summary className="cursor-pointer font-semibold uppercase tracking-[0.14em] text-[#DFC082] select-none">
                Technical Error &amp; Asset Diagnostics
              </summary>
              <div className="mt-3 space-y-3 font-mono text-[11px] leading-relaxed">
                <div>
                  <p className="text-[#9A9282] mb-1">Base URI &amp; Loaded DOM Assets:</p>
                  <p className="break-all text-[#E6DFD1]">document.baseURI: {snapshot.baseUri}</p>
                  <ul className="mt-1 space-y-0.5 text-[#A9A191]">
                    {snapshot.assets.map((asset, i) => (
                      <li key={`${asset.tag}-${i}`} className="break-all">
                        [{asset.tag}] {asset.hrefOrSrc}
                      </li>
                    ))}
                  </ul>
                </div>
                {this.state.error?.stack && (
                  <div>
                    <p className="text-[#9A9282] mb-1">Stack Trace:</p>
                    <pre className="whitespace-pre-wrap break-words bg-[#0B0B0B] p-3 rounded-sm border border-[#F8F4EC]/10 max-h-48 overflow-auto text-[#D8D0C0]">
                      {this.state.error.stack}
                    </pre>
                  </div>
                )}
                {this.state.errorInfo?.componentStack && (
                  <div>
                    <p className="text-[#9A9282] mb-1">React Component Stack:</p>
                    <pre className="whitespace-pre-wrap break-words bg-[#0B0B0B] p-3 rounded-sm border border-[#F8F4EC]/10 max-h-40 overflow-auto text-[#D8D0C0]">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>
          </div>
        </div>
      );
    }

    return <div key={this.state.resetCount}>{this.props.children}</div>;
  }
}
