import { useState, useRef, useCallback } from 'react';
import api from '../lib/api.js';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

interface UseAiChatOptions {
  projectId: string;
}

export function useAiChat({ projectId }: UseAiChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await api.get(`/projects/${projectId}/chat/history`);
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch {
      // No history yet - first conversation
      setMessages([]);
    }
  }, [projectId]);

  const sendMessage = useCallback(async (
    message: string,
    contextFileId?: string,
    contextSelection?: string,
  ) => {
    setError(null);
    setIsLoading(true);

    // Add user message optimistically
    const userMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: message,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    // Create abort controller
    abortRef.current = new AbortController();

    try {
      const response = await fetch(`/api/v1/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message, contextFileId, contextSelection }),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Chat request failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      // Read SSE stream
      const decoder = new TextDecoder();
      let fullContent = '';

      // Add a temporary assistant message
      const assistantMsgId = `assistant-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: assistantMsgId, role: 'assistant', content: '', createdAt: new Date().toISOString() },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                setError(data.error);
                break;
              }
              if (data.done) break;
              if (data.content) {
                fullContent += data.content;
                // Update the assistant message content
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: fullContent } : m,
                  ),
                );
              }
            } catch {
              // Skip malformed SSE data
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to send message');
      }
    } finally {
      setIsLoading(false);
      abortRef.current = null;
    }
  }, [projectId]);

  const stopGeneration = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    stopGeneration,
    clearMessages,
    loadHistory,
  };
}
