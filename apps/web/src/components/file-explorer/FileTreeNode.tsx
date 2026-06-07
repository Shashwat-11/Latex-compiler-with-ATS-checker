import { useState } from 'react';
import type { FileNode } from '@overleaf/shared';
import { FileTree } from './FileTree.js';
import { FileIcon } from './FileIcon.js';
import { ChevronRight, Trash2 } from 'lucide-react';

interface FileTreeNodeProps {
  file: FileNode;
  level: number;
  onFileClick: (file: FileNode) => void;
  onDelete: (fileId: string) => void;
}

export function FileTreeNode({ file, level, onFileClick, onDelete }: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const isFolder = file.type === 'folder';
  const hasChildren = file.children && file.children.length > 0;

  return (
    <div>
      <div
        onClick={() => { if (isFolder) setExpanded(!expanded); else onFileClick(file); }}
        className="group flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm transition-colors hover:bg-[var(--bg-overlay)]"
        style={{ paddingLeft: `${level * 14 + 8}px` }}
      >
        {isFolder && (
          <ChevronRight className={`h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)] transition-transform duration-150 ${expanded ? 'rotate-90' : ''}`} />
        )}
        <FileIcon name={file.name} type={file.type} />
        <span className="truncate text-[var(--text-primary)]">{file.name}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(file.id); }}
          className="ml-auto hidden rounded p-0.5 text-[var(--text-tertiary)] hover:text-red-500 group-hover:block transition-colors"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {isFolder && expanded && hasChildren && (
        <FileTree files={file.children!} level={level + 1} onFileClick={onFileClick} onDelete={onDelete} />
      )}
    </div>
  );
}
