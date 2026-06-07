export interface ATSReport {
  id: string;
  projectId: string;
  fileId: string;
  compilationId: string;
  overallScore: number;
  categoryScores: ATSCategoryScores;
  keywordMatches: ATSKeywordMatch[];
  missingKeywords: string[];
  formattingIssues: ATSFormattingIssue[];
  readabilityMetrics: ATSReadabilityMetrics;
  recommendations: string[];
  createdAt: string;
}

export interface ATSCategoryScores {
  keywords: number;
  formatting: number;
  readability: number;
  structure: number;
  contactInfo: number;
}

export interface ATSKeywordMatch {
  keyword: string;
  category: string;
  count: number;
  context: string;
}

export interface ATSFormattingIssue {
  type: 'font' | 'spacing' | 'tables' | 'columns' | 'images' | 'headers_footers';
  severity: 'warning' | 'error';
  description: string;
  page?: number;
}

export interface ATSReadabilityMetrics {
  wordCount: number;
  sentenceCount: number;
  avgSentenceLength: number;
  bulletPointsCount: number;
  actionVerbsCount: number;
  quantifiedAchievements: number;
}
