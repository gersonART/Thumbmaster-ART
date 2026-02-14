
import { GoogleGenAI } from "@google/genai";
import { ThumbnailData, ThumbnailResult } from "../types";

export const generateThumbnailImage = async (data: ThumbnailData, variationIndex: number = 0): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const variations = [
    "Masterpiece quality, extreme cinematic contrast, dramatic deep shadows, epic Teal and Orange color grading.",
    "Dynamic action-movie composition, anamorphic lens flares, intense atmospheric depth with volumetric god rays.",
    "Hyper-vibrant studio glows, cinematic fog, rich saturated lighting, professional rim lighting with high specular highlights."
  ];

  const prompt = `
    Create a world-class, hyper-realistic professional YouTube thumbnail background.
    VISUAL STYLE: ${variations[variationIndex]}
    
    MAIN SUBJECT: High-fidelity reconstruction of the person from the reference image.
    FRAMING: ${data.framing}.
    SUBJECT POSITION: Place the presenter at horizontal position ${variationIndex === 0 ? '75%' : (variationIndex === 1 ? '85%' : '65%')} and vertical center.
    
    CINEMATIC LIGHTING (CRITICAL):
    - Massive, intense "${data.accentColor}" RIM LIGHTING (backlight) creating a sharp, glowing silhouette.
    - Professional 3-point studio lighting with deep cinematic shadows.
    - Volumetric atmosphere: add subtle smoke, dust particles, and "${data.accentColor}" tinted fog for depth.
    - Dramatic high-key highlights on skin and hair textures.
    
    SCENE ENVIRONMENT: ${data.theme}.
    
    COMPOSITION:
    - Cinematic 8K resolution, ultra-sharp focus on the subject.
    - Beautiful background bokeh (depth of field).
    - Maintain a clean, high-contrast area on the LEFT 60% of the frame for large text.
    - NO text, logos, or watermarks.
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: data.talentImage.split(',')[1],
              mimeType: data.talentImageMimeType
            }
          },
          { text: prompt }
        ],
      },
      config: { imageConfig: { aspectRatio: "16:9" } },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Falha na geração.");
  } catch (error) {
    console.error("Erro ao gerar thumbnail:", error);
    throw error;
  }
};

export const refineThumbnailImage = async (result: ThumbnailResult, accentColor: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const prompt = `
    Refine and improve this professional thumbnail based on this suggestion: "${result.suggestion || 'Enhance cinematic quality'}".
    
    KEEP CURRENT CHARACTER: Maintain the exact same person, expression, and "${accentColor}" lighting theme.
    QUALITY UPGRADE:
    - Increase contrast and cinematic sharpness.
    - Make the "${accentColor}" rim light even more intense and dramatic.
    - Enhance volumetric fog and background depth.
    - Ensure the character positioning is optimized for impact.
    
    STRICT: NO text, UI elements, or watermarks in the image.
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: result.imageUrl.split(',')[1],
              mimeType: 'image/png'
            }
          },
          { text: prompt }
        ],
      },
      config: { imageConfig: { aspectRatio: "16:9" } },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("Falha no refinamento.");
  } catch (error) {
    console.error("Erro ao refinar:", error);
    throw error;
  }
};
