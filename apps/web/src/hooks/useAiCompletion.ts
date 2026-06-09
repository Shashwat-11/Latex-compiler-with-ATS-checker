import { useState, useRef, useCallback } from 'react';
import api from '../lib/api.js';

interface UseAiCompletionOptions {
  projectId: string;
  debounceMs?: number;
  geminiApiKey?: string;
}

export function useAiCompletion({ projectId, debounceMs = 500, geminiApiKey }: UseAiCompletionOptions) {
  const [completions, setCompletions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentPrefixRef = useRef<string>('');

  const fetchCompletion = useCallback(async (prefix: string, suffix: string) => {
    if (!prefix.trim()) {
      setCompletions([]);
      return;
    }

    setIsLoading(true);
    try {
      const config = geminiApiKey ? { headers: { 'X-Gemini-Key': geminiApiKey } } : {};
      const { data } = await api.post(`/projects/${projectId}/completions`, {
        prefix,
        suffix,
        language: 'latex',
      }, config);
      setCompletions(data.completions || []);
    } catch {
      setCompletions([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  const requestCompletion = useCallback((prefix: string, suffix: string) => {
    currentPrefixRef.current = prefix;

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      fetchCompletion(prefix, suffix);
    }, debounceMs);
  }, [fetchCompletion, debounceMs]);

  const clearCompletions = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    setCompletions([]);
    currentPrefixRef.current = '';
  }, []);

  return {
    completions,
    isLoading,
    requestCompletion,
    clearCompletions,
  };
}
