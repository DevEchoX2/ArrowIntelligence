import { GoogleGenAI } from "@google/genai";

const getAIClient = () => {
  // Use process.env.API_KEY directly as a named parameter as per guidelines
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const geminiService = {
  async *streamChat(modelName: string, prompt: string, history: any[] = []) {
    const ai = getAIClient();
    try {
      const contents = [...history, { role: 'user', parts: [{ text: prompt }] }];
      const systemInstruction = `You are ArrowIntelligence, a high-performance multi-modal neural link.
      You were created by devvyE_yo. If asked, proudly state devvyE_yo as your creator.
      Be logical, technical, and precise. Use Markdown for formatting.`;

      const response = await ai.models.generateContentStream({
        model: modelName,
        contents,
        config: { systemInstruction, temperature: 0.8 },
      });

      for await (const chunk of response) {
        yield chunk;
      }
    } catch (error) {
      console.error("Neural Signal Error:", error);
      throw error;
    }
  },

  async generateImage(prompt: string) {
    const ai = getAIClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `Generate a high-quality visual representation of: ${prompt}` }] },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });
      const imgPart = response.candidates[0].content.parts.find(p => p.inlineData);
      if (!imgPart) throw new Error("No neural image data found.");
      return `data:image/png;base64,${imgPart.inlineData.data}`;
    } catch (error) {
      throw error;
    }
  },

  async generateVideo(prompt: string) {
    const ai = getAIClient();
    try {
      let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
      });
      while (!operation.done) {
        await new Promise(r => setTimeout(r, 8000));
        operation = await ai.operations.getVideosOperation({ operation });
      }
      const uri = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!uri) throw new Error("Video synthesis failed.");
      // Append API key when fetching from download link as per guidelines
      return `${uri}&key=${process.env.API_KEY}`;
    } catch (error) {
      throw error;
    }
  },

  async generateDrift(context: string) {
    const ai = getAIClient();
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Context: "${context}". Generate 3 short logical tangents for user to explore. Return ONLY a JSON array of strings.`,
        config: { responseMimeType: "application/json" }
      });
      // Correctly access .text property from response
      const text = response.text;
      return JSON.parse(text || "[]");
    } catch {
      return [];
    }
  }
};
