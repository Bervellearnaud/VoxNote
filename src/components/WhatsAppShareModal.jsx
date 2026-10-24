import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Phone,
  Send,
  Share2,
  Camera,
  Check,
  Copy,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  formatNoteForWhatsApp,
  buildWhatsAppUrl,
  canNativeShareFiles,
  shareNoteWithPhotoFiles,
} from '../utils/whatsappUtils';

export function WhatsAppIcon({ className = 'h-4 w-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12.031 2C6.508 2 2.023 6.485 2.023 12.007c0 1.766.461 3.49 1.337 5.01L2 22l5.122-1.343a9.97 9.97 0 0 0 4.907 1.251h.004c5.522 0 10.007-4.485 10.007-10.007C22.04 6.485 17.554 2 12.031 2Zm5.823 14.142c-.246.693-1.432 1.326-1.995 1.411-.511.077-1.158.109-1.87-.117-.432-.137-.986-.32-1.696-.626-2.984-1.288-4.933-4.293-5.082-4.492-.149-.199-1.214-1.615-1.214-3.081 0-1.466.768-2.187 1.041-2.485.273-.298.595-.373.794-.373.198 0 .397.002.57.01.183.009.428-.069.67.511.248.596.843 2.06.917 2.209.075.149.124.323.025.521-.099.199-.149.323-.298.497-.148.174-.313.389-.446.522-.149.148-.304.31-.131.608.174.298.771 1.272 1.656 2.061 1.138 1.014 2.097 1.329 2.395 1.478.298.149.471.124.645-.075.174-.199.744-.869.943-1.167.198-.298.397-.248.67-.149.273.099 1.736.819 2.034.968.298.149.496.224.571.348.074.124.074.72-.173 1.412Z" />
    </svg>
  );
}

export default function WhatsAppShareModal({ note, onClose }) {
  const isOpen = Boolean(note);
  const notePhotos = useMemo(
    () => (Array.isArray(note?.photos) ? note.photos : []),
    [note]
  );
  const hasHttpPhotos = useMemo(
    () =>
      notePhotos.some(
        (p) => typeof p.url === 'string' && p.url.startsWith('http')
      ),
    [notePhotos]
  );

  const [phone, setPhone] = useState('');
  const [includePhotoCaptions, setIncludePhotoCaptions] = useState(true);
  const [includePhotoLinks, setIncludePhotoLinks] = useState(true);
  const [customMessage, setCustomMessage] = useState('');
  const [isEditedManually, setIsEditedManually] = useState(false);

  const [sharingFiles, setSharingFiles] = useState(false);
  const [shareError, setShareError] = useState(null);
  const [copied, setCopied] = useState(false);

  // Régénérer automatiquement l'aperçu du message tant qu'il n'a pas été modifié à la main
  useEffect(() => {
    if (!note) {
      setPhone('');
      setIsEditedManually(false);
      setShareError(null);
      return;
    }
    if (!isEditedManually) {
      setCustomMessage(
        formatNoteForWhatsApp(note, {
          includePhotoCaptions,
          includePhotoLinks: includePhotoLinks && hasHttpPhotos,
        })
      );
    }
  }, [
    note,
    includePhotoCaptions,
    includePhotoLinks,
    hasHttpPhotos,
    isEditedManually,
  ]);

  if (!isOpen) return null;

  const whatsappUrl = buildWhatsAppUrl({
    message: customMessage,
    phone,
  });

  const supportsFileShare = canNativeShareFiles() && notePhotos.length > 0;

  const handleNativePhotoShare = async () => {
    setSharingFiles(true);
    setShareError(null);
    try {
      await shareNoteWithPhotoFiles(note, customMessage);
      onClose();
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setShareError(
          err?.message ||
            'Partage direct des fichiers non disponible sur cet appareil. Utilisez le bouton vert « Envoyer sur WhatsApp ».'
        );
      }
    } finally {
      setSharingFiles(false);
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(customMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* En-tête WhatsApp */}
        <div className="px-5 py-4 bg-gradient-to-r from-[#128C7E] to-[#25D366] text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
              <WhatsAppIcon className="h-5 w-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold truncate">
                Envoyer la note sur WhatsApp
              </h2>
              <p className="text-xs text-white/85 truncate">{note.title}</p>
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

        {/* Corps de la modale */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {shareError && (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 flex items-start gap-2 text-xs text-amber-900">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{shareError}</span>
            </div>
          )}

          {/* Numéro destinataire optionnel */}
          <div>
            <label
              htmlFor="wa-phone"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Numéro WhatsApp du destinataire{' '}
              <span className="text-slate-400 font-normal">
                (optionnel — laissez vide pour choisir dans vos contacts)
              </span>
            </label>
            <div className="relative">
              <Phone className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="wa-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex : +225 07 00 00 00 00 ou +33 6 12 34 56 78"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#128C7E] transition"
              />
            </div>
          </div>

          {/* Options photos si la note possède des clichés */}
          {notePhotos.length > 0 && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3.5 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Camera className="h-3.5 w-3.5 text-[#128C7E]" />
                <span>
                  Cette note contient {notePhotos.length}{' '}
                  {notePhotos.length > 1 ? 'photos' : 'photo'}
                </span>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePhotoCaptions}
                  onChange={(e) => {
                    setIsEditedManually(false);
                    setIncludePhotoCaptions(e.target.checked);
                  }}
                  className="rounded border-slate-300 text-[#128C7E] focus:ring-[#25D366]"
                />
                <span>Inclure les annotations écrites sur les photos</span>
              </label>

              {hasHttpPhotos && (
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includePhotoLinks}
                    onChange={(e) => {
                      setIsEditedManually(false);
                      setIncludePhotoLinks(e.target.checked);
                    }}
                    className="rounded border-slate-300 text-[#128C7E] focus:ring-[#25D366]"
                  />
                  <span>
                    Inclure le lien sécurisé des photos (valable 24h)
                  </span>
                </label>
              )}

              {supportsFileShare && (
                <button
                  type="button"
                  disabled={sharingFiles}
                  onClick={handleNativePhotoShare}
                  className="w-full mt-1 py-2 px-3 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200 text-xs font-semibold text-[#128C7E] inline-flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  {sharingFiles ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Share2 className="h-3.5 w-3.5" />
                  )}
                  Joindre directement les fichiers photos (Mobile)
                </button>
              )}
            </div>
          )}

          {/* Aperçu modifiable du message WhatsApp */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="wa-message-preview"
                className="text-xs font-semibold text-slate-700"
              >
                Aperçu du message WhatsApp (modifiable)
              </label>
              <button
                type="button"
                onClick={handleCopyMessage}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600" />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" />
                    Copier le texte
                  </>
                )}
              </button>
            </div>
            <textarea
              id="wa-message-preview"
              rows={6}
              value={customMessage}
              onChange={(e) => {
                setIsEditedManually(true);
                setCustomMessage(e.target.value);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#efeae2]/40 border border-slate-300 text-base sm:text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#25D366]/30 focus:border-[#128C7E]"
            />
          </div>

          {/* Boutons d'action */}
          <div className="pt-1 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition cursor-pointer"
            >
              Annuler
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => onClose()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#1ebe5d] text-white text-sm font-bold shadow-sm shadow-[#25D366]/30 transition cursor-pointer"
            >
              <WhatsAppIcon className="h-4 w-4" />
              <span>Envoyer sur WhatsApp</span>
              <Send className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
