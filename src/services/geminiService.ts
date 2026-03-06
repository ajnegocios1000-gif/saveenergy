
import { GoogleGenAI, Type } from "@google/genai";

const ECO_SYSTEM_INSTRUCTION = `Você é o Luiz da Save Energy, um consultor de eficiência energética movido a IA de elite da SAVE ENERGY. 
Seu objetivo é reduzir as contas de ENERGIA ELÉTRICA dos usuários através de análise técnica de faturas, dicas práticas de consumo e hábitos sustentáveis.
Tom de voz: Profissional, motivador, analítico e focado em economia real. 
Idioma: Português Brasileiro. Responda sempre de forma estruturada, com seções claras e bullet points. 
Não trate de outros assuntos fora de eficiência elétrica.`;

export async function getGeminiResponse(message: string, history: any[] = [], customRules: string = '', customMemory: string = '') {
  try {
    // A plataforma injeta a chave no ambiente
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("Chave de API Gemini não encontrada.");
    }

    const ai = new GoogleGenAI({ apiKey });
    const contents = [
      ...(history || []).map((m: any) => ({
        role: m.role,
        parts: m.parts
      })), 
      { role: 'user', parts: [{ text: message }] }
    ];

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

    return response.text;
  } catch (error: any) {
    console.error("Erro no Gemini Service:", error);
    throw error;
  }
}

export async function analyzeBill(imageBase64: string, mimeType: string) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("Chave de API Gemini não encontrada.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `Analise esta fatura de energia elétrica e extraia os dados necessários. 
Mesmo que a imagem não esteja perfeita, tente extrair o máximo de informações possível. 
Se você conseguir ler o nome, CPF ou UC, considere nitidez_ok como true.`;
    const extractionInstruction = "Você é um especialista em OCR e extração de dados de faturas de energia brasileiras. Sua prioridade é extrair os dados mesmo em imagens com qualidade média (40-60%).";
    
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

    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    console.error("Erro na análise da fatura (Frontend):", error);
    throw error;
  }
}
