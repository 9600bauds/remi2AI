import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import styles from './ThoughtsPreview.module.css';

interface ThoughtsPreviewProps {
  thinkingParts: string[];
  outputParts: string[];
}

const ThoughtsPreview: React.FC<ThoughtsPreviewProps> = ({
  thinkingParts,
  outputParts,
}) => {
  const { t } = useTranslation();

  let title: string | null = null;
  let text: string | null = null;
  let extraClassName = '';
  if (outputParts.length) {
    text = outputParts.join('');
    title = t('messages.creatingOutput');
    extraClassName = styles.json;
  } else if (thinkingParts.length) {
    const lastThought = thinkingParts[thinkingParts.length - 1];
    const withoutEmptyLines = lastThought.replace(/(^[ \t]*\n)/gm, '');
    text = withoutEmptyLines;
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
          {title && <h6 id={styles.bubbleTitle}>{title}</h6>}
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
