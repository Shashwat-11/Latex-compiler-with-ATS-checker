import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, X, Loader2, StopCircle, MessageSquare, Sparkles, CheckCircle, FileEdit, Key } from 'lucide-react';
import { useAiChat } from '../../hooks/useAiChat.js';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import { useEditorStore } from '../../stores/editor.store.js';
import { useUIStore } from '../../stores/ui.store.js';
import type { ChatMessage } from '../../hooks/useAiChat.js';

interface FileAction {
  type: 'create' | 'edit';
  filename: string;
  content: string;
}

interface Props {
  projectId: string;
  currentFileId?: string;
  currentSelection?: string;
  isOpen: boolean;
  onToggle: () => void;
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  const isStreaming = message.id.startsWith('assistant-') && message.content === '';

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
        isUser ? 'bg-[var(--accent)]' : 'bg-[var(--bg-overlay)]'
      }`}>
        {isUser ? <User className="h-3.5 w-3.5 text-white" /> : <Bot className="h-3.5 w-3.5 text-[var(--text-secondary)]" />}
      </div>
      <div className={`max-w-[85%] rounded-[var(--radius-sm)] px-3 py-2 text-[13px] leading-relaxed ${
        isUser
          ? 'bg-[var(--accent)] text-white'
          : 'bg-[var(--bg-elevated)] border border-[var(--border-default)] text-[var(--text-primary)]'
      }`}>
        {isStreaming ? (
          <span className="inline-flex items-center gap-1.5 text-[var(--text-tertiary)]">
            <Loader2 className="h-3 w-3 animate-spin" /> Thinking...
          </span>
        ) : (
          <div className="whitespace-pre-wrap break-words">
            {message.content || (message.role === 'assistant' ? 'No response' : '')}
          </div>
        )}
      </div>
    </div>
  );
}

function parseFileActions(content: string): FileAction[] {
  const actions: FileAction[] = [];
  const regex = /\[(CREATE_FILE|EDIT_FILE):\s*([^\]]+)\]\s*```latex?\s*([\s\S]*?)```/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    actions.push({
      type: match[1] === 'CREATE_FILE' ? 'create' : 'edit',
      filename: match[2]!.trim(),
      content: match[3]!.trim(),
    });
  }
  return actions;
}

export function CopilotSidebar({ projectId, currentFileId, currentSelection, isOpen, onToggle }: Props) {
  const [input, setInput] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInputValue, setKeyInputValue] = useState('');
  const [fileChanges, setFileChanges] = useState<Array<{ file: string; type: string; status: 'pending' | 'done' | 'error'; time: Date }>>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedMessages = useRef<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const geminiApiKey = useUIStore((s) => s.geminiApiKey);
  const setGeminiApiKey = useUIStore((s) => s.setGeminiApiKey);
  const { messages, isLoading, error, sendMessage, stopGeneration, clearMessages, loadHistory } = useAiChat({ projectId, geminiApiKey: geminiApiKey || undefined });

  // Track which file actions we've already executed (by filename) to avoid duplicates
  const executedActions = useRef<Set<string>>(new Set());

  // Execute file actions from assistant messages — when streaming is done
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg || lastMsg.role !== 'assistant' || lastMsg.id.startsWith('temp-')) return;
    // Only process when streaming is complete (no longer loading) or there's an error
    if (isLoading) return;
    if (!lastMsg.content.includes('[CREATE_FILE') && !lastMsg.content.includes('[EDIT_FILE')) return;

    const actions = parseFileActions(lastMsg.content);
    if (actions.length === 0) return;

    for (const action of actions) {
      const actionKey = `${action.type}:${action.filename}`;
      // Skip if we already executed this exact action
      if (executedActions.current.has(actionKey)) continue;
      executedActions.current.add(actionKey);

      setFileChanges((prev) => [...prev, { file: action.filename, type: action.type, status: 'pending', time: new Date() }]);

      (async () => {
        try {
          const editorStore = useEditorStore.getState();
          let fileId: string | null = null;

          if (action.type === 'create') {
            const res = await api.post(`/projects/${projectId}/files`, {
              name: action.filename,
              type: 'file',
              content: action.content,
            });
            // Try to get file ID from response (different shapes from different APIs)
            fileId = res.data?.id || res.data?.file?.id || null;
            // Open the new file in the editor with refresh bump
            if (fileId) {
              editorStore.setExternalContent(fileId, action.content);
              editorStore.openFile(fileId, action.filename, action.content);
            }
          } else {
            // Find file by name to get its ID
            const { data } = await api.get(`/projects/${projectId}/files`);
            const files = data?.files || data?.data || data || [];
            const targetFile = Array.isArray(files) ? files.find((f: any) => f.name === action.filename) : null;

            if (targetFile) {
              fileId = targetFile.id;
              await api.patch(`/projects/${projectId}/files/${fileId}`, {
                content: action.content,
              });
            } else {
              // File doesn't exist yet, create it
              const res = await api.post(`/projects/${projectId}/files`, {
                name: action.filename,
                type: 'file',
                content: action.content,
              });
              fileId = res.data?.id || res.data?.file?.id || null;
            }

            // Update the editor content — use setExternalContent to bump
            // the refreshCounter so the CodeEditor re-mounts with new content
            if (fileId) {
              editorStore.setExternalContent(fileId, action.content);
              if (!editorStore.openTabs.find((t) => t.fileId === fileId)) {
                editorStore.openFile(fileId, action.filename, action.content);
              }
            }
          }

          setFileChanges((prev) => {
            const next = [...prev];
            const idx = next.findIndex((f) => f.file === action.filename && f.status === 'pending');
            if (idx >= 0) next[idx] = { ...next[idx]!, status: 'done' };
            return next;
          });
          // Invalidate file tree query to refresh the file explorer
          queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'files'] });
          // Force a refetch of the file content query if cached
          if (fileId) {
            queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'files', fileId] });
          }
        } catch (err: any) {
          const errMsg = err?.response?.data?.error?.message || err.message;
          setFileChanges((prev) => {
            const next = [...prev];
            const idx = next.findIndex((f) => f.file === action.filename && f.status === 'pending');
            if (idx >= 0) next[idx] = { ...next[idx]!, status: 'error' };
            return next;
          });
        }
      })();
    }
  }, [messages, projectId, queryClient]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, fileChanges]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSubmit = () => {
    const msg = input.trim();
    if (!msg || isLoading) return;
    setInput('');
    sendMessage(msg, currentFileId, currentSelection);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="flex flex-col h-full border-l border-[var(--border-default)] bg-[var(--bg)]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border-default)] shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-[var(--accent)]" />
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">AI Copilot</span>
          {!geminiApiKey && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--warning-muted)] text-[var(--warning)]">No API key</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className="rounded-[var(--radius-sm)] p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-all"
            title="Configure API key"
          >
            <Key className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={clearMessages}
            className="rounded-[var(--radius-sm)] p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-all"
            title="Clear conversation"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onToggle}
            className="rounded-[var(--radius-sm)] p-1 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-all"
            title="Close"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* API Key Input */}
      {showKeyInput && (
        <div className="shrink-0 px-3 py-2 border-b border-[var(--border-muted)] bg-[var(--bg-overlay)]">
          <label className="block text-[11px] font-medium text-[var(--text-secondary)] mb-1">
            Gemini API Key
          </label>
          <div className="flex gap-1.5">
            <input
              type="password"
              value={keyInputValue || geminiApiKey}
              onChange={(e) => setKeyInputValue(e.target.value)}
              placeholder="Enter your Gemini API key..."
              className="flex-1 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg)] px-2 py-1.5 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] outline-none focus:border-[var(--accent)]"
            />
            <button
              onClick={() => {
                if (keyInputValue) {
                  setGeminiApiKey(keyInputValue);
                  setKeyInputValue('');
                  setShowKeyInput(false);
                }
              }}
              disabled={!keyInputValue}
              className="rounded-[var(--radius-sm)] bg-[var(--accent-emphasis)] px-2.5 py-1.5 text-[12px] text-white hover:bg-[var(--accent)] disabled:opacity-50 transition-all"
            >
              Save
            </button>
            {geminiApiKey && (
              <button
                onClick={() => { setGeminiApiKey(''); setKeyInputValue(''); }}
                className="rounded-[var(--radius-sm)] border border-[var(--border-default)] px-2.5 py-1.5 text-[12px] text-[var(--text-tertiary)] hover:text-[var(--danger)] transition-all"
              >
                Clear
              </button>
            )}
          </div>
          <p className="mt-1 text-[10px] text-[var(--text-tertiary)]">
            Get a free key at <span className="text-[var(--accent-text)]">aistudio.google.com</span> — stored locally in your browser.
          </p>
        </div>
      )}

      {/* File Changes */}
      {fileChanges.length > 0 && (
        <div className="shrink-0 px-3 py-2 border-b border-[var(--border-muted)]">
          <div className="flex items-center gap-1.5 mb-1.5">
            <FileEdit className="h-3 w-3 text-[var(--text-tertiary)]" />
            <span className="text-[11px] font-medium text-[var(--text-tertiary)] uppercase tracking-wide">File Changes</span>
          </div>
          <div className="space-y-1">
            {fileChanges.map((fc, i) => (
              <div key={i} className="flex items-center gap-2 text-[12px]">
                {fc.status === 'pending' ? <Loader2 className="h-3 w-3 animate-spin text-[var(--text-tertiary)]" /> :
                 fc.status === 'done' ? <CheckCircle className="h-3 w-3 text-[var(--success)]" /> :
                 <X className="h-3 w-3 text-[var(--danger)]" />}
                <span className={fc.status === 'done' ? 'text-[var(--success)]' : fc.status === 'error' ? 'text-[var(--danger)]' : 'text-[var(--text-tertiary)]'}>
                  {fc.type === 'create' ? 'Created' : 'Edited'} {fc.file}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3">
        {messages.length === 0 && !isLoading && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <Bot className="h-8 w-8 text-[var(--text-tertiary)] mb-3" />
            <p className="text-[13px] text-[var(--text-secondary)] font-medium mb-1">AI LaTeX Assistant</p>
            <p className="text-[11px] text-[var(--text-tertiary)] leading-relaxed">
              Ask me to help write LaTeX, fix errors, or suggest improvements to your document.
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {error && (
          <div className="rounded-[var(--radius-sm)] bg-[var(--danger-muted)] border border-[var(--danger)] px-3 py-2 text-[12px] text-[var(--danger)]">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-[var(--border-default)] p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your document..."
            rows={1}
            className="flex-1 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] resize-none outline-none focus:border-[var(--accent)] transition-all max-h-32"
            style={{ minHeight: '36px' }}
          />
          {isLoading ? (
            <button
              onClick={stopGeneration}
              className="rounded-[var(--radius-sm)] bg-[var(--danger)] p-2 text-white hover:opacity-90 transition-all shrink-0"
              title="Stop generating"
            >
              <StopCircle className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="rounded-[var(--radius-sm)] bg-[var(--accent-emphasis)] p-2 text-white hover:bg-[var(--accent)] disabled:opacity-50 transition-all shrink-0"
              title="Send message"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
