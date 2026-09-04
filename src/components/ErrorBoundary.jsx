import React from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught an error]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-6 text-white" id="error-boundary-screen">
          <div className="max-w-md w-full bg-[#111112] border border-white/10 rounded-md p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-full bg-red-brand/10 border border-red-brand/30 flex items-center justify-center mx-auto text-red-brand">
              <AlertCircle size={24} />
            </div>
            <h2 className="font-display font-bold text-lg uppercase tracking-wide">
              Ha ocurrido un detalle visual
            </h2>
            <p className="text-xs text-zinc-400 leading-relaxed">
              {this.state.error?.message || 'La aplicación experimentó un problema temporal. Tus datos de sesión y perfil están seguros.'}
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-brand hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors cursor-pointer"
              >
                <RefreshCw size={13} /> Recargar Página
              </button>
              <a
                href="/"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-sm transition-colors"
              >
                <Home size={13} /> Inicio
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
