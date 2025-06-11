import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import styles from './ThoughtsPreview.module.css';
import type { LocalizedError } from '../types/LocalizedError';

interface ThoughtsPreviewProps {
  thinkingParts: string[],
  outputParts: string[]
}

const ThoughtsPreview: React.FC<ThoughtsPreviewProps> = ({
  thinkingParts, outputParts
}) => {
  const { t } = useTranslation();

  
  let text: string;
  if(!thinkingParts.length && !outputParts.length){
    text = t('messages.awaitingThinkingTokens')
  } else if(!outputParts.length){
    const lastThought = thinkingParts[thinkingParts.length-1]
    const withoutEmptyLines = lastThought.replace(/(^[ \t]*\n)/gm, "")
    text = withoutEmptyLines;
  } else {
    text = outputParts.join('')
  }

  return (
    <div className={styles.thoughtsContainer}>
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
          <ReactMarkdown>{text}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export default ThoughtsPreview;
