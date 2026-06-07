export type CompilerType = 'pdflatex' | 'xelatex' | 'lualatex';

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  template?: 'blank' | 'resume' | 'article' | 'report';
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string | null;
  isArchived?: boolean;
}

export interface ProjectSettings {
  projectId: string;
  compiler: CompilerType;
  rootFileId: string | null;
  spellCheckLang: string;
  editorFontSize: number;
  autoCompile: boolean;
  compileOnSave: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProjectSettingsRequest {
  compiler?: CompilerType;
  rootFileId?: string | null;
  spellCheckLang?: string;
  editorFontSize?: number;
  autoCompile?: boolean;
  compileOnSave?: boolean;
}
