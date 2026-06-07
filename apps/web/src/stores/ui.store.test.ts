import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from './ui.store.js';

describe('ui store', () => {
  beforeEach(() => {
    useUIStore.setState({ theme: 'system', sidebarOpen: true, pdfPanelOpen: true });
  });

  it('toggles sidebar', () => {
    useUIStore.getState().toggleSidebar();
    expect(useUIStore.getState().sidebarOpen).toBe(false);
  });

  it('toggles pdf panel', () => {
    useUIStore.getState().togglePdfPanel();
    expect(useUIStore.getState().pdfPanelOpen).toBe(false);
  });

  it('sets theme', () => {
    useUIStore.getState().setTheme('dark');
    expect(useUIStore.getState().theme).toBe('dark');
  });
});
