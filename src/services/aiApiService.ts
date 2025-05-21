import { GoogleGenAI, GenerateContentResponse, type Part } from '@google/genai';

const API_KEY = import.meta.env.VITE_AI_API_KEY as string;
const MODEL_NAME = import.meta.env.VITE_MODEL_NAME as string;

const fileToGenerativePart = async (file: File): Promise<Part> => {
  const base64EncodedString = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultString = reader.result as string;
      resolve(resultString.split(',')[1]);
    };
    reader.onerror = (event) => {
      const error = event.target?.error;
      if (error) {
        reject(
          new Error(`FileReader error: ${error.message || 'Unknown error'}`)
        );
      } else {
        reject(new Error('FileReader failed with an unknown error.'));
      }
    };
    reader.readAsDataURL(file);
  });
  return { inlineData: { mimeType: file.type, data: base64EncodedString } };
};

export const sendAiRequest = async (
  files: File[],
  prompt: string
): Promise<GenerateContentResponse> => {
  if (!API_KEY) throw new Error('VITE_AI_API_KEY is not configured.');
  if (files.length === 0) throw new Error('No files uploaded.');
  if (!MODEL_NAME) throw new Error('VITE_MODEL_NAME is not configured.');

  const genAI = new GoogleGenAI({ apiKey: API_KEY });

  try {
    const textPart: Part = { text: prompt };
    const imagePartsPromises = files.map((file) => fileToGenerativePart(file));
    const imageParts = await Promise.all(imagePartsPromises);

    // As per the SDK examples, 'contents' is an array of Part objects for a single user message
    const requestPartsForContent: Part[] = [textPart, ...imageParts];

    // The result object will have a .text property (or method) as per your examples
    const result = await genAI.models.generateContent({
      model: MODEL_NAME,
      contents: requestPartsForContent,
      // generationConfig: {
      //   responseMimeType: "application/json", // For JSON mode
      // },
    });

    return result; // Return the direct result object from the SDK call
  } catch (error) {
    console.error('Error calling AI API with @google/genai SDK:', error);
    if (error instanceof Error) {
      throw new Error(`SDK Error: ${error.message}`);
    }
    throw new Error('An unknown error occurred while calling the AI API.');
  }
};
