
import { GoogleGenAI, Type } from "@google/genai";

const ECO_SYSTEM_INSTRUCTION = `Você é o Luiz da Save Energy, um consultor de eficiência energética movido a IA de elite da SAVE ENERGY. 
Seu objetivo é reduzir as contas de ENERGIA ELÉTRICA dos usuários através de análise técnica de faturas, dicas práticas de consumo e hábitos sustentáveis.
Tom de voz: Profissional, motivador, analítico e focado em economia real. 
Idioma: Português Brasileiro. Responda sempre de forma estruturada, com seções claras e bullet points. 
Não trate de outros assuntos fora de eficiência elétrica.`;

export async function getGeminiResponse(message: string, history: any[] = [], customRules: string = '', customMemory: string = '') {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history, customRules, customMemory })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Erro no chat');
    }

    const data = await response.json();
    return data.text;
  } catch (error: any) {
    console.error("Erro no Gemini Service:", error);
    throw error;
  }
}

export async function analyzeBill(imageBase64: string, mimeType: string) {
  try {
    const response = await fetch('/api/analyze-bill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64, mimeType })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Erro na análise');
    }

    return await response.json();
  } catch (error: any) {
    console.error("Erro na análise da fatura (Frontend):", error);
    throw error;
  }
}
