import { supabase, isSupabaseConfigured } from '../lib/supabaseClient';

const DEMO_STORAGE_KEY = 'voxnote_demo_notes_v2';
const PHOTO_BUCKET = 'note-photos';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 24 heures

// Exemple d'image vectorielle légère simulant un croquis de tableau blanc en Mode Démo
const DEMO_WHITEBOARD_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="540" viewBox="0 0 960 540">
    <rect width="960" height="540" fill="#f8fafc"/>
    <rect x="28" y="28" width="904" height="484" rx="20" fill="#ffffff" stroke="#cbd5e1" stroke-width="3"/>
    <text x="68" y="88" font-family="system-ui, sans-serif" font-size="26" font-weight="700" fill="#1e293b">Architecture VoxNote — Réunion Produit</text>
    <rect x="70" y="135" width="230" height="130" rx="16" fill="#eef2ff" stroke="#6366f1" stroke-width="2.5"/>
    <text x="102" y="188" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#312e81">React + Vite</text>
    <text x="92" y="220" font-family="system-ui, sans-serif" font-size="15" fill="#4338ca">• Web Speech API</text>
    <text x="92" y="244" font-family="system-ui, sans-serif" font-size="15" fill="#4338ca">• Capture Caméra</text>
    <path d="M310 200 L380 200" stroke="#64748b" stroke-width="3" stroke-dasharray="6 6"/>
    <polygon points="385,200 373,193 373,207" fill="#64748b"/>
    <rect x="395" y="135" width="240" height="130" rx="16" fill="#ecfdf5" stroke="#10b981" stroke-width="2.5"/>
    <text x="435" y="188" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#065f46">Supabase RLS</text>
    <text x="420" y="220" font-family="system-ui, sans-serif" font-size="15" fill="#047857">• Table PostgreSQL</text>
    <text x="420" y="244" font-family="system-ui, sans-serif" font-size="15" fill="#047857">• auth.uid() = user_id</text>
    <path d="M645 200 L715 200" stroke="#64748b" stroke-width="3" stroke-dasharray="6 6"/>
    <polygon points="720,200 708,193 708,207" fill="#64748b"/>
    <rect x="730" y="135" width="165" height="130" rx="16" fill="#fef3c7" stroke="#f59e0b" stroke-width="2.5"/>
    <text x="756" y="188" font-family="system-ui, sans-serif" font-size="19" font-weight="700" fill="#92400e">Storage Privé</text>
    <text x="748" y="220" font-family="system-ui, sans-serif" font-size="14" fill="#b45309">• Bucket photos</text>
    <text x="748" y="244" font-family="system-ui, sans-serif" font-size="14" fill="#b45309">• URLs signées</text>
    <rect x="70" y="315" width="825" height="145" rx="14" fill="#f1f5f9"/>
    <text x="96" y="356" font-family="system-ui, sans-serif" font-size="17" font-weight="600" fill="#334155">Notes manuscrites capturées :</text>
    <text x="96" y="390" font-family="system-ui, sans-serif" font-size="16" fill="#475569">1. Permettre d'annoter chaque photo individuellement (clavier ou dictée vocale).</text>
    <text x="96" y="422" font-family="system-ui, sans-serif" font-size="16" fill="#475569">2. Isoler les fichiers dans note-photos/{user_id}/{photo_id}.jpg avec politiques RLS.</text>
  </svg>`
)}`;

const INITIAL_DEMO_NOTES = [
  {
    id: 'demo-note-photo-1',
    user_id: 'demo-user',
    title: 'Croquis tableau blanc — Architecture VoxNote 📸',
    content:
      "Synthèse prise en photo à la fin de l'atelier technique.\nVous pouvez cliquer sur la photo ci-dessous pour l'agrandir, ou utiliser le bouton « Prendre une photo » dans le formulaire pour capturer vos propres clichés et y ajouter des notes !",
    photos: [
      {
        id: 'demo-photo-1',
        url: DEMO_WHITEBOARD_SVG,
        caption:
          'Schéma validé en réunion : flux React (Web Speech + Caméra) vers PostgreSQL et Supabase Storage privé.',
        created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
      },
    ],
    created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
  },
  {
    id: 'demo-note-2',
    user_id: 'demo-user',
    title: 'Bienvenue sur VoxNote 🎙️',
    content:
      "VoxNote vous permet de créer des notes intelligentes :\n- Au clavier\n- À la voix en direct (bouton « Dicter »)\n- En prenant des photos annotées depuis votre caméra ou votre téléphone !",
    photos: [],
    created_at: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000 * 5).toISOString(),
  },
];

