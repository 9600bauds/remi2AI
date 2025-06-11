// src/components/App.tsx
import { useEffect, useState, useRef } from 'react';
import styles from './App.module.css';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { jsonResponseTo2DArray, sendAiRequest } from '../services/aiApiService';
import {
  AI_MODEL,
  AI_PROMPT,
  AI_SCHEMA,
  API_KEY,
  BATCH_UPDATE_REQUEST,
  DISCOVERY_DOCS,
  GAPI_SCOPE,
  LOCALSTORAGE_TOKEN_KEY,
  SHEETS_RANGE,
} from '../utils/constants';
import type { SupportedLanguage } from '../types/SupportedLanguage';
import Header from './Header';
import DropZone, { type DropZoneHandles } from './DropZone';
import type { LocalizedError } from '../types/LocalizedError';
import {
  createNewSheetFromTemplate,
  writeToSpreadsheet,
} from '../services/googleSheetsService';
import ThoughtsPreview from './ThoughtsPreview';

function App() {
  const { t, i18n } = useTranslation();

  const [isGapiClientReady, setIsGapiClientReady] = useState<boolean>(false);
  const [isGoogleSignedIn, setIsGoogleSignedIn] = useState<boolean>(false);

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [error, setError] = useState<LocalizedError>(null);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);
  const tokenExpiryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [highlightButton, setHighlightButton] =
    useState<boolean>(false); /* If true, the submit button should glow */
  const [resultLink, setresultLink] = useState<string | null>(null);
  const [resultJson, setresultJson] = useState<string | null>(null);
  const [resultCopied, setResultCopied] = useState<boolean>(false);

  const [isAwaitingAIResponse, setIsAwaitingAIResponse] =
    useState<boolean>(false);
  const [isAwaitingGapiResponse, setIsAwaitingGapiResponse] =
    useState<boolean>(false);
  const [thinkingParts, setThinkingParts] = useState<string[]>([]);
  const [outputParts, setOutputParts] = useState<string[]>([]);

  const dropZoneRef = useRef<DropZoneHandles>(null); // Ref for DropZone

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
        setError({
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
          onSignIn(storedTokenData.token, storedTokenData.expires_at);
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
   * Cleanup useEffect for the timeout when the component unmounts (shouldn't really be needed but, it's good practice)
   */
  useEffect(() => {
    return () => {
      if (tokenExpiryTimeoutRef.current) {
        clearTimeout(tokenExpiryTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Schedules an automatic sign-out when the Google token expires.
   */
  const scheduleTokenExpiry = (expiresAt: number) => {
    // Clear any existing timeout before setting a new one
    if (tokenExpiryTimeoutRef.current) {
      clearTimeout(tokenExpiryTimeoutRef.current);
    }

    const delay = expiresAt - Date.now();
    tokenExpiryTimeoutRef.current = setTimeout(() => {
      googleSignOut();
      setTemporaryError('messages.errorSessionExpired');
    }, delay);
  };

  /**
   * Google authentication login/log out
   */
  const onSignIn = (token: string, expiresAt: number) => {
    gapi.client.setToken({ access_token: token });
    setIsGoogleSignedIn(true);
    setError(null);
    if (selectedFiles.length > 0) {
      setHighlightButton(true);
    }
    scheduleTokenExpiry(expiresAt);
  };
  const onSignOut = () => {
    if (tokenExpiryTimeoutRef.current) {
      clearTimeout(tokenExpiryTimeoutRef.current);
      tokenExpiryTimeoutRef.current = null;
    }
    gapi.client.setToken(null);
    setIsGoogleSignedIn(false);
    localStorage.removeItem(LOCALSTORAGE_TOKEN_KEY);
    setHighlightButton(false);
  };

  const googleSignIn = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      const expiresAt = Date.now() + tokenResponse.expires_in * 1000; // expires_in is in seconds
      onSignIn(tokenResponse.access_token, expiresAt);

      const tokenToStore: StoredToken = {
        token: tokenResponse.access_token,
        expires_at: expiresAt,
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

  /**
   * End of sign in / sign out stuff
   */

  const changeLanguage = async (lng: SupportedLanguage) => {
    await i18n.changeLanguage(lng);
  };

  const setTemporaryError = (
    errorValue: LocalizedError,
    duration: number = 6000
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

  const onPartReceived = (
    newThinkingParts: string[],
    newOutputParts: string[]
  ) => {
    setThinkingParts(newThinkingParts);
    setOutputParts(newOutputParts);
  };
  const clearParts = () => {
    setThinkingParts([]);
    setOutputParts([]);
  };

  const onResultCopied = () => {
    setResultCopied(true);
  };

  const clearResult = () => {
    setResultCopied(false);
    setresultJson(null);
    setresultLink(null);
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

    setError(null);
    setresultLink(null);
    setresultJson(null);
    setResultCopied(false);
    setHighlightButton(false);
    clearParts();

    try {
      setIsAwaitingAIResponse(true);
      const rawJsonResult = await sendAiRequest(
        API_KEY,
        AI_MODEL,
        selectedFiles,
        AI_PROMPT,
        AI_SCHEMA,
        onPartReceived
      );
      setIsAwaitingAIResponse(false);

      const arrayResult = jsonResponseTo2DArray(rawJsonResult, AI_SCHEMA);

      const newFilename = t('fileUpload.defaultCopyName', {
        dateTime: new Date().toLocaleString(),
      });
      setIsAwaitingGapiResponse(true);
      const newSheet = await createNewSheetFromTemplate(
        newFilename,
        BATCH_UPDATE_REQUEST
      );
      if (!newSheet || !newSheet.spreadsheetId) {
        // Error handled by createNewSheetFromTemplate throwing new Error('messages.errorCreatingSpreadsheet')
        return;
      }

      await writeToSpreadsheet(
        newSheet.spreadsheetId,
        arrayResult,
        SHEETS_RANGE
      );
      setIsAwaitingGapiResponse(false);
      if (newSheet.spreadsheetUrl) {
        setresultLink(newSheet.spreadsheetUrl);
        setresultJson(rawJsonResult);
        setSelectedFiles([]);
        window.open(newSheet.spreadsheetUrl);
      }
    } catch (err) {
      console.error('Error during processing:', err);
      let processedError: LocalizedError = null;

      if (err instanceof Error) {
        if (i18n.exists(err.message)) {
          processedError = err.message;
        } else {
          processedError = {
            key: 'messages.errorProcessingGeneric',
            params: { message: err.message },
          };
        }
      } else if (typeof err === 'string' && i18n.exists(err)) {
        processedError = err;
      } else if (typeof err === 'object' && err !== null && 'key' in err) {
        processedError = err as LocalizedError;
      } else {
        processedError = 'messages.errorUnknown';
      }
      setTemporaryError(processedError);
    } finally {
      setIsAwaitingAIResponse(false);
      setIsAwaitingGapiResponse(false);
      clearParts();
    }
  };

  const copyJsonToClipboard = async () => {
    if (!resultJson) {
      setTemporaryError({ key: 'messages.errorNoJsonToCopy' });
      return;
    }
    try {
      await navigator.clipboard.writeText(resultJson);
      onResultCopied();
    } catch (err) {
      console.error('Failed to copy JSON to clipboard:', err);
      setTemporaryError({ key: 'messages.errorCopyJsonFailed' });
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
    if (selectedFiles.length === 0) {
      return (
        <button
          type="button"
          className="btn btn-outline-primary btn-lg"
          onClick={() => {
            if (dropZoneRef.current) {
              dropZoneRef.current.openFileDialog();
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
          isGoogleSignedIn={isGoogleSignedIn}
          onSignInClick={() => googleSignIn()}
          onSignOutClick={googleSignOut}
        />
      </div>

      <main className={styles.mainContentArea}>
        <DropZone
          ref={dropZoneRef}
          selectedFiles={selectedFiles}
          onFilesChange={setSelectedFiles}
          setTemporaryError={setTemporaryError}
        />

        {error && (
          <div
            className={`alert alert-danger ${styles.errorContainer}`}
            role="alert"
          >
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

        {resultLink && (
          <div
            className={`alert alert-success d-flex gap-2 flex-column flex-sm-row align-items-center justify-content-center ${styles.alertSuccess}`}
            role="alert"
          >
            <i className="bi bi-check-circle-fill me-2"></i>
            <div>
              <strong>{t('messages.processingComplete')}</strong>{' '}
              {t('messages.dataProcessed')}
            </div>
            <button
              type="button"
              className="btn btn-outline-success btn-sm"
              onClick={copyJsonToClipboard}
              title={t('messages.copyJsonTooltip')}
            >
              <i
                className={`bi ${resultCopied ? 'bi-check-lg' : 'bi-clipboard-check'} me-1`}
              ></i>
              {t('messages.copyJson')}
            </button>
            <a
              href={resultLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-success btn-sm"
              title={t('messages.openSpreadsheetTooltip')}
            >
              <i className="bi bi-box-arrow-up-right me-1"></i>
              {t('messages.openSpreadsheet')}
            </a>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              onClick={clearResult}
              title={t('messages.clearResultTooltip')}
            >
              <i className={`bi bi-x-circle`}></i>
            </button>
          </div>
        )}

        {isAwaitingAIResponse || isAwaitingGapiResponse ? (
          <ThoughtsPreview
            thinkingParts={thinkingParts}
            outputParts={outputParts}
            isAwaitingAIResponse={isAwaitingAIResponse}
            isAwaitingGapiResponse={isAwaitingGapiResponse}
          />
        ) : (
          <div className={styles.actionButtonWrapper}>{generateButton()}</div>
        )}
      </main>
    </div>
  );
}

export default App;
