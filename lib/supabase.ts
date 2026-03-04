
import { createClient } from '@supabase/supabase-js';

const getEnvVar = (key: string): string | undefined => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.[key]) {
      return (import.meta as any).env[key];
    }
    if (typeof process !== 'undefined' && process.env?.[key]) {
      return process.env[key];
    }
    if (typeof window !== 'undefined' && (window as any)._env_?.[key]) {
      return (window as any)._env_[key];
    }
  } catch (e) {
    console.warn(`Log: Falha ao ler variável ${key}`);
  }
  return undefined;
};

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

const isConfigured = !!supabaseUrl && !!supabaseAnonKey;

// Mock de fallback para evitar erros de "Cannot read properties of null" antes da inicialização
const supabaseMock = {
  auth: {
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase não configurado') }),
    updateUser: async () => ({ data: { user: null }, error: new Error('Supabase não configurado') }),
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
