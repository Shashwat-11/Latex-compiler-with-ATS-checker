import { useEffect, useRef, useCallback } from 'react';
import { useUpdateFile } from './useFiles.js';

/**
 * Debounced auto-save — saves file content to backend 1.5s after last edit.
 * Returns { isSaving, saveNow } for manual save and status display.
 */
export function useAutoSave(
  projectId: string | undefined,
  fileId: string | null,
  content: string | undefined,
) {
  const updateFile = useUpdateFile();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedRef = useRef<string | undefined>(content);

  // Track initial content as "already saved"
  useEffect(() => {
    savedRef.current = content;
  }, [fileId]); // reset when switching files

  const doSave = useCallback(() => {
    if (!projectId || !fileId || content === undefined) return;
    if (content === savedRef.current) return; // no changes

    updateFile.mutate(
      { projectId, fileId, content },
      {
        onSuccess: (result) => {
          // Update savedRef only after successful save
          if (result) savedRef.current = content;
        },
        onError: () => {
          // Don't update savedRef on error — keep as dirty
        },
      },
    );
  }, [projectId, fileId, content, updateFile]);

  // Debounced auto-save on content change
  useEffect(() => {
    if (!projectId || !fileId || content === undefined) return;
    if (content === savedRef.current) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(doSave, 1500);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [content, projectId, fileId, doSave]);

  // Ctrl+S / Cmd+S handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
        doSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [doSave]);

  return {
    isSaving: updateFile.isPending,
    isDirty: content !== savedRef.current && content !== undefined,
    saveNow: doSave,
  };
}
