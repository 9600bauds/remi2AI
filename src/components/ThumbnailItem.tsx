// src/components/ThumbnailItem.tsx
import React from 'react';
import styles from './FileUpload.module.css';

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
  return (
    <div
      className="col-12 col-sm-6 col-lg-4"
      id={`thumbnail-item-${index}`} // Use index for unique ID part
    >
      <div className="position-relative h-100">
        {' '}
        <div
          className="ratio ratio-4x3 thumbnail-container border rounded-3 overflow-hidden bg-light d-flex align-items-center justify-content-center w-100 h-100"
          id={`thumbnail-image-container-${index}`}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={file.name}
              className={`w-100 h-100 ${styles.thumbnailImage}`}
              id={`thumbnail-image-${index}`}
              loading="lazy"
            />
          ) : (
            <div className="text-center text-muted p-3">
              {' '}
              <i className="bi bi-image fs-3 mb-1"></i>
              <div className="small">Cargando...</div>
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
          aria-label={`Quitar ${file.name}`}
          title={`Quitar ${file.name}`}
        >
          <i className={`bi bi-x ${styles.removeButtonIcon}`}></i>{' '}
        </button>
      </div>
    </div>
  );
};

export default ThumbnailItem;
