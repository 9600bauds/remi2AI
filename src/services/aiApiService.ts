import { GoogleGenAI, type Part, type Schema } from '@google/genai';
import type { ParsedAIResponse } from '../utils/constants';

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
      reject(new Error(errorMessage));
    };
    reader.readAsDataURL(file);
  });
  return { inlineData: { mimeType: file.type, data: base64EncodedString } };
};

export const sendAiRequest = async (
  apiKey: string,
  modelName: string,
  files: File[],
  prompt: string,
  responseSchema: Schema,
  onPartReceived: (newThinkingParts: string[], newOutputParts: string[]) => void
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

  const imagePartsPromises = files.map((file) => fileToGenerativePart(file));
  const imageParts = await Promise.all(imagePartsPromises);
  const textPart: Part = { text: prompt };

  const contentStream = await genAI.models.generateContentStream({
    model: modelName,
    contents: [{ role: 'user', parts: [textPart, ...imageParts] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: responseSchema,
      thinkingConfig: {
        includeThoughts: true,
      },
    },
  });

  let thoughtFragments: string[] = [];
  let jsonFragments: string[] = [];

  console.log('Starting to process stream...');
  for await (const chunk of contentStream) {
    console.log('Received chunk:', chunk);
    if (chunk.candidates && chunk.candidates.length > 0) {
      const candidate = chunk.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.text) {
            if (part.thought === true) {
              const thoughtFragment = part.text;
              thoughtFragments = [...thoughtFragments, thoughtFragment];
            } else {
              const jsonFragment = part.text.trim();
              jsonFragments = [...jsonFragments, jsonFragment];
            }
            onPartReceived(thoughtFragments, jsonFragments);
          }
        }
      }
    }
  }
  console.log('Stream processing finished.');

  const finalStringToParse = jsonFragments.join('');
  console.log('Final String to Parse (after outer trim):', finalStringToParse);

  if (finalStringToParse) {
    JSON.parse(finalStringToParse); // Validate final accumulated string
    console.log('Final Accumulated JSON successfully parsed.');
    console.log('Collected Thoughts:', thoughtFragments);
    console.log('Collected JSON Fragments:', jsonFragments);
    return finalStringToParse;
  } else if (thoughtFragments.length > 0) {
    console.warn('Only thoughts were received, no primary JSON output.');
  }
  throw new Error('messages.errorAIResponse');
};

export const parseAIResponse = (
  jsonText: string,
  schema: Schema
): ParsedAIResponse => {
  try {
    const responseObject: unknown = JSON.parse(jsonText);

    // Validate the new top-level object structure
    if (
      typeof responseObject !== 'object' ||
      responseObject === null ||
      !('title' in responseObject) ||
      !('items' in responseObject) ||
      typeof responseObject.title !== 'string' ||
      !Array.isArray(responseObject.items)
    ) {
      throw new Error('messages.errorAISchema');
    }

    const title = responseObject.title;
    const itemsArray = responseObject.items;

    // Get the ordered property names for each item from the schema.
    // This is more robust than relying on the API's implicit ordering.
    const propertyNames = schema.properties?.items?.items?.propertyOrdering;

    if (!propertyNames || !Array.isArray(propertyNames)) {
      throw new Error('messages.errorAISchemaDefinitionInvalid');
    }

    // Map the array of item objects to a 2D array of strings
    const dataRows: string[][] = itemsArray.map(
      (item: Record<string, unknown>) => {
        return propertyNames.map((propName) => {
          const value = item[propName];
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          return value != null ? String(value) : '';
        });
      }
    );

    return {
      title: title,
      items: dataRows,
    };
  } catch (parseError: unknown) {
    console.error("Failed to parse AI's JSON response:", parseError);
    if (parseError instanceof SyntaxError) {
      // Specific error for malformed JSON
      throw new Error('messages.errorAIJsonParse');
    }
    // For other errors, like schema validation or data transformation
    throw new Error('messages.errorAIDataTransformation');
  }
};
