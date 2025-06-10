import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import styles from './Result.module.css';
import type { LocalizedError } from '../types/LocalizedError';

interface ResultProps {
  thoughts: string | null;
  resultJson: string | null;
  resultLink: string | null;
  resultCopied: boolean;
  onResultCopied: () => void;
  setTemporaryError: (errorValue: LocalizedError, duration?: number) => void;
  clearResult: () => void;
}

const Result: React.FC<ResultProps> = ({
  thoughts,
  resultJson,
  resultLink,
  resultCopied,
  onResultCopied,
  setTemporaryError,
  clearResult,
}) => {
  const { t } = useTranslation();

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

  if (resultLink) {
    <div className={styles.resultContainer}>
      <i className="bi bi-robot me-2 fs-4 text-primary"></i>
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
        className="btn btn-outline-success btn-sm"
        onClick={clearResult}
        title={t('messages.copyJsonTooltip')}
      >
        <i className={`bi bi-x-circle`}></i>
      </button>
    </div>;
  }

  return (
    <div className={styles.resultContainer}>
      <i className="bi bi-robot me-2 fs-4 text-primary"></i>

      <span
        className="spinner-border spinner-border-sm"
        role="status"
        aria-hidden="true"
      />
      <div className={styles.thoughtTextArea}>
        <ReactMarkdown>{thoughts}</ReactMarkdown>
      </div>
    </div>
  );
};

export default Result;
