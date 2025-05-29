import { useCallback, useState } from 'react';
import { useDropzone, type FileRejection } from 'react-dropzone'; // Import types
import { MAX_FILES, MAX_FILESIZE } from '../utils/constants';

interface FileUploadProps {
  selectedFiles: File[];
  onFilesChange: (files: File[]) => void;
  setTemporaryError: (error: string | null) => void;
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

        // Create a Set of existing file keys for efficient lookup
        const existingFileKeys = new Set(selectedFiles.map(generateFileKey));

        for (const newFile of acceptedFiles) {
          // useDropZone's validation only cares about the files that it's receiving at that moment.
          // We need to do a few more checks, since we also care about the files that have already been uploaded.
          if (existingFileKeys.has(generateFileKey(newFile))) {
            setTemporaryError(
              `El archivo "${newFile.name}" ya ha sido seleccionado.`
            );
            continue;
          }
          if (updatedFiles.length > maxFiles) {
            setTemporaryError(
              `No puedes seleccionar más de ${maxFiles} archivos.`
            );
            continue;
          }

          updatedFiles.push(newFile);
          try {
            const preview = await createImagePreview(newFile);
            const fileKey = generateFileKey(newFile);
            setFilePreviews((prev) => ({ ...prev, [fileKey]: preview }));
          } catch (error) {
            console.error('Error creating preview:', error);
          }
        }

        onFilesChange(updatedFiles);
      })(); // Immediately invoke the async function
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
    noClick: false,
    onDropRejected: (fileRejections: FileRejection[]) => {
      fileRejections.forEach(({ file, errors }) => {
        errors.forEach((err) => {
          if (err.code === 'file-too-large') {
            setTemporaryError(
              `El archivo "${file.name}" es demasiado grande (máx. ${maxSize / 1024 / 1024}MB).`
            );
          } else if (err.code === 'file-invalid-type') {
            setTemporaryError(
              `El archivo "${file.name}" tiene un formato no válido.`
            );
          } else if (err.code === 'too-many-files') {
            setTemporaryError(
              `No puedes seleccionar más de ${maxFiles} archivos.`
            );
          } else {
            setTemporaryError(
              `Error con el archivo "${file.name}": ${err.message}`
            );
          }
        });
      });
    },
  });

  const removeFile = (fileToRemove: File, event: React.MouseEvent) => {
    // Prevent the dropzone click event when removing files
    event.stopPropagation();

    const fileKey = generateFileKey(fileToRemove);
    const updatedFiles = selectedFiles.filter((file) => file !== fileToRemove);
    onFilesChange(updatedFiles);

    setFilePreviews((prev) => {
      const updated = { ...prev };
      delete updated[fileKey];
      return updated;
    });
  };

  return (
    <div
      {...getRootProps()}
      className={`card shadow-sm border-2 mb-4 ${
        isDragActive
          ? 'border-primary bg-primary bg-opacity-10'
          : 'border-secondary-subtle'
      }`}
      style={{
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        minHeight: selectedFiles.length > 0 ? 'auto' : '300px',
      }}
    >
      <input {...getInputProps()} />

      <div className="card-body">
        {/* Drag active overlay */}
        {isDragActive && (
          <div
            className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
            style={{
              zIndex: 10,
              backgroundColor: 'rgba(13, 110, 253, 0.1)',
              backdropFilter: 'blur(2px)',
              borderRadius: 'inherit',
            }}
          >
            <div className="text-center p-4 bg-primary text-white rounded-4 shadow-lg">
              <i className="bi bi-cloud-upload fs-1 mb-3"></i>
              <h4 className="mb-2">Suelta los archivos aquí</h4>
              <p className="mb-0 opacity-75">Para añadir a tu selección</p>
            </div>
          </div>
        )}

        {/* Content based on file state */}
        {selectedFiles.length === 0 ? (
          // Empty state
          <div className="d-flex flex-column align-items-center justify-content-center text-center py-5">
            <i className="bi bi-cloud-upload fs-1 mb-4 text-secondary"></i>
            <h4 className="mb-3 fw-bold">
              Arrastra imágenes aquí o haz clic para seleccionar
            </h4>
            <p className="mb-0 text-muted">
              Formatos: PNG, JPG, JPEG, WebP (máx. 10MB cada una)
              <br />
              Límite: {maxFiles} imágenes
            </p>
          </div>
        ) : (
          // Files selected state
          <>
            {/* Thumbnails Grid */}
            <div className="row g-3 mb-3">
              {selectedFiles.map((file) => {
                const fileKey = generateFileKey(file);
                const preview = filePreviews[fileKey];
                return (
                  <div key={fileKey} className="col-12 col-sm-6 col-lg-4">
                    <div className="position-relative">
                      <div
                        className="thumbnail-container border rounded-3 overflow-hidden bg-light d-flex align-items-center justify-content-center w-100"
                        style={{
                          aspectRatio: '4/3', // Or your desired aspect ratio
                          minHeight: '150px', // Ensures a minimum size
                        }}
                      >
                        {preview ? (
                          <img
                            src={preview}
                            alt={file.name}
                            className="w-100 h-100"
                            style={{
                              objectFit: 'cover',
                              objectPosition: 'top center',
                            }}
                          />
                        ) : (
                          <div className="text-center text-muted">
                            <i className="bi bi-image fs-3 mb-1"></i>
                            <div className="small">Cargando...</div>
                          </div>
                        )}
                      </div>

                      {/* File name overlay */}
                      <div
                        className="position-absolute bottom-0 start-0 end-0 bg-dark bg-opacity-75 text-white p-2"
                        style={{ fontSize: '0.8rem' }}
                      >
                        <div
                          className="text-truncate fw-medium"
                          title={file.name}
                        >
                          {file.name}
                        </div>
                      </div>

                      {/* Remove button */}
                      <button
                        type="button"
                        className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 rounded-circle d-flex align-items-center justify-content-center"
                        onClick={(e) => removeFile(file, e)}
                        aria-label={`Quitar ${file.name}`}
                        style={{ width: '32px', height: '32px' }}
                      >
                        <i className="bi bi-x" style={{ fontSize: '16px' }}></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Add more files prompt - only show if not at max */}
            {selectedFiles.length < maxFiles && (
              <div className="text-center py-3 border-top">
                <div className="d-flex align-items-center justify-content-center text-muted">
                  <i className="bi bi-plus-circle fs-5 me-2"></i>
                  <span>
                    Haz clic en cualquier lugar o arrastra más imágenes para
                    añadir ({maxFiles - selectedFiles.length} restantes)
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
