import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Mic,
  MicOff,
  Camera,
  ImagePlus,
  Plus,
  Save,
  Trash2,
  Edit3,
  Search,
  LogOut,
  FileText,
  Sparkles,
  X,
  Check,
  Copy,
  AlertCircle,
  Loader2,
  Database,
  Clock,
  Globe,
  Eraser,
  ZoomIn,
  MessageSquareText,
} from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import {
  fetchNotes,
  createNote,
  updateNote,
  deleteNote,
} from '../services/notesService';
import { compressImageFile } from '../utils/imageUtils';
import SupabaseSetupModal from './SupabaseSetupModal';
import CameraCaptureModal from './CameraCaptureModal';
import PhotoLightboxModal from './PhotoLightboxModal';

const SPEECH_LANGUAGES = [
  { code: 'fr-FR', label: 'Français (FR)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'es-ES', label: 'Español (ES)' },
];

function formatDateFr(isoString) {
  if (!isoString) return '';
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return '';
  }
}

function generateDefaultPhotoTitle() {
  const formatted = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date());
  return `Note photo — ${formatted}`;
}

export default function NotesDashboard({
  user,
  isDemoMode = false,
  onSignOut,
  onExitDemoMode,
}) {
  // État de la liste des notes, recherche & filtre
  const [notes, setNotes] = useState([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all' | 'with_photos'

  // État du formulaire Création / Édition
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState([]);
  const [originalPhotos, setOriginalPhotos] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // États modales & retours visuels
  const [isCameraModalOpen, setIsCameraModalOpen] = useState(false);
  const [lightboxState, setLightboxState] = useState(null);
  const [crudError, setCrudError] = useState(null);
  const [statusToast, setStatusToast] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  const formRef = useRef(null);
  const textareaRef = useRef(null);
  const galleryInputRef = useRef(null);

  const showToast = useCallback((message) => {
    setStatusToast(message);
    setTimeout(() => {
      setStatusToast((prev) => (prev === message ? null : prev));
    }, 3200);
  }, []);

  // Callback appelé à chaque phrase finalisée par l'API SpeechRecognition
  const handleFinalTranscript = useCallback((transcriptChunk) => {
    setContent((prev) => {
      if (!prev.trim()) return transcriptChunk;
      const needsSpace = !/[\s\n]$/.test(prev);
      return `${prev}${needsSpace ? ' ' : ''}${transcriptChunk}`;
    });
  }, []);

  const {
    isSupported: isSpeechSupported,
    isListening,
    interimTranscript,
    speechError,
    setSpeechError,
    language,
    changeLanguage,
    stopListening,
    toggleListening,
  } = useSpeechRecognition({
    onFinalTranscript: handleFinalTranscript,
    defaultLang: 'fr-FR',
  });

  // Contenu affiché en temps réel dans le textarea
  const displayedContent = useMemo(() => {
    if (isListening && interimTranscript) {
      const needsSpace = content.length > 0 && !/[\s\n]$/.test(content);
      return `${content}${needsSpace ? ' ' : ''}${interimTranscript}`;
    }
    return content;
  }, [content, isListening, interimTranscript]);

  // Chargement initial des notes (READ)
  const loadNotes = useCallback(async () => {
    setLoadingNotes(true);
    setCrudError(null);
    try {
      const data = await fetchNotes({ useDemo: isDemoMode });
      setNotes(data);
    } catch (err) {
      setCrudError(
        err.message || 'Impossible de charger vos notes depuis Supabase.'
      );
    } finally {
      setLoadingNotes(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    loadNotes();
  }, [loadNotes]);

  // Réinitialiser le formulaire
  const resetForm = useCallback(() => {
    if (isListening) stopListening();
    setEditingNoteId(null);
    setTitle('');
    setContent('');
    setPhotos([]);
    setOriginalPhotos([]);
    setCrudError(null);
  }, [isListening, stopListening]);

  // Réception d'une photo prise depuis CameraCaptureModal
  const handleConfirmCapturedPhoto = useCallback(
    ({ blob, dataUrl, caption }) => {
      const newPhotoItem = {
        id: crypto.randomUUID ? crypto.randomUUID() : `photo-${Date.now()}`,
        blob,
        dataUrl,
        url: dataUrl,
        caption: caption || '',
        created_at: new Date().toISOString(),
      };

      setPhotos((prev) => [...prev, newPhotoItem]);
      setTitle((prevTitle) =>
        prevTitle.trim() ? prevTitle : generateDefaultPhotoTitle()
      );
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },
    []
  );

  // Import d'une ou plusieurs images depuis l'appareil
  const handleImportFiles = async (e) => {
    const fileList = Array.from(e.target.files || []);
    e.target.value = '';
    if (fileList.length === 0) return;

    setCrudError(null);
    try {
      const processed = await Promise.all(
        fileList.map(async (file) => {
          const { blob, dataUrl } = await compressImageFile(file, {
            maxDimension: 1280,
            quality: 0.84,
          });
          return {
            id: crypto.randomUUID
              ? crypto.randomUUID()
              : `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            blob,
            dataUrl,
            url: dataUrl,
            caption: '',
            created_at: new Date().toISOString(),
          };
        })
      );

      setPhotos((prev) => [...prev, ...processed]);
      setTitle((prevTitle) =>
        prevTitle.trim() ? prevTitle : generateDefaultPhotoTitle()
      );
    } catch (err) {
      setCrudError(err.message || "Erreur lors de l'importation de l'image.");
    }
  };

  // Mettre à jour la note associée à une photo précise
  const handlePhotoCaptionChange = (photoId, nextCaption) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, caption: nextCaption } : p))
    );
  };

  // Retirer une photo du formulaire
  const handleRemovePhoto = (photoId) => {
    setPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  // Soumission du formulaire : Création (CREATE) ou Mise à jour (UPDATE)
  const handleSubmit = async (e) => {
    e.preventDefault();
    const finalContentToSave = displayedContent;

    if (!title.trim()) {
      setCrudError('Veuillez saisir un titre pour votre note.');
      return;
    }

    if (isListening) {
      stopListening();
    }

    setIsSaving(true);
    setCrudError(null);

    try {
      if (editingNoteId) {
        const updated = await updateNote({
          id: editingNoteId,
          title,
          content: finalContentToSave,
          photos,
          previousPhotos: originalPhotos,
          userId: user?.id,
          useDemo: isDemoMode,
        });
        setNotes((prev) =>
          prev
            .map((n) => (n.id === editingNoteId ? updated : n))
            .sort(
              (a, b) =>
                new Date(b.updated_at).getTime() -
                new Date(a.updated_at).getTime()
            )
        );
        showToast('Note et photos mises à jour');
      } else {
        const created = await createNote({
          title,
          content: finalContentToSave,
          photos,
          userId: user?.id,
          useDemo: isDemoMode,
        });
        setNotes((prev) => [created, ...prev]);
        showToast('Nouvelle note enregistrée');
      }

      setEditingNoteId(null);
      setTitle('');
      setContent('');
      setPhotos([]);
      setOriginalPhotos([]);
    } catch (err) {
      setCrudError(
        err.message || "Erreur lors de l'enregistrement de la note."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Charger une note dans le formulaire pour édition
  const handleSelectEdit = (note, { openCamera = false } = {}) => {
    if (isListening) stopListening();
    const notePhotos = Array.isArray(note.photos) ? note.photos : [];
    setEditingNoteId(note.id);
    setTitle(note.title);
    setContent(note.content || '');
    setPhotos(notePhotos.map((p) => ({ ...p })));
    setOriginalPhotos(notePhotos);
    setCrudError(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (openCamera) {
      setIsCameraModalOpen(true);
    }
  };

  // Suppression d'une note (DELETE)
  const handleConfirmDelete = async (note) => {
    setDeletingId(note.id);
    setCrudError(null);
    try {
      await deleteNote({
        id: note.id,
        photos: note.photos || [],
        useDemo: isDemoMode,
      });
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      if (editingNoteId === note.id) {
        resetForm();
      }
      setConfirmDeleteId(null);
      showToast('Note supprimée');
    } catch (err) {
      setCrudError(err.message || 'Impossible de supprimer cette note.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyNote = async (note) => {
    try {
      const photoNotesText =
        Array.isArray(note.photos) && note.photos.length > 0
          ? `\n\nPhotos (${note.photos.length}) :\n` +
            note.photos
              .map(
                (p, idx) =>
                  `- Photo ${idx + 1}${p.caption ? ` : ${p.caption}` : ''}`
              )
              .join('\n')
          : '';
      await navigator.clipboard.writeText(
        `${note.title}\n\n${note.content || ''}${photoNotesText}`
      );
      setCopiedId(note.id);
      setTimeout(() => {
        setCopiedId((prev) => (prev === note.id ? null : prev));
      }, 2000);
    } catch {
      // Ignore si presse-papiers restreint
    }
  };

  const photoNotesCount = useMemo(
    () => notes.filter((n) => Array.isArray(n.photos) && n.photos.length > 0).length,
    [notes]
  );

  // Filtrage par recherche instantanée (titre, contenu ET notes de photos) + filtre onglet
  const filteredNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notes.filter((note) => {
      const notePhotos = Array.isArray(note.photos) ? note.photos : [];
      if (filterMode === 'with_photos' && notePhotos.length === 0) {
        return false;
      }
      if (!q) return true;
      const inTitle = note.title.toLowerCase().includes(q);
      const inContent = note.content && note.content.toLowerCase().includes(q);
      const inPhotoCaptions = notePhotos.some(
        (p) => p.caption && p.caption.toLowerCase().includes(q)
      );
      return inTitle || inContent || inPhotoCaptions;
    });
  }, [notes, searchQuery, filterMode]);

  const wordCount = useMemo(() => {
    const trimmed = displayedContent.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [displayedContent]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Bannière d'information en Mode Démo */}
      {isDemoMode && (
        <div className="bg-indigo-950 text-indigo-100 px-4 py-2.5 text-xs border-b border-indigo-900">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/25 text-indigo-200 font-semibold border border-indigo-400/30">
                <Sparkles className="h-3 w-3" /> Mode Démo Local
              </span>
              <span className="text-indigo-200/90">
                Testez le clavier, la dictée vocale et la prise de photos annotées. Connectez Supabase pour activer PostgreSQL + Storage privé RLS.
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onExitDemoMode ? (
                <button
                  type="button"
                  onClick={onExitDemoMode}
                  className="px-3 py-1 rounded-lg bg-white text-indigo-950 font-semibold hover:bg-indigo-50 transition cursor-pointer"
                >
                  Retour à la connexion Supabase
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsSetupModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white font-semibold transition cursor-pointer"
                >
                  <Database className="h-3.5 w-3.5" />
                  Connecter Supabase
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Barre de navigation supérieure */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm shadow-indigo-600/25">
              <Mic className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  VoxNote
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                  {notes.length} {notes.length > 1 ? 'notes' : 'note'}
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">
                Notes intelligentes : clavier, dictée vocale &amp; photos annotées
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {statusToast && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                {statusToast}
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsCameraModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs shadow-indigo-600/20 transition cursor-pointer"
            >
              <Camera className="h-3.5 w-3.5" />
              <span>Prendre une photo</span>
            </button>

            {!isDemoMode && user && (
              <div className="flex items-center gap-2.5">
                <span className="hidden lg:inline-block text-xs font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg truncate max-w-[180px]">
                  {user.user_metadata?.full_name || user.email}
                </span>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-medium text-slate-700 transition cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Déconnexion</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Contenu principal : Formulaire (gauche) + Liste des notes (droite) */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {crudError && (
          <div className="mb-6 rounded-xl bg-red-50 border border-red-200 p-4 flex items-start justify-between gap-3 text-sm text-red-700">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <span>{crudError}</span>
            </div>
            <button
              type="button"
              onClick={() => setCrudError(null)}
              className="text-red-500 hover:text-red-700 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLONNE GAUCHE : Formulaire Création / Édition + Micro + Photos */}
          <section
            ref={formRef}
            className="lg:col-span-5 lg:sticky lg:top-24 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                {editingNoteId ? (
                  <Edit3 className="h-4 w-4 text-indigo-600" />
                ) : (
                  <Plus className="h-4 w-4 text-indigo-600" />
                )}
                <h2 className="text-base font-semibold text-slate-900">
                  {editingNoteId ? 'Modifier la note' : 'Nouvelle note'}
                </h2>
              </div>

              {editingNoteId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 px-2.5 py-1 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                  Annuler
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Champ Titre */}
              <div>
                <label
                  htmlFor="note-title"
                  className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5"
                >
                  Titre de la note
                </label>
                <input
                  id="note-title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex : Croquis réunion, Facture matériel, Idées..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-600 transition"
                />
              </div>

              {/* Section Photos & Annotations dédiées */}
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Photos &amp; notes visuelles ({photos.length})
                  </span>

                  <div className="flex items-center gap-2">
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImportFiles}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => galleryInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 transition cursor-pointer"
                    >
                      <ImagePlus className="h-3.5 w-3.5 text-slate-500" />
                      Importer
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCameraModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-xs font-semibold text-indigo-700 transition cursor-pointer"
                    >
                      <Camera className="h-3.5 w-3.5" />
                      Prendre une photo
                    </button>
                  </div>
                </div>

                {photos.length > 0 ? (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {photos.map((photo, idx) => (
                      <div
                        key={photo.id}
                        className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/90"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setLightboxState({
                              photos,
                              index: idx,
                              noteTitle: title || 'Aperçu de la note',
                            })
                          }
                          className="relative group/thumb h-20 w-24 shrink-0 rounded-lg overflow-hidden bg-slate-200 border border-slate-200 cursor-pointer"
                        >
                          <img
                            src={photo.url || photo.dataUrl}
                            alt={photo.caption || `Photo ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition">
                            <ZoomIn className="h-4 w-4" />
                          </span>
                        </button>

                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-slate-500">
                              Photo #{idx + 1}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePhoto(photo.id)}
                              title="Retirer cette photo"
                              className="text-slate-400 hover:text-red-600 p-0.5 transition cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <textarea
                            rows={2}
                            value={photo.caption || ''}
                            onChange={(e) =>
                              handlePhotoCaptionChange(photo.id, e.target.value)
                            }
                            placeholder="Ajouter une note ou observation sur cette photo..."
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30 resize-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    onClick={() => setIsCameraModalOpen(true)}
                    className="rounded-xl border border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/30 px-4 py-3 flex items-center justify-between gap-3 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 text-xs text-slate-500">
                      <Camera className="h-4 w-4 text-indigo-500 shrink-0" />
                      <span>
                        Aucune photo jointe — cliquez pour photographier et annoter
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Barre de contrôle vocal + Champ Contenu */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <label
                    htmlFor="note-content"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-600"
                  >
                    Contenu de la note
                  </label>

                  {/* Contrôles Reconnaissance Vocale */}
                  <div className="flex items-center gap-2">
                    <div className="relative flex items-center">
                      <Globe className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                      <select
                        aria-label="Langue de dictée vocale"
                        value={language}
                        onChange={(e) => changeLanguage(e.target.value)}
                        className="pl-7 pr-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-xs font-medium text-slate-700 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {SPEECH_LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        toggleListening();
                        textareaRef.current?.focus();
                      }}
                      disabled={!isSpeechSupported}
                      title={
                        isSpeechSupported
                          ? 'Transcrire votre voix en direct dans le contenu'
                          : 'API Web Speech non supportée sur ce navigateur'
                      }
                      className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        isListening
                          ? 'bg-red-600 hover:bg-red-700 text-white ring-4 ring-red-500/20 animate-pulse'
                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                      }`}
                    >
                      {isListening ? (
                        <>
                          <MicOff className="h-3.5 w-3.5" />
                          <span>Arrêter</span>
                        </>
                      ) : (
                        <>
                          <Mic className="h-3.5 w-3.5" />
                          <span>Dicter</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Bandeau d'état d'écoute en direct */}
                {isListening && (
                  <div className="mb-2.5 px-3 py-2 rounded-xl bg-red-50 border border-red-200/80 flex items-center justify-between gap-2 text-xs text-red-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="relative flex h-2.5 w-2.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600" />
                      </span>
                      <span className="font-semibold shrink-0">
                        Écoute en cours...
                      </span>
                      <span className="truncate text-red-600/80 italic">
                        {interimTranscript || 'Parlez dans votre microphone'}
                      </span>
                    </div>
                  </div>
                )}

                {!isSpeechSupported && (
                  <div className="mb-2.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                    Votre navigateur ne prend pas en charge l&apos;API{' '}
                    <code>SpeechRecognition</code>. Utilisez Chrome, Edge ou Safari pour la dictée vocale.
                  </div>
                )}

                {speechError && (
                  <div className="mb-2.5 px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 flex items-start justify-between gap-2 text-xs text-amber-900">
                    <span>{speechError}</span>
                    <button
                      type="button"
                      onClick={() => setSpeechError(null)}
                      className="text-amber-700 hover:text-amber-900 shrink-0 cursor-pointer"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  id="note-content"
                  rows={6}
                  value={displayedContent}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Écrivez votre note au clavier ou cliquez sur « Dicter » pour transcrire votre voix en direct..."
                  className={`w-full px-3.5 py-3 rounded-xl border text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition resize-y ${
                    isListening
                      ? 'border-red-300 focus:ring-red-500/20 focus:border-red-500 bg-red-50/10'
                      : 'border-slate-300 focus:ring-indigo-500/30 focus:border-indigo-600'
                  }`}
                />

                <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                  <span>
                    {wordCount} {wordCount > 1 ? 'mots' : 'mot'} ·{' '}
                    {displayedContent.length} caractères
                  </span>
                  {displayedContent.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setContent('')}
                      className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    >
                      <Eraser className="h-3 w-3" />
                      Vider le texte
                    </button>
                  )}
                </div>
              </div>

              {/* Bouton Soumettre */}
              <div className="pt-1 flex items-center gap-2.5">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold shadow-sm shadow-indigo-600/20 transition cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : editingNoteId ? (
                    <>
                      <Save className="h-4 w-4" />
                      Mettre à jour la note
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Enregistrer la note
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>

          {/* COLONNE DROITE : Tableau de bord & Liste des notes */}
          <section className="lg:col-span-7 space-y-5">
            {/* Barre de recherche & filtres */}
            <div className="bg-white p-3 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par titre, texte ou note sur une photo..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-50 border border-transparent focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    filterMode === 'all'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Toutes ({notes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('with_photos')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    filterMode === 'with_photos'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="h-3.5 w-3.5" />
                  Avec photos ({photoNotesCount})
                </button>
              </div>
            </div>

            {/* États de chargement / liste vide / grille de notes */}
            {loadingNotes ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 flex flex-col items-center justify-center text-slate-500">
                <Loader2 className="h-7 w-7 animate-spin text-indigo-600 mb-3" />
                <p className="text-sm font-medium">Chargement de vos notes...</p>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
                  {filterMode === 'with_photos' ? (
                    <Camera className="h-6 w-6" />
                  ) : (
                    <FileText className="h-6 w-6" />
                  )}
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {searchQuery
                    ? 'Aucune note ne correspond à votre recherche'
                    : filterMode === 'with_photos'
                    ? 'Aucune note avec photo pour le moment'
                    : 'Aucune note pour le moment'}
                </h3>
                <p className="mt-1.5 text-sm text-slate-500 max-w-sm mx-auto">
                  {searchQuery
                    ? 'Essayez un autre mot-clé ou réinitialisez les filtres.'
                    : 'Prenez une photo pour y attacher une note, ou dictez directement à la voix dans le formulaire.'}
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  {(searchQuery || filterMode !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setFilterMode('all');
                      }}
                      className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 transition cursor-pointer"
                    >
                      Réinitialiser les filtres
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsCameraModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold text-white transition cursor-pointer"
                  >
                    <Camera className="h-3.5 w-3.5" />
                    Prendre une photo
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredNotes.map((note) => {
                  const isSelected = editingNoteId === note.id;
                  const isConfirmingDelete = confirmDeleteId === note.id;
                  const isDeleting = deletingId === note.id;
                  const notePhotos = Array.isArray(note.photos)
                    ? note.photos
                    : [];

                  return (
                    <article
                      key={note.id}
                      className={`group bg-white rounded-2xl border p-5 transition shadow-xs hover:shadow-md ${
                        isSelected
                          ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/15'
                          : 'border-slate-200/90 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-semibold text-slate-900 break-words">
                              {note.title}
                            </h3>
                            {notePhotos.length > 0 && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                                <Camera className="h-3 w-3" />
                                {notePhotos.length}
                              </span>
                            )}
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide bg-indigo-100 text-indigo-700">
                                En édition
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                            <Clock className="h-3 w-3" />
                            <span>
                              Modifié le{' '}
                              {formatDateFr(note.updated_at || note.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Actions de la carte : Ajouter photo, Copier, Modifier, Supprimer */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              handleSelectEdit(note, { openCamera: true })
                            }
                            title="Prendre et ajouter une photo à cette note"
                            className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          >
                            <Camera className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyNote(note)}
                            title="Copier la note"
                            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                          >
                            {copiedId === note.id ? (
                              <Check className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSelectEdit(note)}
                            title="Modifier cette note"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Modifier</span>
                          </button>

                          {isConfirmingDelete ? (
                            <div className="flex items-center gap-1 bg-red-50 border border-red-200 rounded-xl px-2 py-1">
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => handleConfirmDelete(note)}
                                className="text-xs font-semibold text-red-700 hover:text-red-800 px-1.5 cursor-pointer"
                              >
                                {isDeleting ? '...' : 'Confirmer'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(null)}
                                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(note.id)}
                              title="Supprimer cette note"
                              className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {note.content && (
                        <p className="mt-3 text-sm text-slate-600 whitespace-pre-line leading-relaxed break-words">
                          {note.content}
                        </p>
                      )}

                      {/* Galerie de photos annotées rattachées à la note */}
                      {notePhotos.length > 0 && (
                        <div
                          className={`mt-4 grid gap-3 ${
                            notePhotos.length === 1
                              ? 'grid-cols-1'
                              : 'grid-cols-1 sm:grid-cols-2'
                          }`}
                        >
                          {notePhotos.map((photo, idx) => (
                            <div
                              key={photo.id || idx}
                              className="rounded-xl border border-slate-200/90 overflow-hidden bg-slate-50 flex flex-col"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  setLightboxState({
                                    photos: notePhotos,
                                    index: idx,
                                    noteTitle: note.title,
                                  })
                                }
                                className="relative group/img overflow-hidden bg-slate-900/5 aspect-video w-full cursor-pointer"
                              >
                                <img
                                  src={photo.url || photo.dataUrl}
                                  alt={
                                    photo.caption ||
                                    `${note.title} - Photo ${idx + 1}`
                                  }
                                  className="w-full h-full object-cover group-hover/img:scale-[1.02] transition duration-200"
                                />
                                <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900/75 text-white text-[11px] font-medium opacity-0 group-hover/img:opacity-100 transition">
                                  <ZoomIn className="h-3.5 w-3.5" />
                                  Agrandir
                                </span>
                              </button>

                              {photo.caption && (
                                <div className="p-3 bg-white border-t border-slate-100 flex items-start gap-2">
                                  <MessageSquareText className="h-3.5 w-3.5 text-indigo-500 shrink-0 mt-0.5" />
                                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line break-words">
                                    {photo.caption}
                                  </p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {!note.content && notePhotos.length === 0 && (
                        <p className="mt-3 text-xs italic text-slate-400">
                          Aucun contenu
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Modales : Caméra, Visionneuse plein écran & Configuration Supabase */}
      <CameraCaptureModal
        isOpen={isCameraModalOpen}
        onClose={() => setIsCameraModalOpen(false)}
        onConfirmPhoto={handleConfirmCapturedPhoto}
      />

      <PhotoLightboxModal
        lightboxState={lightboxState}
        onClose={() => setLightboxState(null)}
        onChangeIndex={(nextIdx) =>
          setLightboxState((prev) =>
            prev ? { ...prev, index: nextIdx } : null
          )
        }
      />

      <SupabaseSetupModal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
      />
    </div>
  );
}
