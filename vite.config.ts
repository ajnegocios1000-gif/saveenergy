
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

dotenv.config();

console.log('Log: Vite Config - URL:', process.env.VITE_SUPABASE_URL ? 'Configurada' : 'NÃO ENCONTRADA');
console.log('Log: Vite Config - KEY:', process.env.VITE_SUPABASE_ANON_KEY ? 'Configurada' : 'NÃO ENCONTRADA');

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.VITE_SUPABASE_URL': JSON.stringify(process.env.VITE_SUPABASE_URL),
    'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(process.env.VITE_SUPABASE_ANON_KEY),
  },
  server: {
    middlewareMode: true,
    hmr: false,
    proxy: {},
  },
});
