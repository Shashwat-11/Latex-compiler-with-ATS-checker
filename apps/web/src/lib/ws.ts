type MessageHandler = (data: unknown) => void;

class WSClient {
  ws: WebSocket | null = null;
  handlers = new Map<string, Set<MessageHandler>>();
  reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  url: string = '';
  projectIds = new Set<string>();

  connect(url: string) {
    this.url = url;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      console.log('[WS] Connected');
      this.projectIds.forEach((id) => this.subscribe(id));
    };

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const handlers = this.handlers.get(msg.type);
        if (handlers) {
          handlers.forEach((h) => h(msg));
        }
      } catch {
        // Skip non-JSON messages
      }
    };

    this.ws.onclose = () => {
      console.log('[WS] Disconnected, reconnecting...');
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(this.url);
    }, 2000);
  }

  subscribe(projectId: string) {
    this.projectIds.add(projectId);
    this.send({ type: 'subscribe', projectId });
  }

  unsubscribe(projectId: string) {
    this.projectIds.delete(projectId);
    this.send({ type: 'unsubscribe', projectId });
  }

  on(type: string, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  send(data: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
  }
}

export const wsClient = new WSClient();
