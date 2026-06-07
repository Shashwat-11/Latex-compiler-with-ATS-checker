import { useEditorStore } from '../../stores/editor.store.js';
import { useProjectSettings } from '../../hooks/useProjects.js';

interface Props { projectId: string; isSaving?: boolean; isDirty?: boolean; }

export function EditorStatusBar({ projectId, isSaving, isDirty }: Props) {
  const activeFileId = useEditorStore((s) => s.activeFileId);
  const fileContents = useEditorStore((s) => s.fileContents);
  const { data: settings } = useProjectSettings(projectId);
  const content = activeFileId ? fileContents[activeFileId] : '';
  const lines = content ? content.split('\n').length : 0;

  return (
    <div className="flex h-6 items-center justify-between border-t border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 text-[11px] text-[var(--text-tertiary)] shrink-0">
      <div className="flex items-center gap-3">
        {isSaving && <span className="text-[var(--accent)]">Saving...</span>}
        {isDirty && !isSaving && <span className="text-[var(--warning)]">Unsaved</span>}
        {!isDirty && !isSaving && activeFileId && <span className="text-[var(--success)]">Saved</span>}
        {activeFileId && <span>Ln {lines}</span>}
      </div>
      <div className="flex items-center gap-3">
        <span>{settings?.compiler ?? 'pdflatex'}</span>
        <span>UTF-8</span>
      </div>
    </div>
  );
}
