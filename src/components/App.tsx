// src/components/App.tsx
import { useEffect, useState, useRef } from 'react';
import styles from './App.module.css';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { sendAiRequest } from '../services/aiApiService';
import { LOCALSTORAGE_TOKEN_KEY } from '../utils/constants';
import type { SupportedLanguage } from '../types/SupportedLanguage';
import Header from './Header';
import FileUpload, { type FileUploadHandles } from './FileUpload';
import type { LocalizedError } from '../types/LocalizedError';

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
  const { t, i18n } = useTranslation();

  const [isGapiClientReady, setIsGapiClientReady] = useState<boolean>(false);
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] =
    useState<boolean>(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isAwaitingResponse, setIsAwaitingResponse] = useState<boolean>(false);
  const [highlightButton, setHighlightButton] = useState<boolean>(false);
  const [successLink, setSuccessLink] = useState<string | null>(null);
  const [error, setError] = useState<LocalizedError>(null);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);

  const fileUploadRef = useRef<FileUploadHandles>(null); // Ref for FileUpload

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
        const errMsg = e instanceof Error ? e.message : 'Unknown error';
        setTemporaryError({
          key: 'messages.errorGapiInit',
          params: { message: errMsg },
        });
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
          console.error('Failed to load GAPI client library');
          setTemporaryError('messages.errorGapiLoad');
        },
        timeout: 5000,
        ontimeout: () => {
          console.error(
            'GAPI client library could not load in a timely manner'
          );
          setTemporaryError('messages.errorGapiTimeout');
        },
      });
    };
    loadGapiClient();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      try {
        const storedTokenData = JSON.parse(storedTokenItem) as StoredToken;
        const tokenIsValid =
          storedTokenData.token && storedTokenData.expires_at > Date.now();
        if (tokenIsValid) {
          onSignIn(storedTokenData.token);
        } else {
          localStorage.removeItem(LOCALSTORAGE_TOKEN_KEY);
        }
      } catch (e) {
        console.error('Failed to parse stored token:', e);
        localStorage.removeItem(LOCALSTORAGE_TOKEN_KEY);
      }
    }
  }, [isGapiClientReady]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Google authentication login/log out
   */
  const onSignIn = (token: string) => {
    gapi.client.setToken({ access_token: token });
    setIsGoogleSignedIn(true);
    setError(null);
    if (selectedFiles.length > 0) {
      setHighlightButton(true);
    }
  };
  const onSignOut = () => {
    gapi.client.setToken(null);
    setIsGoogleSignedIn(false);
    localStorage.removeItem(LOCALSTORAGE_TOKEN_KEY);
    setHighlightButton(false);
  };

  const googleSignIn = useGoogleLogin({
    onSuccess: (tokenResponse) => {
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
      let message = t('messages.errorGoogleLoginUnknown'); // Default translated message
      let messageKey: LocalizedError = 'messages.errorGoogleLoginUnknown';

      if (typeof errorResponse === 'string') {
        message = errorResponse;
        messageKey = {
          key: 'messages.errorGoogleLoginWithMessage',
          params: { message },
        };
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
        messageKey = {
          key: 'messages.errorGoogleLoginWithMessage',
          params: { message },
        };
      }
      onSignOut();
      setTemporaryError(messageKey);
    },
    scope: GAPI_SCOPE,
  });

  const googleSignOut = () => {
    googleLogout(); // From @react-oauth/google
    onSignOut();
    setError(null); // Clear errors on sign out
  };

  const changeLanguage = async (lng: SupportedLanguage) => {
    await i18n.changeLanguage(lng);
  };

  const toggleSettingsModal = () => {
    setIsSettingsModalOpen((prev) => !prev);
  };

  const setTemporaryError = (
    errorValue: LocalizedError,
    duration: number = 4000
  ) => {
    if (errorTimeout) {
      clearTimeout(errorTimeout);
    }
    setError(errorValue);
    if (errorValue) {
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
    copyFilename?: string
  ): Promise<gapi.client.drive.File> => {
    if (!gapi?.client?.drive) {
      throw new Error(t('messages.errorGapiClientNotReady'));
    }
    if (!gapi.client.getToken()) {
      throw new Error(t('messages.errorAccessTokenMissing'));
    }
    const finalCopyFilename =
      copyFilename ||
      t('fileUpload.defaultCopyName', {
        dateTime: new Date().toLocaleString(),
      });

    const copyRequest = await gapi.client.drive.files.copy({
      fileId,
      resource: {
        name: finalCopyFilename,
      },
      fields: 'id, webViewLink', // Fields to include in the response (we need the ID of the new copy)
    });
    return copyRequest.result;
  };

  const writeToSpreadsheet = async (
    spreadsheetID: string,
    dataToWrite: string[][],
    range: string
  ): Promise<gapi.client.Response<gapi.client.sheets.UpdateValuesResponse>> => {
    if (!gapi?.client?.sheets) {
      throw new Error(t('messages.errorGapiClientNotReady'));
    }
    if (!gapi.client.getToken()) {
      throw new Error(t('messages.errorAccessTokenMissing'));
    }
    if (!dataToWrite || dataToWrite.length === 0) {
      throw new Error(t('messages.errorNoDataToWrite'));
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
      setTemporaryError('fileUpload.errorNoFilesSelected');
      return;
    }
    if (!isGoogleSignedIn || !isGapiClientReady) {
      setTemporaryError('messages.errorSignInRequired');
      return;
    }

    setIsAwaitingResponse(true);
    setError(null);
    setSuccessLink(null);
    setHighlightButton(false);

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
        setTemporaryError('messages.errorCopyFile');
        setIsAwaitingResponse(false);
        return;
      }
      await writeToSpreadsheet(copiedFile.id, aiData, SHEETS_RANGE);
      if (copiedFile.webViewLink) {
        setSuccessLink(copiedFile.webViewLink);
        window.open(copiedFile.webViewLink);
      }
      setSelectedFiles([]);
    } catch (err) {
      console.error('Error during processing:', err);
      const errorMsg =
        err instanceof Error ? err.message : t('messages.errorUnknown');
      if (
        err instanceof Error &&
        (err.message === t('messages.errorGapiClientNotReady') ||
          err.message === t('messages.errorAccessTokenMissing') ||
          err.message === t('messages.errorNoDataToWrite'))
      ) {
        setTemporaryError(err.message);
      } else {
        setTemporaryError({
          key: 'messages.errorProcessingGeneric',
          params: { message: errorMsg },
        });
      }
    } finally {
      setIsAwaitingResponse(false);
    }
  };

  const generateButton = () => {
    if (!isGapiClientReady) {
      return (
        <button type="button" className="btn btn-secondary btn-lg" disabled>
          <span
            className="spinner-border spinner-border-sm"
            role="status"
            aria-hidden="true"
          ></span>
          <span className="ms-2">{t('buttons.loadingGoogleApi')}</span>
        </button>
      );
    }
    if (!isGoogleSignedIn) {
      return (
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={() => googleSignIn()}
        >
          <i className="bi bi-google me-2"></i>
          {t('buttons.signInToContinue')}
        </button>
      );
    }
    if (isAwaitingResponse) {
      return (
        <button type="button" className="btn btn-secondary btn-lg" disabled>
          <span
            className="spinner-border spinner-border-sm"
            role="status"
            aria-hidden="true"
          ></span>
          <span className="ms-2">{t('buttons.processing')}</span>
        </button>
      );
    }

    if (selectedFiles.length === 0) {
      return (
        <button
          type="button"
          className="btn btn-outline-primary btn-lg"
          onClick={() => {
            if (fileUploadRef.current) {
              fileUploadRef.current.openFileDialog();
            }
          }}
        >
          <i className="bi bi-plus-circle me-2"></i>
          {t('buttons.selectFilesToContinue')}
        </button>
      );
    }

    const buttonTextKey =
      selectedFiles.length === 1 ? 'buttons.process_one' : 'buttons.process';
    const buttonClasses = ['btn', 'btn-primary', 'btn-lg'];
    if (highlightButton) {
      buttonClasses.push(styles.glowingButton);
    }
    return (
      <button
        type="button"
        className={buttonClasses.join(' ')}
        onClick={handleSubmit}
      >
        <i className="bi bi-robot me-2"></i>
        {t(buttonTextKey, { count: selectedFiles.length })}
      </button>
    );
  };

  return (
    <div className={styles.appContainer}>
      <div className={styles.headerWrapper}>
        <Header
          currentLanguage={i18n.language.split('-')[0] as SupportedLanguage}
          onLanguageChange={changeLanguage}
          onToggleSettings={toggleSettingsModal}
          isGoogleSignedIn={isGoogleSignedIn}
          onSignInClick={() => googleSignIn()}
          onSignOutClick={googleSignOut}
        />
      </div>

      <main className={styles.mainContentArea}>
        <FileUpload
          ref={fileUploadRef}
          selectedFiles={selectedFiles}
          onFilesChange={setSelectedFiles}
          setTemporaryError={setTemporaryError}
        />

        <div className={styles.actionPanelWrapper}>
          {error && (
            <div className={`alert alert-danger ${styles.alert}`} role="alert">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              <div>
                <strong>{t('messages.error')}:</strong>{' '}
                {typeof error === 'string'
                  ? t(error)
                  : error?.key
                    ? t(error.key, error.params)
                    : t('messages.errorUnknown')}
              </div>
            </div>
          )}
          {successLink && !error && (
            <div
              className={`alert alert-success ${styles.alertSuccess}`}
              role="alert"
            >
              <div className={styles.alertContent}>
                <i className="bi bi-check-circle-fill me-2"></i>
                <div>
                  <strong>{t('messages.processingComplete')}</strong>{' '}
                  {t('messages.dataProcessed')}
                </div>
              </div>
              <a
                href={successLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-success btn-sm ms-3"
              >
                <i className="bi bi-box-arrow-up-right me-1"></i>
                {t('messages.openSpreadsheet')}
              </a>
            </div>
          )}
          <div className={styles.actionButtonWrapper}>{generateButton()}</div>
        </div>
      </main>
      {/* TODO: Settings Modal
        {isSettingsModalOpen && (
          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={toggleSettingsModal}
            // pass other settings props
          />
        )}
      */}
    </div>
  );
}

export default App;
