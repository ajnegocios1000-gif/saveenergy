
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

dotenv.config();

const getEnv = (key: string) => {
  const val = process.env[key] || process.env[key.replace('VITE_', '')] || process.env[`VITE_${key}`];
  return val ? val.trim() : '';
};

const sUrl = getEnv('VITE_SUPABASE_URL');
const sKey = getEnv('VITE_SUPABASE_ANON_KEY');
const gKey = getEnv('GEMINI_API_KEY');

console.log('Log: Vite Config - URL:', sUrl ? 'Configurada' : 'NÃO ENCONTRADA');
console.log('Log: Vite Config - KEY:', sKey ? 'Configurada' : 'NÃO ENCONTRADA');
console.log('Log: Vite Config - GEMINI:', gKey ? 'Configurada' : 'NÃO ENCONTRADA');

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.VITE_SUPABASE_URL': JSON.stringify(sUrl),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(sKey),
    'process.env.GEMINI_API_KEY': JSON.stringify(gKey),
  },
  server: {
    middlewareMode: true,
    hmr: false,
    proxy: {},
  },
});
