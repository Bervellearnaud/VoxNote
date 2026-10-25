import { useState, useEffect, useMemo } from 'react';
import {
  Mic,
  Camera,
  Mail,
  Lock,
  User,
  UserPlus,
  LogIn,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Wifi,
  Download,
} from 'lucide-react';
import {
  supabase,
  activeSupabaseUrl,
  activeSupabaseAnonKey,
} from '../lib/supabaseClient';
import { usePwaInstall } from '../hooks/usePwaInstall';
import InstallPwaModal from './InstallPwaModal';

function translateAuthError(err) {
  const message = err?.message || '';
  const code = err?.code || '';
  const rawDetail = [code, message].filter(Boolean).join(' — ');

  if (
    code === 'signup_disabled' ||
    message.toLowerCase().includes('signups not allowed')
  ) {
    return {
      text: 'Les inscriptions sont désactivées dans Supabase. Activez « Allow new users to sign up » dans Supabase → Authentication → Sign In / Providers, puis cliquez sur « Save changes ».',
      rawDetail,
      suggestMode: null,
    };
  }

  if (
    code === 'email_provider_disabled' ||
    message.toLowerCase().includes('email logins are disabled')
  ) {
    return {
      text: 'La connexion par e-mail est désactivée dans Supabase ! Dans Authentication → Sign In / Providers → Auth Providers → Email, activez « Enable Email provider » puis sauvegardez.',
      rawDetail,
      suggestMode: null,
    };
  }

  if (
    code === 'invalid_credentials' ||
    message.includes('Invalid login credentials')
  ) {
    return {
      text: "Adresse e-mail ou mot de passe incorrect. Si vous n'avez pas encore créé votre compte, passez sur l'onglet « Créer un compte ».",
      rawDetail,
      suggestMode: 'signup',
    };
  }

  if (
    code === 'email_not_confirmed' ||
    message.includes('Email not confirmed')
  ) {
    return {
      text: "Ce compte avait été créé avant la désactivation de « Confirm email » et attend d'être validé. Dans Supabase → Authentication → Users, cliquez sur les 3 points (⋮) à droite de votre e-mail → « Confirm user ».",
      rawDetail,
      suggestMode: null,
    };
  }

  if (
    code === 'user_already_exists' ||
    message.includes('User already registered')
  ) {
    return {
      text: 'Un compte existe déjà avec cette adresse e-mail ! Passez sur l’onglet « Connexion » pour entrer.',
      rawDetail,
      suggestMode: 'signin',
    };
  }

  if (
    code === 'over_email_send_rate_limit' ||
    message.toLowerCase().includes('rate limit')
  ) {
    return {
      text: "Limite d'envoi d'e-mails Supabase atteinte. Vérifiez que « Confirm email » est bien désactivé dans Supabase → Authentication → Sign In / Providers.",
      rawDetail,
      suggestMode: null,
    };
  }

  if (message.includes('Password should be at least')) {
    return {
      text: 'Le mot de passe doit contenir au moins 6 caractères.',
      rawDetail,
      suggestMode: null,
    };
  }

  return {
    text: message || "Une erreur est survenue lors de l'authentification.",
    rawDetail,
    suggestMode: null,
  };
}

function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: 'bg-slate-200' };
  if (pwd.length < 6) {
    return {
      score: 1,
      label: 'Trop court (6 caractères minimum)',
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
    2: { label: 'Sécurité moyenne', color: 'bg-amber-500' },
    3: { label: 'Bon mot de passe', color: 'bg-emerald-500' },
    4: { label: 'Excellent mot de passe', color: 'bg-emerald-600' },
  };
  return { score, ...map[score] };
}

