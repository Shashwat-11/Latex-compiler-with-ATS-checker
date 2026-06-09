import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, X, Loader2, StopCircle, MessageSquare, Sparkles, CheckCircle } from 'lucide-react';
import { useAiChat } from '../../hooks/useAiChat.js';
import { useQueryClient } from '@tanstack/react-query';
import api from '../../lib/api.js';
import { useEditorStore } from '../../stores/editor.store.js';
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
  const [fileActions, setFileActions] = useState<Array<{ msg: string; status: 'pending' | 'done' | 'error' }>>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const processedMessages = useRef<Set<string>>(new Set());
  const queryClient = useQueryClient();
  const { messages, isLoading, error, sendMessage, stopGeneration, clearMessages, loadHistory } = useAiChat({ projectId });

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

      setFileActions((prev) => [...prev, { msg: `${action.type === 'create' ? 'Creating' : 'Editing'} ${action.filename}...`, status: 'pending' }]);

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

          setFileActions((prev) => [
            ...prev.slice(0, -1),
            { msg: `✅ ${action.type === 'create' ? 'Created' : 'Edited'} ${action.filename}`, status: 'done' },
          ]);
          // Invalidate file tree query to refresh the file explorer
          queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'files'] });
          // Force a refetch of the file content query if cached
          if (fileId) {
            queryClient.invalidateQueries({ queryKey: ['projects', projectId, 'files', fileId] });
          }
        } catch (err: any) {
          const errMsg = err?.response?.data?.error?.message || err.message;
          setFileActions((prev) => [
            ...prev.slice(0, -1),
            { msg: `❌ Failed to ${action.type} ${action.filename}: ${errMsg}`, status: 'error' },
          ]);
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
  }, [messages, fileActions]);

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
        </div>
        <div className="flex items-center gap-1">
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
        {fileActions.map((fa, i) => (
          <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] ${
            fa.status === 'done' ? 'text-[var(--success)]' :
            fa.status === 'error' ? 'text-[var(--danger)]' :
            'text-[var(--text-tertiary)]'
          }`}>
            {fa.status === 'pending' ? <Loader2 className="h-3 w-3 animate-spin" /> :
             fa.status === 'done' ? <CheckCircle className="h-3 w-3" /> :
             <X className="h-3 w-3" />}
            {fa.msg}
          </div>
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
