export type WSClientMessage =
  | { type: 'ping' }
  | { type: 'subscribe'; projectId: string }
  | { type: 'unsubscribe'; projectId: string }
  | { type: 'file:update'; projectId: string; fileId: string; content: string; version: string }
  | { type: 'cursor:move'; projectId: string; fileId: string; line: number; col: number };

export type WSServerMessage =
  | { type: 'pong' }
  | { type: 'file:updated'; projectId: string; fileId: string; version: string; updatedBy: string }
  | { type: 'file:created'; projectId: string; file: import('./file.js').FileNode }
  | { type: 'file:deleted'; projectId: string; fileId: string; affectedIds: string[] }
  | { type: 'file:renamed'; projectId: string; fileId: string; newName: string }
  | { type: 'project:updated'; projectId: string }
  | { type: 'error'; message: string };
