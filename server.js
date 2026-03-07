
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
const memoryApiKeys = []; // Fallback in-memory API keys

async function getActiveApiKey() {
  let key = null;
  // 1. Try Supabase
  if (supabase) {
    try {
      const { data } = await supabase.from('api_keys').select('key_value').eq('status', 'active').limit(1);
      if (data && data.length > 0) {
        key = data[0].key_value;
        console.log('Log: Usando chave ativa do Supabase.');
      } else {
        // If no active, try any key
        const { data: anyKey } = await supabase.from('api_keys').select('key_value').limit(1);
        if (anyKey && anyKey.length > 0) {
          key = anyKey[0].key_value;
          console.log('Log: Nenhuma chave ativa no Supabase, usando primeira disponível.');
        }
      }
    } catch (e) {
      console.error('Error fetching key from Supabase:', e.message);
    }
  }
  
  if (key) return key;

  // 2. Try Memory
  if (memoryApiKeys.length > 0) {
    const active = memoryApiKeys.find(k => k.status === 'active');
    if (active) {
      console.log('Log: Usando chave ativa da Memória.');
      return active.key_value;
    }
    console.log('Log: Usando primeira chave da Memória.');
    return memoryApiKeys[0].key_value;
  }
  
  // 3. Try Env
  const envKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (envKey) console.log('Log: Usando chave das variáveis de ambiente.');
  return envKey;
}

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
        if (k.key_value.startsWith('sk-')) {
          await supabase.from('api_keys').update({ status: 'error' }).eq('id', k.id);
          continue;
        }
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
    
    // Check for OpenAI key format
    if (key_value.startsWith('sk-')) {
      return res.json({ 
        status: 'error', 
        error: 'Esta parece ser uma chave da OpenAI. O sistema utiliza a Google Gemini API. Por favor, use uma chave que comece com AIza...' 
      });
    }

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
    let dbKeys = [];
    if (supabase) {
      try {
        const { data, error } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false });
        if (!error) dbKeys = data || [];
      } catch (e) {
        console.warn('Log: Falha ao buscar chaves no Supabase, usando memória.');
      }
    }
    
    // Merge memory and DB keys, avoiding duplicates by key_value
    const allKeys = [...memoryApiKeys];
    dbKeys.forEach(dk => {
      if (!allKeys.find(ak => ak.key_value === dk.key_value)) {
        allKeys.push(dk);
      }
    });
    
    res.json(allKeys);
  } catch (err) {
    console.error('Error fetching API keys:', err);
    res.json(memoryApiKeys);
  }
});

