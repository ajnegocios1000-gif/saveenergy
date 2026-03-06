
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Security Headers
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src * 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
    "script-src * 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
    "connect-src * 'self' 'unsafe-inline' 'unsafe-eval' data: blob:; " +
    "img-src * 'self' data: blob:; " +
    "style-src * 'self' 'unsafe-inline'; " +
    "font-src * 'self' data:; " +
    "media-src * 'self' data: blob:; " +
    "frame-src * 'self';"
  );
  next();
});

async function startServer() {
  app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));

const PORT = 3000;
const distPath = path.join(__dirname, 'dist');

const getEnv = (key) => {
  const val = process.env[key] || process.env[key.replace('VITE_', '')] || process.env[`VITE_${key}`];
  return val ? val.trim() : '';
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || getEnv('VITE_SUPABASE_ANON_KEY');

const isValidUrl = (url) => url && (url.startsWith('http://') || url.startsWith('https://'));

let supabase = null;
const memoryLeads = []; // Fallback in-memory leads

if (isValidUrl(supabaseUrl) && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Log: Backend Supabase carregado ✅');
  } catch (err) {
    console.error('Log: Falha Supabase Backend:', err.message);
  }
} else if (supabaseUrl || supabaseKey) {
  console.warn('Log: Supabase Backend não iniciado - URL ou Chave inválida/ausente');
}

/**
 * Rotina de Teste de Chaves: Força a validação de todas as chaves a cada 4 horas
 */
async function forceReTestAllKeys() {
  if (!supabase) return;
  console.log('Log: [Auto-Sync] Iniciando re-teste de 4 horas para todas as chaves de API...');
  try {
    const { data: keys } = await supabase.from('api_keys').select('*');
    if (!keys) return;

    for (const k of keys) {
      try {
        const ai = new GoogleGenAI({ apiKey: k.key_value });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: 'ping',
          config: { maxOutputTokens: 2, temperature: 0.1 }
        });
        
        if (response.text) {
          await supabase.from('api_keys').update({ status: 'active' }).eq('id', k.id);
        }
      } catch (e) {
        const msg = e.message.toLowerCase();
        let status = 'error';
        if (msg.includes('429') || msg.includes('quota') || msg.includes('limit') || msg.includes('credit') || msg.includes('exhausted')) {
          status = 'no_credit';
        }
        await supabase.from('api_keys').update({ status }).eq('id', k.id);
        console.warn(`Log: Chave [${k.label}] falhou no re-teste de 4h: ${status}`);
      }
    }
    console.log('Log: [Auto-Sync] Re-teste concluído com sucesso.');
  } catch (err) {
    console.error('Log: Erro na rotina de auto-teste:', err.message);
  }
}

// Inicia o intervalo de 4 horas (14400000ms)
setInterval(forceReTestAllKeys, 14400000);

app.post('/api/admin/test-key', async (req, res) => {
  const { id, key_value } = req.body;
  try {
    const ai = new GoogleGenAI({ apiKey: key_value });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'ping',
      config: { maxOutputTokens: 5, temperature: 0.1 }
    });
    
    const status = (response.text) ? 'active' : 'error';
    if (supabase && id) {
      await supabase.from('api_keys').update({ status }).eq('id', id);
    }
    res.json({ status });
  } catch (e) {
    console.error(`Log: Falha manual na chave [${id}]:`, e.message);
    let status = 'error';
    const msg = e.message.toLowerCase();
    if (msg.includes('429') || msg.includes('quota') || msg.includes('limit') || msg.includes('credit') || msg.includes('exhausted')) {
      status = 'no_credit';
    }
    if (supabase && id) {
      await supabase.from('api_keys').update({ status }).eq('id', id);
    }
    res.json({ status, error: e.message });
  }
});

app.get('/api/admin/api-keys', async (req, res) => {
  try {
    if (!supabase) return res.json([]);
    const { data, error } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Error fetching API keys:', err);
    res.status(500).json([]);
  }
});

app.post('/api/admin/api-keys', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase offline' });
  try {
    const { error } = await supabase.from('api_keys').insert([req.body]);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/api-keys/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase offline' });
  const { id } = req.params;
  try {
    const { error } = await supabase.from('api_keys').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/banners', async (req, res) => {
  try {
    if (!supabase) return res.json([]);
    const { data, error } = await supabase.from('banners').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Error fetching banners:', err);
    res.status(500).json([]);
  }
});

app.post('/api/admin/banners', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase offline' });
  const banner = req.body;
  try {
    const { data, error } = await supabase.from('banners').insert([banner]).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/banners/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase offline' });
  const { id } = req.params;
  try {
    const { error } = await supabase.from('banners').update(req.body).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/banners/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase offline' });
  const { id } = req.params;
  try {
    const { error } = await supabase.from('banners').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/settings', async (req, res) => {
  try {
    if (!supabase) return res.json({});
    const { data, error } = await supabase.from('site_content').select('*').maybeSingle();
    if (error) throw error;
    res.json(data || {});
  } catch (err) {
    console.error('Error fetching settings:', err);
    res.status(500).json({});
  }
});

app.post('/api/admin/settings', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase offline' });
  const { error } = await supabase.from('site_content').upsert({ id: 1, ...req.body });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get('/api/admin/leads', async (req, res) => {
  try {
    if (!supabase) return res.json(memoryLeads);
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json(memoryLeads);
  }
});

app.patch('/api/admin/leads/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase offline' });
  const { id } = req.params;
  try {
    const { error } = await supabase.from('leads').update(req.body).eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/leads/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase offline' });
  const { id } = req.params;
  try {
    const { error } = await supabase.from('leads').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads', async (req, res) => {
  const lead = { ...req.body, created_at: new Date().toISOString(), id: Math.random().toString(36).substr(2, 9) };
  memoryLeads.unshift(lead); // Always save to memory
  if (supabase) {
    try {
      await supabase.from('leads').insert([req.body]);
    } catch (e) {
      console.error('Supabase save error:', e.message);
    }
  }
  res.json({ success: true });
});

app.get('/api/social-links', async (req, res) => {
  try {
    if (!supabase) return res.json([]);
    const { data, error } = await supabase.from('social_links').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Error fetching social links:', err);
    res.status(500).json([]);
  }
});

app.get('/api/terms', async (req, res) => {
  try {
    if (!supabase) return res.json([]);
    const { data, error } = await supabase.from('site_terms').select('*');
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Error fetching terms:', err);
    res.status(500).json([]);
  }
});

app.post('/api/admin/terms', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase offline' });
  const { title, content } = req.body;
  try {
    const { error } = await supabase.from('site_terms').insert([{ title, content }]);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/social-links', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase offline' });
  const { platform, url } = req.body;
  try {
    const { error } = await supabase.from('social_links').insert([{ platform, url }]);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/social-links/:id', async (req, res) => {
  if (!supabase) return res.status(500).json({ error: 'Supabase offline' });
  const { id } = req.params;
  try {
    const { error } = await supabase.from('social_links').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      hmr: false, // Disable HMR to avoid websocket errors in this environment
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(distPath));
}

// API 404 handler
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found' });
});

app.get('*', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(distPath, 'index.html'));
  } else {
    // In dev mode, Vite middleware handles SPA fallback.
    // If we reach here, it means it's not handled.
    res.status(404).send('Not Found');
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SAVE ENERGY Production Server running on port ${PORT} ✅`);
  forceReTestAllKeys();
});

}

startServer();
