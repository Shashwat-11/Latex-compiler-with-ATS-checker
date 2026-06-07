import { useEffect, useRef } from 'react';
import { useCompilationStore } from '../stores/compilation.store.js';

export function useCompilationSSE(compilationId: string | null) {
  const { setCompiling, setStatus, setPdfUrl, setError, setCompileTime } =
    useCompilationStore();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!compilationId) return;

    // State reset is handled by useCompilation.onMutate — don't reset here

    const es = new EventSource(`/api/v1/projects/compilations/${compilationId}/stream`, {
      withCredentials: true,
    });

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setStatus(data.status);

        if (data.compileTimeMs) setCompileTime(data.compileTimeMs);
        if (data.pdfUrl) setPdfUrl(data.pdfUrl);
        if (data.errorLine) setError(data.errorLine);

        if (['success', 'error', 'cancelled', 'timeout'].includes(data.status)) {
          setCompiling(false);
          es.close();
        }
      } catch {
        // Skip parse errors
      }
    };

    es.onerror = () => {
      setCompiling(false);
      setStatus('error');
      setError('Connection to compilation stream lost');
      es.close();
    };

    eventSourceRef.current = es;

    return () => {
      es.close();
    };
  }, [compilationId]);
}
