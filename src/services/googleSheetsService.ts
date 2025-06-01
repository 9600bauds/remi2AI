export const createNewSheetFromTemplate = async (
  templateTitle: string,
  batchUpdatePayload: gapi.client.sheets.Request[]
): Promise<gapi.client.sheets.Spreadsheet> => {
  // 1. Check if GAPI client for Sheets is ready
  if (!gapi?.client?.sheets) {
    throw new Error('messages.errorGapiClientNotReady');
  }
  // 2. Check for access token
  if (!gapi.client.getToken()) {
    throw new Error('messages.errorAccessTokenMissing');
  }
  if (!templateTitle) {
    throw new Error('messages.errorTemplateTitleMissing');
  }
  if (!batchUpdatePayload || batchUpdatePayload.length === 0) {
    throw new Error('messages.errorBatchUpdatePayloadMissing');
  }

  try {
    // 3. Create a new blank spreadsheet
    const createSheetRequest = await gapi.client.sheets.spreadsheets.create({
      resource: {
        properties: {
          title: templateTitle,
        },
      },
      fields: 'spreadsheetId,spreadsheetUrl', // Fields to include in the response
    });

    const newSpreadsheet = createSheetRequest.result;

    if (!newSpreadsheet.spreadsheetId || !newSpreadsheet.spreadsheetUrl) {
      throw new Error('messages.errorCreatingSpreadsheet');
    }

    // 4. Apply the batch update to the newly created spreadsheet
    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: newSpreadsheet.spreadsheetId,
      resource: { requests: batchUpdatePayload },
    });

    // 5. Return the ID and URL of the new, templated spreadsheet
    return newSpreadsheet;
  } catch (error: unknown) {
    console.error('Error in createNewSheetFromTemplate:', error);
    // Attempt to extract a more specific error message from the GAPI error response.
    // App.tsx's catch block will handle wrapping this message if it's not a direct i18n key.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const detailMessage =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (error as any)?.result?.error?.message || (error as Error)?.message;
    if (detailMessage) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      throw new Error(detailMessage);
    }
    // Generic fallback key if no specific message could be extracted from GAPI error.
    throw new Error('messages.errorApplyingTemplateToSheet');
  }
};

export const writeToSpreadsheet = async (
  spreadsheetID: string,
  dataToWrite: string[][],
  range: string
): Promise<gapi.client.Response<gapi.client.sheets.UpdateValuesResponse>> => {
  if (!gapi?.client?.sheets) {
    throw new Error('messages.errorGapiClientNotReady');
  }
  if (!gapi.client.getToken()) {
    throw new Error('messages.errorAccessTokenMissing');
  }
  if (!dataToWrite || dataToWrite.length === 0) {
    throw new Error('messages.errorNoDataToWrite');
  }
  if (!spreadsheetID) {
    throw new Error('messages.errorSpreadsheetIdMissing');
  }
  if (!range) {
    throw new Error('messages.errorRangeMissing');
  }

  try {
    const response = await gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: spreadsheetID,
      range,
      valueInputOption: 'USER_ENTERED', // Determines how input data is interpreted. 'USER_ENTERED' means formulas are calculated, etc.
      resource: {
        values: dataToWrite,
      },
    });
    return response;
  } catch (error: unknown) {
    console.error('Error writing to spreadsheet:', error);
    // Attempt to extract a more specific error message from the GAPI error response.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const detailMessage =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (error as any)?.result?.error?.message || (error as Error)?.message;
    if (detailMessage) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      throw new Error(detailMessage);
    }
    // Generic fallback key for errors during the write operation.
    throw new Error('messages.errorWritingToSheet');
  }
};
