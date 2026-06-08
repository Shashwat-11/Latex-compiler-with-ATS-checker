import { useEffect } from 'react';
import { wsClient } from '../lib/ws.js';

export function useWebSocket(projectId: string | null) {
  useEffect(() => {
    if (!projectId) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    wsClient.connect(wsUrl);
    wsClient.subscribe(projectId);

    return () => {
      wsClient.unsubscribe(projectId);
    };
  }, [projectId]);

  return wsClient;
}
