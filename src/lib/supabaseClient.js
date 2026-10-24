import { createClient } from '@supabase/supabase-js';

const STORAGE_CONFIG_KEY = 'voxnote_supabase_config';

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
  : sanitizeEnvValue(storedConfig?.url, 'VITE_SUPABASE_URL');

export const activeSupabaseAnonKey = isValidAnonKey(envAnonKey)
  ? envAnonKey
  : sanitizeEnvValue(storedConfig?.anonKey, 'VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured =
  isValidSupabaseUrl(activeSupabaseUrl) &&
  isValidAnonKey(activeSupabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(activeSupabaseUrl, activeSupabaseAnonKey)
  : null;

export function saveRuntimeSupabaseConfig(url, anonKey) {
  const cleanUrl = sanitizeEnvValue(url, 'VITE_SUPABASE_URL');
  const cleanKey = sanitizeEnvValue(anonKey, 'VITE_SUPABASE_ANON_KEY');
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

export const hasRuntimeConfig = Boolean(
  storedConfig?.url && storedConfig?.anonKey
);
