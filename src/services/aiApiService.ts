import {
  GoogleGenAI,
  type GenerateContentResponse,
  type Part,
  type Schema,
} from '@google/genai';

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
  apiKey: string,
  model: string,
  files: File[],
  prompt: string,
  responseSchema: Schema
): Promise<string> => {
  if (files.length === 0) throw new Error('No files uploaded.');
  if (!prompt) throw new Error('AI service received an empty prompt!');

  const genAI = new GoogleGenAI({ apiKey });

  try {
    const textPart: Part = { text: prompt };
    const imagePartsPromises = files.map((file) => fileToGenerativePart(file));
    const imageParts = await Promise.all(imagePartsPromises);

    const requestPartsForContent: Part[] = [textPart, ...imageParts];

    const response: GenerateContentResponse =
      await genAI.models.generateContent({
        model,
        contents: requestPartsForContent,
        config: {
          responseMimeType: 'application/json',
          responseSchema,
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

export const jsonResponseTo2DArray = (
  jsonText: string,
  schema: Schema
): string[][] => {
  const data: unknown = JSON.parse(jsonText);

  // Ensure we have an array of objects
  if (
    !Array.isArray(data) ||
    !data.every((item) => typeof item === 'object' && item !== null)
  ) {
    throw new Error('Expected JSON response to be an array of objects');
  }

  // Extract property names from schema in order
  const properties = schema.items?.properties;
  if (!properties) {
    throw new Error('Schema must have items.properties defined!');
  }

  // Get property names in the order they appear in the schema
  const propertyNames = Object.keys(properties);

  // Convert each object to an array of string values
  const result: string[][] = data.map((item: Record<string, unknown>) => {
    return propertyNames.map((propName) => {
      const value = item[propName];
      // Convert to string - this should never be an object, so we don't care about [object Object] shenanigans
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      return value !== null && value !== undefined ? String(value) : '';
    });
  });

  return result;
};
