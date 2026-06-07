import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from './editor.store.js';

const initialState = useEditorStore.getInitialState();

describe('editor store', () => {
  beforeEach(() => {
    useEditorStore.setState(initialState, true);
  });

  it('opens a file tab', () => {
    const store = useEditorStore.getState();
    store.openFile('file-1', 'test.tex', 'Hello World');
    const state = useEditorStore.getState();
    expect(state.activeFileId).toBe('file-1');
    expect(state.openTabs).toHaveLength(1);
    expect(state.openTabs[0]?.name).toBe('test.tex');
    expect(state.fileContents['file-1']).toBe('Hello World');
  });

  it('marks file as dirty on content update', () => {
    const store = useEditorStore.getState();
    store.openFile('file-2', 'doc.tex', 'content');
    store.updateContent('file-2', 'new content');
    const state = useEditorStore.getState();
    const tab = state.openTabs.find((t) => t.fileId === 'file-2');
    expect(tab?.isDirty).toBe(true);
    expect(state.fileContents['file-2']).toBe('new content');
  });

  it('closes a tab', () => {
    const store = useEditorStore.getState();
    store.openFile('file-3', 'a.tex', 'a');
    store.openFile('file-4', 'b.tex', 'b');
    store.setActiveFile('file-4');
    store.closeTab('file-4');
    const state = useEditorStore.getState();
    expect(state.activeFileId).toBe('file-3');
    expect(state.openTabs).toHaveLength(1);
  });
});
