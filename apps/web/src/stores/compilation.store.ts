import { create } from 'zustand';

interface CompilationState {
  isCompiling: boolean;
  compilationId: string | null;
  status: string | null;
  pdfUrl: string | null;
  errorLine: string | null;
  compileTimeMs: number | null;
  setCompiling: (isCompiling: boolean) => void;
  setCompilationId: (id: string | null) => void;
  setStatus: (status: string | null) => void;
  setPdfUrl: (url: string | null) => void;
  setError: (error: string | null) => void;
  setCompileTime: (ms: number | null) => void;
  reset: () => void;
}

export const useCompilationStore = create<CompilationState>((set) => ({
  isCompiling: false,
  compilationId: null,
  status: null,
  pdfUrl: null,
  errorLine: null,
  compileTimeMs: null,

  setCompiling: (isCompiling) => set({ isCompiling }),
  setCompilationId: (compilationId) => set({ compilationId }),
  setStatus: (status) => set({ status }),
  setPdfUrl: (pdfUrl) => set({ pdfUrl }),
  setError: (errorLine) => set({ errorLine }),
  setCompileTime: (compileTimeMs) => set({ compileTimeMs }),
  reset: () =>
    set({
      isCompiling: false,
      compilationId: null,
      status: null,
      pdfUrl: null,
      errorLine: null,
      compileTimeMs: null,
    }),
}));
