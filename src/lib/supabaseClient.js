import { createClient } from '@supabase/supabase-js';

const STORAGE_CONFIG_KEY = 'voxnote_supabase_config';

function getStoredConfig() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_CONFIG_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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

const storedConfig = getStoredConfig();

const supabaseUrl = isValidSupabaseUrl(import.meta.env.VITE_SUPABASE_URL)
  ? import.meta.env.VITE_SUPABASE_URL
  : storedConfig?.url;

const supabaseAnonKey = isValidAnonKey(import.meta.env.VITE_SUPABASE_ANON_KEY)
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : storedConfig?.anonKey;

export const isSupabaseConfigured =
  isValidSupabaseUrl(supabaseUrl) && isValidAnonKey(supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function saveRuntimeSupabaseConfig(url, anonKey) {
  const cleanUrl = url.trim();
  const cleanKey = anonKey.trim();
  if (!isValidSupabaseUrl(cleanUrl) || !isValidAnonKey(cleanKey)) {
    throw new Error(
      "Veuillez fournir une URL Supabase valide (https://...) et une clé publique 'anon' valide."
    );
  }
  window.localStorage.setItem(
    STORAGE_CONFIG_KEY,
    JSON.stringify({ url: cleanUrl, anonKey: cleanKey })
  );
  window.location.reload();
}

export function clearRuntimeSupabaseConfig() {
  window.localStorage.removeItem(STORAGE_CONFIG_KEY);
  window.location.reload();
}

export const hasRuntimeConfig = Boolean(storedConfig?.url && storedConfig?.anonKey);
