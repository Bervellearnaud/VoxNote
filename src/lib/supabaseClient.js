import { createClient } from '@supabase/supabase-js';

// Identifiants publics du projet Supabase VoxNote (clé publishable protégée par RLS)
const DEFAULT_SUPABASE_URL = 'https://fhtrsqgokkvekvidmpuj.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'sb_publishable_pM3Moa9iwYRhyjLM8DxRAQ_ScS2bEXj';

function sanitizeEnvValue(raw, expectedKeyName) {
  if (!raw || typeof raw !== 'string') return '';
  let val = raw.trim();
  if (expectedKeyName && val.startsWith(`${expectedKeyName}=`)) {
    val = val.slice(expectedKeyName.length + 1).trim();
  }
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1).trim();
  }
  return val.replace(/\/+$/, '');
}

function isValidSupabaseUrl(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.includes('votre-projet-id.supabase.co')) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

function isValidAnonKey(key) {
  if (!key || typeof key !== 'string') return false;
  if (key === 'votre-cle-publique-anon-supabase') return false;
  return key.trim().length > 20;
}

// Nettoyer toute ancienne saisie manuelle locale pour toujours utiliser la vraie base Supabase
if (typeof window !== 'undefined') {
  try {
    window.localStorage.removeItem('voxnote_supabase_config');
  } catch {
    // Ignore
  }
}

const envUrl = sanitizeEnvValue(
  import.meta.env.VITE_SUPABASE_URL,
  'VITE_SUPABASE_URL'
);
const envAnonKey = sanitizeEnvValue(
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  'VITE_SUPABASE_ANON_KEY'
);

export const activeSupabaseUrl = isValidSupabaseUrl(envUrl)
  ? envUrl
  : DEFAULT_SUPABASE_URL;

export const activeSupabaseAnonKey = isValidAnonKey(envAnonKey)
  ? envAnonKey
  : DEFAULT_SUPABASE_ANON_KEY;

export const isSupabaseConfigured =
  isValidSupabaseUrl(activeSupabaseUrl) &&
  isValidAnonKey(activeSupabaseAnonKey);

export const supabase = createClient(activeSupabaseUrl, activeSupabaseAnonKey);

export const hasRuntimeConfig = false;
export function saveRuntimeSupabaseConfig() {}
export function clearRuntimeSupabaseConfig() {}
