import i18n from '../i18n';

export const createNewSheetFromTemplate = async (
  templateTitle: string,
  batchUpdatePayload: gapi.client.sheets.Request[]
): Promise<gapi.client.sheets.Spreadsheet> => {
  // 1. Check if GAPI client for Sheets is ready
  if (!gapi?.client?.sheets) {
    // You might want a more specific error message key for sheets
    throw new Error(
      i18n.t('messages.errorGapiClientSheetsNotReady', {
        service: 'Google Sheets API',
      })
    );
  }

  // 2. Check for access token
  if (!gapi.client.getToken()) {
    throw new Error(i18n.t('messages.errorAccessTokenMissing'));
  }

  try {
    // 3. Create a new blank spreadsheet
    const createSheetRequest = await gapi.client.sheets.spreadsheets.create({
      resource: {
        properties: {
          title: templateTitle,
        },
        // By default, a new spreadsheet is created with one sheet (tab) which usually has sheetId: 0.
        // The batchUpdatePayload you provided targets sheetId: 0, which is perfect.
      },
      fields: 'spreadsheetId,spreadsheetUrl', // Fields to include in the response
    });

    const newSpreadsheet = createSheetRequest.result;

    if (!newSpreadsheet.spreadsheetId || !newSpreadsheet.spreadsheetUrl) {
      // You might want a more specific error message key
      throw new Error(i18n.t('messages.errorCreatingSpreadsheet'));
    }

    // 4. Apply the batch update to the newly created spreadsheet
    // The batchUpdatePayload's 'requests' should already contain the correct sheetId (e.g., 0 for the first sheet)
    // for the operations within that payload.
    await gapi.client.sheets.spreadsheets.batchUpdate({
      spreadsheetId: newSpreadsheet.spreadsheetId,
      resource: { requests: batchUpdatePayload },
    });
    console.log(newSpreadsheet);

    // 5. Return the ID and URL of the new, templated spreadsheet
    return newSpreadsheet;
  } catch (error: unknown) {
    console.error('Error creating sheet from template:', error);
    // Try to extract a more specific error message from the GAPI error response
    const detailMessage = error?.result?.error?.message || error.message;
    throw new Error(
      i18n.t('messages.errorApplyingTemplateToSheet', {
        error: detailMessage || 'Unknown error',
      })
    );
  }
};

export const writeToSpreadsheet = async (
  spreadsheetID: string,
  dataToWrite: string[][],
  range: string
): Promise<gapi.client.Response<gapi.client.sheets.UpdateValuesResponse>> => {
  if (!gapi?.client?.sheets) {
    throw new Error(i18n.t('messages.errorGapiClientNotReady'));
  }
  if (!gapi.client.getToken()) {
    throw new Error(i18n.t('messages.errorAccessTokenMissing'));
  }
  if (!dataToWrite || dataToWrite.length === 0) {
    throw new Error(i18n.t('messages.errorNoDataToWrite'));
  }

  const response = await gapi.client.sheets.spreadsheets.values.update({
    spreadsheetId: spreadsheetID,
    range,
    valueInputOption: 'USER_ENTERED',
    resource: {
      values: dataToWrite,
    },
  });
  return response;
};
