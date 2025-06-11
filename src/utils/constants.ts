import { Type, type Schema } from '@google/genai';

export const LOCALSTORAGE_TOKEN_KEY = 'googleUserToken';

export const MAX_FILES = 3;
export const MAX_FILESIZE = 10 * 1024 * 1024; // 10MB;

export const SHEET_DATA_RANGE: string = 'Sheet1!B2';
export const SHEET_TITLE_RANGE: string = 'Sheet1!A1';
export const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
];
export const GAPI_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

export const AI_MODEL: string = 'gemini-2.5-flash-preview-05-20';
export const AI_PROMPT: string = `You are an expert at data entry, digitizing a scanned invoice provided by the user.
Your task is to identify and list all the items presented in the scanned invoice.
Analyze the provided images, gather the text that appears on the invoice, and then identify each item.
If multiple images are provided, assume they are different pages of just one multi-page invoice.
The layout of the invoice usually follows a table-like structure, though it may not always be intuitive.
Look at all the columns, their titles, and their contents, and try to deduce which one corresponds to each property in the output schema.
Some of the text may be hard to read (obscured by stamps or writing), pay careful attention.
Sometimes, the printer used to print this invoice may have been misaligned, resulting in the text being hard to read or askew.
First, identify all the items according to your best ability, and identify any potential error-inducing factors that you can see.
Then, after identifying all the items, DOUBLE-CHECK to make sure you have not missed any.
DOUBLE-CHECK also that you have not hallucinated any of the identified items - verify that the all truly exist in the images.
When ready, provide a response according to the structured output.`;
export const AI_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description:
        "A concise title for the extracted invoice, particularly the provider or the invoice number, if found. Example: 'ElectroDos #12345-678910'",
    },
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          amount: {
            type: Type.NUMBER,
            description:
              "The amount for this item, exactly as it appears on the invoice. It will usually be whole numbers, do not confuse it with the price of the item (generally large and with many significant decimals) or the tax% (usually exactly 21% or 10.5%). It will usually be in a column titled 'Cant' (short for Cantidad), or 'U' (short for Unidades).",
          },
          SKU: {
            type: Type.STRING,
            description:
              "The provider's internal code for this item, if it appears. It will usually appear in a column titled 'Código', 'Cod.', 'Cod. E1' or similar. If there are multiple columns that seem suitable, include all of them, separated by a space.",
          },
          itemName: {
            type: Type.STRING,
            description:
              "Name of the item, exactly as it appears on the invoice. It may sometimes appear in a column titled 'Desc' (short for Descripción).",
          },
        },
        required: ['amount', 'SKU', 'itemName'],
        propertyOrdering: ['amount', 'SKU', 'itemName'],
      },
    },
  },
  required: ['title', 'items'],
  propertyOrdering: ['title', 'items'],
};

export interface ParsedAIResponse {
  title: string;
  items: string[][];
}

