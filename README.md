# VoxNote 🎙️📸📱

Application web & mobile (**PWA installable Android / iPhone**) de prise de notes intelligente permettant de créer, organiser et partager ses notes :
- **Au clavier**
- **À la voix en direct** grâce à l'**API Web Speech native** (`SpeechRecognition`)
- **Par prise de photos annotées** via la caméra (`getUserMedia` / appareil photo mobile) ou import d'images
- **Partage direct sur WhatsApp** (formatage natif + pièces jointes photos sur mobile)
- **Application Mobile PWA** installable en plein écran sur **Android** et **iOS (Safari)**

Stockage sécurisé avec **Supabase** (**PostgreSQL** + **Supabase Storage privé** + politiques **Row Level Security**).

## Stack technique

- **Frontend & PWA** : React.js (Vite) + Tailwind CSS + Web App Manifest + Service Worker (`sw.js`)
- **Reconnaissance vocale** : Web Speech API native (`SpeechRecognition` / `webkitSpeechRecognition`)
- **Capture & traitement photo** : MediaDevices API (`getUserMedia`) + compression JPEG HTML5 `<canvas>`
- **Partage** : API WhatsApp `wa.me` + Web Share API Level 2 (partage de fichiers sur mobile)
- **Backend, Storage & Auth** : `@supabase/supabase-js` (PostgreSQL, bucket privé `note-photos`, URLs signées, Politiques RLS)

## Installer VoxNote sur téléphone (PWA)

Une fois déployée en HTTPS (par ex. sur Netlify) :
- **Sur Android (Chrome / Edge / Samsung Internet)** : appuyez sur le bouton **« Installer l'appli »** directement dans VoxNote (ou menu `⋮` → *Installer l'application*).
- **Sur iPhone / iPad (Safari)** : appuyez sur **Partager** (`⬆️`) → **Sur l'écran d'accueil** (`➕`) → **Ajouter**.

## Développement local

```bash
npm install
cp .env.example .env
npm run dev
```
