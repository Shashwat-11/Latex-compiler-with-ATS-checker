export interface AiChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  contextFileId?: string | null;
  contextSelection?: string | null;
  createdAt: string;
}

export interface AiConversation {
  id: string;
  projectId: string;
  title: string;
  messages: AiChatMessage[];
  createdAt: string;
}

export interface SendMessageRequest {
  message: string;
  contextFileId?: string;
  contextSelection?: string;
}

export interface InlineCompletionRequest {
  prefix: string;
  suffix: string;
  language: string;
}

export interface InlineCompletionResponse {
  completions: string[];
}

export interface ResumeTemplateSummary {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  latexClass: string;
  compiler: string;
  styleOptions: Record<string, string[]>;
  thumbnailUrl: string | null;
}

export interface ResumeTemplateDetail extends ResumeTemplateSummary {
  templateFiles: Array<{ filename: string; content: string }>;
}

export interface GenerateResumeRequest {
  templateId: string;
  style?: string;
  color?: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    title?: string;
    linkedin?: string;
    github?: string;
    summary?: string;
  };
  education: Array<{
    institution: string;
    degree: string;
    field?: string;
    startYear?: string;
    endYear?: string;
    gpa?: string;
  }>;
  experience: Array<{
    company: string;
    role: string;
    location?: string;
    startDate: string;
    endDate?: string;
    current?: boolean;
    bullets: string[];
  }>;
  skills: Array<{
    category: string;
    items: string[];
  }>;
  projects?: Array<{
    name: string;
    description: string;
    url?: string;
    technologies: string[];
  }>;
}

export interface GeneratedResumeResponse {
  id: string;
  status: string;
  latex: string;
  projectId?: string | null;
  createdAt: string;
}
