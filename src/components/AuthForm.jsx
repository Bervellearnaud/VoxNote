import { useState, useEffect, useMemo } from 'react';
import {
  Mic,
  Camera,
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Wifi,
} from 'lucide-react';
import {
  supabase,
  activeSupabaseUrl,
  activeSupabaseAnonKey,
  hasRuntimeConfig,
  clearRuntimeSupabaseConfig,
} from '../lib/supabaseClient';

function translateAuthError(err) {
  const message = err?.message || '';
  const code = err?.code || '';
  const rawDetail = [code, message].filter(Boolean).join(' — ');

  if (
    code === 'signup_disabled' ||
    message.toLowerCase().includes('signups not allowed')
  ) {
    return {
      text: 'Les inscriptions sont encore désactivées dans Supabase. Activez « Allow new users to sign up » dans Supabase → Authentication → Sign In / Providers, puis cliquez sur « Save changes ».',
      rawDetail,
      suggestAction: null,
    };
  }

  if (
    code === 'email_provider_disabled' ||
    message.toLowerCase().includes('email logins are disabled')
  ) {
    return {
      text: 'La connexion par e-mail est désactivée dans Supabase ! Descendez juste en dessous de User Signups dans « Auth Providers → Email » et activez « Enable Email provider », puis sauvegardez.',
      rawDetail,
      suggestAction: null,
    };
  }

  if (
    code === 'invalid_credentials' ||
    message.includes('Invalid login credentials')
  ) {
    return {
      text: "Aucun compte trouvé avec ces identifiants (ou mot de passe différent). Si votre compte n'avait pas pu être créé tout à l'heure, cliquez ci-dessous pour le créer maintenant :",
      rawDetail,
      suggestAction: 'instant_signup',
    };
  }

  if (
    code === 'email_not_confirmed' ||
    message.includes('Email not confirmed')
  ) {
    return {
      text: "Ce compte avait été créé avant la désactivation de « Confirm email » et attend encore d'être validé. Dans Supabase → Authentication → Users, cliquez sur les 3 points (⋮) à droite de votre e-mail → « Confirm user » (ou supprimez la ligne puis recréez le compte ici).",
      rawDetail,
      suggestAction: null,
    };
  }

  if (
    code === 'user_already_exists' ||
    message.includes('User already registered')
  ) {
    return {
      text: 'Ce compte existe déjà dans Supabase ! Cliquez ci-dessous pour vous connecter directement avec cet e-mail.',
      rawDetail,
      suggestAction: 'instant_signin',
    };
  }

  if (
    code === 'over_email_send_rate_limit' ||
    message.toLowerCase().includes('rate limit')
  ) {
    return {
      text: "Limite d'envoi d'e-mails Supabase atteinte. Assurez-vous que « Confirm email » est bien désactivé (Save changes) dans Supabase → Authentication → Sign In / Providers.",
      rawDetail,
      suggestAction: null,
    };
  }

  if (message.includes('Password should be at least')) {
    return {
      text: 'Le mot de passe doit contenir au moins 6 caractères.',
      rawDetail,
      suggestAction: null,
    };
  }

  if (message.toLowerCase().includes('invalid api key')) {
    return {
      text: 'Clé publique Supabase (VITE_SUPABASE_ANON_KEY) refusée. Vérifiez vos variables sur Netlify (sans espace ni guillemets) puis relancez un déploiement.',
      rawDetail,
      suggestAction: null,
    };
  }

  return {
    text: message || "Une erreur est survenue lors de l'authentification.",
    rawDetail,
    suggestAction: null,
  };
}

function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: 'bg-slate-200' };
  if (pwd.length < 6) {
    return {
      score: 1,
      label: 'Trop court (6 caractères min.)',
      color: 'bg-red-500',
    };
  }
  let score = 2;
  if (pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) {
    score = 3;
  }
  if (pwd.length >= 10 && /[^A-Za-z0-9]/.test(pwd)) {
    score = 4;
  }
  const map = {
    2: { label: 'Correct', color: 'bg-amber-500' },
    3: { label: 'Bon mot de passe', color: 'bg-emerald-500' },
    4: { label: 'Très robuste', color: 'bg-emerald-600' },
  };
  return { score, ...map[score] };
}

