import { useState, useCallback } from "react";

interface UploadResult {
  success: boolean;
  url?: string;
  filename?: string;
  size?: number;
  type?: string;
  error?: string;
}

interface UseFileUploadOptions {
  folder?: string;
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: string) => void;
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<UploadResult> => {
      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        const formData = new FormData();
        formData.append("file", file);
        if (options.folder) {
          formData.append("folder", options.folder);
        }

        // Symulacja progressu (XHR byłby lepszy dla rzeczywistego progressu)
        setProgress(30);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        setProgress(80);

        const result = await response.json();

        if (!response.ok) {
          const errorMessage = result.error || "Błąd podczas uploadu";
          setError(errorMessage);
          options.onError?.(errorMessage);
          return { success: false, error: errorMessage };
        }

        setProgress(100);
        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const errorMessage = "Błąd połączenia podczas uploadu";
        setError(errorMessage);
        options.onError?.(errorMessage);
        return { success: false, error: errorMessage };
      } finally {
        setIsUploading(false);
      }
    },
    [options]
  );

  const deleteFile = useCallback(async (url: string): Promise<boolean> => {
    try {
      // Wyciągnij ścieżkę z URL (usuń /uploads/ prefix)
      const path = url.replace(/^\/uploads\//, "");

      const response = await fetch(`/api/upload/${path}`, {
        method: "DELETE",
      });

      return response.ok;
    } catch {
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setIsUploading(false);
    setProgress(0);
    setError(null);
  }, []);

  return {
    upload,
    deleteFile,
    reset,
    isUploading,
    progress,
    error,
  };
}

