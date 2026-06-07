export type CompilationStatus =
  | 'queued'
  | 'running'
  | 'compiling'
  | 'success'
  | 'error'
  | 'cancelled'
  | 'timeout';

export interface Compilation {
  id: string;
  projectId: string;
  initiatorId: string;
  status: CompilationStatus;
  compiler: string;
  logOutput: string | null;
  errorSummary: string | null;
  pdfPath: string | null;
  pdfSizeBytes: number | null;
  compileTimeMs: number | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

export interface CompilationSSEEvent {
  status: CompilationStatus;
  message?: string;
  logLine?: string;
  errorLine?: string;
  compileTimeMs?: number;
  pdfUrl?: string;
}
