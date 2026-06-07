import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import type { Project, CreateProjectRequest, UpdateProjectRequest, PaginatedResponse, ProjectSettings } from '@overleaf/shared';

export function useProjects(page = 1, search?: string) {
  return useQuery({
    queryKey: ['projects', { page, search }],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      if (search) params.set('search', search);
      const { data } = await api.get<PaginatedResponse<Project>>(`/projects?${params}`);
      return data;
    },
  });
}

export function useProject(projectId: string | null) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await api.get<{ project: Project }>(`/projects/${projectId}`);
      return data.project;
    },
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProjectRequest) => {
      const { data } = await api.post<{ project: Project }>('/projects', input);
      return data.project;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & UpdateProjectRequest) => {
      const { data } = await api.patch<{ project: Project }>(`/projects/${id}`, input);
      return data.project;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/projects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useProjectSettings(projectId: string | null) {
  return useQuery({
    queryKey: ['projectSettings', projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data } = await api.get<{ settings: ProjectSettings }>(`/projects/${projectId}/settings`);
      return data.settings;
    },
    enabled: !!projectId,
  });
}
