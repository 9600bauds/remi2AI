import { useState } from 'react';
import FileUpload from './FileUpload';
import { sendAiRequest } from '../services/aiApiService';
import './App.css';

function App() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesAdd = (newFiles: File[]) => {
    setSelectedFiles((prevFiles) => {
      const updatedFiles = [...prevFiles];
      newFiles.forEach((newFile) => {
        const alreadyExists = prevFiles.some(
          (pf) =>
            pf.name === newFile.name &&
            pf.size === newFile.size &&
            pf.lastModified === newFile.lastModified
        );
        if (!alreadyExists) {
          updatedFiles.push(newFile);
        }
      });
      return updatedFiles;
    });
    setError(null);
  };

  const handleFileRemove = (fileToRemove: File) => {
    setSelectedFiles((prevFiles) =>
      prevFiles.filter((file) => file !== fileToRemove)
    );
    setError(null);
  };

  const handleSubmit = async () => {
    if (selectedFiles.length === 0) {
      setError('Por favor seleccione uno o más archivos.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const prompt = import.meta.env.VITE_PROMPT as string;

    try {
      const response = await sendAiRequest(selectedFiles, prompt);
      console.log('AI API Response:', response);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error desconocido procesando los archivos.');
      }
      console.error('Error procesando archivos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mt-4">
      <header className="text-center mb-4">
        <h1>remi2AI</h1>
        <p className="lead">
          Suba los escaneos de los remitos para digitalizarlos automáticamente.
        </p>
      </header>

      <main>
        <div className="row justify-content-center">
          <div className="col-md-10 col-lg-8">
            <div className="card shadow-sm">
              <FileUpload
                selectedFiles={selectedFiles}
                onFilesAdd={handleFilesAdd}
                onFileRemove={handleFileRemove}
                className="mb-3"
              />
              <div className="d-grid">
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  onClick={handleSubmit}
                  disabled={selectedFiles.length === 0 || isLoading}
                >
                  {isLoading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      <span className="ms-2">Procesando...</span>
                    </>
                  ) : (
                    `Procesar ${selectedFiles.length} Archivo(s)`
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger mt-4" role="alert">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
