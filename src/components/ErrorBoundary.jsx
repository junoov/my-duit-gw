import React from "react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-surface-container-lowest">
          <div className="bg-surface-container-low p-8 rounded-3xl max-w-md w-full text-center space-y-4 shadow-xl border border-error/20">
            <span className="material-symbols-outlined text-5xl text-error">error</span>
            <h1 className="text-xl font-bold text-on-surface">Oops, terjadi kesalahan.</h1>
            <p className="text-sm text-on-surface-variant">
              Aplikasi mengalami kendala teknis. Coba muat ulang halaman ini.
            </p>
            <p className="text-xs bg-surface-container-highest p-3 rounded-xl text-error text-left overflow-auto max-h-32 mb-4">
              {this.state.error?.toString()}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="bg-primary text-on-primary font-bold py-3 px-6 rounded-full hover:bg-primary/90 transition-colors w-full"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
