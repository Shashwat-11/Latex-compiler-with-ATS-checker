import { useEditorStore } from '../../stores/editor.store.js';
import { X } from 'lucide-react';

export function EditorTabs() {
  const { openTabs, activeFileId, setActiveFile, closeTab } = useEditorStore();

  if (openTabs.length === 0) {
    return <div className="flex h-9 items-center border-b border-[var(--border-default)] bg-[var(--bg-elevated)] px-4 text-[11px] text-[var(--text-tertiary)] select-none">No file open — select a file from the explorer</div>;
  }

  return (
    <div className="flex h-9 items-center border-b border-[var(--border-default)] bg-[var(--bg-elevated)] overflow-x-auto">
      {openTabs.map((tab) => (
        <div key={tab.fileId} onClick={() => setActiveFile(tab.fileId)}
          className={`flex h-full cursor-pointer items-center gap-1.5 border-r border-[var(--border-muted)] px-3 text-[12px] shrink-0 transition-all ${
            tab.fileId === activeFileId ? 'bg-[var(--bg)] text-[var(--text-primary)] font-medium border-t-2 border-t-[var(--accent)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]'}`}>
          {tab.isDirty && <span className="h-1.5 w-1.5 rounded-full bg-[var(--warning)]" />}
          <span className="max-w-[120px] truncate">{tab.name}</span>
          <button onClick={(e) => { e.stopPropagation(); closeTab(tab.fileId); }} className="rounded p-0.5 text-[var(--text-tertiary)] hover:bg-[var(--border-default)] hover:text-[var(--text-primary)]"><X className="h-3 w-3" /></button>
        </div>
      ))}
    </div>
  );
}
