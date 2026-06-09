import { create } from 'zustand';

interface EditorTab {
  fileId: string;
  name: string;
  isDirty: boolean;
}

interface EditorState {
  activeFileId: string | null;
  openTabs: EditorTab[];
  fileContents: Record<string, string>;
  refreshCounter: Record<string, number>;
  setActiveFile: (fileId: string | null) => void;
  openFile: (fileId: string, name: string, content: string) => void;
  closeTab: (fileId: string) => void;
  updateContent: (fileId: string, content: string) => void;
  /** Force-refresh a file's content from outside (e.g., AI edits) — bumps refreshCounter */
  setExternalContent: (fileId: string, content: string) => void;
  markClean: (fileId: string) => void;
  reset: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  activeFileId: null,
  openTabs: [],
  fileContents: {},
  refreshCounter: {},

  reset: () => set({ activeFileId: null, openTabs: [], fileContents: {}, refreshCounter: {} }),

  setActiveFile: (fileId) => set({ activeFileId: fileId }),

  openFile: (fileId, name, content) =>
    set((state) => {
      const existing = state.openTabs.find((t) => t.fileId === fileId);
      if (existing) {
        return { activeFileId: fileId };
      }
      return {
        activeFileId: fileId,
        openTabs: [...state.openTabs, { fileId, name, isDirty: false }],
        fileContents: { ...state.fileContents, [fileId]: content },
      };
    }),

  closeTab: (fileId) =>
    set((state) => {
      const newTabs = state.openTabs.filter((t) => t.fileId !== fileId);
      const newContents = { ...state.fileContents };
      delete newContents[fileId];
      const newActive =
        state.activeFileId === fileId
          ? newTabs[newTabs.length - 1]?.fileId ?? null
          : state.activeFileId;
      return { openTabs: newTabs, activeFileId: newActive, fileContents: newContents };
    }),

  updateContent: (fileId, content) =>
    set((state) => ({
      fileContents: { ...state.fileContents, [fileId]: content },
      openTabs: state.openTabs.map((t) =>
        t.fileId === fileId ? { ...t, isDirty: true } : t
      ),
    })),

  setExternalContent: (fileId, content) =>
    set((state) => ({
      fileContents: { ...state.fileContents, [fileId]: content },
      refreshCounter: { ...state.refreshCounter, [fileId]: (state.refreshCounter[fileId] || 0) + 1 },
    })),

  markClean: (fileId) =>
    set((state) => ({
      openTabs: state.openTabs.map((t) =>
        t.fileId === fileId ? { ...t, isDirty: false } : t
      ),
    })),
}));
