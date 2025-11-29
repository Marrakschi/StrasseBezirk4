import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client safely
const apiKey = process.env.API_KEY;
// Check if key is present and not just an empty string
const isValidKey = apiKey && apiKey.length > 0 && apiKey !== 'undefined';
const ai = isValidKey ? new GoogleGenAI({ apiKey }) : null;

export const checkAPIKeyStatus = (): boolean => {
  return !!isValidKey;
};

export const identifyStreetDetails = async (base64Image: string): Promise<{ street: string; number: string; streetBox?: number[]; numberBox?: number[] }> => {
  try {
    if (!ai) {
      console.error("API Key check failed. Value length:", apiKey ? apiKey.length : 0);
      throw new Error("API_KEY_MISSING");
    }

    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: `Analysiere das Bild von einem Straßenschild.
            Extrahiere den Straßennamen und die Hausnummer.
            Gib für beide Elemente auch die Bounding Boxen im Format [ymin, xmin, ymax, xmax] (Skala 0-1000) zurück.
            Gib das Ergebnis als JSON Objekt zurück.`
          }
        ]
      },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            street: { type: Type.STRING },
            street_box_2d: { 
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
              description: "Bounding box for the street name [ymin, xmin, ymax, xmax]"
            },
            number: { type: Type.STRING },
            number_box_2d: { 
              type: Type.ARRAY,
              items: { type: Type.INTEGER },
              description: "Bounding box for the house number [ymin, xmin, ymax, xmax]"
            }
          }
        }
      }
    });

    const json = JSON.parse(response.text || '{}');
    return {
      street: json.street || 'UNKNOWN',
      number: json.number || '',
      streetBox: json.street_box_2d,
      numberBox: json.number_box_2d
    };
  } catch (error: any) {
    console.error("Gemini Error:", error);
    
    // Pass through the specific error message for debugging in UI
    if (error.message === 'API_KEY_MISSING') {
      throw error;
    }
    
    // Helper to extract readable error from Google GenAI error object
    const errorMessage = error.message || error.toString();
    throw new Error(`Google AI Error: ${errorMessage}`);
  }
};