
import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string | undefined => {
  const isUrlRequest = key.includes('URL');
  const isKeyRequest = key.includes('KEY') || key.includes('ANON');

  const keysToTry = [key, key.replace('VITE_', ''), `VITE_${key}`, key.toLowerCase()];
  
  if (isUrlRequest) {
    keysToTry.push('VITE_SUPABASE_UR', 'SUPABASE_UR', 'URL', 'VITE_SUPABASE_URL', 'SUPABASE_URL');
  }
  if (isKeyRequest) {
    keysToTry.push('VITE_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY', 'ANON_KEY', 'KEY');
  }

  const cleanValue = (val: any): string | undefined => {
    if (typeof val !== 'string') return undefined;
    const trimmed = val.trim();
    if (!trimmed) return undefined;
    // Remove quotes if they were accidentally included
    return trimmed.replace(/^["']|["']$/g, '');
  };

  try {
    for (const k of keysToTry) {
      // 1. Try process.env
      if (typeof process !== 'undefined' && process.env && (process.env as any)[k]) {
        const val = cleanValue((process.env as any)[k]);
        if (val) {
          // Safety check: if we want a URL, don't return something that looks like a JWT key
          if (isUrlRequest && val.startsWith('eyJ')) continue;
          // Safety check: if we want a key, don't return something that looks like a URL
          if (isKeyRequest && val.startsWith('http')) continue;
          return val;
        }
      }
      // 2. Try import.meta.env
      if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[k]) {
        const val = cleanValue((import.meta as any).env[k]);
        if (val) {
          if (isUrlRequest && val.startsWith('eyJ')) continue;
          if (isKeyRequest && val.startsWith('http')) continue;
          return val;
        }
      }
    }
  } catch (e) {
    console.warn(`Log: Erro ao tentar ler variável ${key}`);
  }
  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

const isValidUrl = (url: string | undefined): boolean => {
  if (!url) return false;
  return url.startsWith('http://') || url.startsWith('https://');
};

const cleanUrl = supabaseUrl || '';
const cleanKey = supabaseAnonKey || '';

// Detect if user swapped URL and Key
const isSwapped = cleanUrl.startsWith('eyJ') || cleanKey.startsWith('http');

console.log('Log: Supabase Client Config - URL:', isValidUrl(cleanUrl) ? 'OK' : (cleanUrl ? `INVALID FORMAT (${cleanUrl.substring(0, 10)}...)` : 'MISSING'));
console.log('Log: Supabase Client Config - KEY:', cleanKey ? 'OK' : 'MISSING');
if (isSwapped) console.error('Log: ALERTA - Parece que você inverteu a URL e a KEY do Supabase!');

const isConfigured = isValidUrl(cleanUrl) && !!cleanKey && !isSwapped;

const getErrorMessage = () => {
  if (isSwapped) return '⚠️ ALERTA: Você inverteu as chaves! Coloque a URL no campo VITE_SUPABASE_URL e a Key no campo VITE_SUPABASE_ANON_KEY.';
  if (!cleanUrl || !cleanKey) return 'Supabase não configurado. Por favor, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente do AI Studio.';
  if (!isValidUrl(cleanUrl)) return `URL do Supabase inválida: "${cleanUrl.substring(0, 20)}...". Certifique-se de que começa com https://`;
  return 'Erro desconhecido na configuração do Supabase.';
};

// Mock de fallback para evitar erros de "Cannot read properties of null" antes da inicialização
const supabaseMock = {
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error(getErrorMessage()) }),
    signInWithOAuth: async () => ({ data: { user: null, session: null }, error: new Error(getErrorMessage()) }),
    updateUser: async () => ({ data: { user: null }, error: new Error(getErrorMessage()) }),
    signOut: async () => ({ error: null }),
  },
  from: () => ({
    select: () => ({
      order: () => ({
        maybeSingle: async () => ({ data: null, error: null }),
        single: async () => ({ data: null, error: null }),
      }),
      maybeSingle: async () => ({ data: null, error: null }),
      single: async () => ({ data: null, error: null }),
    }),
    upsert: async () => ({ data: null, error: null }),
    insert: async () => ({ data: null, error: null }),
    update: async () => ({ data: null, error: null }),
    delete: async () => ({ data: null, error: null }),
  }),
  storage: {
    from: () => ({
      upload: async () => ({ data: null, error: null }),
      getPublicUrl: () => ({ data: { publicUrl: '' } }),
    }),
  },
} as any;

export const supabase = isConfigured 
  ? createClient(cleanUrl, cleanKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }) 
  : supabaseMock;
