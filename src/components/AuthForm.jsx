import { useState } from 'react';
import { Mic, Mail, Lock, ArrowRight, Loader2, ShieldCheck, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase, hasRuntimeConfig, clearRuntimeSupabaseConfig } from '../lib/supabaseClient';

function translateAuthError(message = '') {
  if (message.includes('Invalid login credentials')) {
    return 'Identifiants incorrects. Vérifiez votre adresse e-mail et votre mot de passe (ou créez un compte).';
  }
  if (message.includes('Email not confirmed')) {
    return 'Votre adresse e-mail n’a pas encore été confirmée. Vérifiez votre boîte de réception.';
  }
  if (message.includes('User already registered')) {
    return 'Un compte existe déjà avec cette adresse e-mail. Passez sur l’onglet « Connexion ».';
  }
  if (message.includes('Password should be at least')) {
    return 'Le mot de passe doit contenir au moins 6 caractères.';
  }
  return message || "Une erreur est survenue lors de l'authentification.";
}

export default function AuthForm({ onEnterDemoMode }) {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) throw error;

        if (data?.user && !data?.session) {
          setSuccessMsg(
            'Compte créé ! Vérifiez votre boîte mail pour confirmer votre adresse avant de vous connecter.'
          );
          setMode('signin');
        }
      }
    } catch (err) {
      setErrorMsg(translateAuthError(err?.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25">
            <Mic className="h-7 w-7" />
          </div>
        </div>
        <h1 className="mt-5 text-center text-3xl font-bold tracking-tight text-slate-900">
          VoxNote
        </h1>
        <p className="mt-2 text-center text-sm text-slate-600">
          Vos notes intelligentes au clavier et à la voix, sécurisées avec Supabase RLS.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-200/80 sm:px-10">
          {/* Sélecteur Connexion / Inscription */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-sm font-medium rounded-lg transition ${
                mode === 'signin'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Connexion
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-sm font-medium rounded-lg transition ${
                mode === 'signup'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Créer un compte
            </button>
          </div>

          {errorMsg && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3.5 flex items-start gap-2.5 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-2.5 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1.5">
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vous@exemple.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm shadow-indigo-600/20 transition cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  {mode === 'signin' ? 'Se connecter' : 'Créer mon compte'}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500 justify-center">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>Protection Row Level Security (RLS) activée par utilisateur</span>
            </div>

            {onEnterDemoMode && (
              <button
                type="button"
                onClick={onEnterDemoMode}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-700 underline underline-offset-2 text-center cursor-pointer"
              >
                Explorer le tableau de bord en Mode Démo local
              </button>
            )}

            {hasRuntimeConfig && (
              <button
                type="button"
                onClick={clearRuntimeSupabaseConfig}
                className="text-xs text-slate-500 hover:text-slate-700 text-center cursor-pointer"
              >
                Réinitialiser la configuration Supabase personnalisée
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
