
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { BirthDetails, Message } from "../types";

const VEDIC_GUIDELINES = `
  Identity: You are the Great AI Pandit of "Vedic Jyotish AI".
  Role: Advanced Consultant mirroring the precision of Astrosage.
  Rules: 
  - Use precise terminology: Ashtakoot, Gana, Nadi, Bhakoot, Lagna.
  - Structure: Use CLEAR SECTIONS with CAPITALIZED TITLES.
  - Tone: Scholarly and traditionally accurate.
  - Formatting: Plain text with clear spacing and bullet points.
`;

const MODELS = {
  PRO: 'gemini-3-pro-preview',
  FLASH: 'gemini-3-flash-preview'
};

// Helper for exponential backoff retry logic with model fallback
const withRetryAndFallback = async <T>(
  fn: (modelName: string) => Promise<T>, 
  primaryModel: string = MODELS.PRO,
  retries = 2, 
  delay = 1500
): Promise<T> => {
  try {
    return await fn(primaryModel);
  } catch (error: any) {
    const errorMsg = error?.message || "";
    const isQuotaError = errorMsg.includes("429") || errorMsg.includes("RESOURCE_EXHAUSTED");
    
    // If we hit a quota error on the PRO model, immediately try FLASH instead of waiting for retries
    if (isQuotaError && primaryModel === MODELS.PRO) {
      console.warn("Pro model quota hit, falling back to Flash model immediately...");
      return withRetryAndFallback(fn, MODELS.FLASH, retries, delay);
    }

    if (retries > 0 && (isQuotaError || errorMsg.includes("503") || errorMsg.includes("500"))) {
      console.warn(`API issue, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetryAndFallback(fn, primaryModel, retries - 1, delay * 2);
    }
    throw error;
  }
};

export const getAstrologicalInsight = async (details: BirthDetails, chatHistory: Message[]) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const systemInstruction = `Advanced Vedic Consultation for ${details.name}. ${VEDIC_GUIDELINES}`;
  const contents = chatHistory.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.text }]
  }));

  try {
    const response = await withRetryAndFallback<GenerateContentResponse>((model) => ai.models.generateContent({
      model,
      contents,
      config: { systemInstruction, temperature: 0.7, thinkingConfig: { thinkingBudget: 2000 } },
    }));
    return response.text || "Consultation disrupted by planetary transit.";
  } catch (error: any) {
    if (error.message?.includes("429")) throw new Error("QUOTA_EXHAUSTED");
    return "The stars are momentarily silent. Please re-try.";
  }
};

export const performMatchmaking = async (pA: BirthDetails, pB: BirthDetails) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Perform a Gun Milan (Matchmaking) analysis for ${pA.name} and ${pB.name}.
  Analyze:
  1. Ashtakoot Compatibility (36 Points)
  2. Manglik Dosha Matching
  3. Bhakoot and Nadi Dosha Presence
  4. Final Verdict for Marriage
  ${VEDIC_GUIDELINES}`;

  try {
    const response = await withRetryAndFallback<GenerateContentResponse>((model) => ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }));
    return response.text;
  } catch (error: any) {
    if (error.message?.includes("429")) throw new Error("QUOTA_EXHAUSTED");
    throw error;
  }
};

export const getPanchangInsights = async () => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Provide the Spiritual Significance of the current Panchang (Tithi, Nakshatra, Yoga). 
  What is the energy of the day? Suggest 1 specific ritual. ${VEDIC_GUIDELINES}`;

  try {
    const response = await withRetryAndFallback<GenerateContentResponse>((model) => ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }), MODELS.FLASH); // Use FLASH by default for Panchang to save quota
    return response.text;
  } catch (error: any) {
    if (error.message?.includes("429")) throw new Error("QUOTA_EXHAUSTED");
    return "The daily energy is being calculated...";
  }
};

export const generateInitialReading = async (details: BirthDetails) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `Generate a Full Avakahada Chakra and Lagna analysis for ${details.name}.
  Include: Lagna Lord, Rashi Lord, and current Dasha impact. ${VEDIC_GUIDELINES}`;

  try {
    const response = await withRetryAndFallback<GenerateContentResponse>((model) => ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }), MODELS.FLASH); // Use FLASH for login summary for speed and quota efficiency
    return response.text;
  } catch (error: any) {
    if (error.message?.includes("429")) throw new Error("QUOTA_EXHAUSTED");
    return "Your destiny is unfolding. Please refresh in a moment.";
  }
};

export const getSpecializedReport = async (type: string, details: BirthDetails) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `In-depth ${type} Report for ${details.name}. 
  Provide specific remedies (Mantra, Gemstone, Charity). ${VEDIC_GUIDELINES}`;

  try {
    const response = await withRetryAndFallback<GenerateContentResponse>((model) => ai.models.generateContent({
      model,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }));
    return response.text;
  } catch (error: any) {
    if (error.message?.includes("429")) throw new Error("QUOTA_EXHAUSTED");
    return "Celestial records are currently unavailable.";
  }
};
