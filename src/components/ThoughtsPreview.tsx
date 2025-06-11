import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import styles from './ThoughtsPreview.module.css';

interface ThoughtsPreviewProps {
  thinkingParts: string[];
  outputParts: string[];
  isAwaitingAIResponse: boolean;
  isAwaitingGapiResponse: boolean;
}

const ThoughtsPreview: React.FC<ThoughtsPreviewProps> = ({
  thinkingParts,
  outputParts,
  isAwaitingAIResponse,
  isAwaitingGapiResponse,
}) => {
  const { t } = useTranslation();

  let title: string | null = null;
  let text: string | null = null;
  let extraClassName = '';
  if (outputParts.length) {
    text = outputParts.join('');
    text = text
      // eslint-disable-next-line no-useless-escape
      .replace(/([\{\}\[\],:])\s+/g, '$1') // Remove whitespace after structural chars
      // eslint-disable-next-line no-useless-escape
      .replace(/\s+([\{\}\[\],:])/g, '$1') // Remove whitespace before structural chars
      .trim();
    extraClassName = styles.json;
    if (isAwaitingAIResponse) {
      title = t('messages.creatingOutput');
    } else if (isAwaitingGapiResponse) {
      title = t('messages.creatingSheet');
    }
  } else if (thinkingParts.length) {
    const lastThought = thinkingParts[thinkingParts.length - 1];

    const lines = lastThought.split('\n').filter((line) => line.trim() !== '');
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      const firstLineIsTitle =
        firstLine.startsWith('**') && firstLine.endsWith('**');
      if (firstLineIsTitle) {
        title = firstLine.replace(/\*\*/gm, ''); /* Remove the title markdown */
        text = lines.slice(1).join('\n');
      } else {
        text = lines.join('\n');
      }
    }
  } else {
    title = t('messages.awaitingThinkingTokens');
  }

  return (
    <div id={styles.thoughtsContainer}>
      <div id={styles.robotIcon}>
        <i className="bi bi-robot me-0 fs-4 text-primary"></i>
      </div>
      <div id={styles.speechBubble}>
        <span
          className="spinner-border spinner-border-sm text-primary flex-shrink-0"
          role="status"
          aria-hidden="true"
        />
        <div id={styles.bubbleContentWrapper}>
          {title && (
            <h6 id={styles.bubbleTitle}>
              <ReactMarkdown>{title}</ReactMarkdown>
            </h6>
          )}
          {title && text && <hr className="mt-0 mb-1" />}
          {text && (
            <div id={styles.bubbleText} className={extraClassName}>
              <div className={styles.scrollableReverse}>
                <div>
                  <ReactMarkdown>{text}</ReactMarkdown>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ThoughtsPreview;
