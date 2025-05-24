import { useCallback, useEffect, useState } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import FileUpload from './FileUpload';
import { sendAiRequest } from '../services/aiApiService';
import './App.css';

const SHEETS_TEMPLATE_ID = '1e4AaDW9w5YIWpQ0FuM0Qkz4zA4IzAwNz_yvaZKGGIV8';
const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
];
const GAPI_SCOPE =
  'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive';
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const AI_MODEL = import.meta.env.VITE_MODEL_NAME;

function App() {
  const [isGapiClientReady, setIsGapiClientReady] = useState<boolean>(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState<boolean>(false);
  const [googleAuthError, setGoogleAuthError] = useState<string | null>(null);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Google API load/init
   */
  useEffect(() => {
    const initGapiClient = async () => {
      try {
        await gapi.client.init({
          apiKey: API_KEY,
          discoveryDocs: DISCOVERY_DOCS,
        });
        setIsGapiClientReady(true);
      } catch (e: unknown) {
        console.error('Error initializing GAPI client:', e);
        setGoogleAuthError(
          `Failed to initialize GAPI client: ${e instanceof Error ? e.message : 'Unknown error'}`
        );
      }
    };

    const loadGapiClient = () => {
      if (typeof gapi === 'undefined') {
        // Not loaded yet - just pool to retry later. Shouldn't happen anymore?
        setTimeout(loadGapiClient, 100);
        return;
      }
      gapi.load('client', {
        callback: () => {
          void initGapiClient();
        },
        onerror: () => {
          const errorMsg = 'Failed to load GAPI client library';
          console.error(errorMsg);
          setGoogleAuthError(errorMsg);
        },
        timeout: 5000,
        ontimeout: () => {
          const timeoutMsg =
            'GAPI client library could not load in a timely manner';
          console.error(timeoutMsg);
          setGoogleAuthError(timeoutMsg);
        },
      });
    };
    loadGapiClient();
  }, []);

  /**
   * Google authentication login/log out
   */
  const googleSignIn = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log('Google Login Success:', tokenResponse);
      setAccessToken(tokenResponse.access_token);
      gapi.client.setToken({ access_token: tokenResponse.access_token });
      setIsGoogleSignedIn(true);
      setGoogleAuthError(null);
    },
    onError: (errorResponse: unknown) => {
      console.error('Google Login Failed:', errorResponse);
      let message = 'Login failed for unknown reasons.';
      if (typeof errorResponse === 'string') {
        message = errorResponse;
      } else if (
        errorResponse &&
        typeof errorResponse === 'object' &&
        'error' in errorResponse
      ) {
        const err = errorResponse as {
          error: string;
          error_description?: string;
        };
        message = err.error_description || err.error;
      }
      setGoogleAuthError(`Google Login Error: ${message}`);
      setIsGoogleSignedIn(false);
      setAccessToken(null);
      gapi.client.setToken(null);
    },
    scope: GAPI_SCOPE,
  });

  const googleSignOut = () => {
    googleLogout(); // From @react-oauth/google
    setAccessToken(null);
    gapi.client.setToken(null); // Clear token from gapi client
    setIsGoogleSignedIn(false);
    setGoogleAuthError(null);
    console.log('Signed out from Google.');
  };

  const copyFile = async (
    fileId: string,
    copyFilename = `Processed Data - ${new Date().toLocaleString()}`
  ): Promise<gapi.client.drive.File> => {
    if (!gapi || !gapi.client || !gapi.client.drive) {
      throw new Error(
        'Google API client is not ready. Please ensure you are signed in and the client has initialized.'
      );
    }
    if (!gapi.client.getToken()) {
      throw new Error('Google access token is not set. Please sign in again.');
    }

    const copyRequest = await gapi.client.drive.files.copy({
      fileId,
      resource: {
        name: copyFilename, // Todo: Typescript doesn't like what I'm doing here, even though it works
      },
      fields: 'id, webViewLink', // Fields to include in the response (we need the ID of the new copy)
    });
    return copyRequest.result;
  };

  const writeToSpreadsheet = async (
    spreadsheetID: string,
    dataToWrite: string[][],
    range: string = 'Sheet1!A1'
  ): Promise<gapi.client.Response<gapi.client.sheets.UpdateValuesResponse>> => {
    if (!gapi || !gapi.client || !gapi.client.sheets) {
      throw new Error(
        'Google API client is not ready. Please ensure you are signed in and the client has initialized.'
      );
    }
    if (!gapi.client.getToken()) {
      throw new Error('Google access token is not set. Please sign in again.');
    }

    if (!dataToWrite || dataToWrite.length === 0) {
      throw new Error('No data provided to write to the sheet.');
    }

    const response = await window.gapi.client.sheets.spreadsheets.values.update(
      {
        spreadsheetId: spreadsheetID,
        range,
        valueInputOption: 'USER_ENTERED', // What exacly is this?
        resource: {
          values: dataToWrite,
        },
      }
    );

    return response;
  };

  const handleFilesAdd = (newFiles: File[]) => {
    setSelectedFiles((prevFiles) => {
      const updatedFiles = [...prevFiles];
      newFiles.forEach((newFile) => {
        const alreadyExists = prevFiles.some(
          (pf) =>
            pf.name === newFile.name &&
            pf.size === newFile.size &&
            pf.lastModified === newFile.lastModified
        );
        if (!alreadyExists) {
          updatedFiles.push(newFile);
        }
      });
      return updatedFiles;
    });
    setError(null);
  };

  const handleFileRemove = (fileToRemove: File) => {
    setSelectedFiles((prevFiles) =>
      prevFiles.filter((file) => file !== fileToRemove)
    );
    setError(null);
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      setError('Por favor seleccione uno o más archivos.');
      return;
    }
    if (!isGoogleSignedIn || !isGapiClientReady) {
      setError('Por favor inicie sesión.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const prompt = import.meta.env.VITE_PROMPT;
    const response = await sendAiRequest(
      API_KEY,
      AI_MODEL,
      selectedFiles,
      prompt
    );
    console.log('AI API Response:', response);
    const aiData = [
      ['a', 'b'],
      ['c', 'd'],
    ];

    const copiedFile = await copyFile(SHEETS_TEMPLATE_ID);
    if (!copiedFile || !copiedFile.id) {
      setError('No se pudo copiar el archivo.');
      setIsLoading(false);
      return;
    }
    await writeToSpreadsheet(copiedFile.id, aiData);
    setIsLoading(false);
  };

  return (
    <div className="container mt-4">
      <header className="text-center mb-4">
        <h1>remi2AI</h1>
        <p className="lead">
          Suba los escaneos de los remitos para digitalizarlos automáticamente.
        </p>
      </header>

      <main>
        <div className="row justify-content-center">
          <div className="col-md-10 col-lg-8">
            <div className="card shadow-sm">
              <FileUpload
                selectedFiles={selectedFiles}
                onFilesAdd={handleFilesAdd}
                onFileRemove={handleFileRemove}
                className="mb-3"
              />
              <div className="d-grid">
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={handleSubmit}
                  disabled={selectedFiles.length === 0 || isLoading}
                >
                  {isLoading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      <span className="ms-2">Procesando...</span>
                    </>
                  ) : (
                    `Procesar ${selectedFiles.length} Archivo(s)`
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger mt-4" role="alert">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>
        </div>

        <div className="card shadow-sm mt-4">
          <div className="card-body">
            <h5 className="card-title">Google Integration</h5>
            {!isGapiClientReady && <p>Loading Google API client...</p>}
            {googleAuthError && (
              <div className="alert alert-warning" role="alert">
                {googleAuthError}
              </div>
            )}
            {isGapiClientReady && (
              <>
                {!isGoogleSignedIn ? (
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => googleSignIn()}
                    disabled={!isGapiClientReady}
                  >
                    Sign In with Google
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline-danger mb-2"
                      onClick={googleSignOut}
                    >
                      Sign Out
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
