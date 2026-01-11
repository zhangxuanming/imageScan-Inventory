import { GoogleGenAI, Type } from "@google/genai";
import { InventoryItem, Annotation, Settings } from "../types";

const drawAnnotationsOnImage = async (base64Image: string, annotations: Annotation[]): Promise<string> => {
  if (annotations.length === 0) return base64Image;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Image);
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0);

      // Common Styles
      ctx.strokeStyle = '#ef4444'; // Red-500
      const baseLineWidth = Math.max(5, img.width / 200);
      ctx.lineWidth = baseLineWidth;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)'; // Semi-transparent fill

      annotations.forEach(ann => {
        if (ann.type === 'point' && ann.point) {
          const x = ann.point.x * img.width;
          const y = ann.point.y * img.height;
          const radius = Math.max(20, img.width / 30); 

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, 2 * Math.PI);
          ctx.fill();
          ctx.stroke();
        } else if (ann.type === 'region' && ann.region) {
          const x = ann.region.x * img.width;
          const y = ann.region.y * img.height;
          const w = ann.region.width * img.width;
          const h = ann.region.height * img.height;

          ctx.beginPath();
          ctx.rect(x, y, w, h);
          ctx.fill();
          ctx.stroke();
        }
      });

      resolve(canvas.toDataURL('image/jpeg', 0.85).split('base64,')[1]);
    };
    img.src = base64Image.includes('base64,') ? base64Image : `data:image/jpeg;base64,${base64Image}`;
  });
};

const getSystemInstruction = (settings: Settings, hasAnnotations: boolean) => `
You are an expert second-hand item appraiser and inventory specialist. 
Your task is to analyze images of miscellaneous items.

${hasAnnotations ? "IMPORTANT: The user has marked specific items with RED CIRCLES (dots) or RED BOXES (regions). Only analyze and extract the items indicated by these red markers." : "Analyze the image and extract distinct sellable items."}

Output Language: ${settings.language === 'zh' ? 'Chinese (Simplified)' : 'English'}.
Currency: ${settings.currency === 'CNY' ? 'CNY (¥)' : 'USD ($)'}.

For each item identified:
1. Name: Concise, attractive (max 10 words).
2. Description: Selling-point focused (max 20 words).
3. avgPrice: Estimate 'Average Second Hand Market Price'.
4. sellPrice: Suggest a 'Recommended Selling Price' for quick sale.
5. newPrice: Estimate the 'Brand New Retail Price' (Reference for condition scaling).

Return result as JSON array.
`;

export const analyzeImage = async (
  base64Image: string, 
  settings: Settings,
  annotations: Annotation[] = []
): Promise<InventoryItem[]> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const modelId = "gemini-3-flash-preview"; 

    // Pre-process image if annotations exist
    let processedBase64 = base64Image.includes('base64,') 
      ? base64Image.split('base64,')[1] 
      : base64Image;

    if (annotations.length > 0) {
      processedBase64 = await drawAnnotationsOnImage(base64Image, annotations);
    }

    const response = await ai.models.generateContent({
      model: modelId,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: processedBase64
            }
          },
          {
            text: annotations.length > 0 
              ? "Identify the items marked with red markers. Output JSON." 
              : "Identify all distinct items suitable for resale. Output JSON."
          }
        ]
      },
      config: {
        systemInstruction: getSystemInstruction(settings, annotations.length > 0),
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              avgPrice: { type: Type.STRING },
              sellPrice: { type: Type.STRING },
              newPrice: { type: Type.STRING }
            },
            required: ["name", "description", "avgPrice", "sellPrice"]
          }
        }
      }
    });

    const textResponse = response.text;
    if (!textResponse) throw new Error("No response");

    const parsedData = JSON.parse(textResponse);
    
    return parsedData.map((item: any) => ({
      ...item,
      id: Math.random().toString(36).substring(7),
      originalSellPrice: item.sellPrice
    }));

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};
