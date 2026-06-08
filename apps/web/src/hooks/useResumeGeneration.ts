import { useState, useCallback } from 'react';
import api from '../lib/api.js';
import type { GenerateResumeRequest } from '@overleaf/shared';

export function useResumeGeneration() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; latex: string } | null>(null);

  const generate = useCallback(async (input: GenerateResumeRequest) => {
    setIsGenerating(true);
    setError(null);
    setResult(null);

    try {
      const { data } = await api.post('/resume/generate', input);
      setResult(data);
      return data;
    } catch (err: any) {
      const message = err?.response?.data?.error?.message || err.message || 'Failed to generate resume';
      setError(message);
      throw err;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const saveAsProject = useCallback(async (resumeId: string, projectName: string) => {
    const { data } = await api.post(`/resume/${resumeId}/save`, { projectName });
    return data.projectId as string;
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { generate, saveAsProject, reset, isGenerating, error, result };
}
