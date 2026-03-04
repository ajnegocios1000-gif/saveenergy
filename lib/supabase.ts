
import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string | undefined => {
  const keysToTry = [key, key.replace('VITE_', ''), `VITE_${key}`, key.toLowerCase()];
  
  try {
    for (const k of keysToTry) {
      // Try import.meta.env
      if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[k]) {
        return (import.meta as any).env[k].trim();
      }
      // Try process.env
      if (typeof process !== 'undefined' && process.env?.[k]) {
        return process.env[k].trim();
      }
      // Try window._env_
      if (typeof window !== 'undefined' && (window as any)._env_?.[k]) {
        return (window as any)._env_[k].trim();
      }
    }
  } catch (e) {
    console.warn(`Log: Erro ao tentar ler variável ${key}`);
  }
  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

console.log('Log: Supabase Client Config - URL:', supabaseUrl ? 'OK' : 'MISSING');
console.log('Log: Supabase Client Config - KEY:', supabaseAnonKey ? 'OK' : 'MISSING');

const isConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Mock de fallback para evitar erros de "Cannot read properties of null" antes da inicialização
const supabaseMock = {
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase não configurado. Por favor, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente do AI Studio.') }),
    signInWithOAuth: async () => ({ data: { user: null, session: null }, error: new Error('Supabase não configurado. Por favor, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente do AI Studio.') }),
    updateUser: async () => ({ data: { user: null }, error: new Error('Supabase não configurado. Por favor, configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY nas variáveis de ambiente do AI Studio.') }),
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
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    }) 
  : supabaseMock;
