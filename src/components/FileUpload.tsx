import React, { useState, type ChangeEvent } from 'react';

interface FileUploadProps {
  onFilesSelect: (files: File[]) => void;
  className?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesSelect,
  className,
}) => {
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const filesArray = event.target.files ? Array.from(event.target.files) : [];
    onFilesSelect(filesArray);
    setSelectedFileNames(
      filesArray.length > 0 ? filesArray.map((f) => f.name) : []
    );
  };

  return (
    <div className={`mb-3 ${className || ''}`}>
      <input
        type="file"
        className="form-control"
        id="invoiceFiles"
        accept="image/png, image/jpeg, image/webp"
        multiple
        onChange={handleFileChange}
      />
      {selectedFileNames.length > 0 && (
        <div className="form-text mt-1">
          Seleccionados:
          <ul>
            {selectedFileNames.map((name, index) => (
              <li key={index}>{name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
