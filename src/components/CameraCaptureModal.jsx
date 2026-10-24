import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Camera,
  X,
  RefreshCw,
  Check,
  RotateCcw,
  ImagePlus,
  Mic,
  MicOff,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { captureVideoFrame, compressImageFile } from '../utils/imageUtils';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

export default function CameraCaptureModal({ isOpen, onClose, onConfirmPhoto }) {
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' | 'user'
  const [streamReady, setStreamReady] = useState(false);
  const [startingCamera, setStartingCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Photo capturée en attente de validation : { blob, dataUrl, width, height }
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const [caption, setCaption] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);

  // Reconnaissance vocale dédiée à l'annotation rapide de la photo
  const handleFinalCaptionSpeech = useCallback((chunk) => {
    setCaption((prev) => {
      if (!prev.trim()) return chunk;
      const needsSpace = !/[\s\n]$/.test(prev);
      return `${prev}${needsSpace ? ' ' : ''}${chunk}`;
    });
  }, []);

  const {
    isSupported: isSpeechSupported,
    isListening,
    interimTranscript,
    stopListening,
    toggleListening,
  } = useSpeechRecognition({
    onFinalTranscript: handleFinalCaptionSpeech,
    defaultLang: 'fr-FR',
  });

  const displayedCaption = useMemo(() => {
    if (isListening && interimTranscript) {
      const needsSpace = caption.length > 0 && !/[\s\n]$/.test(caption);
      return `${caption}${needsSpace ? ' ' : ''}${interimTranscript}`;
    }
    return caption;
  }, [caption, isListening, interimTranscript]);

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamReady(false);
  }, []);

  const startCameraStream = useCallback(
    async (mode = facingMode) => {
      stopCameraStream();
      setCameraError(null);

      if (
        typeof navigator === 'undefined' ||
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
      ) {
        setCameraError(
          "L'accès direct à la caméra n'est pas disponible dans ce navigateur. Vous pouvez importer ou prendre une photo via le sélecteur ci-dessous."
        );
        return;
      }

      setStartingCamera(true);
      try {
        let mediaStream;
        try {
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: mode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          });
        } catch {
          // Fallback générique si la contrainte facingMode échoue sur certains ordinateurs
          mediaStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
        }

        streamRef.current = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch(() => {});
          setStreamReady(true);
        }
      } catch (err) {
        if (err.name === 'NotAllowedError' || err.name === 'SecurityError') {
          setCameraError(
            "Accès à la caméra refusé ou restreint dans cet aperçu. Autorisez la caméra dans votre navigateur (ou ouvrez dans un nouvel onglet), ou importez directement une photo ci-dessous."
          );
        } else if (err.name === 'NotFoundError') {
          setCameraError(
            'Aucune caméra détectée sur cet appareil. Utilisez le bouton ci-dessous pour importer une image.'
          );
        } else {
          setCameraError(
            "Impossible d'activer la caméra en direct. Vous pouvez choisir une image depuis votre appareil."
          );
        }
      } finally {
        setStartingCamera(false);
      }
    },
    [facingMode, stopCameraStream]
  );

  // Ouvrir / fermer proprement la caméra à l'affichage de la modale
  useEffect(() => {
    if (isOpen && !capturedPhoto) {
      startCameraStream(facingMode);
    } else {
      stopCameraStream();
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, capturedPhoto, facingMode, startCameraStream, stopCameraStream]);

  useEffect(() => {
    if (!isOpen) {
      if (isListening) stopListening();
      setCapturedPhoto(null);
      setCaption('');
      setCameraError(null);
    }
  }, [isOpen, isListening, stopListening]);

  if (!isOpen) return null;

  const handleSnapPhoto = async () => {
    if (!videoRef.current || !streamReady) return;
    try {
      const result = await captureVideoFrame(videoRef.current, {
        maxDimension: 1280,
        quality: 0.84,
        mirror: facingMode === 'user',
      });
      stopCameraStream();
      setCapturedPhoto(result);
    } catch (err) {
      setCameraError(err.message || 'Erreur lors de la capture photo.');
    }
  };

  const handleFallbackFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    try {
      setCameraError(null);
      const result = await compressImageFile(file, {
        maxDimension: 1280,
        quality: 0.84,
      });
      stopCameraStream();
      setCapturedPhoto(result);
    } catch (err) {
      setCameraError(err.message || 'Fichier image invalide.');
    }
  };

  const handleRetake = () => {
    if (isListening) stopListening();
    setCapturedPhoto(null);
  };

  const handleToggleFacingMode = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const handleConfirm = () => {
    if (!capturedPhoto) return;
    const finalCaption = displayedCaption.trim();
    if (isListening) stopListening();
    onConfirmPhoto({
      ...capturedPhoto,
      caption: finalCaption,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Camera className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {capturedPhoto ? 'Annoter la photo capturée' : 'Prendre une photo'}
              </h2>
              <p className="text-xs text-slate-500">
                {capturedPhoto
                  ? 'Ajoutez une note écrite ou vocale à votre cliché'
                  : 'Capturez un document, tableau blanc ou objet'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Corps : Caméra en direct OU Photo capturée + champ note */}
        <div className="p-5 space-y-4 overflow-y-auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFallbackFile}
            className="hidden"
          />

          {!capturedPhoto ? (
            <>
              <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`w-full h-full object-cover ${
                    facingMode === 'user' ? '-scale-x-100' : ''
                  } ${streamReady ? 'opacity-100' : 'opacity-0'}`}
                />

                {startingCamera && !cameraError && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-300">
                    <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
                    <span className="text-xs font-medium">
                      Activation de la caméra...
                    </span>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-slate-900/95">
                    <AlertCircle className="h-8 w-8 text-amber-400 mb-2.5" />
                    <p className="text-xs text-slate-200 max-w-sm leading-relaxed mb-4">
                      {cameraError}
                    </p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Choisir ou prendre une photo depuis l&apos;appareil
                    </button>
                  </div>
                )}

                {streamReady && (
                  <button
                    type="button"
                    onClick={handleToggleFacingMode}
                    title="Changer de caméra (avant / arrière)"
                    className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/70 hover:bg-slate-900/90 text-white text-xs font-medium backdrop-blur-xs transition cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Inverser</span>
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition cursor-pointer"
                >
                  <ImagePlus className="h-4 w-4 text-slate-500" />
                  Importer depuis l&apos;appareil
                </button>

                <button
                  type="button"
                  disabled={!streamReady}
                  onClick={handleSnapPhoto}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold shadow-sm shadow-indigo-600/25 transition cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  Capturer la photo
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Aperçu de la photo capturée */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-200">
                <img
                  src={capturedPhoto.dataUrl}
                  alt="Aperçu de la photo capturée"
                  className="w-full max-h-64 object-contain mx-auto"
                />
              </div>

              {/* Champ d'annotation directe de la photo (clavier + voix) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="photo-caption-input"
                    className="text-xs font-semibold uppercase tracking-wider text-slate-600"
                  >
                    Note associée à cette photo
                  </label>

                  {isSpeechSupported && (
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        isListening
                          ? 'bg-red-600 text-white animate-pulse'
                          : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100'
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="h-3.5 w-3.5" />
                          Arrêter
                        </>
                      ) : (
                        <>
                          <Mic className="h-3.5 w-3.5" />
                          Dicter la note
                        </>
                      )}
                    </button>
                  )}
                </div>

                <textarea
                  id="photo-caption-input"
                  rows={3}
                  autoFocus
                  value={displayedCaption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Ex : Schéma d'architecture dessiné au tableau blanc, points à reprendre..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600"
                />
              </div>

              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleRetake}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition cursor-pointer"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reprendre la photo
                </button>

                <button
                  type="button"
                  onClick={handleConfirm}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm shadow-indigo-600/25 transition cursor-pointer"
                >
                  <Check className="h-4 w-4" />
                  Ajouter à la note
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
