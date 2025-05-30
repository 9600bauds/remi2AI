// src/components/FileUpload.tsx
import { useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { MAX_FILES, MAX_FILESIZE } from '../utils/constants';
import styles from './FileUpload.module.css';
import ThumbnailItem from './ThumbnailItem';
import type { LocalizedError } from '../types/LocalizedError';

interface FileUploadProps {
  selectedFiles: File[];
  onFilesChange: (files: File[]) => void;
  setTemporaryError: (errorValue: LocalizedError, duration?: number) => void;
  maxFiles?: number;
  maxSize?: number;
}

export interface FileUploadHandles {
  openFileDialog: () => void;
}

const FileUpload = forwardRef<FileUploadHandles, FileUploadProps>(
  (
    {
      selectedFiles,
      onFilesChange,
      setTemporaryError,
      maxFiles = MAX_FILES,
      maxSize = MAX_FILESIZE,
    },
    ref
  ) => {
    const { t } = useTranslation();
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
              setFilePreviews((prev) => ({
                ...prev,
                [currentFileKey]: preview,
              }));
            } catch (error) {
              console.error('Error creating preview:', error);
            }
          }
          onFilesChange(updatedFiles);
        })();
      },
      [selectedFiles, onFilesChange, setTemporaryError, maxFiles]
    );

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
      onDrop,
      accept: {
        'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      },
      multiple: true,
      maxFiles,
      maxSize,
      noClick: false,
      onDropRejected: (fileRejections: FileRejection[]) => {
        fileRejections.forEach(({ file, errors }) => {
          errors.forEach((err) => {
            const params = {
              fileName: file.name,
              maxSizeMB: (maxSize / 1024 / 1024).toFixed(1),
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

    useImperativeHandle(
      ref,
      () => ({
        openFileDialog: () => {
          if (open) {
            open();
          } else {
            console.warn(
              'FileUpload: react-dropzone open function not available.'
            );
          }
        },
      }),
      [open]
    );

    const handleRemoveFile = (fileToRemove: File, event: React.MouseEvent) => {
      event.stopPropagation();

      const fileKey = generateFileKey(fileToRemove);
      const updatedFiles = selectedFiles.filter(
        (file) => generateFileKey(file) !== fileKey
      );
      onFilesChange(updatedFiles);

      setFilePreviews((prev) => {
        const updated = { ...prev };
        delete updated[fileKey];
        return updated;
      });
    };

    const remainingSlots = maxFiles - selectedFiles.length;

    return (
      <div
        {...getRootProps()}
        id="fileUploadWrapper"
        className={`
        card shadow-sm border-2 
        ${styles.dropzoneContainer}
        ${isDragActive ? `border-primary bg-primary bg-opacity-10` : 'border-secondary-subtle'}
      `}
      >
        <input {...getInputProps({ id: 'file-input-element' })} />
        {isDragActive && (
          <div id="drag-active-overlay" className={styles.dragActiveOverlay}>
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
          <div id="dropzone-empty-state" className={styles.emptyState}>
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
          <div id="dropzone-full-state" className={styles.fullState}>
            <div id={styles.thumbnailGrid} className={styles.thumbnailGrid}>
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
                className={styles.addMoreFilesPrompt}
                id="add-more-files-prompt"
              >
                <div className={styles.addMoreFilesContent}>
                  <i className="bi bi-plus-circle me-2"></i>
                  <span>
                    {t('fileUpload.addMore', { count: remainingSlots })}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

FileUpload.displayName = 'FileUpload';
export default FileUpload;
