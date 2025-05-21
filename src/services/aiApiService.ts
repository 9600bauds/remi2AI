const API_KEY = import.meta.env.VITE_AI_API_KEY as string;
const MODEL_NAME = import.meta.env.VITE_MODEL_NAME as string;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;

interface AIPart {
  text?: string;
  inline_data?: {
    mime_type: string;
    data: string;
  };
}

interface AIContent {
  parts: AIPart[];
  role?: string;
}

interface AIRequestPayload {
  contents: AIContent[];
  // generationConfig?: GenerationConfig; // Optional
}

const fileToGenerativePart = async (file: File): Promise<AIPart> => {
  const base64EncodedString = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });

  return {
    inline_data: {
      mime_type: file.type,
      data: base64EncodedString.split(',')[1],
    },
  };
};

export const sendAiRequest = async (
  files: File[], // Changed from file: File to files: File[]
  prompt: string
): Promise<any> => {
  if (!API_KEY) {
    console.error(
      'No se ha configurado el archivo .env (falta VITE_AI_API_KEY)!'
    );
    throw new Error(
      'No se ha configurado el archivo .env (falta VITE_AI_API_KEY)!'
    );
  }
  if (files.length === 0) {
    throw new Error('No se han subido archivos.');
  }

  try {
    const textPart: AIPart = { text: prompt };

    // Create image parts from all files
    const imagePartsPromises = files.map((file) => fileToGenerativePart(file));
    const imageParts = await Promise.all(imagePartsPromises);

    // Combine text prompt and image parts
    // The order is important: prompt text first, then all image parts.
    const allParts: AIPart[] = [textPart, ...imageParts];

    const payload: AIRequestPayload = {
      contents: [
        {
          parts: allParts,
        },
      ],
    };

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('AI API Error:', errorBody);
      throw new Error(
        `API request failed with status ${response.status}: ${errorBody.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling AI API:', error);
    throw error;
  }
};
