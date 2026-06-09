import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'light' | 'dark' | 'system';

interface UIState {
  theme: Theme;
  sidebarOpen: boolean;
  pdfPanelOpen: boolean;
  geminiApiKey: string;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  togglePdfPanel: () => void;
  setGeminiApiKey: (key: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarOpen: true,
      pdfPanelOpen: true,
      geminiApiKey: '',

      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      togglePdfPanel: () => set((s) => ({ pdfPanelOpen: !s.pdfPanelOpen })),
      setGeminiApiKey: (key) => set({ geminiApiKey: key }),
    }),
    { name: 'overleaf-ui' }
  )
);
