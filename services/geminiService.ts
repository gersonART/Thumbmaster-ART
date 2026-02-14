
import { GoogleGenAI } from "@google/genai";
import { ThumbnailData, ThumbnailResult } from "../types";

const MODEL_NAME = 'gemini-3-pro-image-preview';

export const generateThumbnailImage = async (data: ThumbnailData, variationIndex: number = 0): Promise<string> => {
  // Always create a new instance right before the call to pick up the latest injected API key
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
  
  const variations = [
    "Masterpiece quality, extreme cinematic contrast, dramatic deep shadows, epic Teal and Orange color grading.",
    "Dynamic action-movie composition, anamorphic lens flares, intense atmospheric depth with volumetric god rays.",
    "Hyper-vibrant studio glows, cinematic fog, rich saturated lighting, professional rim lighting with high specular highlights."
  ];

  const horizontalPositions = ['82%', '88%', '78%'];
  const posH = horizontalPositions[variationIndex];

  const prompt = `
    Create a world-class, hyper-realistic professional YouTube thumbnail.
    VISUAL STYLE: ${variations[variationIndex]}
    
    MAIN SUBJECT: High-fidelity reconstruction of the person from the reference image.
    FACIAL EXPRESSION (CRITICAL): Modify the person's face to clearly show the emotion: "${data.emotion}". 
    The expression should be high-energy and viral-style (e.g., exaggerated eyes and mouth if shocked, intense focus if serious).
    
    FRAMING: ${data.framing}.
    SUBJECT POSITION: Place the presenter at horizontal position ${posH} (strictly on the RIGHT side of the frame) and vertical center. 
    Ensure the presenter is NOT centered; they MUST be pushed towards the right edge to leave 60% of the left side clear for text.
    
    CINEMATIC LIGHTING & ATMOSPHERE (CRITICAL):
    - Massive, intense "${data.accentColor}" RIM LIGHTING (backlight) creating a sharp, glowing silhouette on the subject.
    - ENVIRONMENT TINT: The entire background and ambient atmosphere (fog, smoke, details) MUST be heavily tinted and illuminated with the "${data.accentColor}" color.
    - The scene should feel immersed in a "${data.accentColor}" light bath.
    - Professional 3-point studio lighting with deep cinematic shadows.
    - Volumetric atmosphere: add subtle smoke, dust particles, and thick "${data.accentColor}" tinted fog for depth.
    
    SCENE ENVIRONMENT: ${data.theme}.
    
    COMPOSITION:
    - Cinematic 8K resolution, ultra-sharp focus on the subject.
    - Beautiful background bokeh (depth of field).
    - Maintain a clean, high-contrast area on the LEFT 60% of the frame for large text.
    - NO text, logos, or watermarks.
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
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
      config: { 
        imageConfig: { 
          aspectRatio: "16:9",
          imageSize: "1K" 
        } 
      },
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
    
    POSITIONING ADJUSTMENT: The user has adjusted the framing. Please ensure the presenter is positioned correctly according to the current image composition, making sure they are well-placed on the RIGHT side.
    
    KEEP CURRENT CHARACTER AND EXPRESSION: Maintain the exact same person and their current facial expression.
    COLOR THEME (CRITICAL): Intensely apply the "${accentColor}" lighting theme to both the subject AND the background environment. Ensure the entire scene is bathed in this color.
    
    QUALITY UPGRADE:
    - Increase contrast and cinematic sharpness.
    - Make the "${accentColor}" rim light and background glow even more intense and dramatic.
    - Enhance volumetric fog and background depth.
    
    STRICT: NO text, UI elements, or watermarks in the image.
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
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
      config: { 
        imageConfig: { 
          aspectRatio: "16:9",
          imageSize: "1K" 
        } 
      },
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
