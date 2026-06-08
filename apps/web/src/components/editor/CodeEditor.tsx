import { useRef } from 'react';
import Editor, { type OnChange, type OnMount, type BeforeMount } from '@monaco-editor/react';
import { useEditorStore } from '../../stores/editor.store.js';
import { useUIStore } from '../../stores/ui.store.js';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
  fileId: string;
  initialContent: string;
  onContentChange?: (content: string) => void;
}

export function CodeEditor({ fileId, initialContent, onContentChange }: CodeEditorProps) {
  const updateContent = useEditorStore((s) => s.updateContent);
  const theme = useUIStore((s) => s.theme);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const handleBeforeMount: BeforeMount = (monaco) => {
    const hasLatex = monaco.languages.getLanguages().some((l: { id: string }) => l.id === 'latex');
    if (!hasLatex) {
      monaco.languages.register({ id: 'latex', extensions: ['.tex'], aliases: ['LaTeX', 'latex'] });
      monaco.languages.setMonarchTokensProvider('latex', {
        tokenizer: {
          root: [
            [/%[^\n]*/, 'comment'],
            [/\\[a-zA-Z@]+/, 'keyword'],
            [/{/, 'delimiter.curly'],
            [/}/, 'delimiter.curly'],
            [/\$.*?\$/, 'support.type'],
          ],
        },
      });
    }
  };

  const handleChange: OnChange = (value) => {
    if (value !== undefined) {
      updateContent(fileId, value);
      onContentChange?.(value);
    }
  };

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    const model = editor.getModel();
    if (model && monaco) {
      monaco.editor.setModelLanguage(model, 'latex');
    }

    console.log('=== MONACO DEBUG ===');
    console.log('Monaco loaded:', !!monaco);
    console.log('Editor created:', !!editor);

    console.log('Language ID:', model?.getLanguageId());

    const langs = monaco.languages.getLanguages();
    const latexLang = langs.find((l: any) => l.id === 'latex');
    console.log('LaTeX language registered:', !!latexLang, latexLang);
    console.log('All languages:', langs.map((l: any) => l.id).join(', '));

    setTimeout(() => {
      try {
        const tokens = monaco.editor.tokenize(model?.getValue() || '', 'latex');
        if (tokens.length > 0 && tokens[0]) {
          const sample = tokens[0].slice(0, 20).map((t: any) => `${t.type}:${t.offset}`).join(', ');
          console.log('Token types (first 20):', sample);
        } else {
          console.log('No tokens generated! Language may not be recognized.');
        }
      } catch (e) {
        console.log('tokenize failed:', e);
      }
    }, 500);

    console.log('===================');

    editor.focus();
  };

  const handleValidate = (markers: editor.IMarker[]) => {
    console.log('Markers:', markers.length, markers.map(m => m.message).slice(0, 5));
  };

  return (
    <Editor
      key={fileId}
      height="100%"
      language="latex"
      defaultLanguage="latex"
      path={"file:///document.tex"}
      theme={isDark ? 'vs-dark' : 'vs'}
      value={initialContent}
      beforeMount={handleBeforeMount}
      onChange={handleChange}
      onMount={handleMount}
      onValidate={handleValidate}
      options={{
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        fontLigatures: true,
        lineNumbers: 'on',
        minimap: { enabled: false },
        wordWrap: 'on',
        bracketPairColorization: { enabled: true },
        matchBrackets: 'always',
        autoClosingBrackets: 'always',
        autoClosingQuotes: 'always',
        tabSize: 2,
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        cursorStyle: 'line',
        padding: { top: 12, bottom: 12 },
        scrollBeyondLastLine: false,
        lineHeight: 24,
        folding: true,
        renderLineHighlight: 'line',
        glyphMargin: false,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        guides: { indentation: true, bracketPairs: true },
        scrollbar: {
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
        },
      }}
      loading={
        <div className="flex h-full items-center justify-center text-[12px] text-[var(--text-muted)]">
          Loading Monaco editor from CDN... (this may take a moment)
        </div>
      }
    />
  );
}
