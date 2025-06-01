export const LOCALSTORAGE_TOKEN_KEY = 'googleUserToken';

export const MAX_FILES = 3;
export const MAX_FILESIZE = 10 * 1024 * 1024; // 10MB;

export const SHEETS_RANGE: string = 'Sheet1!B2';
export const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
];
export const GAPI_SCOPE =
  'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file';
export const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
export const AI_MODEL = import.meta.env.VITE_MODEL_NAME;
export const AI_SCHEMA_TEXT = import.meta.env.VITE_STRUCTURED_OUTPUT_SCHEMA;

export const BATCH_UPDATE_REQUEST: gapi.client.sheets.Request[] = [
  // 1. Set Column Widths
  {
    updateDimensionProperties: {
      range: { sheetId: 0, dimension: 'COLUMNS', startIndex: 0, endIndex: 1 },
      properties: { pixelSize: 293 }, // Column A
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
      properties: { pixelSize: 110 }, // Column D
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
    // Column A (Barcode font) for A2:A23
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
    // Column B (Desc) for B2:B23
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
    // Column C (#) for C2:C23
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
    // Column D (Notas - first part styling) for D2:D23 (original HTML had a style change at row 39, this simplifies to one style for D2:D23)
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
          // Using the 10pt font style that was applied to the earlier rows in the HTML for Notas
          textFormat: { fontFamily: 'Arial', fontSize: 10 },
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