function readDemoNotes() {
  try {
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(
        DEMO_STORAGE_KEY,
        JSON.stringify(INITIAL_DEMO_NOTES)
      );
      return INITIAL_DEMO_NOTES;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_DEMO_NOTES;
  }
}

function writeDemoNotes(notes) {
  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(notes));
  } catch {
    throw new Error(
      "L'espace de stockage local du navigateur est plein. Supprimez d'anciennes photos de démo ou connectez Supabase Storage."
    );
  }
}

function formatSupabaseError(error) {
  const msg = error?.message || '';
  const code = error?.code || '';

  if (
    code === 'PGRST205' ||
    code === '42P01' ||
    msg.includes("Could not find the table 'public.notes'") ||
    msg.includes('relation "public.notes" does not exist')
  ) {
    return new Error(
      "La table 'notes' n'existe pas encore dans votre base Supabase. Ouvrez Supabase Dashboard → SQL Editor, puis collez et exécutez le contenu du fichier `supabase/schema.sql`."
    );
  }

  if (
    msg.includes('Bucket not found') ||
    (msg.includes('photos') && msg.includes('column'))
  ) {
    return new Error(
      "Le support des photos n'est pas encore activé sur votre base Supabase. Exécutez le script `supabase/schema.sql` dans le SQL Editor de Supabase."
    );
  }

  return error;
}

/**
 * Génère en une seule requête groupée les URLs signées temporaires pour toutes les photos
 * stockées dans le bucket privé "note-photos".
 */
async function hydrateNotesSignedUrls(notes) {
  if (!supabase || !Array.isArray(notes) || notes.length === 0) {
    return notes;
  }

  const allPaths = [];
  for (const note of notes) {
    if (Array.isArray(note.photos)) {
      for (const photo of note.photos) {
        if (photo.storage_path) {
          allPaths.push(photo.storage_path);
        }
      }
    }
  }

  if (allPaths.length === 0) {
    return notes.map((n) => ({ ...n, photos: Array.isArray(n.photos) ? n.photos : [] }));
  }

  const { data: signedList } = await supabase.storage
    .from(PHOTO_BUCKET)
    .createSignedUrls(allPaths, SIGNED_URL_TTL_SECONDS);

  const signedMap = new Map();
  if (Array.isArray(signedList)) {
    for (const item of signedList) {
      if (item.path && item.signedUrl) {
        signedMap.set(item.path, item.signedUrl);
      }
    }
  }

  return notes.map((note) => ({
    ...note,
    photos: (Array.isArray(note.photos) ? note.photos : []).map((photo) => ({
      ...photo,
      url:
        (photo.storage_path && signedMap.get(photo.storage_path)) ||
        photo.url ||
        '',
    })),
  }));
}

/**
 * Téléverse les nouvelles photos (possédant un `blob`) dans `{userId}/{photoId}.jpg`
 * et retourne le tableau JSONB propre à enregistrer en base.
 */
