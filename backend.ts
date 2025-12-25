
import { GoogleGenAI, Modality } from "@google/genai";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const geminiService = {
  async *streamChat(modelName: string, prompt: string, history: any[] = [], tools: any[] = [], neuralMemory: string = "") {
    const ai = getAIClient();
    try {
      const contents = [...history, { role: 'user', parts: [{ text: prompt }] }];
      const systemPrompt = `You are ArrowIntelligence, a multi-modal high-performance neural system based on a modern Transformer architecture. 
      ${neuralMemory ? `NEURAL MEMORY: ${neuralMemory}` : ""}
      - Reasoning & logic focus.
      - Factual grounding via search.
      Be precise and professional.`;

      const response = await ai.models.generateContentStream({
        model: modelName,
        contents,
        config: {
          systemInstruction: systemPrompt,
          tools: tools.length > 0 ? tools : undefined,
          thinkingConfig: { thinkingBudget: 0 }
        },
      });

      for await (const chunk of response) {
        yield chunk;
      }
    } catch (error) {
      console.error("Neural Error:", error);
      throw error;
    }
  },

  async extractInsights(history: any[]) {
    const ai = getAIClient();
    const chatSummary = history.map(m => `${m.role === 'model' ? 'AI' : 'User'}: ${m.parts[0].text}`).join('\n');
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: `Summarize the user's technical interests from this chat for profile adaptation.\n\n${chatSummary}` }] }],
      });
      return response.text;
    } catch (e) { return ""; }
  },

  async generateImage(prompt: string, imageData?: string, mimeType?: string) {
    const ai = getAIClient();
    const parts: any[] = [{ text: prompt }];
    if (imageData && mimeType) parts.push({ inlineData: { data: imageData, mimeType } });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    const images: string[] = [];
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) images.push(`data:${part.inlineData.mimeType};base64,${part.inlineData.data}`);
    }
    return { text: response.text || "Image synthesis complete.", images };
  },

  async generateVideo(prompt: string, imageData?: string, mimeType?: string) {
    const ai = getAIClient();
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      ...(imageData ? { image: { imageBytes: imageData, mimeType: mimeType || 'image/png' } } : {}),
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 8000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }
    return `${operation.response?.generatedVideos?.[0]?.video?.uri}&key=${process.env.API_KEY}`;
  },

  async synthesizeSpeech(text: string, voiceName: string = 'Kore') {
    const ai = getAIClient();
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } },
        },
      });
      return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    } catch (e) { return null; }
  }
};
