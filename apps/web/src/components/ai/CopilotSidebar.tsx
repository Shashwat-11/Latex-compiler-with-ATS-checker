import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Loader2, StopCircle, MessageSquare, Sparkles } from 'lucide-react';
import { useAiChat } from '../../hooks/useAiChat.js';
import type { ChatMessage } from '../../hooks/useAiChat.js';

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

export function CopilotSidebar({ projectId, currentFileId, currentSelection, isOpen, onToggle }: Props) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isLoading, error, sendMessage, stopGeneration, clearMessages, loadHistory } = useAiChat({ projectId });

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    <div className="flex flex-col h-full w-[340px] border-l border-[var(--border-default)] bg-[var(--bg)]">
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
        {error && (
          <div className="rounded-[var(--radius-sm)] bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 text-[12px] text-red-700 dark:text-red-400">
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
