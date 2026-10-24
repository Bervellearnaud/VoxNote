import { useState } from 'react';
import { X, Database, KeyRound, ExternalLink, AlertCircle, Check } from 'lucide-react';
import {
  saveRuntimeSupabaseConfig,
  clearRuntimeSupabaseConfig,
  hasRuntimeConfig,
} from '../lib/supabaseClient';

export default function SupabaseSetupModal({ isOpen, onClose }) {
  const [url, setUrl] = useState('');
  const [anonKey, setAnonKey] = useState('');
  const [error, setError] = useState(null);
  const [copiedEnv, setCopiedEnv] = useState(false);

  if (!isOpen) return null;

  const envSnippet = `VITE_SUPABASE_URL=https://votre-projet.supabase.co\nVITE_SUPABASE_ANON_KEY=votre-cle-anon-publique`;

  const handleCopyEnv = async () => {
    try {
      await navigator.clipboard.writeText(envSnippet);
      setCopiedEnv(true);
      setTimeout(() => setCopiedEnv(false), 2000);
    } catch {
      // Ignore clipboard restriction
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setError(null);
    try {
      saveRuntimeSupabaseConfig(url, anonKey);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Connecter votre projet Supabase
              </h2>
              <p className="text-xs text-slate-500">
                Activez PostgreSQL, l&apos;authentification et les règles RLS
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-700 space-y-2">
            <p className="font-semibold text-slate-900">
              Méthode recommandée (fichier <code className="text-indigo-600">.env</code> à la racine) :
            </p>
            <ol className="list-decimal list-inside space-y-1 text-slate-600">
              <li>
                Exécutez le script <code className="font-mono text-slate-800">supabase/schema.sql</code> dans le{' '}
                <span className="font-medium">SQL Editor</span> de Supabase.
              </li>
              <li>
                Copiez <code className="font-mono text-slate-800">.env.example</code> vers{' '}
                <code className="font-mono text-slate-800">.env</code> avec vos identifiants API :
              </li>
            </ol>
            <div className="relative mt-2">
              <pre className="bg-slate-900 text-slate-100 rounded-lg p-3 font-mono text-[11px] overflow-x-auto">
                {envSnippet}
              </pre>
              <button
                type="button"
                onClick={handleCopyEnv}
                className="absolute top-2 right-2 px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
              >
                {copiedEnv ? <Check className="h-3 w-3 text-emerald-400" /> : null}
                {copiedEnv ? 'Copié' : 'Copier'}
              </button>
            </div>
          </div>

          <form onSubmit={handleSave} className="space-y-3.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
              <KeyRound className="h-4 w-4 text-indigo-600" />
              <span>Ou tester directement depuis cet aperçu :</span>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-3 flex items-start gap-2 text-xs text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Project URL (<code className="text-slate-500">VITE_SUPABASE_URL</code>)
              </label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Anon Public Key (<code className="text-slate-500">VITE_SUPABASE_ANON_KEY</code>)
              </label>
              <input
                type="password"
                required
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
              />
            </div>

            <div className="flex items-center justify-between pt-2 gap-3">
              {hasRuntimeConfig ? (
                <button
                  type="button"
                  onClick={clearRuntimeSupabaseConfig}
                  className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
                >
                  Supprimer les clés locales
                </button>
              ) : (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" /> Stocké uniquement dans votre navigateur
                </span>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Fermer
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition cursor-pointer"
                >
                  Connecter Supabase
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
