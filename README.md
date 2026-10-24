# VoxNote 🎙️📸

Application web intelligente de prise de notes permettant de créer et d'organiser ses notes :
- **Au clavier**
- **À la voix en direct** grâce à l'**API Web Speech native du navigateur** (`SpeechRecognition`)
- **Par prise de photos annotées** via la caméra (`getUserMedia` / appareil photo mobile) ou import d'images, avec la possibilité d'attacher une note dédiée (écrite ou dictée) à chaque cliché.

Stockage sécurisé avec **Supabase** (**PostgreSQL** + **Supabase Storage privé** + politiques **Row Level Security**).

## Stack technique

- **Frontend** : React.js (Vite) + Tailwind CSS + Lucide Icons
- **Reconnaissance vocale** : Web Speech API native (`SpeechRecognition` / `webkitSpeechRecognition`)
- **Capture & traitement photo** : MediaDevices API (`getUserMedia`) + compression JPEG HTML5 `<canvas>`
- **Backend, Storage & Auth** : `@supabase/supabase-js` (PostgreSQL, bucket privé `note-photos`, URLs signées, Politiques RLS)

## Architecture du projet

```text
VoxNote/
├── .env.example                       # Modèle des variables d'environnement Supabase
├── supabase/
│   └── schema.sql                     # Table "notes", bucket "note-photos" & règles RLS
└── src/
    ├── lib/
    │   └── supabaseClient.js          # Initialisation du client @supabase/supabase-js
    ├── hooks/
    │   └── useSpeechRecognition.js    # Hook React gérant la dictée vocale continue en direct
    ├── utils/
    │   └── imageUtils.js              # Capture vidéo webcam & compression JPEG côté client
    ├── services/
    │   └── notesService.js            # CRUD PostgreSQL + Upload/Suppression Supabase Storage
    ├── components/
    │   ├── AuthForm.jsx               # Connexion / Inscription Supabase Auth
    │   ├── CameraCaptureModal.jsx     # Prise de photo caméra + annotation écrite ou vocale
    │   ├── PhotoLightboxModal.jsx     # Visionneuse plein écran des photos et de leurs notes
    │   ├── NotesDashboard.jsx         # Tableau de bord, formulaire, micro & galerie photos
    │   └── SupabaseSetupModal.jsx     # Assistant de connexion rapide Supabase
    └── App.jsx                        # Gestion de session Auth & routage principal
```

## Installation et configuration

### 1. Installer les dépendances

```bash
npm install
```

### 2. Configurer PostgreSQL, Supabase Storage et les règles RLS

1. Créez un projet sur [Supabase](https://supabase.com).
2. Ouvrez **SQL Editor** dans votre tableau de bord Supabase.
3. Copiez et exécutez le contenu du fichier [`supabase/schema.sql`](./supabase/schema.sql) :
   - Crée/met à jour la table `public.notes` (incluant la colonne `photos JSONB`).
   - Active les politiques RLS sur `public.notes`.
   - Crée le bucket privé `note-photos` dans **Supabase Storage** et configure les politiques RLS sur `storage.objects` afin que chaque utilisateur n'accède qu'à son dossier `{auth.uid()}/*`.

### 3. Configurer les variables d'environnement

Copiez `.env.example` en `.env` à la racine du projet :

```bash
cp .env.example .env
```

Renseignez votre URL et votre clé publique `anon` (*Project Settings > API*) :

```env
VITE_SUPABASE_URL=https://votre-projet-id.supabase.co
VITE_SUPABASE_ANON_KEY=votre-cle-publique-anon-supabase
```

*(Sans fichier `.env`, l'application démarre automatiquement en **Mode Démo Local** afin de vous permettre de tester immédiatement l'interface, la prise de photos annotées, le CRUD et la dictée vocale).*

### 4. Lancer le serveur de développement

```bash
npm run dev
```
