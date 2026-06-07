import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import type { FileNode, FileTreeResponse, CreateFileRequest, UpdateFileRequest, MoveFileRequest } from '@overleaf/shared';

export function useFileTree(projectId: string | null) {
  return useQuery({
    queryKey: ['fileTree', projectId],
    queryFn: async () => {
      if (!projectId) return [];
      const { data } = await api.get<FileTreeResponse>(`/projects/${projectId}/files`);
      return data.files;
    },
    enabled: !!projectId,
  });
}

export function useCreateFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, ...input }: CreateFileRequest & { projectId: string }) => {
      const { data } = await api.post<{ file: FileNode }>(`/projects/${projectId}/files`, input);
      return data.file;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['fileTree', projectId] });
    },
  });
}

export function useUpdateFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, fileId, ...input }: UpdateFileRequest & { projectId: string; fileId: string }) => {
      const { data } = await api.patch<{ file: FileNode }>(`/projects/${projectId}/files/${fileId}`, input);
      return data.file;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['fileTree', projectId] });
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, fileId }: { projectId: string; fileId: string }) => {
      await api.delete(`/projects/${projectId}/files/${fileId}`);
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['fileTree', projectId] });
    },
  });
}

export function useMoveFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ projectId, fileId, ...input }: MoveFileRequest & { projectId: string; fileId: string }) => {
      const { data } = await api.post<{ file: FileNode }>(`/projects/${projectId}/files/${fileId}/move`, input);
      return data.file;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: ['fileTree', projectId] });
    },
  });
}
