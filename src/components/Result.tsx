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

  return (
    <div className={styles.resultContainer}>
      <div className={styles.robotIcon}>
        <i className="bi bi-robot me-0 fs-4 text-primary"></i>
      </div>
      <div className={styles.speechBubble}>
        <span
          className="spinner-border spinner-border-sm text-primary"
          role="status"
          aria-hidden="true"
        />
        <div className={styles.thoughtTextArea}>
          <ReactMarkdown>{thoughts}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default Result;
