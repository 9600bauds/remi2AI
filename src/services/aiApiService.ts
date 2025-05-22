import {
  GoogleGenAI,
  type GenerateContentResponse,
  type Part,
  type Schema,
} from '@google/genai';

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
      const fileReaderError = event.target?.error;
      if (fileReaderError) {
        reject(
          new Error(
            `FileReader error on file ${file.name}: ${fileReaderError.name} - ${fileReaderError.message}`
          )
        );
      } else {
        reject(
          new Error(
            `FileReader failed on file ${file.name} with an unknown error.`
          )
        );
      }
    };
    reader.readAsDataURL(file);
  });
  return { inlineData: { mimeType: file.type, data: base64EncodedString } };
};

export const sendAiRequest = async (
  files: File[],
  prompt: string
): Promise<string> => {
  if (!API_KEY) throw new Error('VITE_AI_API_KEY is not configured.');
  if (files.length === 0) throw new Error('No files uploaded.');
  if (!MODEL_NAME) throw new Error('VITE_MODEL_NAME is not configured.');
  if (!prompt) throw new Error('AI service received an empty prompt!');

  const genAI = new GoogleGenAI({ apiKey: API_KEY });

  try {
    const textPart: Part = { text: prompt };
    const imagePartsPromises = files.map((file) => fileToGenerativePart(file));
    const imageParts = await Promise.all(imagePartsPromises);

    const requestPartsForContent: Part[] = [textPart, ...imageParts];
    const schemaText = import.meta.env.VITE_STRUCTURED_OUTPUT_SCHEMA as string;
    if (!schemaText) {
      throw new Error(
        'VITE_STRUCTURED_OUTPUT_SCHEMA is not configured in .env'
      );
    }

    let schemaObject: Schema;
    try {
      schemaObject = JSON.parse(schemaText) as Schema;
    } catch (e) {
      console.error('Failed to parse VITE_STRUCTURED_OUTPUT_SCHEMA:', e);
      throw new Error(
        'Invalid JSON schema provided in VITE_STRUCTURED_OUTPUT_SCHEMA.'
      );
    }

    const response: GenerateContentResponse =
      await genAI.models.generateContent({
        model: MODEL_NAME,
        contents: requestPartsForContent,
        config: {
          responseMimeType: 'application/json',
          responseSchema: schemaObject,
        },
      });

    if (!response.text) {
      throw new Error(
        'Received a successful, but empty response from the AI API!'
      );
    }

    return response.text;
  } catch (error) {
    console.error('Error calling AI API with @google/genai SDK:', error);
    if (error instanceof Error) {
      throw new Error(`SDK Error: ${error.message}`);
    }
    throw new Error('An unknown error occurred while calling the AI API.');
  }
};
