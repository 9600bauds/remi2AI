// src/components/ThumbnailItem.tsx
import React from 'react';
import styles from './FileUpload.module.css';
import { useTranslation } from 'react-i18next';

interface ThumbnailItemProps {
  file: File;
  previewUrl?: string;
  onRemove: (file: File, event: React.MouseEvent) => void;
  index: number;
}

const ThumbnailItem: React.FC<ThumbnailItemProps> = ({
  file,
  previewUrl,
  onRemove,
  index,
}) => {
  const { t } = useTranslation();

  return (
    <div
      className={styles.thumbnailItem}
      id={`thumbnail-item-${index}`} // Use index for unique ID part
    >
      <div
        className={`${styles.thumbnailImageContainer} border rounded-3 bg-light`}
        id={`thumbnail-image-container-${index}`}
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={t('thumbnailItem.altText', { fileName: file.name })}
            className={`w-100 h-100 ${styles.thumbnailImage}`}
            id={`thumbnail-image-${index}`}
            loading="lazy"
          />
        ) : (
          <div className="text-center text-muted p-3">
            {' '}
            <i className="bi bi-image fs-3 mb-1"></i>
            <div className="small">{t('loading')}</div>
          </div>
        )}
      </div>
      <div
        id={`thumbnail-filename-overlay-${index}`}
        className={`position-absolute bottom-0 start-0 end-0 bg-dark bg-opacity-75 text-white p-2 ${styles.thumbnailFilenameOverlay}`}
      >
        <div className="text-truncate fw-medium" title={file.name}>
          {file.name}
        </div>
      </div>
      <button
        id={`thumbnail-remove-button-${index}`}
        type="button"
        className={`btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle d-flex align-items-center justify-content-center ${styles.removeButton}`}
        onClick={(e) => onRemove(file, e)}
        aria-label={t('fileUpload.removeFile', { fileName: file.name })}
        title={t('fileUpload.removeFile', { fileName: file.name })}
      >
        <i className={`bi bi-x ${styles.removeButtonIcon}`}></i>{' '}
      </button>
    </div>
  );
};

export default ThumbnailItem;
