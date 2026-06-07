export type FileType = 'file' | 'folder';

export interface FileNode {
  id: string;
  projectId: string;
  parentId: string | null;
  name: string;
  type: FileType;
  content: string | null;
  sortOrder: number;
  sizeBytes: number;
  createdAt: string;
  updatedAt: string;
  children?: FileNode[];
}

export interface CreateFileRequest {
  name: string;
  parentId?: string | null;
  type: FileType;
  content?: string;
}

export interface UpdateFileRequest {
  content?: string;
  name?: string;
}

export interface MoveFileRequest {
  newParentId: string | null;
  newSortOrder?: number;
}

export interface DuplicateFileRequest {
  newName?: string;
}

export interface FileTreeResponse {
  files: FileNode[];
}
