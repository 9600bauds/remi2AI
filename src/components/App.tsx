import { useState } from 'react';
import FileUpload from './FileUpload';
import { sendAiRequest } from '../services/aiApiService';
import './App.css';
import type { GenerateContentResponse } from '@google/genai';

function App() {
  // Changed from selectedFile to selectedFiles, and type to File[]
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiResponse, setApiResponse] =
    useState<GenerateContentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Changed prop name and type
  const handleFilesSelect = (files: File[]) => {
    setSelectedFiles(files);
    setApiResponse(null);
    setError(null);
  };

  const handleSubmitInvoice = async () => {
    // Check if selectedFiles array is empty
    if (selectedFiles.length === 0) {
      setError('Por favor seleccione un remito.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setApiResponse(null);

    const prompt = import.meta.env.VITE_PROMPT as string;

    try {
      // Pass the array of files
      const response = await sendAiRequest(selectedFiles, prompt);
      console.log('AI API Response:', response);
      setApiResponse(response);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unknown error occurred.');
      }
      console.error('Error procesando remitos:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <header className="text-center mb-4">
        <h1>remi2AI</h1>
        <p className="lead">
          Por favor suba los escaneos de los remitos para empezar.
        </p>
      </header>

      <main>
        <div className="row justify-content-center">
          <div className="col-md-8 col-lg-6">
            <FileUpload onFilesSelect={handleFilesSelect} className="mb-3" />

            <div className="d-grid gap-2">
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSubmitInvoice}
                disabled={selectedFiles.length === 0 || isLoading} // Check array length
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
                  'Procesar Remitos'
                )}
              </button>
            </div>

            {error && (
              <div className="alert alert-danger mt-3" role="alert">
                <strong>Error:</strong> {error}
              </div>
            )}

            {apiResponse && (
              <div className="mt-4">
                <h2>Respuesta de la API:</h2>
                <pre
                  className="bg-light p-3 rounded"
                  style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
                >
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