export default function AuthForm({ onEnterDemoMode }) {
  const [mode, setMode] = useState('signup'); // 'signin' | 'signup' | 'reset'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Diagnostic temps réel de la configuration Auth Supabase
  const [serverStatus, setServerStatus] = useState(null);

  useEffect(() => {
    if (!activeSupabaseUrl || !activeSupabaseAnonKey) return undefined;
    let cancelled = false;

    async function checkSupabaseAuthSettings() {
      try {
        const res = await fetch(`${activeSupabaseUrl}/auth/v1/settings`, {
          headers: { apikey: activeSupabaseAnonKey },
        });

        if (cancelled) return;

        if (res.status === 401 || res.status === 403) {
          setServerStatus({
            ok: false,
            warning:
              'Clé API Supabase refusée (401). Vérifiez VITE_SUPABASE_ANON_KEY dans vos paramètres Netlify.',
          });
          return;
        }

        if (!res.ok) {
          setServerStatus({
            ok: false,
            warning: `Serveur Supabase Auth indisponible (HTTP ${res.status}).`,
          });
          return;
        }

        const settings = await res.json();
        if (cancelled) return;

        if (settings?.external?.email === false) {
          setServerStatus({
            ok: false,
            warning:
              'Le fournisseur « Email » est désactivé dans Supabase ! Allez dans Authentication → Sign In / Providers → Auth Providers → Email et activez « Enable Email provider ».',
          });
        } else if (settings?.disable_signup === true) {
          setServerStatus({
            ok: false,
            warning:
              '« Allow new users to sign up » est encore désactivé dans Supabase ! Activez-le et cliquez sur « Save changes ».',
          });
        } else {
          setServerStatus({
            ok: true,
            autoconfirm: Boolean(settings?.mailer_autoconfirm),
          });
        }
      } catch {
        if (!cancelled) {
          setServerStatus({
            ok: false,
            warning:
              "Impossible de joindre l'URL Supabase. Vérifiez VITE_SUPABASE_URL.",
          });
        }
      }
    }

    checkSupabaseAuthSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const passwordStrength = useMemo(
    () => getPasswordStrength(password),
    [password]
  );

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setErrorInfo(null);
    setSuccessMsg(null);
  };

  const executeSignUp = async (cleanEmail, pwd) => {
    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: pwd,
      options: {
        emailRedirectTo: window.location.origin,
        data: fullName.trim() ? { full_name: fullName.trim() } : undefined,
      },
    });

    if (error) throw error;

    if (
      data?.user &&
      Array.isArray(data.user.identities) &&
      data.user.identities.length === 0
    ) {
      setMode('signin');
      setErrorInfo({
        text: 'Ce compte existe déjà dans Supabase. Connectez-vous avec votre mot de passe ci-dessous.',
        rawDetail: 'identities_empty',
        suggestAction: null,
      });
      return;
    }

    if (data?.user && !data?.session) {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pwd,
      });

      if (signInErr) {
        if (signInErr.message?.includes('Email not confirmed')) {
          setErrorInfo(translateAuthError(signInErr));
        } else {
          setSuccessMsg(
            `Compte créé pour ${cleanEmail} ! Connectez-vous maintenant ci-dessous.`
          );
        }
        setMode('signin');
      }
    }
  };

  const executeSignIn = async (cleanEmail, pwd) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pwd,
    });
    if (error) throw error;
  };

  const handleInstantAction = async (actionType) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) return;

    setLoading(true);
    setErrorInfo(null);
    setSuccessMsg(null);

    try {
      if (actionType === 'instant_signup') {
        setMode('signup');
        await executeSignUp(cleanEmail, password);
      } else if (actionType === 'instant_signin') {
        setMode('signin');
        await executeSignIn(cleanEmail, password);
      }
    } catch (err) {
      setErrorInfo(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) return;

    const cleanEmail = email.trim().toLowerCase();
    setErrorInfo(null);
    setSuccessMsg(null);

    if (mode !== 'reset' && password.length < 6) {
      setErrorInfo({
        text: 'Veuillez saisir un mot de passe d’au moins 6 caractères.',
        rawDetail: null,
        suggestAction: null,
      });
      return;
    }

    setLoading(true);

    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          { redirectTo: window.location.origin }
        );
        if (error) throw error;
        setSuccessMsg(
          `Si un compte existe pour ${cleanEmail}, un lien de réinitialisation vient d'être envoyé.`
        );
        return;
      }

      if (mode === 'signin') {
        await executeSignIn(cleanEmail, password);
      } else {
        await executeSignUp(cleanEmail, password);
      }
    } catch (err) {
      setErrorInfo(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/50 to-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="h-14 w-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/25">
            <Mic className="h-7 w-7" />
          </div>
        </div>
        <h1 className="mt-4 text-center text-3xl font-bold tracking-tight text-slate-900">
          VoxNote
        </h1>
        <p className="mt-1.5 text-center text-sm text-slate-600">
          Notes intelligentes au clavier, à la voix et en photos annotées
        </p>

        {/* Badges fonctionnalités */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shadow-2xs">
            <Mic className="h-3 w-3 text-indigo-600" /> Dictée vocale
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shadow-2xs">
            <Camera className="h-3 w-3 text-indigo-600" /> Photos &amp; notes
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shadow-2xs">
            <ShieldCheck className="h-3 w-3 text-emerald-600" /> Espace privé RLS
          </span>
        </div>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 shadow-xl shadow-slate-200/60 rounded-2xl border border-slate-200/80 sm:px-9">
          {/* Statut de liaison Supabase en direct */}
          {serverStatus && !serverStatus.ok && (
            <div className="mb-5 rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
              <span>{serverStatus.warning}</span>
            </div>
          )}

          {serverStatus?.ok && (
            <div className="mb-5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 px-3 py-2 flex items-center justify-center gap-2 text-[11px] font-medium text-emerald-800">
              <Wifi className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>
                Supabase connecté ·{' '}
                {serverStatus.autoconfirm
                  ? 'Connexion immédiate activée'
                  : 'Validation e-mail active'}
              </span>
            </div>
          )}

          {/* Onglets Connexion / Créer un compte */}
          {mode !== 'reset' ? (
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className={`py-2.5 text-sm font-semibold rounded-lg transition cursor-pointer ${
                  mode === 'signin'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`py-2.5 text-sm font-semibold rounded-lg transition cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Créer un compte
              </button>
            </div>
          ) : (
            <div className="mb-5">
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 mb-2 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Retour à la connexion
              </button>
              <h2 className="text-lg font-bold text-slate-900">
                Réinitialiser le mot de passe
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Recevez un lien sécurisé par e-mail pour définir un nouveau mot de passe.
              </p>
            </div>
          )}

          {/* Message d'erreur détaillé + bouton d'action directe en 1 clic */}
          {errorInfo && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 space-y-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
                <div className="space-y-1 min-w-0">
                  <p className="leading-relaxed">{errorInfo.text}</p>
                  {errorInfo.rawDetail && (
                    <p className="text-[10px] font-mono text-red-600/80 break-words">
                      Réponse Supabase : {errorInfo.rawDetail}
                    </p>
                  )}
                </div>
              </div>

              {errorInfo.suggestAction === 'instant_signup' && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleInstantAction('instant_signup')}
                  className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  Créer ce compte et me connecter maintenant →
                </button>
              )}

              {errorInfo.suggestAction === 'instant_signin' && (
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleInstantAction('instant_signin')}
                  className="w-full py-2 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  Me connecter maintenant avec ce compte →
                </button>
              )}
            </div>
          )}

          {successMsg && (
            <div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200 p-3.5 flex items-start gap-2.5 text-xs text-emerald-800 leading-relaxed">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Champ Nom complet (uniquement en création de compte) */}
            {mode === 'signup' && (
              <div>
                <label
                  htmlFor="auth-fullname"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Votre nom <span className="text-slate-400 font-normal">(optionnel)</span>
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-fullname"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex : Arnaud Bervelle"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition"
                  />
                </div>
              </div>
            )}

            {/* Champ E-mail */}
            <div>
              <label
                htmlFor="auth-email"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Adresse e-mail
              </label>
              <div className="relative">
                <Mail className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="auth-email"
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

            {/* Champ Mot de passe */}
            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    Mot de passe
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => switchMode('reset')}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-700 cursor-pointer"
                    >
                      Mot de passe oublié ?
                    </button>
                  )}
                </div>

                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete={
                      mode === 'signin' ? 'current-password' : 'new-password'
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((prev) => !prev)}
                    title={
                      showPassword
                        ? 'Masquer le mot de passe'
                        : 'Afficher le mot de passe'
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {mode === 'signup' && password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="grid grid-cols-4 gap-1">
                      {[1, 2, 3, 4].map((step) => (
                        <div
                          key={step}
                          className={`h-1 rounded-full transition-colors ${
                            passwordStrength.score >= step
                              ? passwordStrength.color
                              : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {passwordStrength.label}
                    </p>
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm shadow-indigo-600/20 transition cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connexion en cours...
                </>
              ) : mode === 'signin' ? (
                <>
                  Se connecter à mes notes
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : mode === 'signup' ? (
                <>
                  Créer mon compte et entrer
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Envoyer le lien de réinitialisation
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col gap-2.5">
            {onEnterDemoMode && (
              <button
                type="button"
                onClick={onEnterDemoMode}
                className="w-full py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-xs font-medium text-slate-700 inline-flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                Tester immédiatement sans compte (Mode Démo local)
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
