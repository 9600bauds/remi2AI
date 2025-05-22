import React, { type ChangeEvent, useId } from 'react'; // Import useId for unique IDs

interface FileUploadProps {
  selectedFiles: File[];
  onFilesAdd: (newFiles: File[]) => void;
  onFileRemove: (fileToRemove: File) => void;
  className?: string;
  // inputId?: string; // We can use useId hook for more robust unique IDs
}

const FileUpload: React.FC<FileUploadProps> = ({
  selectedFiles,
  onFilesAdd,
  onFileRemove,
  className,
}) => {
  const inputId = useId(); // Generate a unique ID for the input and label

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const filesArray = event.target.files ? Array.from(event.target.files) : [];
    if (filesArray.length > 0) {
      onFilesAdd(filesArray);
    }
    // Reset the input value to allow selecting the same file again if it was removed
    event.target.value = '';
  };

  return (
    <div className={`${className || ''}`}>
      {/* Styled label acting as a button */}
      <label htmlFor={inputId} className="btn btn-outline-primary mb-2">
        {selectedFiles.length > 0
          ? 'Añadir más archivos...'
          : 'Seleccionar archivos...'}
      </label>

      {/* Visually hidden file input */}
      <input
        type="file"
        className="d-none" // Bootstrap class to hide the element
        id={inputId}
        accept="image/png, image/jpeg, image/webp"
        multiple
        onChange={handleFileChange}
      />

      {/* Display selected files */}
      {selectedFiles.length > 0 && (
        <div className="mt-2">
          <h6>Archivos Seleccionados:</h6>
          <ul className="list-group">
            {selectedFiles.map((file) => (
              <li
                key={`${file.name}-${file.lastModified}-${file.size}`}
                className="list-group-item d-flex justify-content-between align-items-center py-2"
              >
                <small className="text-truncate d-block" title={file.name}>
                  {file.name} ({(file.size / 1024).toFixed(2)} KB)
                </small>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => onFileRemove(file)}
                  aria-label={`Quitar ${file.name}`}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
