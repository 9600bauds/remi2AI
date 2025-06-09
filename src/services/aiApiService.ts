import { GoogleGenAI, type Part, type Schema } from '@google/genai';

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
  onPartReceived: (partText: string, isThought: boolean) => void
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

  const thoughtFragments: string[] = [];
  const jsonFragments: string[] = [];

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
              thoughtFragments.push(thoughtFragment);
              onPartReceived(thoughtFragment, true);
            } else {
              const jsonFragment = part.text.trim();
              jsonFragments.push(jsonFragment);
              onPartReceived(jsonFragment, false);
            }
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
      throw new Error('messages.errorAISchema');
    }
    const properties = schema.items?.properties;
    if (!properties) {
      throw new Error('messages.errorAISchemaDefinitionInvalid');
    }
    const propertyNames = Object.keys(properties);
    const result: string[][] = data.map((item: Record<string, unknown>) => {
      return propertyNames.map((propName) => {
        const value = item[propName];
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
    throw new Error('messages.errorAIDataTransformation');
  }
};
