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
      const errorMessage = fileReaderError
        ? `FileReader error on file ${file.name}: ${fileReaderError.name} - ${fileReaderError.message}`
        : `FileReader failed on file ${file.name} with an unknown error.`;
      reject(new Error(errorMessage)); // This generic message will be wrapped by App.tsx
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
  if (!apiKey) {
    throw new Error('messages.errorApiKeyMissing');
  }
  if (files.length === 0) {
    throw new Error('fileUpload.errorNoFilesSelected');
  }
  if (!prompt) {
    throw new Error('messages.errorAIPromptMissing');
  }
  if (!responseSchema || Object.keys(responseSchema).length === 0) {
    throw new Error('messages.errorAISchemaMissing');
  }

  const genAI = new GoogleGenAI({ apiKey });

  try {
    const textPart: Part = { text: prompt };
    const imagePartsPromises = files.map((file) => fileToGenerativePart(file));
    const imageParts = await Promise.all(imagePartsPromises);
    const requestPartsForContent: Part[] = [textPart, ...imageParts];

    const genAIResponse: GenerateContentResponse =
      await genAI.models.generateContent({
        model,
        contents: requestPartsForContent,
        config: {
          responseMimeType: 'application/json',
          responseSchema,
        },
      });

    if (!genAIResponse.text) {
      throw new Error('messages.errorAIResponse');
    }
    return genAIResponse.text;
  } catch (error: unknown) {
    console.error('Error calling AI API with @google/genai SDK:', error);
    if (error instanceof Error) {
      // Re-throw SDK's error message; App.tsx will handle translation/wrapping.
      throw new Error(error.message);
    }
    // Fallback for non-Error instances or other unexpected issues from the SDK.
    throw new Error('messages.errorAIUnknown');
  }
};

export const jsonResponseTo2DArray = (
  jsonText: string,
  schema: Schema
): string[][] => {
  try {
    const data: unknown = JSON.parse(jsonText);

    if (
      !Array.isArray(data) ||
      !data.every((item) => typeof item === 'object' && item !== null)
    ) {
      throw new Error('messages.errorAISchema'); // AI response structure mismatch
    }

    const properties = schema.items?.properties;
    if (!properties) {
      // Error in the provided schema definition itself.
      throw new Error('messages.errorAISchemaDefinitionInvalid');
    }

    const propertyNames = Object.keys(properties);
    const result: string[][] = data.map((item: Record<string, unknown>) => {
      return propertyNames.map((propName) => {
        const value = item[propName];
        // Convert to string; null/undefined become empty strings.
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        return value !== null && value !== undefined ? String(value) : '';
      });
    });
    return result;
  } catch (parseError: unknown) {
    console.error(
      "Failed to parse AI's JSON response or map to 2D array:",
      parseError
    );
    if (parseError instanceof SyntaxError) {
      throw new Error('messages.errorAIJsonParse'); // Specific error for JSON parsing failures.
    }
    // Generic error for other issues during data transformation.
    throw new Error('messages.errorAIDataTransformation');
  }
};
