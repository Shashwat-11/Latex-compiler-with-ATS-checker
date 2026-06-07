import type { FileNode } from '@overleaf/shared';
import { FileTreeNode } from './FileTreeNode.js';

interface FileTreeProps {
  files: FileNode[];
  level: number;
  onFileClick: (file: FileNode) => void;
  onDelete: (fileId: string) => void;
}

export function FileTree({ files, level, onFileClick, onDelete }: FileTreeProps) {
  return (
    <div>
      {files.map((file) => (
        <FileTreeNode
          key={file.id}
          file={file}
          level={level}
          onFileClick={onFileClick}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
