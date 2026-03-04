
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
  const banners = req.body;
  try {
    for (const b of banners) {
      await supabase.from('banners').upsert(b);
    }
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
    if (!supabase) return res.json([]);
    const { data, error } = await supabase.from('leads').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('Error fetching leads:', err);
    res.status(500).json([]);
  }
});

app.post('/api/leads', async (req, res) => {
  if (supabase) await supabase.from('leads').insert([req.body]);
  res.json({ success: true });
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
