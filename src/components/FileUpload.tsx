// src/components/FileUpload.tsx
import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { useTranslation } from 'react-i18next'; // Import useTranslation
import { MAX_FILES, MAX_FILESIZE } from '../utils/constants';
import styles from './FileUpload.module.css';
import ThumbnailItem from './ThumbnailItem'; // Assuming ThumbnailItem is also updated or doesn't have text
import type { LocalizedError } from '../types/LocalizedError';

interface FileUploadProps {
  selectedFiles: File[];
  onFilesChange: (files: File[]) => void;
  setTemporaryError: (errorValue: LocalizedError, duration?: number) => void;
  maxFiles?: number;
  maxSize?: number;
}

const FileUpload: React.FC<FileUploadProps> = ({
  selectedFiles,
  onFilesChange,
  setTemporaryError,
  maxFiles = MAX_FILES,
  maxSize = MAX_FILESIZE,
}) => {
  const { t } = useTranslation(); // Initialize the t function
  const [filePreviews, setFilePreviews] = useState<{ [key: string]: string }>(
    {}
  );

  const generateFileKey = (file: File): string => {
    return `${file.name}-${file.lastModified}-${file.size}`;
  };

  const createImagePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    });
  };

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      void (async () => {
        const updatedFiles = [...selectedFiles];
        const existingFileKeys = new Set(selectedFiles.map(generateFileKey));

        for (const newFile of acceptedFiles) {
          const currentFileKey = generateFileKey(newFile);
          if (existingFileKeys.has(currentFileKey)) {
            setTemporaryError({
              key: 'fileUpload.errorAlreadySelected',
              params: { fileName: newFile.name },
            });
            continue;
          }
          if (updatedFiles.length >= maxFiles) {
            setTemporaryError({
              key: 'fileUpload.errorTooManyFiles',
              params: { maxFiles: maxFiles },
            });
            break;
          }

          updatedFiles.push(newFile);
          existingFileKeys.add(currentFileKey);
          try {
            const preview = await createImagePreview(newFile);
            setFilePreviews((prev) => ({ ...prev, [currentFileKey]: preview }));
          } catch (error) {
            console.error('Error creating preview:', error);
          }
        }
        onFilesChange(updatedFiles);
      })();
    },
    [selectedFiles, onFilesChange, setTemporaryError, maxFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
    },
    multiple: true,
    maxFiles,
    maxSize,
    noClick: false, // Keep true if you want to trigger file dialog only from a separate button
    onDropRejected: (fileRejections: FileRejection[]) => {
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach((err) => {
          const params = {
            fileName: file.name,
            maxSizeMB: (maxSize / 1024 / 1024).toFixed(1), // Format for display
            maxFiles: maxFiles,
          };
          if (err.code === 'file-too-large') {
            setTemporaryError({
              key: 'fileUpload.errorFileTooLarge',
              params,
            });
          } else if (err.code === 'file-invalid-type') {
            setTemporaryError({
              key: 'fileUpload.errorInvalidType',
              params,
            });
          } else if (err.code === 'too-many-files') {
            setTemporaryError({
              key: 'fileUpload.errorTooManyFiles',
              params,
            });
          } else {
            setTemporaryError({
              key: 'fileUpload.errorGeneric',
              params: {
                fileName: file.name,
                message: err.message,
              },
            });
          }
        });
      });
    },
  });

  const handleRemoveFile = (fileToRemove: File, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent dropzone click

    const fileKey = generateFileKey(fileToRemove);
    const updatedFiles = selectedFiles.filter(
      (file) => generateFileKey(file) !== fileKey
    );
    onFilesChange(updatedFiles);

    setFilePreviews((prev) => {
      const updated = { ...prev };
      delete updated[fileKey]; // Remove preview
      // URL.revokeObjectURL(previewUrl) if you were using createObjectURL
      return updated;
    });
  };

  const remainingSlots = maxFiles - selectedFiles.length;

  return (
    <div
      {...getRootProps()}
      id="file-dropzone-container"
      className={`
        card shadow-sm border-2 mb-4
        ${styles.dropzoneContainer}
        ${isDragActive ? `border-primary bg-primary bg-opacity-10 ${styles.dropzoneContainerActive}` : 'border-secondary-subtle'}
      `}
    >
      <input {...getInputProps({ id: 'file-input-element' })} />
      <div className="card-body" id="file-dropzone-card-body">
        {isDragActive && (
          <div
            id="drag-active-overlay"
            className={`position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center rounded-4 ${styles.dragActiveOverlay}`}
          >
            <div className="text-center p-4 bg-primary text-white rounded-4 shadow-lg">
              <i className="bi bi-cloud-upload fs-1 mb-3"></i>
              <h4 className="mb-2">{t('fileUpload.dropFilesHere')}</h4>
              <p className="mb-0 opacity-75">
                {t('fileUpload.toAddToSelection')}
              </p>
            </div>
          </div>
        )}
        {selectedFiles.length === 0 ? (
          <div
            id="dropzone-empty-state"
            className="d-flex flex-column align-items-center justify-content-center text-center py-5"
          >
            <i className="bi bi-cloud-upload fs-1 mb-4 text-secondary"></i>
            <h4 className="mb-3 fw-bold">{t('fileUpload.dragOrClick')}</h4>
            <p className="mb-0 text-muted">
              {t('fileUpload.formats', {
                maxSizeMB: (maxSize / 1024 / 1024).toFixed(1),
              })}
              <br />
              {t('fileUpload.limit', { maxFiles: maxFiles })}
            </p>
          </div>
        ) : (
          <>
            <div className="row g-3 mb-3" id="thumbnail-grid">
              {selectedFiles.map((file, index) => {
                const fileKey = generateFileKey(file);
                return (
                  <ThumbnailItem
                    key={fileKey}
                    file={file}
                    previewUrl={filePreviews[fileKey]}
                    onRemove={handleRemoveFile}
                    index={index}
                  />
                );
              })}
            </div>

            {selectedFiles.length < maxFiles && (
              <div
                className="text-center py-3 border-top"
                id="add-more-files-prompt"
              >
                <div className="d-flex align-items-center justify-content-center text-muted">
                  <i className="bi bi-plus-circle fs-5 me-2"></i>
                  <span>
                    {t('fileUpload.addMore', { count: remainingSlots })}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FileUpload;
