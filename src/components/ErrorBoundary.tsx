import { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Application render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#101010] text-[#F8F4EC] flex items-center justify-center p-6">
          <div className="max-w-lg w-full border border-[#C9A45C]/40 bg-[#181818] rounded-sm p-8 text-center space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C9A45C]">
              Chop &apos;n Chill Restaurant &amp; Lounge · Kasoa
            </p>
            <h1 className="font-display text-2xl font-semibold text-[#F8F4EC]">
              Unable to display this page cleanly
            </h1>
            <p className="text-sm text-[#C8BFA8] leading-relaxed">
              Please reload the page. For immediate table reservations or menu enquiries, call or
              WhatsApp us at +233 55 490 3755.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-sm bg-[#C9A45C] text-[#101010] text-xs font-semibold uppercase tracking-[0.14em]"
              >
                Reload Page
              </button>
              <a
                href="tel:+233554903755"
                className="px-5 py-2.5 rounded-sm border border-[#C9A45C]/45 text-xs font-semibold uppercase tracking-[0.14em] text-[#DFC082]"
              >
                Call +233 55 490 3755
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
