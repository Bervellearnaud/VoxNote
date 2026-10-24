import { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, MessageSquareText } from 'lucide-react';

export default function PhotoLightboxModal({
  lightboxState,
  onClose,
  onChangeIndex,
}) {
  const isOpen = Boolean(lightboxState?.photos?.length);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && lightboxState.photos.length > 1) {
        onChangeIndex(
          (lightboxState.index - 1 + lightboxState.photos.length) %
            lightboxState.photos.length
        );
      } else if (e.key === 'ArrowRight' && lightboxState.photos.length > 1) {
        onChangeIndex((lightboxState.index + 1) % lightboxState.photos.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, lightboxState, onClose, onChangeIndex]);

  if (!isOpen) return null;

  const { photos, index, noteTitle } = lightboxState;
  const currentPhoto = photos[index] || photos[0];
  const hasMultiple = photos.length > 1;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex flex-col justify-between p-4 sm:p-6"
    >
      {/* Barre supérieure */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-5xl w-full mx-auto flex items-center justify-between text-white"
      >
        <div className="min-w-0">
          {noteTitle && (
            <h3 className="text-sm font-semibold text-white truncate">
              {noteTitle}
            </h3>
          )}
          <p className="text-xs text-slate-400">
            Photo {index + 1} sur {photos.length}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Image centrale + navigation */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex-1 flex items-center justify-center my-4 min-h-0"
      >
        {hasMultiple && (
          <button
            type="button"
            onClick={() =>
              onChangeIndex((index - 1 + photos.length) % photos.length)
            }
            className="absolute left-2 sm:left-4 z-10 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-white/15 transition cursor-pointer"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}

        <img
          src={currentPhoto.url || currentPhoto.dataUrl}
          alt={currentPhoto.caption || noteTitle || 'Photo de note'}
          className="max-h-[70vh] max-w-full rounded-xl object-contain shadow-2xl"
        />

        {hasMultiple && (
          <button
            type="button"
            onClick={() => onChangeIndex((index + 1) % photos.length)}
            className="absolute right-2 sm:right-4 z-10 p-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-white/15 transition cursor-pointer"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Note / légende rattachée à cette photo */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-3xl w-full mx-auto"
      >
        {currentPhoto.caption ? (
          <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl px-4 py-3 text-slate-100 flex items-start gap-2.5">
            <MessageSquareText className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="text-sm leading-relaxed whitespace-pre-line">
              {currentPhoto.caption}
            </p>
          </div>
        ) : (
          <p className="text-center text-xs text-slate-500">
            Aucune note spécifique ajoutée sur ce cliché
          </p>
        )}
      </div>
    </div>
  );
}
