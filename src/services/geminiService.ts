
import { GoogleGenAI, Type } from "@google/genai";

const ECO_SYSTEM_INSTRUCTION = `Você é o EcoAgente, um consultor de eficiência energética movido a IA de elite da SAVE ENERGY. 
Seu objetivo é reduzir as contas de ENERGIA ELÉTRICA dos usuários através de análise técnica de faturas, dicas práticas de consumo e hábitos sustentáveis.
Tom de voz: Profissional, motivador, analítico e focado em economia real. 
Idioma: Português Brasileiro. Responda sempre de forma estruturada, com seções claras e bullet points. 
Não trate de outros assuntos fora de eficiência elétrica.`;

export async function getGeminiResponse(message: string, history: any[] = []) {
  try {
    // A plataforma injeta a chave no ambiente
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY;
    
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction: ECO_SYSTEM_INSTRUCTION,
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
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (process as any).env?.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("Chave de API Gemini não encontrada.");
    }

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `Analise esta fatura de energia elétrica e extraia os dados necessários.`;
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
