
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

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;
if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Log: Backend Supabase carregado ✅');
  } catch (err) {
    console.error('Log: Falha Supabase Backend:', err.message);
  }
}

const ECO_SYSTEM_INSTRUCTION = `Você é o EcoAgente, um consultor de eficiência energética movido a IA de elite da SAVE ENERGY. 
Seu objetivo é reduzir as contas de ENERGIA ELÉTRICA dos usuários através de análise técnica de faturas, dicas práticas de consumo e hábitos sustentáveis.
Tom de voz: Profissional, motivador, analítico e focado em economia real. 
Idioma: Português Brasileiro. Responda sempre de forma estruturada, com seções claras e bullet points. 
Não trate de outros assuntos fora de eficiência elétrica.`;

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

async function getWorkingAIResponse(contents, systemInstruction, testKey = null, configOverride = {}) {
  let keys = [];
  
  if (testKey) {
    keys = [{ key_value: testKey, label: 'Chave de Teste Manual', id: 'test' }];
  } else if (supabase) {
    // Busca apenas chaves ativas (verde) - Ordena por criação para conectar sempre na primeira disponível
    const { data } = await supabase
      .from('api_keys')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: true });
    keys = data || [];
  }

  if (keys.length === 0 && process.env.API_KEY && !testKey) {
    keys.push({ key_value: process.env.API_KEY, label: 'Default ENV', id: 'env' });
  }

  if (keys.length === 0) throw new Error('Nenhuma chave de API ativa encontrada no sistema.');

  let lastError = null;
  for (const keyObj of keys) {
    try {
      console.log(`Log: Tentando IA com chave: [${keyObj.label}]`);
      const ai = new GoogleGenAI({ apiKey: keyObj.key_value });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents,
        config: { 
          systemInstruction, 
          temperature: 0.7,
          ...configOverride
        }
      });
      return response.text;
    } catch (e) {
      const msg = e.message.toLowerCase();
      console.error(`Log: Chave [${keyObj.label}] falhou em tempo real:`, msg);
      lastError = e;

      // Se falhar em produção, atualiza o status para pular na próxima rodada
      if (supabase && keyObj.id !== 'test' && keyObj.id !== 'env') {
        const isQuota = msg.includes('429') || msg.includes('quota') || msg.includes('limit') || msg.includes('exhausted');
        const newStatus = isQuota ? 'no_credit' : 'error';
        await supabase.from('api_keys').update({ status: newStatus }).eq('id', keyObj.id);
      }
      
      // Continua o loop para a próxima chave verde
      if (testKey) throw e;
    }
  }
  throw lastError;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history, test_key } = req.body;
    const contents = [...(history || []).map(m => ({
      role: m.role,
      parts: m.parts
    })), { role: 'user', parts: [{ text: message }] }];
    const text = await getWorkingAIResponse(contents, ECO_SYSTEM_INSTRUCTION, test_key);
    res.json({ text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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

app.post('/api/analyze-bill', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) return res.status(400).json({ error: 'Imagem não fornecida' });

    const prompt = `Analise esta fatura de energia elétrica e extraia os dados necessários.`;

    const contents = {
      parts: [
        { inlineData: { data: imageBase64, mimeType: mimeType || 'image/jpeg' } },
        { text: prompt }
      ]
    };

    const extractionInstruction = "Você é um especialista em OCR e extração de dados de faturas de energia brasileiras. Extraia os dados com precisão cirúrgica.";
    
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        nome: { type: Type.STRING, description: "Nome completo do titular" },
        logradouro: { type: Type.STRING, description: "Rua/Avenida" },
        bairro: { type: Type.STRING },
        cidade: { type: Type.STRING },
        uf: { type: Type.STRING, description: "Estado com 2 letras" },
        cep: { type: Type.STRING, description: "Apenas números" },
        nitidez_ok: { type: Type.BOOLEAN, description: "True se a imagem for legível" }
      },
      required: ["nitidez_ok"]
    };

    const textResponse = await getWorkingAIResponse(contents, extractionInstruction, null, {
      responseMimeType: "application/json",
      responseSchema
    });
    
    const data = JSON.parse(textResponse);
    res.json(data);
  } catch (e) {
    console.error('Erro na análise da fatura:', e.message);
    res.status(500).json({ error: 'Falha ao analisar fatura', details: e.message });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({
    server: { 
      middlewareMode: true,
      hmr: {
        host: '127.0.0.1',
      }
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
