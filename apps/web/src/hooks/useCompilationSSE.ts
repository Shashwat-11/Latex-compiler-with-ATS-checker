import { useEffect, useRef } from 'react';
import { useCompilationStore } from '../stores/compilation.store.js';

const QUEUED_TIMEOUT_MS = 60_000;

export function useCompilationSSE(compilationId: string | null) {
  const { setCompiling, setStatus, setPdfUrl, setError, setCompileTime } =
    useCompilationStore();
  const eventSourceRef = useRef<EventSource | null>(null);
  const queuedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!compilationId) return;

    // Clear any stale queued timer
    if (queuedTimerRef.current) clearTimeout(queuedTimerRef.current);

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

        // Reset queued timeout on any progress
        if (queuedTimerRef.current) { clearTimeout(queuedTimerRef.current); queuedTimerRef.current = null; }

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

    // Fail-safe: if stuck on queued for 60s, mark as error
    queuedTimerRef.current = setTimeout(() => {
      setCompiling(false);
      setStatus('error');
      setError('Compilation timed out — please retry');
      es.close();
    }, QUEUED_TIMEOUT_MS);

    eventSourceRef.current = es;

    return () => {
      es.close();
      if (queuedTimerRef.current) { clearTimeout(queuedTimerRef.current); }
    };
  }, [compilationId]);
}
