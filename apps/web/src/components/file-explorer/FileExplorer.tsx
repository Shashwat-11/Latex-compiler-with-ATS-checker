import { useFileTree, useCreateFile, useDeleteFile } from '../../hooks/useFiles.js';
import { useEditorStore } from '../../stores/editor.store.js';
import { FileTree } from './FileTree.js';
import { FilePlus, FolderPlus } from 'lucide-react';
import { useState } from 'react';
import * as Tooltip from '@radix-ui/react-tooltip';
import type { FileNode } from '@overleaf/shared';

interface Props { projectId: string; }

export function FileExplorer({ projectId }: Props) {
  const { data: files, isLoading } = useFileTree(projectId);
  const createFile = useCreateFile();
  const deleteFile = useDeleteFile();
  const { openFile, openTabs, closeTab } = useEditorStore();
  const [isCreating, setIsCreating] = useState<'file' | 'folder' | null>(null);
  const [newName, setNewName] = useState('');

  const handleCreate = async () => {
    if (!newName.trim() || !isCreating) return;
    const ext = isCreating === 'file' && !newName.includes('.') ? '.tex' : '';
    await createFile.mutateAsync({ projectId, name: newName + ext, type: isCreating, parentId: null });
    setNewName(''); setIsCreating(null);
  };

  const handleFileClick = (f: FileNode) => { if (f.type === 'folder') return; openFile(f.id, f.name, f.content ?? ''); };
  const handleDelete = async (fid: string) => { if (openTabs.find((t) => t.fileId === fid)) closeTab(fid); await deleteFile.mutateAsync({ projectId, fileId: fid }); };

  return (
    <Tooltip.Provider>
      <div className="flex h-full flex-col bg-[var(--bg)]">
        <div className="flex items-center justify-between h-9 px-3 border-b border-[var(--border-muted)] shrink-0">
          <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Files</span>
          <div className="flex gap-0.5">
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button onClick={() => setIsCreating('file')} className="rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] transition-all"><FilePlus className="h-3.5 w-3.5" /></button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="rounded-[var(--radius-sm)] bg-[var(--text-primary)] px-2 py-1 text-[11px] text-[var(--text-inverse)] shadow-[var(--shadow-md)]">New file<Tooltip.Arrow className="fill-[var(--text-primary)]" /></Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button onClick={() => setIsCreating('folder')} className="rounded p-1 text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay)] hover:text-[var(--text-primary)] transition-all"><FolderPlus className="h-3.5 w-3.5" /></button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content className="rounded-[var(--radius-sm)] bg-[var(--text-primary)] px-2 py-1 text-[11px] text-[var(--text-inverse)] shadow-[var(--shadow-md)]">New folder<Tooltip.Arrow className="fill-[var(--text-primary)]" /></Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </div>
        </div>

        {isCreating && (
          <div className="flex gap-1 px-2 py-1 border-b border-[var(--border-muted)]">
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setIsCreating(null); }}
              placeholder={isCreating === 'file' ? 'filename.tex' : 'folder name'}
              className="flex-1 rounded-[var(--radius-sm)] border border-[var(--border-default)] bg-[var(--bg)] px-2 py-0.5 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-placeholder)] focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] outline-none" />
            <button onClick={handleCreate} className="text-[11px] font-medium text-[var(--accent-text)]">Create</button>
            <button onClick={() => setIsCreating(null)} className="text-[11px] text-[var(--text-tertiary)]">Cancel</button>
          </div>
        )}

        <div className="flex-1 overflow-auto py-1">
          {isLoading ? <div className="flex justify-center py-4"><div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--border-default)] border-t-[var(--accent)]" /></div> : <FileTree files={files ?? []} level={0} onFileClick={handleFileClick} onDelete={handleDelete} />}
        </div>
      </div>
    </Tooltip.Provider>
  );
}