async function uploadPendingPhotos(photos = [], userId) {
  const persistedPhotos = [];

  for (const photo of photos) {
    if (photo.blob) {
      const photoId =
        photo.id ||
        (crypto.randomUUID ? crypto.randomUUID() : `photo-${Date.now()}`);
      const storagePath = `${userId}/${photoId}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(storagePath, photo.blob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        throw formatSupabaseError(uploadError);
      }

      persistedPhotos.push({
        id: photoId,
        storage_path: storagePath,
        caption: (photo.caption || '').trim(),
        created_at: photo.created_at || new Date().toISOString(),
      });
    } else {
      persistedPhotos.push({
        id: photo.id,
        storage_path: photo.storage_path,
        url: photo.storage_path ? undefined : photo.url,
        caption: (photo.caption || '').trim(),
        created_at: photo.created_at || new Date().toISOString(),
      });
    }
  }

  return persistedPhotos;
}

async function removeOrphanStorageFiles(paths = []) {
  const validPaths = paths.filter(Boolean);
  if (!supabase || validPaths.length === 0) return;
  await supabase.storage.from(PHOTO_BUCKET).remove(validPaths).catch(() => {});
}

/**
 * LIRE (Read) : Récupère les notes + URLs signées des photos de l'utilisateur.
 */
export async function fetchNotes({ useDemo = false } = {}) {
  if (!isSupabaseConfigured || useDemo) {
    const notes = readDemoNotes().map((n) => ({
      ...n,
      photos: Array.isArray(n.photos) ? n.photos : [],
    }));
    return [...notes].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  const { data, error } = await supabase
    .from('notes')
    .select('id, title, content, photos, user_id, created_at, updated_at')
    .order('updated_at', { ascending: false });

  if (error) throw formatSupabaseError(error);
  return hydrateNotesSignedUrls(data ?? []);
}

/**
 * CRÉER (Create) : Téléverse les photos éventuelles puis insère la note dans Supabase.
 */
export async function createNote({
  title,
  content,
  photos = [],
  userId,
  useDemo = false,
}) {
  const cleanTitle = title.trim();

  if (!isSupabaseConfigured || useDemo) {
    const now = new Date().toISOString();
    const demoPhotos = photos.map((p) => ({
      id: p.id || (crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}`),
      url: p.url || p.dataUrl,
      caption: (p.caption || '').trim(),
      created_at: p.created_at || now,
    }));

    const newNote = {
      id: crypto.randomUUID ? crypto.randomUUID() : `note-${Date.now()}`,
      user_id: userId || 'demo-user',
      title: cleanTitle,
      content,
      photos: demoPhotos,
      created_at: now,
      updated_at: now,
    };
    const notes = readDemoNotes();
    writeDemoNotes([newNote, ...notes]);
    return newNote;
  }

  const uploadedPhotos = await uploadPendingPhotos(photos, userId);

  const { data, error } = await supabase
    .from('notes')
    .insert([
      {
        title: cleanTitle,
        content,
        photos: uploadedPhotos,
        user_id: userId,
      },
    ])
    .select()
    .single();

  if (error) throw formatSupabaseError(error);

  const [hydrated] = await hydrateNotesSignedUrls([data]);
  return hydrated;
}

/**
 * METTRE À JOUR (Update) : Gère l'ajout/suppression de photos et met à jour la note.
 */
export async function updateNote({
  id,
  title,
  content,
  photos = [],
  previousPhotos = [],
  userId,
  useDemo = false,
}) {
  const cleanTitle = title.trim();
  const now = new Date().toISOString();

  if (!isSupabaseConfigured || useDemo) {
    const demoPhotos = photos.map((p) => ({
      id: p.id || (crypto.randomUUID ? crypto.randomUUID() : `p-${Date.now()}`),
      url: p.url || p.dataUrl,
      caption: (p.caption || '').trim(),
      created_at: p.created_at || now,
    }));

    const notes = readDemoNotes();
    let updatedNote = null;
    const nextNotes = notes.map((note) => {
      if (note.id === id) {
        updatedNote = {
          ...note,
          title: cleanTitle,
          content,
          photos: demoPhotos,
          updated_at: now,
        };
        return updatedNote;
      }
      return note;
    });
    if (!updatedNote) {
      throw new Error('Note introuvable.');
    }
    writeDemoNotes(nextNotes);
    return updatedNote;
  }

  // Nettoyer du bucket Storage les photos qui ont été retirées de la note
  const keptStoragePaths = new Set(
    photos.map((p) => p.storage_path).filter(Boolean)
  );
  const removedPaths = previousPhotos
    .map((p) => p.storage_path)
    .filter((path) => path && !keptStoragePaths.has(path));

  if (removedPaths.length > 0) {
    await removeOrphanStorageFiles(removedPaths);
  }

  const uploadedPhotos = await uploadPendingPhotos(photos, userId);

  const { data, error } = await supabase
    .from('notes')
    .update({
      title: cleanTitle,
      content,
      photos: uploadedPhotos,
      updated_at: now,
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw formatSupabaseError(error);

  const [hydrated] = await hydrateNotesSignedUrls([data]);
  return hydrated;
}

/**
 * SUPPRIMER (Delete) : Supprime la note et nettoie ses fichiers photos dans Storage.
 */
export async function deleteNote({ id, photos = [], useDemo = false }) {
  if (!isSupabaseConfigured || useDemo) {
    const notes = readDemoNotes();
    writeDemoNotes(notes.filter((note) => note.id !== id));
    return;
  }

  const storagePaths = photos.map((p) => p.storage_path).filter(Boolean);
  if (storagePaths.length > 0) {
    await removeOrphanStorageFiles(storagePaths);
  }

  const { error } = await supabase.from('notes').delete().eq('id', id);
  if (error) throw formatSupabaseError(error);
}
