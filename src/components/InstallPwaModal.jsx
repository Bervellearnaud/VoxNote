import { useState } from 'react';
import {
  X,
  Download,
  Smartphone,
  Share,
  PlusSquare,
  MoreVertical,
  CheckCircle2,
  ExternalLink,
  AlertTriangle,
  Copy,
  Check,
} from 'lucide-react';
import { buildOpenInChromeIntentUrl } from '../hooks/usePwaInstall';

export default function InstallPwaModal({
  isOpen,
  onClose,
  isIos,
  isAndroid = false,
  isInAppBrowser = false,
  canNativePrompt,
  onTriggerNativePrompt,
}) {
  const [tab, setTab] = useState(isIos ? 'ios' : 'android');
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!isOpen) return null;

  const chromeIntentUrl = buildOpenInChromeIntentUrl();

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/65 backdrop-blur-xs p-0 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden pb-safe max-h-[92vh] flex flex-col"
      >
        {/* En-tête avec l'icône officielle VoxNote */}
        <div className="px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src="/icons/icon-192.png"
              alt="Icône VoxNote"
              className="h-11 w-11 rounded-xl shadow-md bg-white/10"
            />
            <div>
              <h2 className="text-sm font-bold">
                Installer l&apos;application VoxNote
              </h2>
              <p className="text-xs text-indigo-100">
                Application mobile plein écran (Android &amp; iPhone)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/15 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Alerte automatique si le lien a été ouvert depuis le navigateur intégré de WhatsApp / Facebook */}
          {isInAppBrowser && (
            <div className="rounded-xl bg-amber-50 border border-amber-300 p-3.5 space-y-2.5 text-xs text-amber-950">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>Navigateur intégré détecté (ex. WhatsApp) :</strong>{' '}
                  ce mini-navigateur bloque l&apos;installation d&apos;applications. Ouvrez d&apos;abord ce lien dans <strong>{isIos ? 'Safari' : 'Google Chrome'}</strong> :
                </p>
              </div>
              {isAndroid ? (
                <a
                  href={chromeIntentUrl}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold inline-flex items-center justify-center gap-1.5 transition"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ouvrir directement dans Google Chrome
                </a>
              ) : (
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full py-2 px-3 rounded-xl bg-white border border-amber-300 font-semibold text-amber-900 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedUrl ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Lien copié ! Collez-le dans Safari
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copier le lien pour l&apos;ouvrir dans Safari
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Bouton d'installation directe 1-clic quand Chrome Android / Desktop est prêt */}
          {canNativePrompt && (
            <button
              type="button"
              onClick={onTriggerNativePrompt}
              className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-sm inline-flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Download className="h-4 w-4" />
              Installer VoxNote maintenant
            </button>
          )}

          {/* Sélecteur Android / iPhone */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => setTab('android')}
              className={`py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                tab === 'android'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Android (Chrome)
            </button>
            <button
              type="button"
              onClick={() => setTab('ios')}
              className={`py-2 text-xs font-semibold rounded-lg transition cursor-pointer ${
                tab === 'ios'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              iPhone / iPad (Safari)
            </button>
          </div>

          {tab === 'android' ? (
            <div className="space-y-3">
              <ol className="space-y-2.5 text-xs text-slate-700">
                <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <div className="leading-relaxed">
                    Assurez-vous d&apos;être dans <strong>Google Chrome</strong> (si vous venez de WhatsApp, touchez <strong>⋮ → Ouvrir dans Chrome</strong>).
                  </div>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <div className="leading-relaxed">
                    Touchez le menu{' '}
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-800">
                      <MoreVertical className="h-3 w-3" />
                    </span>{' '}
                    en haut à droite → <strong>« Ajouter à l&apos;écran d&apos;accueil »</strong> puis choisissez <strong>« Installer »</strong>.
                  </div>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-900">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    Patientez quelques secondes : l&apos;application <strong>VoxNote</strong> s&apos;installe dans votre liste d&apos;applications et sur l&apos;écran d&apos;accueil !
                  </div>
                </li>
              </ol>

              <p className="text-[11px] text-slate-500 bg-slate-50 rounded-xl p-2.5 border border-slate-200/60 leading-relaxed">
                <strong>Astuce Samsung / Xiaomi / Tecno / Infinix :</strong> si l&apos;icône n&apos;apparaît pas sur l&apos;écran d&apos;accueil, vérifiez dans le tiroir de toutes vos applications ou désactivez <em>« Verrouiller la disposition de l&apos;écran d&apos;accueil »</em> dans les paramètres du téléphone.
              </p>
            </div>
          ) : (
            <ol className="space-y-2.5 text-xs text-slate-700">
              <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                  1
                </span>
                <div className="leading-relaxed">
                  Ouvrez ce lien dans <strong>Safari</strong> sur votre iPhone ou iPad, puis touchez{' '}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-800">
                    <Share className="h-3 w-3 text-indigo-600" /> Partager
                  </span>{' '}
                  en bas de l&apos;écran.
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                  2
                </span>
                <div className="leading-relaxed">
                  Faites défiler le menu vers le bas et touchez{' '}
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-white border border-slate-200 font-semibold text-slate-800">
                    <PlusSquare className="h-3 w-3 text-indigo-600" /> Sur l&apos;écran d&apos;accueil
                  </span>
                  .
                </div>
              </li>
              <li className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-900">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  Touchez <strong>Ajouter</strong> en haut à droite : <strong>VoxNote</strong> est installée sur votre iPhone !
                </div>
              </li>
            </ol>
          )}

          <div className="pt-1 flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500">
              <Smartphone className="h-3.5 w-3.5 text-indigo-500" />
              Application PWA plein écran
            </span>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