app.post('/api/admin/api-keys', async (req, res) => {
  const newKey = { 
    ...req.body, 
    id: Math.random().toString(36).substr(2, 9), 
    created_at: new Date().toISOString() 
  };
  
  // Avoid duplicates in memory
  if (!memoryApiKeys.find(k => k.key_value === newKey.key_value)) {
    memoryApiKeys.unshift(newKey);
  }
  
  if (!supabase) return res.json({ success: true });
  
  try {
    const { error } = await supabase.from('api_keys').insert([newKey]);
    if (error) {
      console.warn('Log: Erro Supabase ao inserir chave, mantendo em memória:', error.message);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Supabase API key save error:', err.message);
    res.json({ success: true });
  }
});

app.delete('/api/admin/api-keys/:id', async (req, res) => {
  const { id } = req.params;
  const index = memoryApiKeys.findIndex(k => k.id === id);
  if (index !== -1) memoryApiKeys.splice(index, 1);
  
  if (!supabase) return res.json({ success: true });
  
  try {
    const { error } = await supabase.from('api_keys').delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('Supabase API key delete error:', err.message);
    res.json({ success: true });
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

app.post('/api/analyze-bill', async (req, res) => {
  const { imageBase64, mimeType } = req.body;
  try {
    const apiKey = await getActiveApiKey();
    if (!apiKey) throw new Error('Nenhuma chave de API configurada no sistema.');

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Analise esta fatura de energia elétrica e extraia os dados necessários. 
Sua prioridade é a extração de dados mesmo em imagens de baixa qualidade ou PDFs.
Considere uma qualidade de leitura de 40% como suficiente para prosseguir se você conseguir identificar pelo menos a Unidade Consumidora (UC) ou o Nome do Titular.
Se você conseguir ler o Nome, CPF ou UC, considere nitidez_ok como true.`;
    
    const extractionInstruction = "Você é um especialista em OCR de faturas de energia brasileiras. Extraia os dados com máxima tolerância a ruídos, sombras ou baixa resolução. Se 40% da fatura for legível e contiver os dados principais, valide como nitidez_ok: true.";
    
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        nome: { type: Type.STRING, description: "Nome completo do titular" },
        cpf: { type: Type.STRING, description: "CPF do titular se disponível" },
        unidade_consumidora: { type: Type.STRING, description: "Número da Unidade Consumidora (UC)" },
        logradouro: { type: Type.STRING, description: "Rua/Avenida" },
        bairro: { type: Type.STRING },
        cidade: { type: Type.STRING },
        uf: { type: Type.STRING, description: "Estado com 2 letras" },
        cep: { type: Type.STRING, description: "Apenas números" },
        valor_total: { type: Type.STRING, description: "Valor total da fatura" },
        nitidez_ok: { type: Type.BOOLEAN, description: "True se você conseguiu extrair os dados principais (Nome ou UC)" }
      },
      required: ["nitidez_ok"]
    };

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: extractionInstruction,
        responseMimeType: "application/json",
        responseSchema
      },
    });

    const text = response.text;
    if (!text) throw new Error('O modelo não retornou dados legíveis.');
    
    try {
      const parsed = JSON.parse(text);
      // Ensure nitidez_ok is present and boolean
      if (typeof parsed.nitidez_ok !== 'boolean') {
        parsed.nitidez_ok = !!(parsed.nome || parsed.unidade_consumidora);
      }
      res.json(parsed);
    } catch (parseErr) {
      console.error("Erro ao parsear JSON do Gemini:", text);
      res.status(500).json({ error: "Erro ao processar resposta da IA.", nitidez_ok: false });
    }
  } catch (error) {
    console.error("Erro na análise da fatura (Backend):", error);
    res.status(500).json({ error: error.message, nitidez_ok: false });
  }
});

app.post('/api/chat', async (req, res) => {
  const { message, history, customRules, customMemory } = req.body;
  try {
    const apiKey = await getActiveApiKey();
    if (!apiKey) throw new Error('Nenhuma chave de API configurada no sistema.');

    const ai = new GoogleGenAI({ apiKey });
    const contents = [
      ...(history || []).map((m) => ({
        role: m.role,
        parts: m.parts
      })), 
      { role: 'user', parts: [{ text: message }] }
    ];

    const ECO_SYSTEM_INSTRUCTION = `Você é o Luiz da Save Energy, um consultor de eficiência energética movido a IA de elite da SAVE ENERGY. 
Seu objetivo é reduzir as contas de ENERGIA ELÉTRICA dos usuários através de análise técnica de faturas, dicas práticas de consumo e hábitos sustentáveis.
Tom de voz: Profissional, motivador, analítico e focado em economia real. 
Idioma: Português Brasileiro. Responda sempre de forma estruturada, com seções claras e bullet points. 
Não trate de outros assuntos fora de eficiência elétrica.`;

    const systemInstruction = `${ECO_SYSTEM_INSTRUCTION}
    
REGRAS ADICIONAIS DE ATENDIMENTO:
${customRules || 'Nenhuma regra adicional.'}

MEMÓRIA E CONHECIMENTO ESPECÍFICO:
${customMemory || 'Nenhuma memória adicional.'}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ text: response.text });
  } catch (error) {
    console.error("Erro no Chat (Backend):", error);
    res.status(500).json({ error: error.message });
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