export default function AuthForm() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup' | 'reset'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [serverStatus, setServerStatus] = useState(null);

  const {
    isInstalled,
    isIos,
    canNativePrompt,
    isInstallModalOpen,
    setIsInstallModalOpen,
    triggerInstall,
  } = usePwaInstall();

  useEffect(() => {
    let cancelled = false;

    async function checkSupabaseAuthSettings() {
      try {
        const res = await fetch(`${activeSupabaseUrl}/auth/v1/settings`, {
          headers: { apikey: activeSupabaseAnonKey },
        });
        if (cancelled) return;

        if (!res.ok) {
          setServerStatus({
            ok: false,
            warning: `Erreur de liaison Supabase Auth (HTTP ${res.status}).`,
          });
          return;
        }

        const settings = await res.json();
        if (cancelled) return;

        if (settings?.external?.email === false) {
          setServerStatus({
            ok: false,
            warning:
              'Le fournisseur « Email » est désactivé dans Supabase (Authentication → Sign In / Providers → Auth Providers → Email → Enable Email provider).',
          });
        } else if (settings?.disable_signup === true) {
          setServerStatus({
            ok: false,
            warning:
              '« Allow new users to sign up » est encore désactivé dans Supabase (cliquez sur Save changes).',
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
              'Impossible de contacter le serveur Supabase. Vérifiez votre connexion internet.',
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    setErrorInfo(null);
    setSuccessMsg(null);

    if (mode === 'signup') {
      if (!fullName.trim()) {
        setErrorInfo({
          text: 'Veuillez renseigner votre prénom ou nom pour créer votre compte.',
          rawDetail: null,
          suggestMode: null,
        });
        return;
      }
      if (password.length < 6) {
        setErrorInfo({
          text: 'Le mot de passe doit contenir au moins 6 caractères.',
          rawDetail: null,
          suggestMode: null,
        });
        return;
      }
      if (password !== confirmPassword) {
        setErrorInfo({
          text: 'La confirmation du mot de passe ne correspond pas.',
          rawDetail: null,
          suggestMode: null,
        });
        return;
      }
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
          `Un lien de réinitialisation a été envoyé à ${cleanEmail}.`
        );
        return;
      }

      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (error) throw error;
        return;
      }

      // Création de compte ('signup')
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName.trim() },
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
          text: 'Un compte existe déjà pour cette adresse e-mail. Saisissez votre mot de passe pour vous connecter.',
          rawDetail: null,
          suggestMode: null,
        });
        return;
      }

      // Si aucune session directe n'est retournée, tenter la connexion directe
      if (data?.user && !data?.session) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (signInErr) {
          if (signInErr.message?.includes('Email not confirmed')) {
            setSuccessMsg(
              `Compte créé pour ${cleanEmail} ! Confirmez l'e-mail reçu (vérifiez vos Spams) avant de vous connecter.`
            );
          } else {
            setSuccessMsg(
              `Compte créé avec succès ! Vous pouvez maintenant vous connecter.`
            );
          }
          setMode('signin');
        }
      }
    } catch (err) {
      setErrorInfo(translateAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const isSignUp = mode === 'signup';

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

        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shadow-2xs">
            <Mic className="h-3 w-3 text-indigo-600" /> Dictée vocale
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shadow-2xs">
            <Camera className="h-3 w-3 text-indigo-600" /> Photos &amp; notes
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-medium text-slate-600 shadow-2xs">
            <ShieldCheck className="h-3 w-3 text-emerald-600" /> Base Supabase RLS
          </span>
        </div>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div
          className={`bg-white py-7 px-6 shadow-xl shadow-slate-200/60 rounded-2xl border sm:px-9 transition-colors ${
            isSignUp ? 'border-emerald-200' : 'border-slate-200/80'
          }`}
        >
          {/* Indicateur automatique de connexion à la base Supabase */}
          {serverStatus && !serverStatus.ok && (
            <div className="mb-5 rounded-xl bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
              <span>{serverStatus.warning}</span>
            </div>
          )}

          {serverStatus?.ok && (
            <div className="mb-5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 px-3 py-2 flex items-center justify-center gap-2 text-[11px] font-medium text-emerald-800">
              <Wifi className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>Base Supabase connectée automatiquement</span>
            </div>
          )}

          {/* Onglets distincts : Connexion vs Créer un compte */}
          {mode !== 'reset' ? (
            <>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl mb-5">
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className={`inline-flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-lg transition cursor-pointer ${
                    mode === 'signin'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LogIn className="h-4 w-4" />
                  Connexion
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className={`inline-flex items-center justify-center gap-1.5 py-2.5 text-sm font-semibold rounded-lg transition cursor-pointer ${
                    mode === 'signup'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  Inscription
                </button>
              </div>

              <div className="mb-5">
                <h2 className="text-lg font-bold text-slate-900">
                  {isSignUp
                    ? 'Créer un nouveau compte'
                    : 'Se connecter à mon compte'}
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isSignUp
                    ? 'Remplissez ces 4 champs pour ouvrir votre espace personnel de notes.'
                    : 'Entrez votre e-mail et votre mot de passe pour accéder à vos notes.'}
                </p>
              </div>
            </>
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
                Mot de passe oublié
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Saisissez votre e-mail pour recevoir un lien de réinitialisation.
              </p>
            </div>
          )}

          {errorInfo && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs text-red-800 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0 text-red-600" />
                <div className="space-y-1 min-w-0">
                  <p className="leading-relaxed">{errorInfo.text}</p>
                  {errorInfo.rawDetail && (
                    <p className="text-[10px] font-mono text-red-600/80 break-words">
                      Détail : {errorInfo.rawDetail}
                    </p>
                  )}
                </div>
              </div>
              {errorInfo.suggestMode === 'signup' && (
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="ml-6 font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 cursor-pointer"
                >
                  Passer à l&apos;onglet Inscription →
                </button>
              )}
              {errorInfo.suggestMode === 'signin' && (
                <button
                  type="button"
                  onClick={() => switchMode('signin')}
                  className="ml-6 font-semibold text-indigo-700 hover:text-indigo-800 underline underline-offset-2 cursor-pointer"
                >
                  Passer à l&apos;onglet Connexion →
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
            {/* CHAMP 1 (uniquement en Inscription) : Prénom & Nom */}
            {isSignUp && (
              <div>
                <label
                  htmlFor="auth-fullname"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Prénom et Nom
                </label>
                <div className="relative">
                  <User className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-fullname"
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Ex : Arnaud Bervelle"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-600 transition"
                  />
                </div>
              </div>
            )}

            {/* CHAMP E-mail */}
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
                  className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                    isSignUp
                      ? 'focus:ring-emerald-500/30 focus:border-emerald-600'
                      : 'focus:ring-indigo-500/30 focus:border-indigo-600'
                  }`}
                />
              </div>
            </div>

            {/* CHAMP Mot de passe */}
            {mode !== 'reset' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label
                    htmlFor="auth-password"
                    className="block text-xs font-semibold text-slate-700"
                  >
                    {isSignUp ? 'Créer un mot de passe' : 'Mot de passe'}
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
                      isSignUp ? 'new-password' : 'current-password'
                    }
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={
                      isSignUp
                        ? 'Choisissez au moins 6 caractères'
                        : 'Votre mot de passe'
                    }
                    className={`w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                      isSignUp
                        ? 'focus:ring-emerald-500/30 focus:border-emerald-600'
                        : 'focus:ring-indigo-500/30 focus:border-indigo-600'
                    }`}
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>

                {isSignUp && password.length > 0 && (
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

            {/* CHAMP 4 (uniquement en Inscription) : Confirmer le mot de passe */}
            {isSignUp && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <Lock className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="auth-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retapez votre mot de passe"
                    className={`w-full pl-10 pr-3.5 py-2.5 rounded-xl border text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                      confirmPassword.length > 0 && password !== confirmPassword
                        ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500'
                        : 'border-slate-300 focus:ring-emerald-500/30 focus:border-emerald-600'
                    }`}
                  />
                </div>
                {confirmPassword.length > 0 && (
                  <p
                    className={`mt-1 text-[11px] font-medium ${
                      password === confirmPassword
                        ? 'text-emerald-600'
                        : 'text-red-600'
                    }`}
                  >
                    {password === confirmPassword
                      ? '✓ Les mots de passe correspondent'
                      : 'Les mots de passe ne correspondent pas'}
                  </p>
                )}
              </div>
            )}

            {/* Bouton principal (couleur distincte selon Connexion vs Inscription) */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full mt-2 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl disabled:opacity-60 text-white text-sm font-semibold shadow-sm transition cursor-pointer ${
                isSignUp
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
              }`}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Traitement en cours...
                </>
              ) : mode === 'signin' ? (
                <>
                  Se connecter
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : isSignUp ? (
                <>
                  Créer mon compte VoxNote
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Envoyer le lien
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Lien de bascule explicite en pied de carte */}
          {mode !== 'reset' && (
            <div className="mt-6 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
              {isSignUp ? (
                <>
                  Vous avez déjà un compte ?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signin')}
                    className="font-semibold text-indigo-600 hover:text-indigo-700 underline underline-offset-2 cursor-pointer"
                  >
                    Se connecter ici
                  </button>
                </>
              ) : (
                <>
                  Nouveau sur VoxNote ?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('signup')}
                    className="font-semibold text-emerald-700 hover:text-emerald-800 underline underline-offset-2 cursor-pointer"
                  >
                    Créer un compte gratuitement
                  </button>
                </>
              )}
            </div>
          )}

          {!isInstalled && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={triggerInstall}
                className="w-full py-2.5 px-3.5 rounded-xl bg-indigo-50/80 hover:bg-indigo-100 border border-indigo-200/80 text-xs font-semibold text-indigo-700 inline-flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Télécharger l&apos;application mobile (Android / iPhone)
              </button>
            </div>
          )}
        </div>
      </div>

      <InstallPwaModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        isIos={isIos}
        canNativePrompt={canNativePrompt}
        onTriggerNativePrompt={triggerInstall}
      />
    </div>
  );
}
