import { useEffect, useState } from 'react';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { sendAiRequest } from '../services/aiApiService';
import './App.css';
import { LOCALSTORAGE_TOKEN_KEY } from '../utils/constants';
import type { SupportedLanguage } from '../types/SupportedLanguage';
import Header from './Header';
import FileUpload from './FileUpload';

const SHEETS_TEMPLATE_ID = '1RkI3YNGaywbHT5qANy4TH-JvwioSQ74SQzHT6gR6l1c';
const SHEETS_RANGE: string = 'Sheet1!B2';
const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
];
const GAPI_SCOPE =
  'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive';
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;
const AI_MODEL = import.meta.env.VITE_MODEL_NAME;
const AI_SCHEMA_TEXT = import.meta.env.VITE_STRUCTURED_OUTPUT_SCHEMA;

function App() {
  const [isGapiClientReady, setIsGapiClientReady] = useState<boolean>(false);
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState<boolean>(false);

  const [currentLanguage, setCurrentLanguage] =
    useState<SupportedLanguage>('en');
  const [isSettingsModalOpen, setIsSettingsModalOpen] =
    useState<boolean>(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState<boolean>(false);
  const [successLink, setSuccessLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);

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
        setError(
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
          setError(errorMsg);
        },
        timeout: 5000,
        ontimeout: () => {
          const timeoutMsg =
            'GAPI client library could not load in a timely manner';
          console.error(timeoutMsg);
          setError(timeoutMsg);
        },
      });
    };
    loadGapiClient();
  }, []);

  /**
   * useEffect to automatically re-login from localstorage
   */
  interface StoredToken {
    token: string;
    expires_at: number;
  }
  useEffect(() => {
    if (!isGapiClientReady) return;
    const storedTokenItem = localStorage.getItem(LOCALSTORAGE_TOKEN_KEY);
    if (storedTokenItem) {
      const storedTokenData = JSON.parse(storedTokenItem) as StoredToken;
      const tokenIsValid =
        storedTokenData.token && storedTokenData.expires_at > Date.now();
      if (tokenIsValid) {
        onSignIn(storedTokenData.token);
      } else {
        localStorage.removeItem(LOCALSTORAGE_TOKEN_KEY); // Clean up expired token
      }
    }
  }, [isGapiClientReady]); // Re-run if gapi client becomes ready

  /**
   * Google authentication login/log out
   */
  const onSignIn = (token: string) => {
    gapi.client.setToken({ access_token: token });
    setIsGoogleSignedIn(true);
    setError(null);
  };
  const onSignOut = () => {
    gapi.client.setToken(null);
    setIsGoogleSignedIn(false);
    localStorage.removeItem(LOCALSTORAGE_TOKEN_KEY);
  };

  const googleSignIn = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      console.log('Google Login Success:', tokenResponse);
      onSignIn(tokenResponse.access_token);
      const tokenToStore: StoredToken = {
        token: tokenResponse.access_token,
        expires_at: Date.now() + tokenResponse.expires_in * 1000, // expires_in is in seconds
      };
      localStorage.setItem(
        LOCALSTORAGE_TOKEN_KEY,
        JSON.stringify(tokenToStore)
      );
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
      onSignOut();
      setError(`Google Login Error: ${message}`);
    },
    scope: GAPI_SCOPE,
  });

  const googleSignOut = () => {
    googleLogout(); // From @react-oauth/google
    onSignOut();
    setError(null);
  };

  const handleLanguageChange = (lang: SupportedLanguage) => {
    setCurrentLanguage(lang);
    // TODO: Implement actual translation loading based on `lang`
    // For now, just log it and update state
    console.log(`Language changed to: ${lang}`);
    localStorage.setItem('preferredLang', lang); // Store preference
  };

  // Load language preference on initial mount
  useEffect(() => {
    const preferredLang = localStorage.getItem('preferredLang');
    if (preferredLang && (preferredLang === 'en' || preferredLang === 'es')) {
      //Todo: How to check if the stored language is anything of type SupportedLanguage?
      setCurrentLanguage(preferredLang);
    }
  }, []);

  const toggleSettingsModal = () => {
    setIsSettingsModalOpen(!isSettingsModalOpen);
  };

  const setTemporaryError = (
    message: string | null,
    duration: number = 4000
  ) => {
    if (errorTimeout) {
      clearTimeout(errorTimeout); // Clear any existing timeout
    }
    setError(message);
    if (message) {
      // Only set a timeout if there's a message
      const newTimeoutId = setTimeout(() => {
        setError(null);
        setErrorTimeout(null);
      }, duration);
      setErrorTimeout(newTimeoutId);
    }
  };

  /**
   * Program functions
   */
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
        name: copyFilename,
      },
      fields: 'id, webViewLink', // Fields to include in the response (we need the ID of the new copy)
    });
    console.log('Copyrequest after it finished:', copyRequest);
    return copyRequest.result;
  };

  const writeToSpreadsheet = async (
    spreadsheetID: string,
    dataToWrite: string[][],
    range: string
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

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      setError('Por favor seleccione uno o más archivos.');
      return;
    }
    if (!isGoogleSignedIn || !isGapiClientReady) {
      setError('Por favor inicie sesión.');
      return;
    }

    setIsAwaitingResponse(true);
    setError(null);

    try {
      const prompt = import.meta.env.VITE_PROMPT;
      const aiData = await sendAiRequest(
        API_KEY,
        AI_MODEL,
        selectedFiles,
        prompt,
        AI_SCHEMA_TEXT
      );

      const copiedFile = await copyFile(SHEETS_TEMPLATE_ID);
      if (!copiedFile || !copiedFile.id) {
        setError('No se pudo copiar el archivo.');
        setIsAwaitingResponse(false);
        return;
      }
      await writeToSpreadsheet(copiedFile.id, aiData, SHEETS_RANGE);
      if (copiedFile.webViewLink) {
        setSuccessLink(copiedFile.webViewLink);
        window.open(copiedFile.webViewLink);
      }
      setIsAwaitingResponse(false);
      setError(null);
    } catch (err) {
      console.error('Error during processing:', err);
      setError(
        err instanceof Error ? err.message : 'An unknown error occurred'
      );
      setIsAwaitingResponse(false);
    }
  };

  const generateButton = () => {
    if (!isGapiClientReady)
      return (
        <button
          type="button"
          className="btn btn-secondary btn-lg"
          disabled={true}
        >
          <span
            className="spinner-border spinner-border-sm"
            role="status"
            aria-hidden="true"
          ></span>
          <span className="ms-2">Cargando API de Google...</span>
        </button>
      );
    else if (!isGoogleSignedIn) {
      return (
        <button
          type="button"
          className="btn btn-success btn-lg"
          onClick={() => googleSignIn()}
        >
          <i className="bi bi-google me-2"></i>
          Inicie Sesión para Continuar
        </button>
      );
    } else if (isAwaitingResponse) {
      return (
        <button
          type="button"
          className="btn btn-secondary btn-lg"
          disabled={true}
        >
          <span
            className="spinner-border spinner-border-sm"
            role="status"
            aria-hidden="true"
          ></span>
          <span className="ms-2">Procesando...</span>
        </button>
      );
    } else {
      return (
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={handleSubmit}
          disabled={selectedFiles.length === 0}
        >
          {selectedFiles.length === 0 ? (
            <>Seleccione archivos para continuar</>
          ) : (
            <>
              Procesar {selectedFiles.length} Archivo
              {selectedFiles.length === 1 ? '' : 's'}
            </>
          )}
        </button>
      );
    }
  };

  /**
   * Returned element
   */
  return (
    <div className="min-vh-100 bg-light">
      <Header
        appName="remi2AI"
        currentLanguage={currentLanguage}
        onLanguageChange={handleLanguageChange}
        onToggleSettings={toggleSettingsModal}
        isGoogleSignedIn={isGoogleSignedIn}
        onSignInClick={googleSignIn}
        onSignOutClick={googleSignOut}
      />

      <main className="container py-4">
        <div className="row justify-content-center">
          <div className="col-12 col-md-10 col-lg-8 col-xl-6">
            {/* File Upload Component */}
            <FileUpload
              selectedFiles={selectedFiles}
              onFilesChange={setSelectedFiles}
              setTemporaryError={setTemporaryError}
              maxFiles={3}
              maxSize={10 * 1024 * 1024}
            />

            {error && (
              <div
                className="alert alert-danger d-flex align-items-center mb-4"
                role="alert"
              >
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                <div>
                  <strong>Error:</strong> {error}
                </div>
              </div>
            )}

            {successLink && !error && (
              <div
                className="alert alert-success d-flex align-items-center justify-content-between mb-4"
                role="alert"
              >
                <div className="d-flex align-items-center">
                  <i className="bi bi-check-circle-fill me-2"></i>
                  <div>
                    <strong>Processing Complete!</strong> Your data has been
                    processed successfully.
                  </div>
                </div>
                <a
                  href={successLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-success btn-sm ms-3"
                >
                  <i className="bi bi-box-arrow-up-right me-1"></i>
                  Open Spreadsheet
                </a>
              </div>
            )}

            <div className="d-flex justify-content-center mb-4">
              {generateButton()}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
