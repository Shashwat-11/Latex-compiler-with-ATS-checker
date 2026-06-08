import { useQuery } from '@tanstack/react-query';
import api from '../lib/api.js';

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

export function useTemplates() {
  return useQuery({
    queryKey: ['ai', 'templates'],
    queryFn: async () => {
      const { data } = await api.get('/templates');
      return data.templates as ResumeTemplateSummary[];
    },
    staleTime: 10 * 60 * 1000, // Templates rarely change
  });
}

export function useTemplate(slug: string | null) {
  return useQuery({
    queryKey: ['ai', 'templates', slug],
    queryFn: async () => {
      if (!slug) throw new Error('No slug provided');
      const { data } = await api.get(`/templates/${slug}`);
      return data.template;
    },
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });
}
