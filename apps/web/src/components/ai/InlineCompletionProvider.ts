import type { editor, IDisposable } from 'monaco-editor';

interface CompletionContext {
  projectId: string;
  getAuthHeaders: () => Record<string, string>;
}

interface InlineCompletion {
  text: string;
  range: {
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
  };
}

export function registerInlineCompletionProvider(
  monacoEditor: editor.IStandaloneCodeEditor,
  context: CompletionContext,
): IDisposable {
  const provider = monacoEditor.getModel()?.uri;
  if (!provider) {
    return { dispose: () => {} };
  }

  // Debounce timer
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let currentRequestId = 0;

  const handleCursorActivity = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
      const model = monacoEditor.getModel();
      const position = monacoEditor.getPosition();
      if (!model || !position) return;

      const offset = model.getOffsetAt(position);
      const fullText = model.getValue();

      // Get prefix (text before cursor) and suffix (text after cursor)
      const prefix = fullText.slice(0, offset);
      const suffix = fullText.slice(offset);

      // Only trigger if there's enough context
      if (prefix.length < 3) return;

      const requestId = ++currentRequestId;

      try {
        const response = await fetch(`/api/v1/projects/${context.projectId}/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...context.getAuthHeaders(),
          },
          credentials: 'include',
          body: JSON.stringify({ prefix, suffix, language: 'latex' }),
        });

        if (!response.ok || requestId !== currentRequestId) return;

        const data = await response.json();
        const completions: string[] = data.completions || [];

        if (completions.length === 0) return;

        // Show the first completion as ghost text
        const suggestion = completions[0] ?? '';
        if (!suggestion.trim()) return;

        // Apply the suggestion as an edit
        monacoEditor.executeEdits('ai-completion', [
          {
            range: {
              startLineNumber: position.lineNumber,
              startColumn: position.column,
              endLineNumber: position.lineNumber,
              endColumn: position.column,
            },
            text: suggestion,
            forceMoveMarkers: true,
          },
        ]);

        // Store the suggestion for potential undo
        const suggestionStartOffset = offset;

        // Listen for Tab key to accept or typing to dismiss
        const disposable = monacoEditor.onKeyDown((e) => {
          if (e.keyCode === 9) {
            // Tab → accept (already applied above)
            e.preventDefault();
            disposable.dispose();
          } else if (e.keyCode !== 0) {
            // Any other key → remove the suggestion
            const currentOffset = model.getOffsetAt(monacoEditor.getPosition()!);
            if (currentOffset <= suggestionStartOffset) {
              // User typed something else, remove ghost text
              monacoEditor.executeEdits('ai-completion-dismiss', [
                {
                  range: {
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: monacoEditor.getPosition()!.lineNumber,
                    endColumn: monacoEditor.getPosition()!.column + 1,
                  },
                  text: '',
                  forceMoveMarkers: true,
                },
              ]);
            }
            disposable.dispose();
          }
        });

      } catch {
        // Silently fail — completions are optional
      }
    }, 400); // 400ms debounce
  };

  // Listen for cursor activity
  const cursorDisposable = monacoEditor.onDidChangeCursorPosition(handleCursorActivity);
  const contentDisposable = monacoEditor.onDidChangeModelContent(handleCursorActivity);

  return {
    dispose: () => {
      cursorDisposable.dispose();
      contentDisposable.dispose();
      if (debounceTimer) clearTimeout(debounceTimer);
    },
  };
}
