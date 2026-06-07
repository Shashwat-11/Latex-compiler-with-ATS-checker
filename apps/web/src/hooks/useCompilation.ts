import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api.js';
import { useCompilationStore } from '../stores/compilation.store.js';
import type { Compilation } from '@overleaf/shared';

export function useCompilation(projectId: string | null) {
  const queryClient = useQueryClient();
  const { isCompiling, setCompilationId, setCompiling, setStatus, reset } = useCompilationStore();

  const compileMutation = useMutation({
    mutationFn: async () => {
      if (!projectId) throw new Error('No project');
      const { data } = await api.post<{ compilation: Compilation }>(`/projects/${projectId}/compile`);
      return data.compilation;
    },
    onMutate: () => {
      reset();
      setCompiling(true);
      setStatus('queued');
    },
    onSuccess: (compilation) => {
      setCompilationId(compilation.id);
    },
  });

  const startCompile = async () => {
    await compileMutation.mutateAsync();
  };

  return {
    compile: startCompile,
    isCompiling: isCompiling || compileMutation.isPending,
  };
}
