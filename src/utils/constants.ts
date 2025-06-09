import { Type, type Schema } from '@google/genai';

export const LOCALSTORAGE_TOKEN_KEY = 'googleUserToken';

export const MAX_FILES = 3;
export const MAX_FILESIZE = 10 * 1024 * 1024; // 10MB;

export const SHEETS_RANGE: string = 'Sheet1!B2';
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
The layout of the invoice usually follows a table-like structure, though it may not always be intuitive.
Look at all the columns, their titles, and their contents, and try to deduce which one corresponds to each property in the output schema.
Some of the text may be hard to read (obscured by stamps or writing), pay careful attention.
Sometimes, the printer used to print this invoice may have been misaligned, resulting in the text being hard to read or askew.
First, identify all the items according to your best ability, and identify any potential error-inducing factors that you can see.
Then, after identifying all the items, DOUBLE-CHECK to make sure you have not missed any.
DOUBLE-CHECK also that you have not hallucinated any of the identified items - verify that the all truly exist in the images.
When ready, provide a response according to the structured output.`;
export const AI_SCHEMA: Schema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      itemName: {
        type: Type.STRING,
        description: 'Name of the item, exactly as it appears on the invoice. It may sometimes appear in a column titled \'Desc\' (short for Descripción).',
      },
      amount: {
        type: Type.NUMBER,
        description:
          'The amount for this item, exactly as it appears on the invoice. It will usually be whole numbers, do not confuse it with the price of the item (generally large and with many significant decimals) or the tax% (usually exactly 21% or 10.5%). It will usually be in a column titled \'Cant\' (short for Cantidad), or \'U\' (short for Unidades).',
      },
      SKU: {
        type: Type.STRING,
        description:
          "Optional: The provider's internal code for this item, if it appears. It will usually appear in a column titled \'Código\' or \'Alias\'.",
      },
    },
    required: ['itemName', 'amount'],
    propertyOrdering: ['itemName', 'amount', 'SKU'],
  },
};

export const BATCH_UPDATE_REQUEST: gapi.client.sheets.Request[] = [
  // 1. Set Column Widths
  {
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 300 }, // Column A
      fields: 'pixelSize',
    },
  },
  {
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'COLUMNS', startIndex: 1, endIndex: 2 },
      properties: { pixelSize: 249 }, // Column B
      fields: 'pixelSize',
    },
  },
  {
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'COLUMNS', startIndex: 2, endIndex: 3 },
      properties: { pixelSize: 86 }, // Column C
      fields: 'pixelSize',
    },
  },
  {
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'COLUMNS', startIndex: 3, endIndex: 4 },
      properties: { pixelSize: 216 }, // Column D
      fields: 'pixelSize',
    },
  },
  // 2. Set Row Heights
  {
    // Row 1 (Header)
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'ROWS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 48 },
      fields: 'pixelSize',
    },
  },
  {
    // Rows 2-23
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'ROWS', startIndex: 1, endIndex: 23 },
      properties: { pixelSize: 47 },
      fields: 'pixelSize',
    },
  },
  // 3. Set Cell Borders for A1:D23
  {
    updateBorders: {
      range: {
        sheetId: 0,
        startRowIndex: 0,
        endRowIndex: 23, // Limit to row 23
        startColumnIndex: 0,
        endColumnIndex: 4, // Columns A-D
      },
      top: {
        style: 'SOLID',
        width: 1,
        color: { red: 0.6, green: 0.6, blue: 0.6 },
      },
      bottom: {
        style: 'SOLID',
        width: 1,
        color: { red: 0.6, green: 0.6, blue: 0.6 },
      },
      left: {
        style: 'SOLID',
        width: 1,
        color: { red: 0.6, green: 0.6, blue: 0.6 },
      },
      right: {
        style: 'SOLID',
        width: 1,
        color: { red: 0.6, green: 0.6, blue: 0.6 },
      },
      innerHorizontal: {
        style: 'SOLID',
        width: 1,
        color: { red: 0.6, green: 0.6, blue: 0.6 },
      },
      innerVertical: {
        style: 'SOLID',
        width: 1,
        color: { red: 0.6, green: 0.6, blue: 0.6 },
      },
    },
  },
  // 4. Format and Set Header Row (Row 1: A1:D1)
  {
    updateCells: {
      rows: [
        {
          values: [
            {
              // A1: CODBAR
              userEnteredValue: { stringValue: 'CODBAR' },
              userEnteredFormat: {
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                textFormat: { fontFamily: 'Arial', fontSize: 24 },
                numberFormat: {
                  type: 'TEXT', // Treat as text to preserve the asterisks literally
                  pattern: '"*"#"*"', // Wrap the number with asterisks for barcode legibility
                },
              },
            },
            {
              // B1: DESC
              userEnteredValue: { stringValue: 'DESC' },
              userEnteredFormat: {
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                textFormat: { fontFamily: 'Arial', fontSize: 24 },
                wrapStrategy: 'WRAP',
              },
            },
            {
              // C1: #
              userEnteredValue: { stringValue: '#' },
              userEnteredFormat: {
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE',
                textFormat: { fontFamily: 'Arial', fontSize: 24 },
              },
            },
            {
              // D1: NOTAS
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
      start: { sheetId: 0, rowIndex: 0, columnIndex: 0 },
    },
  },
  // 5. Format Data Columns (Rows 2-23)
  {
    // Column A (Barcode font)
    repeatCell: {
      range: {
        sheetId: 0,
        startRowIndex: 1, // Row 2
        endRowIndex: 23, // Limit to row 23
        startColumnIndex: 0,
        endColumnIndex: 1, // Column A
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
  {
    // Column B (Desc)
    repeatCell: {
      range: {
        sheetId: 0,
        startRowIndex: 1, // Row 2
        endRowIndex: 23, // Limit to row 23
        startColumnIndex: 1,
        endColumnIndex: 2, // Column B
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
  {
    // Column C (#)
    repeatCell: {
      range: {
        sheetId: 0,
        startRowIndex: 1, // Row 2
        endRowIndex: 23, // Limit to row 23
        startColumnIndex: 2,
        endColumnIndex: 3, // Column C
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
  {
    // Column D (Notas)
    repeatCell: {
      range: {
        sheetId: 0,
        startRowIndex: 1, // Row 2
        endRowIndex: 23, // Limit to row 23
        startColumnIndex: 3,
        endColumnIndex: 4, // Column D
      },
      cell: {
        userEnteredFormat: {
          horizontalAlignment: 'CENTER',
          verticalAlignment: 'MIDDLE',
          textFormat: { fontFamily: 'Arial', fontSize: 9 },
          wrapStrategy: 'WRAP',
        },
      },
      fields:
        'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat,wrapStrategy)',
    },
  },
  // 6. Freeze Header Row
  {
    updateSheetProperties: {
      properties: { sheetId: 0, gridProperties: { frozenRowCount: 1 } },
      fields: 'gridProperties.frozenRowCount',
    },
  },
];
