import { StrictMode, Component } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './hooks/usePwaInstall.js';
import App from './App.jsx';

// Enregistrement du Service Worker PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Ignore en cas de restriction navigateur privé
    });
  });
}

class RootErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl border border-red-200 p-6 shadow-sm space-y-3">
            <h1 className="text-base font-bold text-slate-900">
              Une erreur inattendue est survenue
            </h1>
            <p className="text-xs text-red-700 bg-red-50 p-3 rounded-xl font-mono break-words">
              {this.state.error?.message || String(this.state.error)}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold cursor-pointer"
            >
              Recharger l&apos;application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>
);
