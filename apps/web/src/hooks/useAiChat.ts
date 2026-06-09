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
  geminiApiKey?: string;
}

export function useAiChat({ projectId, geminiApiKey }: UseAiChatOptions) {
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
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (geminiApiKey) headers['X-Gemini-Key'] = geminiApiKey;

      const response = await fetch(`/api/v1/projects/${projectId}/chat`, {
        method: 'POST',
        headers,
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

      // Stream timeout guard — force stop after 60s
      const streamTimeout = setTimeout(() => {
        abortRef.current?.abort();
        setError('AI response timed out. Please try again.');
      }, 60000);

      let streamDone = false;

      while (true) {
        const result = await reader.read();
        const { done, value } = result;
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        let receivedDone = false;

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.error) {
                setError(data.error);
                receivedDone = true;
                break;
              }
              if (data.done) {
                receivedDone = true;
                break;
              }
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

        if (receivedDone) {
          streamDone = true;
          break;
        }
      }

      clearTimeout(streamTimeout);

      // If stream ended without a done signal, still mark complete
      if (!streamDone && fullContent.length > 0) {
        // Content was received but no done event — still treat as complete
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
