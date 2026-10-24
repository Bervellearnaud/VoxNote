-- ============================================================================
-- VoxNote - Schéma PostgreSQL, Supabase Storage & Politiques RLS
-- À exécuter dans : Supabase Dashboard > SQL Editor > New Query
-- ============================================================================

-- 1. Création de la table "notes" (avec support des photos annotées en JSONB)
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL CHECK (char_length(trim(title)) > 0),
  content TEXT NOT NULL DEFAULT '',
  photos JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Migration douce si la table "notes" existait déjà sans la colonne "photos"
ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS photos JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 2. Index de performance pour accélérer le tri et le filtrage par utilisateur
CREATE INDEX IF NOT EXISTS idx_notes_user_updated_at
  ON public.notes (user_id, updated_at DESC);

-- 3. Trigger automatique de mise à jour du champ "updated_at"
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_notes_updated_at ON public.notes;
CREATE TRIGGER set_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. Activation de la sécurité Row Level Security (RLS) sur "notes"
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 5. Politiques RLS sur la table "notes"
DROP POLICY IF EXISTS "Lecture de ses propres notes" ON public.notes;
CREATE POLICY "Lecture de ses propres notes"
  ON public.notes
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Création de ses propres notes" ON public.notes;
CREATE POLICY "Création de ses propres notes"
  ON public.notes
  FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Modification de ses propres notes" ON public.notes;
CREATE POLICY "Modification de ses propres notes"
  ON public.notes
  FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Suppression de ses propres notes" ON public.notes;
CREATE POLICY "Suppression de ses propres notes"
  ON public.notes
  FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- ============================================================================
-- 6. Configuration de Supabase Storage pour les photos des notes (Bucket privé)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'note-photos',
  'note-photos',
  false, -- Bucket privé : accès uniquement via URLs signées et règles RLS
  5242880, -- Limite de 5 Mo par image
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 7. Politiques RLS sur storage.objects : chaque utilisateur stocke ses photos
-- dans son dossier dédié "{auth.uid()}/{photo_id}.jpg"

DROP POLICY IF EXISTS "Lecture de ses propres photos" ON storage.objects;
CREATE POLICY "Lecture de ses propres photos"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'note-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Upload de ses propres photos" ON storage.objects;
CREATE POLICY "Upload de ses propres photos"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'note-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Mise à jour de ses propres photos" ON storage.objects;
CREATE POLICY "Mise à jour de ses propres photos"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'note-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  )
  WITH CHECK (
    bucket_id = 'note-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );

DROP POLICY IF EXISTS "Suppression de ses propres photos" ON storage.objects;
CREATE POLICY "Suppression de ses propres photos"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'note-photos'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