export const BATCH_UPDATE_REQUEST: gapi.client.sheets.Request[] = [
  // ============================================================================
  // COLUMN WIDTHS
  // ============================================================================

  // Column A: CODBAR
  {
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 280 },
      fields: 'pixelSize',
    },
  },

  // Column B: AMOUNT
  {
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 },
      properties: { pixelSize: 86 },
      fields: 'pixelSize',
    },
  },

  // Column C: SKU
  {
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 },
      properties: { pixelSize: 160 },
      fields: 'pixelSize',
    },
  },

  // Column D: DESC
  {
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 },
      properties: { pixelSize: 275 },
      fields: 'pixelSize',
    },
  },

  // Column E: NOTAS
  {
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'COLUMNS', startIndex: 4, endIndex: 5 },
      properties: { pixelSize: 200 },
      fields: 'pixelSize',
    },
  },

  // ============================================================================
  // ROW HEIGHTS
  // ============================================================================

  // Header row (48px)
  {
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 48 },
      fields: 'pixelSize',
    },
  },

  // Data rows (47px each)
  {
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'ROWS', startIndex: 1, endIndex: 50 },
      properties: { pixelSize: 47 },
      fields: 'pixelSize',
    },
  },

  // ============================================================================
  // HEADER ROW CONTENT & FORMATTING
  // ============================================================================

  {
    updateCells: {
      start: { sheetId: 0, rowIndex: 0, columnIndex: 0 },
      rows: [
        {
          values: [
            // A1: CODBAR
            {
              userEnteredValue: { stringValue: 'CODBAR' },
              userEnteredFormat: {
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                textFormat: { fontFamily: 'Arial', fontSize: 15 },
                numberFormat: {
                  type: 'TEXT', // Treat as text to preserve the asterisks literally
                  pattern: '"*"#"*"', // Wrap the number with asterisks for barcode legibility
                },
                wrapStrategy: 'WRAP',
              },
            },

            // B1: # (AMOUNT)
            {
              userEnteredValue: { stringValue: '#' },
              userEnteredFormat: {
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                textFormat: { fontFamily: 'Arial', fontSize: 24 },
              },
            },

            // C1: SKU
            {
              userEnteredValue: { stringValue: 'SKU' },
              userEnteredFormat: {
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                textFormat: { fontFamily: 'Arial', fontSize: 24 },
                wrapStrategy: 'WRAP',
              },
            },

            // D1: DESC
            {
              userEnteredValue: { stringValue: 'DESC' },
              userEnteredFormat: {
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                textFormat: { fontFamily: 'Arial', fontSize: 24 },
                wrapStrategy: 'WRAP',
              },
            },

            // E1: NOTAS
            {
              userEnteredValue: { stringValue: 'NOTAS' },
              userEnteredFormat: {
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                textFormat: { fontFamily: 'Arial', fontSize: 24 },
                wrapStrategy: 'WRAP',
              },
            },
          ],
        },
      ],
      fields:
        'userEnteredValue,userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat,wrapStrategy)',
    },
  },

  // ============================================================================
  // DATA COLUMN FORMATTING (Rows 2-50)
  // ============================================================================

  // Column A: CODBAR (Barcode font, 26px)
  {
    repeatCell: {
      range: {
        sheetId: 0,
        startRowIndex: 1,
        endRowIndex: 50,
        startColumnIndex: 0,
        endColumnIndex: 1,
      },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          textFormat: { fontFamily: 'Libre Barcode 39 Text', fontSize: 26 },
        },
      },
      fields:
        'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat)',
    },
  },

  // Column B: AMOUNT (Arial, 22px)
  {
    repeatCell: {
      range: {
        sheetId: 0,
        startRowIndex: 1,
        endRowIndex: 50,
        startColumnIndex: 1,
        endColumnIndex: 2,
      },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          textFormat: { fontFamily: 'Arial', fontSize: 22 },
        },
      },
      fields:
        'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat)',
    },
  },

  // Column C: SKU (Arial, 10px, wrapped)
  {
    repeatCell: {
      range: {
        sheetId: 0,
        startRowIndex: 1,
        endRowIndex: 50,
        startColumnIndex: 2,
        endColumnIndex: 3,
      },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          textFormat: { fontFamily: 'Arial', fontSize: 10 },
          wrapStrategy: 'WRAP',
        },
      },
      fields:
        'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat,wrapStrategy)',
    },
  },

  // Column D: DESC (Arial, 10px, wrapped)
  {
    repeatCell: {
      range: {
        sheetId: 0,
        startRowIndex: 1,
        endRowIndex: 50,
        startColumnIndex: 3,
        endColumnIndex: 4,
      },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          textFormat: { fontFamily: 'Arial', fontSize: 10 },
          wrapStrategy: 'WRAP',
        },
      },
      fields:
        'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat,wrapStrategy)',
    },
  },

  // Column E: NOTAS (Arial, 10px, left-aligned, wrapped)
  {
    repeatCell: {
      range: {
        sheetId: 0,
        startRowIndex: 1,
        endRowIndex: 50,
        startColumnIndex: 4,
        endColumnIndex: 5,
      },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: 'LEFT',
          verticalAlignment: 'MIDDLE',
          textFormat: { fontFamily: 'Arial', fontSize: 10 },
          wrapStrategy: 'WRAP',
        },
      },
      fields:
        'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat,wrapStrategy)',
    },
  },

  // ============================================================================
  // SHEET PROPERTIES
  // ============================================================================

  // Freeze header row
  {
    updateSheetProperties: {
      properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
      fields: 'gridProperties.frozenRowCount',
    },
  },
];
